import { Pedido } from '@concert/domain';

export interface PaymentResult {
  success: boolean;
  referencia: string;
  motivo?: string;
}

export interface PaymentStrategy {
  charge(pedido: Pedido): Promise<PaymentResult>;
  validateSignature(payload: unknown, signature: string): boolean;
  handleWebhook(payload: unknown, signature: string): Promise<void>;
}
