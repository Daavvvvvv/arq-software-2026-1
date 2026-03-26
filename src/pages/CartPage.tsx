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
import './CartPage.css'

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

  const getProductIcon = (productName: string) => {
    const normalizedName = productName.toLowerCase()

    if (normalizedName.includes('hamburguesa')) return '🍔'
    if (normalizedName.includes('pizza')) return '🍕'
    if (normalizedName.includes('cerveza')) return '🥤'
    if (normalizedName.includes('nacho')) return '🌮'
    if (normalizedName.includes('papa')) return '🍟'
    if (normalizedName.includes('hot dog')) return '🌭'

    return '🍽️'
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

  const subtotal = cartState.total
  const seatDeliveryFee = 0
  const serviceFee = cartState.items.length > 0 ? 1250 : 0
  const finalTotal = subtotal + seatDeliveryFee + serviceFee

  return (
    <div className="cart-page">
      <div className="cart-page__container">
        <header className="cart-page__header">
          <div className="cart-page__topbar">
            <button
              type="button"
              className="cart-page__back-button"
              onClick={() => navigate('/menu')}
              aria-label="Volver al menú"
            >
              ←
            </button>

            <div className="cart-page__heading">
              <p className="cart-page__eyebrow">PIKEA</p>
              <h1 className="cart-page__title">Tu pedido</h1>
            </div>
          </div>
        </header>

        <section className="cart-card">
          {checkoutError && (
            <div className="cart-alert cart-alert--error">{checkoutError}</div>
          )}

          {cartState.issues.length > 0 && (
            <div className="cart-alert cart-alert--warning">
              <p className="cart-alert__title">
                Hay productos en tu pedido que necesitan revisión
              </p>

              <div className="cart-alert__issues">
                {cartState.issues.map((issue) => (
                  <p
                    key={`${issue.productId}-${issue.type}`}
                    className="cart-alert__issue"
                  >
                    {issue.message}
                  </p>
                ))}
              </div>
            </div>
          )}

          {cartState.items.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty__icon">🛒</div>
              <h2 className="cart-empty__title">Tu carrito está vacío</h2>
              <p className="cart-empty__text">
                Agrega productos desde el menú para poder realizar tu pedido.
              </p>
              <button
                type="button"
                className="cart-empty__button"
                onClick={() => navigate('/menu')}
              >
                Ver menú
              </button>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cartState.items.map((item) => (
                  <article
                    key={item.product.id}
                    className={`cart-item ${
                      !item.isAvailable ? 'cart-item--unavailable' : ''
                    }`}
                  >
                    <div className="cart-item__left">
                      <div className="cart-item__image" aria-hidden="true">
                        {getProductIcon(item.product.name)}
                      </div>

                      <div className="cart-item__info">
                        <h2 className="cart-item__name">{item.product.name}</h2>
                        <p className="cart-item__unit-price">
                          ${item.currentPrice.toLocaleString('es-CO')} c/u
                        </p>

                        {!item.isAvailable && (
                          <p className="cart-item__issue cart-item__issue--unavailable">
                            Este producto ya no está disponible.
                          </p>
                        )}

                        {item.hasPriceChanged && (
                          <p className="cart-item__issue cart-item__issue--price">
                            El precio cambió de $
                            {item.product.price.toLocaleString('es-CO')} a $
                            {item.currentPrice.toLocaleString('es-CO')}.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="cart-item__right">
                      <div className="cart-item__quantity-controls">
                        <button
                          type="button"
                          className="cart-item__quantity-button cart-item__quantity-button--decrease"
                          onClick={() => handleDecrease(item.product.id)}
                          aria-label={`Disminuir cantidad de ${item.product.name}`}
                        >
                          −
                        </button>

                        <span className="cart-item__quantity">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          className="cart-item__quantity-button cart-item__quantity-button--increase"
                          onClick={() => handleIncrease(item.product.id)}
                          aria-label={`Aumentar cantidad de ${item.product.name}`}
                          disabled={!item.isAvailable}
                        >
                          +
                        </button>
                      </div>

                      <p className="cart-item__subtotal">
                        ${item.subtotal.toLocaleString('es-CO')}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="cart-summary">
                <div className="cart-summary__row">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString('es-CO')}</span>
                </div>

                <div className="cart-summary__row">
                  <span>Domicilio a asiento</span>
                  <span className="cart-summary__value--success">Gratis</span>
                </div>

                <div className="cart-summary__row">
                  <span>Servicio</span>
                  <span>${serviceFee.toLocaleString('es-CO')}</span>
                </div>

                <div className="cart-summary__divider" />

                <div className="cart-summary__row cart-summary__row--total">
                  <span>Total</span>
                  <span>${finalTotal.toLocaleString('es-CO')}</span>
                </div>
              </div>

              <button
                type="button"
                className="cart-checkout-button"
                onClick={handleCheckout}
                disabled={cartState.hasBlockingIssues}
              >
                {cartState.hasBlockingIssues
                  ? 'Corrige tu pedido para continuar'
                  : 'Pagar con MercadoPago →'}
              </button>

              {cartState.hasBlockingIssues && (
                <p className="cart-blocking-message">
                  Debes corregir los productos con cambios antes de continuar.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default CartPage