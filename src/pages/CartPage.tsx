import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CartItem } from '../types/models'
import {
  decreaseCartItemQuantity,
  getCart,
  getCartTotal,
  increaseCartItemQuantity,
} from '../services/cartService'
import { createOrder } from '../services/orderService'
import { getTicket, getUser } from '../services/sessionService'

function CartPage() {
  const navigate = useNavigate()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [total, setTotal] = useState(0)
  const [checkoutError, setCheckoutError] = useState('')

  const refreshCart = () => {
    const storedCart = getCart()
    const storedTotal = getCartTotal()

    setCartItems(storedCart)
    setTotal(storedTotal)
  }

  const handleCheckout = () => {
    setCheckoutError('')

    const result = createOrder()

    if (!result.success) {
      setCheckoutError(result.message ?? 'No se pudo crear el pedido.')
      refreshCart()
      return
    }

    navigate('/order-status')
  }

  const handleIncrease = (productId: string) => {
    increaseCartItemQuantity(productId)
    refreshCart()
  }

  const handleDecrease = (productId: string) => {
    decreaseCartItemQuantity(productId)
    refreshCart()
  }

  useEffect(() => {
    const storedUser = getUser()

    if (!storedUser) {
      navigate('/')
      return
    }

    const storedTicket = getTicket()

    if (!storedTicket) {
      navigate('/link-ticket')
      return
    }

    refreshCart()
  }, [navigate])

  return (
    <div>
      <h1>Carrito</h1>
      <button onClick={() => navigate('/menu')}>Seguir comprando</button>

      {checkoutError && <p>{checkoutError}</p>}

      {cartItems.length === 0 ? (
        <p>Tu carrito está vacío.</p>
      ) : (
        <div>
          {cartItems.map((item) => (
            <div key={item.product.id}>
              <p>{item.product.name}</p>
              <p>Precio: ${item.product.price}</p>
              <p>Cantidad: {item.quantity}</p>

              <button onClick={() => handleDecrease(item.product.id)}>-</button>
              <button onClick={() => handleIncrease(item.product.id)}>+</button>
            </div>
          ))}

          <h2>Total: ${total}</h2>
          <button onClick={handleCheckout}>Realizar pedido</button>
        </div>
      )}
    </div>
  )
}

export default CartPage