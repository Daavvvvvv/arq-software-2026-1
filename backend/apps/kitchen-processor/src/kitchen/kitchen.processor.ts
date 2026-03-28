import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@concert/messaging';
import { PaymentConfirmedEvent } from '@concert/events';
import { KitchenService } from './kitchen.service';

@Injectable()
export class KitchenProcessor {
  private readonly logger = new Logger(KitchenProcessor.name);

  constructor(private readonly kitchenService: KitchenService) {}

  @RabbitSubscribe({
    exchange: 'concert-orders',
    routingKey: 'payment.confirmed',
    queue: 'kitchen-queue',
  })
  async handlePaymentConfirmed(event: PaymentConfirmedEvent): Promise<void> {
    if (event.eventType !== 'payment.confirmed') return;
    this.logger.log(`Kitchen received payment.confirmed for pedido ${event.pedidoId}`);
    await this.kitchenService.handlePaymentConfirmed(
      event.pedidoId,
      event.correlationId,
      event.tenantId,
    );
  }
}
