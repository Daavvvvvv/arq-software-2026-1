import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@concert/messaging';
import { OrderReadyEvent } from '@concert/events';
import { DeliveryService } from './delivery.service';

@Injectable()
export class DeliveryProcessor {
  private readonly logger = new Logger(DeliveryProcessor.name);

  constructor(private readonly deliveryService: DeliveryService) {}

  @RabbitSubscribe({
    exchange: 'concert-orders',
    routingKey: 'order.ready',
    queue: 'delivery-queue',
  })
  async handleOrderReady(event: OrderReadyEvent): Promise<void> {
    if (event.eventType !== 'order.ready') return;
    this.logger.log(`Delivery received order.ready for pedido ${event.pedidoId}`);
    await this.deliveryService.handleOrderReady(
      event.pedidoId,
      event.correlationId,
      event.tenantId,
    );
  }
}
