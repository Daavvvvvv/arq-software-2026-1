import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../services/api'
import { getTicket } from '../services/sessionService'
import './OrderStatusPage.css'

type BackendOrder = {
  id: string
  numeroPedido: string
  estado: string
  total: number | string
  zona: string
  fila: string
  asiento: string
  createdAt: string
  updatedAt: string
  items?: Array<{
    cantidad: number
    precioUnitario: number | string
    producto?: { nombre: string }
  }>
}

type DisplayStatus = 'created' | 'confirmed' | 'ready' | 'delivered' | 'payment_failed' | 'cancelled'

function normalizeStatus(estado: string): DisplayStatus {
  const map: Record<string, DisplayStatus> = {
    PENDIENTE: 'created',
    VALIDADO: 'created',
    CREATED: 'created',
    PAGADO: 'confirmed',
    CONFIRMED: 'confirmed',
    EN_PREPARACION: 'confirmed',
    LISTO: 'ready',
    READY: 'ready',
    EN_ENTREGA: 'ready',
    EN_CAMINO: 'ready',
    ENTREGADO: 'delivered',
    DELIVERED: 'delivered',
    PAYMENT_FAILED: 'payment_failed',
    CANCELADO: 'cancelled',
    CANCELLED: 'cancelled',
  }
  return map[estado] ?? 'created'
}

function getStatusLabel(status: DisplayStatus): string {
  switch (status) {
    case 'created': return 'Recibido'
    case 'confirmed': return 'En preparacion'
    case 'ready': return 'En camino'
    case 'delivered': return 'Entregado'
    case 'payment_failed': return 'Pago fallido'
    case 'cancelled': return 'Cancelado'
  }
}

function getStatusIcon(status: DisplayStatus): string {
  switch (status) {
    case 'created': return '🧾'
    case 'confirmed': return '🍳'
    case 'ready': return '🛵'
    case 'delivered': return '✅'
    case 'payment_failed': return '❌'
    case 'cancelled': return '⚠️'
  }
}

function getStatusColor(status: DisplayStatus): string {
  switch (status) {
    case 'created': return '#eab308'
    case 'confirmed': return '#f97316'
    case 'ready': return '#3b82f6'
    case 'delivered': return '#22c55e'
    case 'payment_failed': return '#ef4444'
    case 'cancelled': return '#6b7280'
  }
}

