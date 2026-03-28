import type { Order, OrderStatus, OrderStatusHistoryItem } from '../types/models'
import { getCart, clearCart } from './cartService'
import { getAuthHeaders } from './sessionService'
import { getTicket } from './sessionService'

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

export async function createOrder(): Promise<CreateOrderResult> {
  const cart = getCart()

  if (cart.length === 0) {
    return {
      success: false,
      error: 'empty_cart',
      message: 'Tu carrito está vacío.',
    }
  }

  try {
    const ticket = getTicket()

    if (!ticket) {
      return {
        success: false,
        message: 'No tienes una boleta vinculada.',
      }
    }

    const payload = {
      items: cart.map((item) => ({
        productoId: item.product.id,
        cantidad: item.quantity,
      })),
      zona: ticket.zona,
      fila: ticket.fila,
      asiento: ticket.asiento,
    }

    const response = await fetch('http://localhost:3001/orders', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()

      return {
        success: false,
        message: errorText || 'Error al crear el pedido',
      }
    }

    const data = await response.json()

    
    localStorage.setItem(
      ORDER_STORAGE_KEY,
      JSON.stringify({
        numeroPedido: data.numeroPedido,
        estado: data.estado,
        createdAt: new Date().toISOString(),
      })
    )

    clearCart()

    return {
      success: true,
    }
  } catch (error) {
    console.error(error)

    return {
      success: false,
      message: 'Error de conexión con el servidor',
    }
  }
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

export function getLastKnownOrder(): Order | null {
  const raw = localStorage.getItem(ORDER_STORAGE_KEY)

  if (!raw) {
    return null
  }

  return JSON.parse(raw) as Order
}