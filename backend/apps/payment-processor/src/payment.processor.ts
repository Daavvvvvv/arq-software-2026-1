import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { WRITE_DATA_SOURCE } from '@concert/database';
import {
  EstadoPago, EstadoPedido, EventsLog, Pago, Pedido,
} from '@concert/domain';
import { RabbitMQService, RabbitSubscribe } from '@concert/messaging';
import { OrderValidatedEvent, PaymentConfirmedEvent, PaymentFailedEvent } from '@concert/events';
import { PaymentService } from './payment.service';

@Injectable()
export class PaymentProcessor {
  private readonly logger = new Logger(PaymentProcessor.name);
  private readonly redis: Redis;

  constructor(
    @Inject(WRITE_DATA_SOURCE) private readonly ds: DataSource,
    private readonly rabbitmq: RabbitMQService,
    private readonly paymentService: PaymentService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis({
      host: config.get<string>('REDIS_HOST') ?? 'localhost',
      port: parseInt(config.get<string>('REDIS_PORT') ?? '6379', 10),
    });
  }

  @RabbitSubscribe({
    exchange: 'concert-orders',
    routingKey: 'order.validated',
    queue: 'payment-queue',
  })
  async handleOrderValidated(event: OrderValidatedEvent): Promise<void> {
    if (event.eventType !== 'order.validated') return;

    const { pedidoId, correlationId, tenantId, usuarioId } = event;

    // Idempotency check
    const idemKey = `idem:${pedidoId}`;
    const cached = await this.redis.get(idemKey);
    if (cached) {
      this.logger.log(`[IDEM] Skipping already processed pedido ${pedidoId}`);
      return;
    }

    const pedidoRepo = this.ds.getRepository(Pedido);
    const pedido = await pedidoRepo.findOne({
      where: { id: pedidoId },
      relations: ['usuario', 'items'],
    });
    if (!pedido) {
      this.logger.error(`Pedido ${pedidoId} not found`);
      return;
    }

    const result = await this.paymentService.charge(pedido);

    const pagoRepo = this.ds.getRepository(Pago);
    const pago = pagoRepo.create({
      pedidoId,
      estado: result.success ? EstadoPago.CONFIRMADO : EstadoPago.RECHAZADO,
      referencia: result.referencia,
      motivo: result.motivo,
      monto: pedido.total,
      proveedor: this.config.get<string>('PAYMENT_PROVIDER') ?? 'mock',
    });
    await pagoRepo.save(pago);

    if (result.success) {
      await pedidoRepo.update(pedidoId, { estado: EstadoPedido.PAGADO });

      await this.ds.getRepository(EventsLog).save({
        eventType: 'payment.confirmed',
        pedidoId,
        correlationId,
        tenantId,
        payload: { referencia: result.referencia },
      });

      const confirmEvent: PaymentConfirmedEvent = {
        eventType: 'payment.confirmed',
        pedidoId,
        tenantId,
        usuarioId,
        correlationId,
        referencia: result.referencia,
        monto: Number(pedido.total),
      };
      await this.rabbitmq.publish('payment.confirmed', confirmEvent as unknown as Record<string, unknown>);

      await this.redis.set(idemKey, JSON.stringify(result), 'EX', 86400);
      this.logger.log(`Payment confirmed for pedido ${pedidoId}`);
    } else {
      const failEvent: PaymentFailedEvent = {
        eventType: 'payment.failed',
        pedidoId,
        tenantId,
        usuarioId,
        correlationId,
        motivo: result.motivo ?? 'Payment rejected',
      };
      await this.rabbitmq.publish('payment.failed', failEvent as unknown as Record<string, unknown>);
      // Throwing re-queues the message → DLQ after max retries
      throw new Error(`Payment failed for ${pedidoId}: ${result.motivo}`);
    }
  }
}
