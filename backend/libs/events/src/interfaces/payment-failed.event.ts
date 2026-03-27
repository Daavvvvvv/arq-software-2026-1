export interface PaymentFailedEvent {
  eventType: 'payment.failed';
  pedidoId: string;
  tenantId: string;
  usuarioId: string;
  correlationId: string;
  motivo: string;
}
