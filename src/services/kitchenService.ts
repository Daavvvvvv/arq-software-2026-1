import type { KitchenOrder } from '../types/kitchen'
import { getAuthHeaders } from './sessionService'

const KITCHEN_BASE_URL = 'http://localhost:3003/cocina'

function extractSeatData(order: Record<string, unknown>) {
  const ubicacion = order.ubicacion as
    | { zona?: string; fila?: string; asiento?: string }
    | undefined

  return {
    zona:
      ubicacion?.zona ??
      (order.zona as string | undefined) ??
      (order['ubicacionZona'] as string | undefined) ??
      null,
    fila:
      ubicacion?.fila ??
      (order.fila as string | undefined) ??
      (order['ubicacionFila'] as string | undefined) ??
      null,
    asiento:
      ubicacion?.asiento ??
      (order.asiento as string | undefined) ??
      (order['ubicacionAsiento'] as string | undefined) ??
      null,
  }
}

function mapKitchenOrder(raw: Record<string, unknown>): KitchenOrder {
  const seatData = extractSeatData(raw)

  return {
    id: String(raw.id),
    numeroPedido: String(raw.numeroPedido ?? raw.id),
    estado: String(raw.estado) as KitchenOrder['estado'],
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? raw.createdAt ?? new Date().toISOString()),
    zona: seatData.zona,
    fila: seatData.fila,
    asiento: seatData.asiento,
    items: Array.isArray(raw.items)
      ? raw.items.map((item) => {
          const typedItem = item as Record<string, unknown>
          const producto = (typedItem.producto ?? {}) as Record<string, unknown>

          return {
            id: String(typedItem.id ?? `${raw.id}-${producto.id ?? crypto.randomUUID()}`),
            cantidad: Number(typedItem.cantidad ?? 0),
            precioUnitario:
              typedItem.precioUnitario as string | number | undefined,
            producto: {
              id: String(producto.id ?? ''),
              nombre: String(producto.nombre ?? 'Producto sin nombre'),
              precio: producto.precio as string | number | undefined,
              descripcion: (producto.descripcion as string | null | undefined) ?? null,
              imagen: (producto.imagen as string | null | undefined) ?? null,
            },
          }
        })
      : [],
  }
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    let message = 'Ocurrió un error en cocina.'

    try {
      const data = await response.json()
      if (data?.message) {
        message = Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message
      }
    } catch {
      // dejamos el mensaje genérico
    }

    throw new Error(message)
  }
}

export async function getKitchenOrders(): Promise<KitchenOrder[]> {
  const response = await fetch(`${KITCHEN_BASE_URL}/pedidos`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  await handleResponse(response)

  const data = (await response.json()) as Record<string, unknown>[]

  return data.map(mapKitchenOrder)
}

export async function markKitchenOrderReady(orderId: string): Promise<void> {
  const response = await fetch(`${KITCHEN_BASE_URL}/pedidos/${orderId}/listo`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  })

  await handleResponse(response)
}

export async function cancelKitchenOrder(orderId: string): Promise<void> {
  const response = await fetch(
    `${KITCHEN_BASE_URL}/pedidos/${orderId}/cancelar`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
    }
  )

  await handleResponse(response)
}