// Usuario
export type UserRole = 'CONSUMER' | 'KITCHEN'

export interface User {
  id: string
  name: string
  email: string
  rol: UserRole
}

// Boleta vinculada
export interface Ticket {
  id: string
  eventName: string
  seat: string
  linked: boolean
  zona?: string
  fila?: string
  asiento?: string
}

export type ProductCategory = 'food' | 'drinks' | 'combos'
// Producto del menú
export interface Product {
  id: string
  name: string
  price: number
  imageUrl?: string
  description?: string
  available: boolean
  category: ProductCategory
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