import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { WRITE_DATA_SOURCE } from '@concert/database';
import {
  EstadoPago, EstadoPedido, EventsLog, Pago, Pedido,
} from '@concert/domain';
import { SqsService, SnsService } from '@concert/messaging';
import { OrderValidatedEvent, PaymentConfirmedEvent, PaymentFailedEvent } from '@concert/events';
import { PaymentService } from './payment.service';

@Injectable()
export class PaymentProcessor implements OnApplicationBootstrap {
  private readonly logger = new Logger(PaymentProcessor.name);
  private readonly redis: Redis;

  constructor(
    @Inject(WRITE_DATA_SOURCE) private readonly ds: DataSource,
    private readonly sqs: SqsService,
    private readonly sns: SnsService,
    private readonly paymentService: PaymentService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis({
      host: config.get<string>('REDIS_HOST') ?? 'localhost',
      port: parseInt(config.get<string>('REDIS_PORT') ?? '6379', 10),
    });
  }

  onApplicationBootstrap(): void {
    const queueUrl = this.config.get<string>('SQS_PAYMENT_QUEUE_URL')!;
    this.sqs.startPolling(queueUrl, async (body) => {
      await this.handleMessage(body as unknown as OrderValidatedEvent);
    });
    this.logger.log('Payment processor polling started');
  }

  private async handleMessage(event: OrderValidatedEvent): Promise<void> {
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
      await this.sns.publish(
        this.config.get<string>('SNS_PAYMENT_EVENTS_ARN')!,
        confirmEvent as unknown as Record<string, unknown>,
      );

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
      await this.sns.publish(
        this.config.get<string>('SNS_PAYMENT_EVENTS_ARN')!,
        failEvent as unknown as Record<string, unknown>,
      );
      // Do not delete message → SQS retries → DLQ after 3 attempts
      throw new Error(`Payment failed for ${pedidoId}: ${result.motivo}`);
    }
  }
}
