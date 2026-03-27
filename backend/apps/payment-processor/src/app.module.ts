import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@concert/database';
import { AuthModule } from '@concert/auth';
import { MessagingModule } from '@concert/messaging';
import { MercadoPagoModule } from './modules/mercadopago/mercadopago.module';
import { StripeModule } from './modules/stripe/stripe.module';
import { MockPaymentService } from './modules/mock/mock-payment.service';
import { PaymentService } from './payment.service';
import { PaymentProcessor } from './payment.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    DatabaseModule,
    AuthModule,
    MessagingModule,
    MercadoPagoModule,
    StripeModule,
  ],
  providers: [MockPaymentService, PaymentService, PaymentProcessor],
})
export class AppModule {}
