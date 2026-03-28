import type { Product, ProductCategory } from '../types/models'
import { getAuthHeaders } from './sessionService'
import { API_URL } from './api'

type BackendStore = {
  id?: string | number
  nombre?: string
  name?: string
  activa?: boolean
  active?: boolean
}

type BackendMenuItem = {
  id?: string | number
  nombre?: string
  name?: string
  descripcion?: string
  description?: string
  precio?: number | string
  price?: number | string
  disponible?: boolean
  available?: boolean
  imagen?: string
  imageUrl?: string
  categoria?: string
  category?: string
}

let cachedMenu: Product[] = []

function normalizeCategory(
  rawCategory: string | undefined,
  productName: string
): ProductCategory {
  const value = (rawCategory ?? '').toLowerCase()
  const normalizedName = productName.toLowerCase()

  if (
    value.includes('bebida') ||
    value.includes('drink') ||
    normalizedName.includes('cerveza') ||
    normalizedName.includes('gaseosa') ||
    normalizedName.includes('agua') ||
    normalizedName.includes('jugo') ||
    normalizedName.includes('refresco')
  ) {
    return 'drinks'
  }

  if (
    value.includes('combo') ||
    normalizedName.includes('combo')
  ) {
    return 'combos'
  }

  return 'food'
}

function normalizeProduct(item: BackendMenuItem): Product {
  const productName = item.nombre ?? item.name ?? 'Producto'

  return {
    id: String(item.id ?? ''),
    name: productName,
    description:
      item.descripcion ??
      item.description ??
      'Producto disponible para pedir desde tu asiento.',
    price: Number(item.precio ?? item.price ?? 0),
    imageUrl: item.imagen ?? item.imageUrl ?? '',
    available: Boolean(item.disponible ?? item.available ?? false),
    category: normalizeCategory(
      item.categoria ?? item.category,
      productName
    ),
  }
}

async function fetchStores(): Promise<BackendStore[]> {
  const response = await fetch(`${API_URL}/tiendas`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Could not fetch stores')
  }

  const data = await response.json()

  if (Array.isArray(data)) return data
  if (Array.isArray(data.tiendas)) return data.tiendas
  if (Array.isArray(data.data)) return data.data

  throw new Error('Unexpected stores response')
}

async function fetchStoreMenu(storeId: string): Promise<BackendMenuItem[]> {
  const response = await fetch(`${API_URL}/tiendas/${storeId}/menu`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Could not fetch store menu')
  }

  const data = await response.json()

  if (Array.isArray(data)) return data
  if (Array.isArray(data.menu)) return data.menu
  if (Array.isArray(data.productos)) return data.productos
  if (Array.isArray(data.data)) return data.data

  throw new Error('Unexpected menu response')
}

export const getMenu = async (): Promise<Product[]> => {
  const stores = await fetchStores()

  if (stores.length === 0) {
    cachedMenu = []
    return []
  }

  const activeStore =
    stores.find((store) => store.activa === true || store.active === true) ??
    stores[0]

  const storeId = String(activeStore.id ?? '')

  if (!storeId) {
    throw new Error('Store id not found')
  }

  const backendMenu = await fetchStoreMenu(storeId)
  const normalizedMenu = backendMenu.map(normalizeProduct)

  cachedMenu = normalizedMenu
  return normalizedMenu
}

export function getCurrentMenu(): Product[] {
  return cachedMenu
}

export function getProductById(productId: string): Product | undefined {
  return cachedMenu.find((product) => product.id === productId)
}