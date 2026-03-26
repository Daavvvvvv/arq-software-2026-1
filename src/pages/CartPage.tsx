import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  decreaseCartItemQuantity,
  increaseCartItemQuantity,
  validateCartAgainstMenu,
  type CartValidationResult,
} from '../services/cartService'
import { createOrder } from '../services/orderService'
import { getTicket, getUser } from '../services/sessionService'

function CartPage() {
  const navigate = useNavigate()
  const [cartState, setCartState] = useState<CartValidationResult>({
    items: [],
    issues: [],
    total: 0,
    hasBlockingIssues: false,
  })
  const [checkoutError, setCheckoutError] = useState('')

  const refreshCart = () => {
    const validationResult = validateCartAgainstMenu()
    setCartState(validationResult)
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

      {cartState.issues.length > 0 && (
        <div>
          <p>Hay productos en tu carrito que necesitan revisión:</p>
          {cartState.issues.map((issue) => (
            <p key={`${issue.productId}-${issue.type}`}>{issue.message}</p>
          ))}
        </div>
      )}

      {cartState.items.length === 0 ? (
        <p>Tu carrito está vacío.</p>
      ) : (
        <div>
          {cartState.items.map((item) => (
            <div key={item.product.id}>
              <p>{item.product.name}</p>
              <p>Precio actual: ${item.currentPrice}</p>
              <p>Cantidad: {item.quantity}</p>

              {!item.isAvailable && <p>Este producto ya no está disponible.</p>}

              {item.hasPriceChanged && (
                <p>
                  El precio cambió. Antes: ${item.product.price} · Ahora: $
                  {item.currentPrice}
                </p>
              )}

              <button onClick={() => handleDecrease(item.product.id)}>-</button>
              <button onClick={() => handleIncrease(item.product.id)}>+</button>
            </div>
          ))}

          <h2>Total actualizado: ${cartState.total}</h2>

          <button
            onClick={handleCheckout}
            disabled={cartState.hasBlockingIssues}
          >
            Realizar pedido
          </button>

          {cartState.hasBlockingIssues && (
            <p>Debes corregir los productos con cambios antes de continuar.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default CartPage