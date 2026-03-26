// Usuario
export interface User {
  id: string
  name: string
  email: string
}

// Boleta vinculada
export interface Ticket {
  id: string
  eventName: string
  seat: string
  linked: boolean
}

// Producto del menú
export interface Product {
  id: string
  name: string
  price: number
  imageUrl?: string
}

// Item dentro del carrito
export interface CartItem {
  product: Product
  quantity: number
}

export type OrderStatus =
  | 'created'
  | 'confirmed'
  | 'ready'
  | 'delivered'
  | 'payment_failed'
  | 'cancelled'

export interface OrderStatusHistoryItem {
  status: OrderStatus
  changedAt: string
  message?: string
}

// Pedido
export interface Order {
  id: string
  items: CartItem[]
  total: number
  status: OrderStatus
  createdAt: string
  updatedAt: string
  paymentShouldFail: boolean
  history: OrderStatusHistoryItem[]
}


