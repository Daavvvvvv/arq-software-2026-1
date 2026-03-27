import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@concert/database';
import { MessagingModule } from '@concert/messaging';
import { NotificationService } from './notification/notification.service';
import { NotificationProcessor } from './notification/notification.processor';
import { FcmChannel } from './channels/fcm.channel';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    DatabaseModule,
    MessagingModule,
  ],
  providers: [
    FcmChannel,
    EmailChannel,
    SmsChannel,
    NotificationService,
    NotificationProcessor,
  ],
})
export class AppModule {}
