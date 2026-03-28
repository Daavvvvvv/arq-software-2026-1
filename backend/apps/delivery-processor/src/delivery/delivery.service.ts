import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { RabbitMQService } from '@concert/messaging';
import {
  ordersDeliveredTotal,
  orderDeliveryDurationSeconds,
  ordersInFlight,
} from '@concert/telemetry';
import { OrderDeliveredEvent } from '@concert/events';
import { randomUUID } from 'crypto';

// Adjacent zones mapping for fallback
const ZONAS_ADYACENTES: Record<string, string[]> = {
  A: ['B'],
  B: ['A', 'C'],
  C: ['B', 'D'],
  D: ['C', 'E'],
  E: ['D'],
};

const AUTO_DELIVERY_DELAY_MS = 5000;

function normalizeOptionalUuid(value?: string | null): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    @Inject(WRITE_DATA_SOURCE) private readonly ds: DataSource,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  async handleOrderReady(
    pedidoId: string,
    correlationId: string,
    tenantId: string,
  ): Promise<void> {
    const pedidoRepo = this.ds.getRepository(Pedido);
    const entregaRepo = this.ds.getRepository(Entrega);
    const repartidorRepo = this.ds.getRepository(Repartidor);
    const eventsLogRepo = this.ds.getRepository(EventsLog);

    const safeCorrelationId = normalizeOptionalUuid(correlationId) ?? randomUUID();
    const safeTenantId = normalizeOptionalUuid(tenantId);

    const pedido = await pedidoRepo.findOne({
      where: { id: pedidoId },
      relations: ['entrega'],
    });

    if (!pedido) {
      this.logger.error(`Pedido ${pedidoId} not found`);
      return;
    }

    if (
      pedido.estado === EstadoPedido.EN_ENTREGA ||
      pedido.estado === EstadoPedido.ENTREGADO
    ) {
      this.logger.warn(
        `Pedido ${pedidoId} already processed by delivery with estado ${pedido.estado}`,
      );
      return;
    }

    let repartidor = await repartidorRepo.findOne({
      where: { zona: pedido.zona, disponible: true },
    });

    if (!repartidor) {
      const adyacentes = ZONAS_ADYACENTES[pedido.zona] ?? [];

      for (const zona of adyacentes) {
        repartidor = await repartidorRepo.findOne({
          where: { zona, disponible: true },
        });

        if (repartidor) break;
      }
    }

    if (repartidor) {
      await repartidorRepo.update(repartidor.id, { disponible: false });
    } else {
      this.logger.log(
        `No repartidor for zona ${pedido.zona} — simulating delivery`,
      );
    }

    const entrega =
      pedido.entrega ??
      entregaRepo.create({
        pedidoId,
        repartidorId: repartidor?.id ?? null,
        estado: EstadoEntrega.ASIGNADO,
      });

    entrega.repartidorId = repartidor?.id ?? null;
    entrega.estado = EstadoEntrega.ASIGNADO;

    await entregaRepo.save(entrega);

    await pedidoRepo.update(pedidoId, { estado: EstadoPedido.EN_ENTREGA });

    await eventsLogRepo.save({
      eventType: 'order.in_delivery',
      pedidoId,
      correlationId: safeCorrelationId,
      tenantId: safeTenantId,
      payload: {
        repartidorId: repartidor?.id ?? 'simulated',
        repartidorNombre: repartidor?.nombre ?? 'Auto',
        zona: pedido.zona,
      },
    });

    this.logger.log(
      `Pedido ${pedidoId} assigned to repartidor ${repartidor?.nombre ?? 'simulated'}`,
    );

    setTimeout(() => {
      void this.autoConfirmDelivery(pedidoId);
    }, AUTO_DELIVERY_DELAY_MS);
  }

  private async autoConfirmDelivery(pedidoId: string): Promise<void> {
    try {
      const pedido = await this.ds.getRepository(Pedido).findOne({
        where: { id: pedidoId },
        relations: ['entrega'],
      });

      if (!pedido) {
        this.logger.warn(
          `Auto-delivery skipped: pedido ${pedidoId} no longer exists`,
        );
        return;
      }

      if (pedido.estado !== EstadoPedido.EN_ENTREGA) {
        this.logger.warn(
          `Auto-delivery skipped: pedido ${pedidoId} is in estado ${pedido.estado}`,
        );
        return;
      }

      this.logger.log(`Auto-delivering pedido ${pedidoId}`);
      await this.confirmarEntrega(pedidoId);
    } catch (error) {
      this.logger.error(
        `Auto-delivery failed for pedido ${pedidoId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async getPedidosEnEntrega(): Promise<Pedido[]> {
    return this.ds.getRepository(Pedido).find({
      where: { estado: EstadoPedido.EN_ENTREGA },
      relations: ['entrega', 'entrega.repartidor', 'items', 'items.producto'],
      order: { createdAt: 'ASC' },
    });
  }

  async getDetallePedido(pedidoId: string): Promise<Pedido> {
    const pedido = await this.ds.getRepository(Pedido).findOne({
      where: { id: pedidoId },
      relations: ['entrega', 'entrega.repartidor', 'items', 'items.producto'],
    });

    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return pedido;
  }

  async getHistorialEntregas(): Promise<Pedido[]> {
    return this.ds.getRepository(Pedido).find({
      where: { estado: EstadoPedido.ENTREGADO },
      relations: ['entrega'],
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  async confirmarEntrega(pedidoId: string): Promise<void> {
    const pedidoRepo = this.ds.getRepository(Pedido);
    const entregaRepo = this.ds.getRepository(Entrega);
    const repartidorRepo = this.ds.getRepository(Repartidor);
    const eventsLogRepo = this.ds.getRepository(EventsLog);

    const pedido = await pedidoRepo.findOne({
      where: { id: pedidoId },
      relations: ['entrega', 'entrega.repartidor'],
    });

    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (!pedido.entrega) {
      throw new NotFoundException('Entrega no encontrada');
    }

    if (pedido.estado === EstadoPedido.ENTREGADO) {
      this.logger.warn(`Pedido ${pedidoId} already delivered`);
      return;
    }

    const horaEntrega = new Date();
    const tiempoTotal = Math.round(
      (horaEntrega.getTime() - pedido.createdAt.getTime()) / 1000,
    );

    await entregaRepo.update(pedido.entrega.id, {
      estado: EstadoEntrega.ENTREGADO,
      horaEntrega,
      tiempoTotal,
    });

    await pedidoRepo.update(pedidoId, { estado: EstadoPedido.ENTREGADO });

    if (pedido.entrega.repartidorId) {
      await repartidorRepo.update(pedido.entrega.repartidorId, {
        disponible: true,
      });
    }

    const safeCorrelationId =
      normalizeOptionalUuid(pedido.correlationId) ?? randomUUID();

    // IMPORTANTE:
    // el evento exige tenantId: string
    // así que aquí no puede quedar undefined
    const safeTenantId =
      normalizeOptionalUuid(pedido.tenantId) ?? randomUUID();

    await eventsLogRepo.save({
      eventType: 'order.delivered',
      pedidoId,
      correlationId: safeCorrelationId,
      tenantId: safeTenantId,
      payload: { tiempoTotal },
    });

    const event: OrderDeliveredEvent = {
      eventType: 'order.delivered',
      pedidoId,
      tenantId: safeTenantId,
      correlationId: safeCorrelationId,
      tiempoTotal,
    };

    await this.rabbitmq.publish(
      'order.delivered',
      event as unknown as Record<string, unknown>,
    );

    ordersDeliveredTotal.inc();
    orderDeliveryDurationSeconds.observe(tiempoTotal);
    ordersInFlight.dec();

    this.logger.log(`Pedido ${pedidoId} ENTREGADO in ${tiempoTotal}s`);
  }
}