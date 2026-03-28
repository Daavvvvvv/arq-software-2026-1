import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@concert/messaging';
import { ConcertEvent } from '@concert/events';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationService: NotificationService) {}

  @RabbitSubscribe({
    exchange: 'concert-orders',
    routingKey: '#',
    queue: 'notification-queue',
  })
  async handleEvent(event: ConcertEvent): Promise<void> {
    this.logger.log(`Notification received event: ${event.eventType}`);
    await this.notificationService.handleEvent(event);
  }

  @RabbitSubscribe({
    exchange: 'concert-orders',
    routingKey: '#',
    queue: 'dlq-monitor-queue',
  })
  async handleDlqAlert(body: Record<string, unknown>): Promise<void> {
    await this.notificationService.handleDlqAlert(body);
  }
}
