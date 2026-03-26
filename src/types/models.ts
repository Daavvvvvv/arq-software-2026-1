
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

// Pedido
export type Order = {
  id: string
  items: CartItem[]
  total: number
  status: 'created' | 'confirmed' | 'ready' | 'delivered'
  createdAt: number
}