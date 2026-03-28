import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Product, ProductCategory, Ticket } from '../types/models'
import { getMenu } from '../services/menuService'
import { getTicket, getUser } from '../services/sessionService'
import {
  addToCart,
  decreaseCartItemQuantity,
  getCart,
  getCartTotal,
} from '../services/cartService'
import { getLastCreatedOrderId } from '../services/orderTrackingService'
import './MenuPage.css'

const categoryOptions: Array<{
  value: ProductCategory
  label: string
  icon: string
}> = [
  { value: 'food', label: 'Comida', icon: '🍔' },
  { value: 'drinks', label: 'Bebidas', icon: '🥤' },
  { value: 'combos', label: 'Combos', icon: '🍟' },
]

function MenuPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [, setFeedbackType] = useState<'success' | 'error'>(
    'success'
  )
  const [cartItemsCount, setCartItemsCount] = useState(0)
  const [cartTotal, setCartTotal] = useState(0)
  const [selectedCategory, setSelectedCategory] =
    useState<ProductCategory | null>(null)
  const [productQuantities, setProductQuantities] = useState<
    Record<string, number>
  >({})
  const [hasActiveOrder, setHasActiveOrder] = useState(false)

  const refreshCartSummary = () => {
    const currentCart = getCart()
    const totalItems = currentCart.reduce((sum, item) => sum + item.quantity, 0)

    const quantities: Record<string, number> = {}

    currentCart.forEach((item) => {
      quantities[item.product.id] = item.quantity
    })

    setProductQuantities(quantities)
    setCartItemsCount(totalItems)
    setCartTotal(getCartTotal())
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

    setTicket(storedTicket)
    refreshCartSummary()
    setHasActiveOrder(!!getLastCreatedOrderId())

    const fetchMenu = async () => {
      try {
        const data = await getMenu()
        setProducts(data)
      } finally {
        setLoading(false)
      }
    }

    fetchMenu()
  }, [navigate])

  useEffect(() => {
    if (!feedbackMessage) return

    const timeoutId = window.setTimeout(() => {
      setFeedbackMessage('')
    }, 2000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [feedbackMessage])

  const handleAddToCart = (product: Product) => {
    if (!product.available) {
      setFeedbackType('error')
      setFeedbackMessage(`${product.name} no está disponible en este momento`)
      return
    }

    addToCart(product)
    refreshCartSummary()
    setFeedbackType('success')
    setFeedbackMessage(`${product.name} agregado al carrito`)
  }

  const handleRemoveFromCart = (product: Product) => {
    decreaseCartItemQuantity(product.id)
    refreshCartSummary()
    setFeedbackType('success')
    setFeedbackMessage(`${product.name} eliminado del pedido`)
  }

  const handleCategoryClick = (category: ProductCategory) => {
    setSelectedCategory((currentCategory) =>
      currentCategory === category ? null : category
    )
  }

  const getProductIcon = (product: Product) => {
    const normalizedName = product.name.toLowerCase()

    if (normalizedName.includes('hamburguesa')) return '🍔'
    if (normalizedName.includes('pizza')) return '🍕'
    if (normalizedName.includes('cerveza')) return '🥤'
    if (normalizedName.includes('nacho')) return '🌮'
    if (normalizedName.includes('papa')) return '🍟'
    if (normalizedName.includes('hot dog')) return '🌭'

    return '🍽️'
  }

  const visibleProducts = useMemo(() => {
    return [...products]
      .filter((product) =>
        selectedCategory ? product.category === selectedCategory : true
      )
      .sort((a, b) => Number(b.available) - Number(a.available))
  }, [products, selectedCategory])

  if (loading) {
    return (
      <div className="menu-page">
        <div className="menu-page__container">
          <div className="card menu-loading">
            <h1 className="menu-loading__title">Cargando menú</h1>
            <p className="menu-loading__text">
              Estamos trayendo los productos disponibles para este evento.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="menu-page">
      <div className="menu-page__container">
        <header className="menu-page__header">
          <div className="menu-page__topbar">
            <div>
              <p className="menu-page__eyebrow">PIKEA</p>
              <h1 className="menu-page__title">Pide sin salir de tu asiento</h1>
            </div>
          </div>

          {ticket && (
            <section className="card menu-hero">
              <div className="menu-hero__top">
                <span className="menu-hero__live-badge">En vivo ahora</span>
                <span className="menu-hero__seat-chip">
                   Zona {ticket.zona} • Fila {ticket.fila} • Asiento {ticket.asiento}
                </span>
              </div>

              <h2 className="menu-hero__title">{ticket.eventName}</h2>
              <p className="menu-hero__meta">Pedido disponible desde tu asiento</p>

              <div className="menu-hero__divider" />

              <div className="menu-categories" aria-label="Categorías del menú">
                {categoryOptions.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    className={`menu-category-chip ${
                      selectedCategory === category.value
                        ? 'menu-category-chip--active'
                        : ''
                    }`}
                    onClick={() => handleCategoryClick(category.value)}
                  >
                    {category.icon} {category.label}
                  </button>
                ))}
              </div>
            </section>
          )}
        </header>

        {visibleProducts.length === 0 ? (
          <div className="card menu-empty">
            <h2 className="menu-empty__title">
              No hay productos en esta categoría
            </h2>
            <p className="menu-empty__text">
              Prueba cambiando de categoría para ver otras opciones.
            </p>
          </div>
        ) : (
          <section className="menu-products">
            {visibleProducts.map((product) => {
              const quantityInCart = productQuantities[product.id] ?? 0

              return (
                <article
                  key={product.id}
                  className={`card menu-product-card ${
                    !product.available ? 'menu-product-card--unavailable' : ''
                  }`}
                >
                  <div className="menu-product-card__top">
                    <div className="menu-product-card__image" aria-hidden="true">
                      {getProductIcon(product)}
                    </div>

                    {product.available ? (
                      <div className="menu-product-card__actions">
                        {quantityInCart > 0 ? (
                          <>
                            <button
                              type="button"
                              className="menu-product-card__action menu-product-card__action--remove"
                              onClick={() => handleRemoveFromCart(product)}
                              aria-label={`Quitar ${product.name} del carrito`}
                            >
                              −
                            </button>

                            <span className="menu-product-card__count" aria-live="polite">
                              {quantityInCart}
                            </span>

                            <button
                              type="button"
                              className="menu-product-card__action menu-product-card__action--add"
                              onClick={() => handleAddToCart(product)}
                              aria-label={`Agregar ${product.name} al carrito`}
                            >
                              +
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="menu-product-card__action menu-product-card__action--add"
                            onClick={() => handleAddToCart(product)}
                            aria-label={`Agregar ${product.name} al carrito`}
                          >
                            +
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="menu-product-card__unavailable-badge">
                        No disponible
                      </div>
                    )}
                  </div>

                  <h2 className="menu-product-card__name">{product.name}</h2>

                  <p className="menu-product-card__description">
                    {product.description ||
                      'Producto disponible para pedir desde tu asiento.'}
                  </p>

                  <p className="menu-product-card__price">
                    ${product.price.toLocaleString('es-CO')}
                  </p>

                  <div className="menu-product-card__footer">
                    <p
                      className={`menu-product-card__availability ${
                        product.available
                          ? 'menu-product-card__availability--available'
                          : 'menu-product-card__availability--unavailable'
                      }`}
                    >
                      {product.available ? 'Disponible' : 'Agotado'}
                    </p>

                  </div>
                </article>
              )
            })}
          </section>
        )}

        {hasActiveOrder && (
          <button
            className="menu-order-status-btn"
            onClick={() => navigate('/order-status')}
          >
            📦 Ver estado de mi pedido
          </button>
        )}

        {cartItemsCount > 0 && (
          <div className="menu-cart-bar">
            <div className="menu-cart-bar__content">
              <div className="menu-cart-bar__count">{cartItemsCount}</div>

              <button
                className="menu-cart-bar__button"
                onClick={() => navigate('/cart')}
              >
                Ver pedido
              </button>

              <div className="menu-cart-bar__total">
                ${cartTotal.toLocaleString('es-CO')}
              </div>
            </div>
          </div>
        )}

        
      </div>
    </div>
  )
}

export default MenuPage