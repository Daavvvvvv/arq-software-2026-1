import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Subject } from 'rxjs';
import { WRITE_DATA_SOURCE } from '@concert/database';
import { EstadoPedido, EventsLog, Pedido } from '@concert/domain';
import { RabbitMQService } from '@concert/messaging';
import { ordersCancelledTotal, ordersInFlight } from '@concert/telemetry';
import { OrderReadyEvent } from '@concert/events';

export interface KitchenUpdate {
  pedidoId: string;
  estado: EstadoPedido;
  numeroPedido: string;
}

@Injectable()
export class KitchenService {
  private readonly logger = new Logger(KitchenService.name);
  readonly updates$ = new Subject<KitchenUpdate>();

  constructor(
    @Inject(WRITE_DATA_SOURCE) private readonly ds: DataSource,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  async handlePaymentConfirmed(pedidoId: string, correlationId: string, tenantId: string): Promise<void> {
    const pedidoRepo = this.ds.getRepository(Pedido);
    const pedido = await pedidoRepo.findOne({ where: { id: pedidoId } });
    if (!pedido) {
      this.logger.error(`Pedido ${pedidoId} not found`);
      return;
    }

    await pedidoRepo.update(pedidoId, { estado: EstadoPedido.EN_PREPARACION });
    await this.ds.getRepository(EventsLog).save({
      eventType: 'payment.confirmed',
      pedidoId,
      correlationId,
      tenantId,
      payload: {},
    });

    this.updates$.next({
      pedidoId,
      estado: EstadoPedido.EN_PREPARACION,
      numeroPedido: pedido.numeroPedido,
    });
    this.logger.log(`Pedido ${pedidoId} now EN_PREPARACION`);
  }

  getPedidosEnPreparacion(): Promise<Pedido[]> {
    return this.ds.getRepository(Pedido).find({
      where: { estado: EstadoPedido.EN_PREPARACION },
      relations: ['items', 'items.producto'],
      order: { createdAt: 'ASC' },
    });
  }

  async marcarListo(id: string): Promise<void> {
    const pedidoRepo = this.ds.getRepository(Pedido);
    const pedido = await pedidoRepo.findOne({ where: { id } });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    if (pedido.estado !== EstadoPedido.EN_PREPARACION) {
      throw new BadRequestException('El pedido no está en preparación');
    }

    await pedidoRepo.update(id, { estado: EstadoPedido.LISTO });
    await this.ds.getRepository(EventsLog).save({
      eventType: 'order.ready',
      pedidoId: id,
      correlationId: pedido.correlationId,
      tenantId: pedido.tenantId,
      payload: {},
    });

    const event: OrderReadyEvent = {
      eventType: 'order.ready',
      pedidoId: id,
      tenantId: pedido.tenantId,
      correlationId: pedido.correlationId,
      usuarioId: pedido.usuarioId,
    };
    await this.rabbitmq.publish(
      'order.ready',
      event as unknown as Record<string, unknown>,
    );

    this.updates$.next({ pedidoId: id, estado: EstadoPedido.LISTO, numeroPedido: pedido.numeroPedido });
    this.logger.log(`Pedido ${id} marked LISTO`);
  }

  async cancelar(id: string): Promise<void> {
    const pedidoRepo = this.ds.getRepository(Pedido);
    const pedido = await pedidoRepo.findOne({ where: { id } });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');

    await pedidoRepo.update(id, { estado: EstadoPedido.CANCELADO });
    await this.ds.getRepository(EventsLog).save({
      eventType: 'order.cancelled',
      pedidoId: id,
      correlationId: pedido.correlationId,
      tenantId: pedido.tenantId,
      payload: { reason: 'cancelled_by_kitchen' },
    });

    ordersCancelledTotal.inc();
    ordersInFlight.dec();
    this.updates$.next({ pedidoId: id, estado: EstadoPedido.CANCELADO, numeroPedido: pedido.numeroPedido });
    this.logger.log(`Pedido ${id} CANCELADO`);
  }
}
