export interface OrderDeliveredEvent {
  eventType: 'order.delivered';
  pedidoId: string;
  tenantId: string;
  correlationId: string;
  tiempoTotal: number;
}
