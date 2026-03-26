import type { Order } from '../types/models'
import { getCart } from './cartService'

const ORDER_STORAGE_KEY = 'app_order'

function getOrderStatusByElapsedTime(createdAt: number): Order['status'] {
  const elapsedSeconds = Math.floor((Date.now() - createdAt) / 1000)

  if (elapsedSeconds < 5) {
    return 'created'
  }

  if (elapsedSeconds < 10) {
    return 'confirmed'
  }

  if (elapsedSeconds < 15) {
    return 'ready'
  }

  return 'delivered'
}

export function createOrder(): Order {
  const cart = getCart()

  const total = cart.reduce((sum, item) => {
    return sum + item.product.price * item.quantity
  }, 0)

  const order: Order = {
    id: `order-${Date.now()}`,
    items: cart,
    total,
    status: 'created',
    createdAt: Date.now(),
  }

  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order))

  return order
}

export function getOrder(): Order | null {
  const raw = localStorage.getItem(ORDER_STORAGE_KEY)

  if (!raw) return null

  const storedOrder = JSON.parse(raw) as Order

  return {
    ...storedOrder,
    status: getOrderStatusByElapsedTime(storedOrder.createdAt),
  }
}