import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import modules from all 5 processors + shared services
import { DatabaseModule } from '@concert/database';
import { MessagingModule } from '@concert/messaging';
import { AuthModule } from '@concert/auth';
import { TelemetryModule } from '@concert/telemetry';

// Controllers
import { AuthController } from '../../../order-processor/src/auth/auth.controller';
import { BoletasController } from '../../../order-processor/src/boletas/boletas.controller';
import { TiendasController } from '../../../order-processor/src/tiendas/tiendas.controller';
import { MenuController } from '../../../order-processor/src/tiendas/menu.controller';
import { AdminController } from '../../../order-processor/src/admin/admin.controller';
import { HealthController } from '../../../order-processor/src/health/health.controller';
import { KitchenController } from '../../../kitchen-processor/src/kitchen/kitchen.controller';
import { DeliveryController } from '../../../delivery-processor/src/delivery/delivery.controller';

// Services
import { AuthService } from '../../../order-processor/src/auth/auth.service';
import { BoletasService } from '../../../order-processor/src/boletas/boletas.service';
import { TiendasService } from '../../../order-processor/src/tiendas/tiendas.service';
import { AdminService } from '../../../order-processor/src/admin/admin.service';
import { KitchenService } from '../../../kitchen-processor/src/kitchen/kitchen.service';
import { DeliveryService } from '../../../delivery-processor/src/delivery/delivery.service';
import { NotificationService } from '../../../notification-service/src/notification/notification.service';
import { PaymentService } from '../../../payment-processor/src/payment.service';

// Processors (RabbitMQ consumers)
import { KitchenProcessor } from '../../../kitchen-processor/src/kitchen/kitchen.processor';
import { DeliveryProcessor } from '../../../delivery-processor/src/delivery/delivery.processor';
import { NotificationProcessor } from '../../../notification-service/src/notification/notification.processor';
import { PaymentProcessor } from '../../../payment-processor/src/payment.processor';

// Channels
import { FcmChannel } from '../../../notification-service/src/channels/fcm.channel';
import { EmailChannel } from '../../../notification-service/src/channels/email.channel';
import { SmsChannel } from '../../../notification-service/src/channels/sms.channel';

// Payment processors
import { MercadoPagoService } from '../../../payment-processor/src/payment-methods/mercado-pago.service';
import { StripeService } from '../../../payment-processor/src/payment-methods/stripe.service';
import { MockPaymentService } from '../../../payment-processor/src/payment-methods/mock-payment.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? undefined : '.env',
    }),
    DatabaseModule,
    MessagingModule,
    AuthModule,
    TelemetryModule,
  ],
  controllers: [
    // Order processor controllers
    AuthController,
    BoletasController,
    TiendasController,
    MenuController,
    AdminController,
    HealthController,
    // Kitchen processor controller
    KitchenController,
    // Delivery processor controller
    DeliveryController,
  ],
  providers: [
    // Order processor services
    AuthService,
    BoletasService,
    TiendasService,
    AdminService,
    // Kitchen processor services + processor
    KitchenService,
    KitchenProcessor,
    // Delivery processor services + processor
    DeliveryService,
    DeliveryProcessor,
    // Notification services + processor
    NotificationService,
    NotificationProcessor,
    FcmChannel,
    EmailChannel,
    SmsChannel,
    // Payment services + processor
    PaymentService,
    PaymentProcessor,
    MercadoPagoService,
    StripeService,
    MockPaymentService,
  ],
})
export class AppModule {}