function getCurrentStep(status: DisplayStatus): number {
  switch (status) {
    case 'created': return 0
    case 'confirmed': return 1
    case 'ready': return 2
    case 'delivered': return 3
    default: return -1
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STEPS = [
  { label: 'Recibido', icon: '🧾' },
  { label: 'Preparando', icon: '🍳' },
  { label: 'En camino', icon: '🛵' },
  { label: 'Entregado', icon: '✅' },
]

function OrderStatusPage() {
  const [orders, setOrders] = useState<BackendOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<BackendOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const ticket = getTicket()

  const fetchOrders = async () => {
    try {
      const data = await apiFetch<BackendOrder[]>('/orders/mis-pedidos')
      setOrders(data)
      if (!selectedOrder && data.length > 0) {
        setSelectedOrder(data[0])
      } else if (selectedOrder) {
        const updated = data.find((o) => o.id === selectedOrder.id)
        if (updated) setSelectedOrder(updated)
      }
      setError('')
    } catch {
      setError('No se pudieron cargar los pedidos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchOrders()
    const interval = window.setInterval(() => void fetchOrders(), 4000)
    return () => window.clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="order-status-page">
        <div className="order-status-page__container">
          <div className="order-status-card">
            <p style={{ textAlign: 'center', color: '#9ca3af' }}>Cargando pedidos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="order-status-page">
        <div className="order-status-page__container">
          <div className="order-status-card order-status-card--empty">
            <h1 className="order-status-empty__title">No hay pedidos</h1>
            <p className="order-status-empty__text">
              Cuando realices un pedido podras seguirlo desde esta pantalla.
            </p>
            <button
              type="button"
              className="order-status-empty__button"
              onClick={() => navigate('/menu')}
            >
              Ir al menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  const status = selectedOrder ? normalizeStatus(selectedOrder.estado) : 'created'
  const currentStep = selectedOrder ? getCurrentStep(status) : -1
  const isFinalError = status === 'payment_failed' || status === 'cancelled'

  return (
    <div className="order-status-page">
      <div className="order-status-page__container">
        <header className="order-status-header">
          <div className="order-status-header__top">
            <h1 className="order-status-header__title">Mis Pedidos</h1>
            {ticket && (
              <span className="order-status-header__meta">
                Zona {ticket.zona} - Fila {ticket.fila} - Asiento {ticket.asiento}
              </span>
            )}
          </div>
        </header>

        {error && <div className="order-status-alert">{error}</div>}

        <div className="order-list">
          {orders.map((order, index) => {
            const orderStatus = normalizeStatus(order.estado)
            const isSelected = selectedOrder?.id === order.id
            return (
              <button
                key={order.id}
                type="button"
                className={`order-list__item ${isSelected ? 'order-list__item--active' : ''}`}
                onClick={() => setSelectedOrder(order)}
              >
                <div className="order-list__number">Pedido {orders.length - index}</div>
                <div className="order-list__meta">
                  {order.numeroPedido} - {formatDate(order.createdAt)} {formatTime(order.createdAt)}
                </div>
                <div
                  className="order-list__badge"
                  style={{ backgroundColor: getStatusColor(orderStatus) + '22', color: getStatusColor(orderStatus) }}
                >
                  {getStatusIcon(orderStatus)} {getStatusLabel(orderStatus)}
                </div>
              </button>
            )
          })}
        </div>

        {selectedOrder && (
          <section className="order-status-card">
            <div className="order-status-hero">
              <div
                className={`order-status-hero__icon ${
                  isFinalError
                    ? 'order-status-hero__icon--error'
                    : status === 'delivered'
                      ? 'order-status-hero__icon--success'
                      : 'order-status-hero__icon--active'
                }`}
              >
                {getStatusIcon(status)}
              </div>
              <h2 className="order-status-hero__title">
                {selectedOrder.numeroPedido}
              </h2>
              <p className="order-status-hero__subtitle">
                {formatDate(selectedOrder.createdAt)} a las {formatTime(selectedOrder.createdAt)} -
                Total: ${Number(selectedOrder.total).toLocaleString('es-CO')}
              </p>
            </div>

            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div className="order-items-summary">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="order-items-summary__item">
                    <span>{item.cantidad}x {item.producto?.nombre ?? 'Producto'}</span>
                    <span>${Number(item.precioUnitario).toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>
            )}

            {!isFinalError && (
              <div className="order-status-timeline">
                {STEPS.map((step, index, array) => {
                  const stepState =
                    currentStep === -1 ? 'pending' :
                    index < currentStep ? 'completed' :
                    index === currentStep ? 'active' : 'pending'

                  return (
                    <div
                      key={step.label}
                      className={`order-status-step ${index === array.length - 1 ? 'order-status-step--last' : ''}`}
                    >
                      <div className="order-status-step__rail">
                        <div className={`order-status-step__icon order-status-step__icon--${stepState}`}>
                          {stepState === 'completed' ? '✓' : step.icon}
                        </div>
                        {index !== array.length - 1 && (
                          <div className={`order-status-step__line order-status-step__line--${stepState}`} />
                        )}
                      </div>
                      <div className="order-status-step__content">
                        <p className={`order-status-step__title ${
                          stepState === 'active' ? 'order-status-step__title--active' :
                          stepState === 'completed' ? 'order-status-step__title--completed' : ''
                        }`}>
                          {step.label}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {status === 'payment_failed' && (
              <div className="order-status-error-box">
                <p className="order-status-error-box__text">
                  Hubo un problema con el pago. Puedes volver al menu e intentar de nuevo.
                </p>
              </div>
            )}

            {status === 'cancelled' && (
              <div className="order-status-error-box">
                <p className="order-status-error-box__text">
                  Este pedido fue cancelado y ya no se encuentra activo.
                </p>
              </div>
            )}
          </section>
        )}

        <button
          type="button"
          className="order-status-back-button"
          onClick={() => navigate('/menu')}
        >
          ← Seguir explorando menu
        </button>
      </div>
    </div>
  )
}

export default OrderStatusPage
