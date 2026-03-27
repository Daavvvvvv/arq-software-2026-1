export interface OrderValidatedEvent {
  eventType: 'order.validated';
  pedidoId: string;
  tenantId: string;
  usuarioId: string;
  correlationId: string;
  items: Array<{
    productoId: string;
    cantidad: number;
    precioUnitario: number;
  }>;
  total: number;
  ubicacion: {
    zona: string;
    fila: string;
    asiento: string;
  };
}
