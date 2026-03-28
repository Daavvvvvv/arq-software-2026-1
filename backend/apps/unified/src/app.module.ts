import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { HttpThrottlerGuard } from './http-throttler.guard';
import { DatabaseModule } from '@concert/database';
import { AuthModule } from '@concert/auth';
import { MessagingModule } from '@concert/messaging';
import { TelemetryModule } from '@concert/telemetry';

// ── Order Processor ────────────────────────────────────────
import { AuthController } from '../../order-processor/src/auth/auth.controller';
import { AuthService } from '../../order-processor/src/auth/auth.service';
import { OrdersController } from '../../order-processor/src/orders/orders.controller';
import { OrdersService } from '../../order-processor/src/orders/orders.service';
import { BoletasController } from '../../order-processor/src/boletas/boletas.controller';
import { BoletasService } from '../../order-processor/src/boletas/boletas.service';
import { TiendasController } from '../../order-processor/src/tiendas/tiendas.controller';
import { TiendasService } from '../../order-processor/src/tiendas/tiendas.service';
import { MenuController } from '../../order-processor/src/tiendas/menu.controller';
import { AdminController } from '../../order-processor/src/admin/admin.controller';
import { AdminService } from '../../order-processor/src/admin/admin.service';
import { HealthController } from '../../order-processor/src/health/health.controller';

// ── Kitchen Processor ──────────────────────────────────────
import { KitchenController } from '../../kitchen-processor/src/kitchen/kitchen.controller';
import { KitchenService } from '../../kitchen-processor/src/kitchen/kitchen.service';
import { KitchenProcessor } from '../../kitchen-processor/src/kitchen/kitchen.processor';

// ── Payment Processor ──────────────────────────────────────
import { PaymentService } from '../../payment-processor/src/payment.service';
import { PaymentProcessor } from '../../payment-processor/src/payment.processor';
import { MockPaymentService } from '../../payment-processor/src/modules/mock/mock-payment.service';
import { MercadoPagoModule } from '../../payment-processor/src/modules/mercadopago/mercadopago.module';
import { StripeModule } from '../../payment-processor/src/modules/stripe/stripe.module';

// ── Delivery Processor ─────────────────────────────────────
import { DeliveryController } from '../../delivery-processor/src/delivery/delivery.controller';
import { DeliveryService } from '../../delivery-processor/src/delivery/delivery.service';
import { DeliveryProcessor } from '../../delivery-processor/src/delivery/delivery.processor';

// ── Notification Service ───────────────────────────────────
import { NotificationService } from '../../notification-service/src/notification/notification.service';
import { NotificationProcessor } from '../../notification-service/src/notification/notification.processor';
import { FcmChannel } from '../../notification-service/src/channels/fcm.channel';
import { EmailChannel } from '../../notification-service/src/channels/email.channel';
import { SmsChannel } from '../../notification-service/src/channels/sms.channel';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TelemetryModule,
    DatabaseModule,
    AuthModule,
    MessagingModule,
    MercadoPagoModule,
    StripeModule,
  ],
  controllers: [
    HealthController,
    AuthController,
    OrdersController,
    BoletasController,
    TiendasController,
    MenuController,
    AdminController,
    KitchenController,
    DeliveryController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: HttpThrottlerGuard },
    // Order
    AuthService,
    OrdersService,
    BoletasService,
    TiendasService,
    AdminService,
    // Kitchen
    KitchenService,
    KitchenProcessor,
    // Payment
    MockPaymentService,
    PaymentService,
    PaymentProcessor,
    // Delivery
    DeliveryService,
    DeliveryProcessor,
    // Notification
    FcmChannel,
    EmailChannel,
    SmsChannel,
    NotificationService,
    NotificationProcessor,
  ],
})
export class AppModule {}
