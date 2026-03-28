import type { Order, OrderStatus, OrderStatusHistoryItem } from '../types/models'
import { getAuthHeaders } from './sessionService'

type BackendOrderStatus =
  | 'CREATED'
  | 'CONFIRMED'
  | 'READY'
  | 'DELIVERED'
  | 'ENTREGADO'
  | 'PAYMENT_FAILED'
  | 'CANCELLED'
  | 'EN_PREPARACION'
  | 'EN_CAMINO'
  | 'EN_ENTREGA'
  | 'PENDIENTE'
  | string

type BackendOrderHistoryItem = {
  estado?: BackendOrderStatus
  status?: BackendOrderStatus
  changedAt?: string
  updatedAt?: string
  fecha?: string
  message?: string
  mensaje?: string
}

type BackendOrderItem = {
  productoId?: string
  nombre?: string
  cantidad?: number
  precioUnitario?: number | string
}

type BackendOrderResponse = {
  id?: string
  pedidoId?: string
  numeroPedido?: string
  estado?: BackendOrderStatus
  status?: BackendOrderStatus
  total?: number | string
  createdAt?: string
  updatedAt?: string
  fechaCreacion?: string
  fechaActualizacion?: string
  items?: BackendOrderItem[]
  historial?: BackendOrderHistoryItem[]
  history?: BackendOrderHistoryItem[]
}

const LAST_KNOWN_BACKEND_ORDER_KEY = 'app_order_backend_last_known'
const LAST_CREATED_ORDER_ID_KEY = 'app_last_order_id'
import { API_URL as API_BASE_URL } from './api'

function buildOrderStatusUrl(orderId: string) {
  return `${API_BASE_URL}/orders/${orderId}`
}

function normalizeStatus(status: BackendOrderStatus | undefined): OrderStatus {
  switch (status) {
    case 'CREATED':
    case 'PENDIENTE':
      return 'created'

    case 'CONFIRMED':
    case 'EN_PREPARACION':
      return 'confirmed'

    case 'READY':
    case 'EN_CAMINO':
    case 'EN_ENTREGA':
      return 'ready'

    case 'DELIVERED':
    case 'ENTREGADO':
      return 'delivered'

    case 'PAYMENT_FAILED':
      return 'payment_failed'

    case 'CANCELLED':
      return 'cancelled'

    default:
      return 'created'
  }
}

function normalizeHistoryItem(
  item: BackendOrderHistoryItem
): OrderStatusHistoryItem | null {
  const rawStatus = item.status ?? item.estado
  const changedAt = item.changedAt ?? item.updatedAt ?? item.fecha

  if (!rawStatus || !changedAt) {
    return null
  }

  return {
    status: normalizeStatus(rawStatus),
    changedAt,
    message: item.message ?? item.mensaje,
  }
}

function buildSyntheticHistory(
  status: OrderStatus,
  createdAt: string,
  updatedAt: string
): OrderStatusHistoryItem[] {
  const history: OrderStatusHistoryItem[] = [
    {
      status: 'created',
      changedAt: createdAt,
      message: 'Pedido recibido',
    },
  ]

  if (status === 'confirmed' || status === 'ready' || status === 'delivered') {
    history.push({
      status: 'confirmed',
      changedAt: updatedAt,
      message: 'Pago confirmado',
    })
  }

  if (status === 'ready' || status === 'delivered') {
    history.push({
      status: 'ready',
      changedAt: updatedAt,
      message: 'Repartidor asignado, pedido en camino',
    })
  }

  if (status === 'delivered') {
    history.push({
      status: 'delivered',
      changedAt: updatedAt,
      message: 'Pedido entregado',
    })
  }

  if (status === 'payment_failed') {
    history.push({
      status: 'payment_failed',
      changedAt: updatedAt,
      message: 'No se pudo procesar el pago',
    })
  }

  if (status === 'cancelled') {
    history.push({
      status: 'cancelled',
      changedAt: updatedAt,
      message: 'Pedido cancelado',
    })
  }

  return history
}

function normalizeBackendOrder(data: BackendOrderResponse): Order {
  const rawStatus = data.status ?? data.estado
  const normalizedStatus = normalizeStatus(rawStatus)

  const createdAt =
    data.createdAt ?? data.fechaCreacion ?? new Date().toISOString()

  const updatedAt = data.updatedAt ?? data.fechaActualizacion ?? createdAt

  const rawHistory = data.history ?? data.historial ?? []

  const normalizedHistory = rawHistory
    .map(normalizeHistoryItem)
    .filter((item): item is OrderStatusHistoryItem => item !== null)

  return {
    id: data.id ?? data.pedidoId ?? '',
    items: [],
    total: Number(data.total ?? 0),
    status: normalizedStatus,
    createdAt,
    updatedAt,
    paymentShouldFail: false,
    history:
      normalizedHistory.length > 0
        ? normalizedHistory
        : buildSyntheticHistory(normalizedStatus, createdAt, updatedAt),
  }
}

export function saveLastCreatedOrderId(orderId: string) {
  localStorage.setItem(LAST_CREATED_ORDER_ID_KEY, orderId)
}

export function getLastCreatedOrderId() {
  return localStorage.getItem(LAST_CREATED_ORDER_ID_KEY)
}

export function saveLastKnownBackendOrder(order: Order) {
  localStorage.setItem(LAST_KNOWN_BACKEND_ORDER_KEY, JSON.stringify(order))
}

export function getLastKnownBackendOrder(): Order | null {
  const raw = localStorage.getItem(LAST_KNOWN_BACKEND_ORDER_KEY)

  if (!raw) return null

  try {
    return JSON.parse(raw) as Order
  } catch {
    return null
  }
}

export async function getBackendOrderById(orderId: string): Promise<Order> {
  const response = await fetch(buildOrderStatusUrl(orderId), {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`No se pudo consultar el pedido (${response.status})`)
  }

  const data = (await response.json()) as BackendOrderResponse
  const normalizedOrder = normalizeBackendOrder(data)

  saveLastKnownBackendOrder(normalizedOrder)

  return normalizedOrder
}

export async function getMyOrders(): Promise<Order[]> {
  const response = await fetch(`${API_BASE_URL}/orders/mis-pedidos`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`No se pudieron obtener los pedidos (${response.status})`)
  }

  const data = await response.json()

  if (!Array.isArray(data)) {
    throw new Error('La respuesta de mis pedidos no tiene el formato esperado.')
  }

  return data.map(normalizeBackendOrder)
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export async function getLatestOrderIdWithRetry(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const orders = await getMyOrders()

    if (orders.length > 0 && orders[0].id) {
      saveLastCreatedOrderId(orders[0].id)
      return orders[0].id
    }

    await sleep(1000)
  }

  throw new Error('No se encontró el pedido recién creado.')
}