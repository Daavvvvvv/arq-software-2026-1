import type { CartItem, Product } from '../types/models'
import { getProductById } from './menuService'


const CART_STORAGE_KEY = 'app_cart'

export interface CartValidationIssue {
  productId: string
  type: 'unavailable' | 'price_changed'
  message: string
}

export interface CartValidationItem {
  product: Product
  quantity: number
  isAvailable: boolean
  hasPriceChanged: boolean
  currentPrice: number
  subtotal: number
}

export interface CartValidationResult {
  items: CartValidationItem[]
  issues: CartValidationIssue[]
  total: number
  hasBlockingIssues: boolean
}

export function getCart(): CartItem[] {
  const raw = localStorage.getItem(CART_STORAGE_KEY)
  return raw ? (JSON.parse(raw) as CartItem[]) : []
}

export function saveCart(cart: CartItem[]): void {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
}

export function addToCart(product: Product): void {
  const cart = getCart()

  const existingItem = cart.find((item) => item.product.id === product.id)

  if (existingItem) {
    existingItem.quantity += 1
  } else {
    cart.push({
      product,
      quantity: 1,
    })
  }

  saveCart(cart)
}

export function increaseCartItemQuantity(productId: string): void {
  const cart = getCart()

  const item = cart.find((cartItem) => cartItem.product.id === productId)

  if (!item) return

  item.quantity += 1
  saveCart(cart)
}

export function decreaseCartItemQuantity(productId: string): void {
  const cart = getCart()

  const item = cart.find((cartItem) => cartItem.product.id === productId)

  if (!item) return

  if (item.quantity === 1) {
    const updatedCart = cart.filter(
      (cartItem) => cartItem.product.id !== productId,
    )
    saveCart(updatedCart)
    return
  }

  item.quantity -= 1
  saveCart(cart)
}

export function clearCart(): void {
  localStorage.removeItem(CART_STORAGE_KEY)
}

export function getCartTotal(): number {
  const cart = getCart()

  return cart.reduce((total, item) => {
    return total + item.product.price * item.quantity
  }, 0)
}

export function validateCartAgainstMenu(): CartValidationResult {
  const cart = getCart()
  const items: CartValidationItem[] = []
  const issues: CartValidationIssue[] = []

  for (const item of cart) {
    const currentProduct = getProductById(item.product.id)

    const isAvailable = !!currentProduct?.available
    const currentPrice = currentProduct?.price ?? item.product.price
    const hasPriceChanged = !!currentProduct && currentProduct.price !== item.product.price

    if (!currentProduct || !currentProduct.available) {
      issues.push({
        productId: item.product.id,
        type: 'unavailable',
        message: `${item.product.name} ya no está disponible.`,
      })
    }

    if (hasPriceChanged) {
      issues.push({
        productId: item.product.id,
        type: 'price_changed',
        message: `El precio de ${item.product.name} cambió de $${item.product.price} a $${currentPrice}.`,
      })
    }

    items.push({
      product: currentProduct ?? item.product,
      quantity: item.quantity,
      isAvailable,
      hasPriceChanged,
      currentPrice,
      subtotal: currentPrice * item.quantity,
    })
  }

  return {
    items,
    issues,
    total: items.reduce((sum, item) => sum + item.subtotal, 0),
    hasBlockingIssues: issues.length > 0,
  }
}