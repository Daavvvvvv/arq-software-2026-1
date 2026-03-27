import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SqsService } from '@concert/messaging';
import { PaymentConfirmedEvent } from '@concert/events';
import { KitchenService } from './kitchen.service';

@Injectable()
export class KitchenProcessor implements OnApplicationBootstrap {
  private readonly logger = new Logger(KitchenProcessor.name);

  constructor(
    private readonly sqs: SqsService,
    private readonly kitchenService: KitchenService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const queueUrl = this.config.get<string>('SQS_KITCHEN_QUEUE_URL')!;
    this.sqs.startPolling(queueUrl, async (body) => {
      const event = body as unknown as PaymentConfirmedEvent;
      if (event.eventType === 'payment.confirmed') {
        await this.kitchenService.handlePaymentConfirmed(
          event.pedidoId,
          event.correlationId,
          event.tenantId,
        );
      }
    });
    this.logger.log('Kitchen processor polling started');
  }
}
