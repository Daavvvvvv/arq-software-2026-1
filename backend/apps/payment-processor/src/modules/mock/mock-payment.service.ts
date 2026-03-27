import { Injectable, Logger } from '@nestjs/common';
import { Pedido } from '@concert/domain';
import { PaymentResult, PaymentStrategy } from '../../interfaces/payment.strategy';
import { randomUUID } from 'crypto';

@Injectable()
export class MockPaymentService implements PaymentStrategy {
  private readonly logger = new Logger(MockPaymentService.name);

  async charge(_pedido: Pedido): Promise<PaymentResult> {
    this.logger.log(`[MOCK] Charging pedido ${_pedido.id}`);
    return { success: true, referencia: `mock-ref-${randomUUID()}` };
  }

  validateSignature(_payload: unknown, _signature: string): boolean {
    return true;
  }

  async handleWebhook(_payload: unknown, _signature: string): Promise<void> {
    this.logger.log('[MOCK] Webhook received (no-op)');
  }
}
