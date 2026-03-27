import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SqsService } from '@concert/messaging';
import { ConcertEvent } from '@concert/events';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationProcessor implements OnApplicationBootstrap {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly sqs: SqsService,
    private readonly notificationService: NotificationService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const notifQueueUrl = this.config.get<string>('SQS_NOTIFICATION_QUEUE_URL')!;
    this.sqs.startPolling(notifQueueUrl, async (body) => {
      await this.notificationService.handleEvent(body as unknown as ConcertEvent);
    });

    const dlqMonitorUrl = this.config.get<string>('SQS_DLQ_MONITOR_URL')!;
    this.sqs.startPolling(dlqMonitorUrl, async (body) => {
      await this.notificationService.handleDlqAlert(body);
    });

    this.logger.log('Notification processor polling started');
  }
}
