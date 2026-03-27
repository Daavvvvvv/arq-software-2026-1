import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@concert/database';
import { AuthModule } from '@concert/auth';
import { MessagingModule } from '@concert/messaging';
import { KitchenController } from './kitchen/kitchen.controller';
import { KitchenService } from './kitchen/kitchen.service';
import { KitchenProcessor } from './kitchen/kitchen.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    DatabaseModule,
    AuthModule,
    MessagingModule,
  ],
  controllers: [KitchenController],
  providers: [KitchenService, KitchenProcessor],
})
export class AppModule {}
