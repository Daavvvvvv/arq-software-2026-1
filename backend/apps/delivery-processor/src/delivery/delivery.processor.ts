import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SqsService } from '@concert/messaging';
import { OrderReadyEvent } from '@concert/events';
import { DeliveryService } from './delivery.service';

@Injectable()
export class DeliveryProcessor implements OnApplicationBootstrap {
  private readonly logger = new Logger(DeliveryProcessor.name);

  constructor(
    private readonly sqs: SqsService,
    private readonly deliveryService: DeliveryService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const queueUrl = this.config.get<string>('SQS_DELIVERY_QUEUE_URL')!;
    this.sqs.startPolling(queueUrl, async (body) => {
      const event = body as unknown as OrderReadyEvent;
      if (event.eventType === 'order.ready') {
        await this.deliveryService.handleOrderReady(
          event.pedidoId,
          event.correlationId,
          event.tenantId,
        );
      }
    });
    this.logger.log('Delivery processor polling started');
  }
}
