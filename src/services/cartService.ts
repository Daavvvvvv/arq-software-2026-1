import type { CartItem, Product } from '../types/models'

const CART_STORAGE_KEY = 'app_cart'

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