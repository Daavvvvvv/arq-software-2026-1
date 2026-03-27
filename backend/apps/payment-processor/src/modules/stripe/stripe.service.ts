import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Pedido } from '@concert/domain';
import { PaymentResult, PaymentStrategy } from '../../interfaces/payment.strategy';
import { randomUUID } from 'crypto';

@Injectable()
export class StripeService implements PaymentStrategy {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe | null = null;

  constructor(private readonly config: ConfigService) {
    const key = config.get<string>('STRIPE_SECRET_KEY');
    if (key && !key.startsWith('sk_test_...')) {
      this.stripe = new Stripe(key, { apiVersion: '2024-04-10' });
    }
  }

  async charge(pedido: Pedido): Promise<PaymentResult> {
    const provider = this.config.get<string>('PAYMENT_PROVIDER') ?? 'mock';
    if (provider === 'mock' || !this.stripe) {
      this.logger.log(`[Stripe MOCK] Charging pedido ${pedido.id}`);
      return { success: true, referencia: `stripe-mock-${randomUUID()}` };
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const intent = await this.stripe.paymentIntents.create({
          amount: Math.round(Number(pedido.total) * 100),
          currency: 'cop',
          metadata: { pedidoId: pedido.id },
          confirm: false,
        });
        return { success: true, referencia: intent.id };
      } catch (err) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        } else {
          return { success: false, referencia: '', motivo: String(err) };
        }
      }
    }
    return { success: false, referencia: '', motivo: 'Max retries' };
  }

  validateSignature(payload: unknown, signature: string): boolean {
    if (!this.stripe) return true;
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    try {
      const raw = Buffer.isBuffer(payload) ? payload : Buffer.from(JSON.stringify(payload));
      this.stripe.webhooks.constructEvent(raw, signature, secret);
      return true;
    } catch {
      return false;
    }
  }

  async handleWebhook(payload: unknown, signature: string): Promise<void> {
    if (!this.validateSignature(payload, signature)) {
      throw new UnauthorizedException('Invalid Stripe webhook signature');
    }
    this.logger.log('[Stripe] Webhook processed');
  }
}
