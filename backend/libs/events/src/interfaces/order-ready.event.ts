export interface OrderReadyEvent {
  eventType: 'order.ready';
  pedidoId: string;
  tenantId: string;
  correlationId: string;
  usuarioId: string;
}