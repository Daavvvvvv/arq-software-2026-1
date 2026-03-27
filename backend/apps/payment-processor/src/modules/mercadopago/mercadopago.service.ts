import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { Pedido } from '@concert/domain';
import { PaymentResult, PaymentStrategy } from '../../interfaces/payment.strategy';
import { randomUUID } from 'crypto';

@Injectable()
export class MercadoPagoService implements PaymentStrategy {
  private readonly logger = new Logger(MercadoPagoService.name);

  constructor(private readonly config: ConfigService) {}

  async charge(pedido: Pedido): Promise<PaymentResult> {
    const provider = this.config.get<string>('PAYMENT_PROVIDER') ?? 'mock';
    if (provider === 'mock') {
      this.logger.log(`[MP MOCK] Charging pedido ${pedido.id}`);
      return { success: true, referencia: `mp-mock-${randomUUID()}` };
    }

    // Production: call real MercadoPago API with exponential backoff
    const token = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transaction_amount: Number(pedido.total),
            description: `Pedido ${pedido.numeroPedido}`,
            payment_method_id: 'pix',
            payer: { email: 'consumer@test.com' },
            external_reference: pedido.id,
          }),
        });
        if (res.ok) {
          const data = await res.json() as { id: string; status: string };
          return {
            success: data.status === 'approved',
            referencia: String(data.id),
            motivo: data.status !== 'approved' ? data.status : undefined,
          };
        }
        throw new Error(`MP API error: ${res.status}`);
      } catch (err) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        } else {
          return { success: false, referencia: '', motivo: String(err) };
        }
      }
    }
    return { success: false, referencia: '', motivo: 'Max retries reached' };
  }

  validateSignature(payload: unknown, signature: string): boolean {
    const secret = this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
    if (!secret) return true; // no secret configured in dev

    // MP signature format: ts=<timestamp>,v1=<hmac>
    const parts: Record<string, string> = {};
    for (const part of signature.split(',')) {
      const [k, v] = part.split('=');
      if (k && v) parts[k] = v;
    }

    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1) return false;

    // Replay attack: reject if > 5 minutes old
    const tsMs = parseInt(ts, 10) * 1000;
    if (Date.now() - tsMs > 5 * 60 * 1000) {
      this.logger.warn('MP webhook replay attack detected');
      return false;
    }

    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expected = createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex');
    return expected === v1;
  }

  async handleWebhook(payload: unknown, signature: string): Promise<void> {
    if (!this.validateSignature(payload, signature)) {
      throw new UnauthorizedException('Invalid MP webhook signature');
    }
    this.logger.log('[MP] Webhook processed', payload);
  }
}
