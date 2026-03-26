import type { Order, OrderStatus, OrderStatusHistoryItem } from '../types/models'
import { getCart, clearCart } from './cartService'

const ORDER_STORAGE_KEY = 'app_order'

function getOrderStatusByElapsedTime(createdAt: string, paymentShouldFail: boolean): OrderStatus {
  const createdAtMs = new Date(createdAt).getTime()
  const elapsedSeconds = Math.floor((Date.now() - createdAtMs) / 1000)

  if (elapsedSeconds < 5) {
    return 'created'
  }

  if (paymentShouldFail) {
    return 'payment_failed'
  }

  if (elapsedSeconds < 10) {
    return 'confirmed'
  }

  if (elapsedSeconds < 15) {
    return 'ready'
  }

  return 'delivered'
}

function shouldSimulatePaymentFailure(): boolean {
  return Math.random() < 0.2
}

function buildOrderHistory(createdAt: string, currentStatus: OrderStatus): OrderStatusHistoryItem[] {
  const history: OrderStatusHistoryItem[] = [
    {
      status: 'created',
      changedAt: createdAt,
      message: 'Pedido creado',
    },
  ]

  if (currentStatus === 'payment_failed') {
    history.push({
      status: 'payment_failed',
      changedAt: new Date(new Date(createdAt).getTime() + 5000).toISOString(),
      message: 'El pago fue rechazado',
    })

    return history
  }

  if (currentStatus === 'confirmed' || currentStatus === 'ready' || currentStatus === 'delivered') {
    history.push({
      status: 'confirmed',
      changedAt: new Date(new Date(createdAt).getTime() + 5000).toISOString(),
      message: 'Pago confirmado',
    })
  }

  if (currentStatus === 'ready' || currentStatus === 'delivered') {
    history.push({
      status: 'ready',
      changedAt: new Date(new Date(createdAt).getTime() + 10000).toISOString(),
      message: 'Pedido listo para entrega',
    })
  }
  if (currentStatus === 'delivered') {
    history.push({
      status: 'delivered',
      changedAt: new Date(new Date(createdAt).getTime() + 15000).toISOString(),
      message: 'Pedido entregado',
    })
  }

  return history
}

export function createOrder(): Order | null {
  const cart = getCart()

  if (cart.length === 0) {
    return null
  }

  const total = cart.reduce((sum, item) => {
    return sum + item.product.price * item.quantity
  }, 0)

  const now = new Date().toISOString()
  const paymentShouldFail = shouldSimulatePaymentFailure()

  const order: Order = {
    id: `order-${Date.now()}`,
    items: cart,
    total,
    status: 'created',
    createdAt: now,
    updatedAt: now,
    paymentShouldFail,
    history: [
      {
        status: 'created',
        changedAt: now,
        message: 'Pedido creado',
      },
    ],
  }

  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order))
  clearCart()

  return order
}

export function getOrder(): Order | null {
  const raw = localStorage.getItem(ORDER_STORAGE_KEY)

  if (!raw) {
    return null
  }

  const storedOrder = JSON.parse(raw) as Order
  const currentStatus = getOrderStatusByElapsedTime(
    storedOrder.createdAt,
    storedOrder.paymentShouldFail ?? false,
  )

  const updatedOrder: Order = {
    ...storedOrder,
    status: currentStatus,
    updatedAt: new Date().toISOString(),
    history: buildOrderHistory(storedOrder.createdAt, currentStatus),
  }

  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(updatedOrder))

  return updatedOrder
}

