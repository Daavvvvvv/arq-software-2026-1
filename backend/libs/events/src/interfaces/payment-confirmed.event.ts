export interface PaymentConfirmedEvent {
  eventType: 'payment.confirmed';
  pedidoId: string;
  tenantId: string;
  usuarioId: string;
  correlationId: string;
  referencia: string;
  monto: number;
}
