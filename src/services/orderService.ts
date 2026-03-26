import type { CartItem, Order, OrderStatus, OrderStatusHistoryItem } from '../types/models'
import { getCart, clearCart } from './cartService'
import { getProductById } from './menuService'

const ORDER_STORAGE_KEY = 'app_order'

export type CreateOrderError =
  | 'empty_cart'
  | 'product_unavailable'
  | 'price_changed'

export interface CreateOrderResult {
  success: boolean
  order?: Order
  error?: CreateOrderError
  message?: string
}

function getOrderStatusByElapsedTime(
  createdAt: string,
  paymentShouldFail: boolean,
): OrderStatus {
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

function shouldSimulateFetchFailure(): boolean {
  return Math.random() < 0.2
}

function buildOrderHistory(
  createdAt: string,
  currentStatus: OrderStatus,
): OrderStatusHistoryItem[] {
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

  if (
    currentStatus === 'confirmed' ||
    currentStatus === 'ready' ||
    currentStatus === 'delivered'
  ) {
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

function validateCartItems(cart: CartItem[]): {
  valid: boolean
  items?: CartItem[]
  error?: CreateOrderError
  message?: string
} {
  const validatedItems: CartItem[] = []

  for (const item of cart) {
    const currentProduct = getProductById(item.product.id)

    if (!currentProduct || !currentProduct.available) {
      return {
        valid: false,
        error: 'product_unavailable',
        message: `El producto ${item.product.name} ya no está disponible.`,
      }
    }

    if (currentProduct.price !== item.product.price) {
      return {
        valid: false,
        error: 'price_changed',
        message: `El precio de ${item.product.name} cambió. Revisa tu carrito antes de continuar.`,
      }
    }

    validatedItems.push({
      product: currentProduct,
      quantity: item.quantity,
    })
  }

  return {
    valid: true,
    items: validatedItems,
  }
}

export function createOrder(): CreateOrderResult {
  const cart = getCart()

  if (cart.length === 0) {
    return {
      success: false,
      error: 'empty_cart',
      message: 'Tu carrito está vacío.',
    }
  }

  const validationResult = validateCartItems(cart)

  if (!validationResult.valid || !validationResult.items) {
    return {
      success: false,
      error: validationResult.error,
      message: validationResult.message,
    }
  }

  const total = validationResult.items.reduce((sum, item) => {
    return sum + item.product.price * item.quantity
  }, 0)

  const now = new Date().toISOString()
  const paymentShouldFail = shouldSimulatePaymentFailure()

  const order: Order = {
    id: `order-${Date.now()}`,
    items: validationResult.items,
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

  return {
    success: true,
    order,
  }
}

export function getOrder(): Order | null {
  // if (shouldSimulateFetchFailure()) {
  //   throw new Error('Simulated fetch error')
  // }

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

export function getLastKnownOrder(): Order | null {
  const raw = localStorage.getItem(ORDER_STORAGE_KEY)

  if (!raw) {
    return null
  }

  return JSON.parse(raw) as Order
}