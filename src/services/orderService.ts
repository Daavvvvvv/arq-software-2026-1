import type { Order } from '../types/models'
import { getCart } from './cartService'

const ORDER_STORAGE_KEY = 'app_order'

export function createOrder(): Order {
  const cart = getCart()

  const total = cart.reduce((sum, item) => {
    return sum + item.product.price * item.quantity
  }, 0)

  const order: Order = {
    id: `order-${Date.now()}`,
    items: cart,
    total,
    status: 'pending',
  }

  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order))

  return order
}

export function getOrder(): Order | null {
  const raw = localStorage.getItem(ORDER_STORAGE_KEY)
  return raw ? (JSON.parse(raw) as Order) : null
}