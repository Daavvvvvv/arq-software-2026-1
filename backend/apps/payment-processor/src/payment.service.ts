import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pedido } from '@concert/domain';
import { PaymentResult, PaymentStrategy } from './interfaces/payment.strategy';
import { MercadoPagoService } from './modules/mercadopago/mercadopago.service';
import { StripeService } from './modules/stripe/stripe.service';
import { MockPaymentService } from './modules/mock/mock-payment.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly mp: MercadoPagoService,
    private readonly stripe: StripeService,
    private readonly mock: MockPaymentService,
    private readonly config: ConfigService,
  ) {}

  async charge(pedido: Pedido): Promise<PaymentResult> {
    const strategy = this.resolveStrategy(pedido.usuario?.metodoPago ?? '');
    return strategy.charge(pedido);
  }

  resolveStrategy(metodoPago: string): PaymentStrategy {
    const provider = this.config.get<string>('PAYMENT_PROVIDER') ?? 'mock';
    if (provider === 'mock') return this.mock;

    const map: Record<string, PaymentStrategy> = {
      mercadopago: this.mp,
      stripe: this.stripe,
    };
    return map[metodoPago] ?? this.mp;
  }
}
