import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@concert/database';
import { AuthModule } from '@concert/auth';
import { MessagingModule } from '@concert/messaging';
import { DeliveryController } from './delivery/delivery.controller';
import { DeliveryService } from './delivery/delivery.service';
import { DeliveryProcessor } from './delivery/delivery.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    DatabaseModule,
    AuthModule,
    MessagingModule,
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService, DeliveryProcessor],
})
export class AppModule {}
