export type KitchenOrderStatus = 'EN_PREPARACION' | 'LISTO' | 'CANCELADO'

export interface KitchenProduct {
  id: string
  nombre: string
  precio?: string | number
  descripcion?: string | null
  imagen?: string | null
}

export interface KitchenOrderItem {
  id: string
  cantidad: number
  precioUnitario?: string | number
  producto: KitchenProduct
}

export interface KitchenOrder {
  id: string
  numeroPedido: string
  estado: KitchenOrderStatus
  createdAt: string
  updatedAt: string
  zona?: string | null
  fila?: string | null
  asiento?: string | null
  items: KitchenOrderItem[]
}

export type KitchenTab = 'preparing' | 'ready'

export interface KitchenActionState {
  [orderId: string]: 'ready' | 'cancel' | null
}