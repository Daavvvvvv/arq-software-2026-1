import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { WRITE_DATA_SOURCE } from '@concert/database';
import {
  EstadoEntrega,
  EstadoPedido,
  Entrega,
  EventsLog,
  Pedido,
  Repartidor,
} from '@concert/domain';
import { SnsService } from '@concert/messaging';
import { OrderDeliveredEvent } from '@concert/events';

// Adjacent zones mapping for fallback
const ZONAS_ADYACENTES: Record<string, string[]> = {
  A: ['B'],
  B: ['A', 'C'],
  C: ['B', 'D'],
  D: ['C', 'E'],
  E: ['D'],
};

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    @Inject(WRITE_DATA_SOURCE) private readonly ds: DataSource,
    private readonly sns: SnsService,
    private readonly config: ConfigService,
  ) {}

  async handleOrderReady(
    pedidoId: string,
    correlationId: string,
    tenantId: string,
  ): Promise<void> {
    const pedidoRepo = this.ds.getRepository(Pedido);
    const pedido = await pedidoRepo.findOne({ where: { id: pedidoId } });
    if (!pedido) {
      this.logger.error(`Pedido ${pedidoId} not found`);
      return;
    }

    const repartidorRepo = this.ds.getRepository(Repartidor);

    // Find available repartidor in same zone first, then adjacent
    let repartidor = await repartidorRepo.findOne({
      where: { zona: pedido.zona, disponible: true },
    });

    if (!repartidor) {
      const adyacentes = ZONAS_ADYACENTES[pedido.zona] ?? [];
      for (const zona of adyacentes) {
        repartidor = await repartidorRepo.findOne({ where: { zona, disponible: true } });
        if (repartidor) break;
      }
    }

    if (!repartidor) {
      this.logger.warn(`No repartidor available for zona ${pedido.zona} — operational alert`);
      return;
    }

    // Assign repartidor
    await repartidorRepo.update(repartidor.id, { disponible: false });

    const entrega = await this.ds.getRepository(Entrega).save(
      this.ds.getRepository(Entrega).create({
        pedidoId,
        repartidorId: repartidor.id,
        estado: EstadoEntrega.ASIGNADO,
      }),
    );

    await pedidoRepo.update(pedidoId, { estado: EstadoPedido.EN_ENTREGA });

    await this.ds.getRepository(EventsLog).save({
      eventType: 'order.in_delivery',
      pedidoId,
      correlationId,
      tenantId,
      payload: { repartidorId: repartidor.id, zona: pedido.zona },
    });

    this.logger.log(`Pedido ${pedidoId} assigned to repartidor ${repartidor.nombre}`);
  }

  async getPedidosEnEntrega(): Promise<Pedido[]> {
    return this.ds.getRepository(Pedido).find({
      where: { estado: EstadoPedido.EN_ENTREGA },
      relations: ['entrega', 'entrega.repartidor'],
      order: { createdAt: 'ASC' },
    });
  }

  async confirmarEntrega(pedidoId: string): Promise<void> {
    const pedidoRepo = this.ds.getRepository(Pedido);
    const pedido = await pedidoRepo.findOne({
      where: { id: pedidoId },
      relations: ['entrega', 'entrega.repartidor'],
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    if (!pedido.entrega) throw new NotFoundException('Entrega no encontrada');

    const horaEntrega = new Date();
    const tiempoTotal = Math.round(
      (horaEntrega.getTime() - pedido.createdAt.getTime()) / 1000,
    );

    await this.ds.getRepository(Entrega).update(pedido.entrega.id, {
      estado: EstadoEntrega.ENTREGADO,
      horaEntrega,
      tiempoTotal,
    });

    await pedidoRepo.update(pedidoId, { estado: EstadoPedido.ENTREGADO });

    if (pedido.entrega.repartidorId) {
      await this.ds.getRepository(Repartidor).update(pedido.entrega.repartidorId, {
        disponible: true,
      });
    }

    await this.ds.getRepository(EventsLog).save({
      eventType: 'order.delivered',
      pedidoId,
      correlationId: pedido.correlationId,
      tenantId: pedido.tenantId,
      payload: { tiempoTotal },
    });

    const event: OrderDeliveredEvent = {
      eventType: 'order.delivered',
      pedidoId,
      tenantId: pedido.tenantId ?? '',
      correlationId: pedido.correlationId ?? '',
      tiempoTotal,
    };
    await this.sns.publish(
      this.config.get<string>('SNS_DELIVERY_EVENTS_ARN')!,
      event as unknown as Record<string, unknown>,
    );

    this.logger.log(`Pedido ${pedidoId} ENTREGADO in ${tiempoTotal}s`);
  }
}
