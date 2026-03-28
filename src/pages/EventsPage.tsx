import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL, apiFetch } from '../services/api'
import type { Order } from '../types/models'
import './EventsPage.css'

interface EventTimelineEntry {
  orderId: string
  orderNumber: string
  items: string[]
  total: number
  status: string
  createdAt: string
  updatedAt: string
  eventType: string
  timestamp: string
}

function getEventTypeLabel(status: string): string {
  switch (status) {
    case 'created':
      return 'order.validated'
    case 'confirmed':
      return 'payment.confirmed'
    case 'ready':
      return 'order.ready'
    case 'delivered':
      return 'order.delivered'
    case 'cancelled':
      return 'order.cancelled'
    case 'payment_failed':
      return 'payment.failed'
    default:
      return 'event.unknown'
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'created':
      return '#f59e0b'
    case 'confirmed':
      return '#f59e0b'
    case 'ready':
      return '#22c55e'
    case 'delivered':
      return '#22c55e'
    case 'cancelled':
      return '#ef4444'
    case 'payment_failed':
      return '#ef4444'
    default:
      return '#6b7280'
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'created':
      return 'event-badge event-badge--pending'
    case 'confirmed':
      return 'event-badge event-badge--active'
    case 'ready':
      return 'event-badge event-badge--ready'
    case 'delivered':
      return 'event-badge event-badge--completed'
    case 'cancelled':
      return 'event-badge event-badge--cancelled'
    case 'payment_failed':
      return 'event-badge event-badge--failed'
    default:
      return 'event-badge'
  }
}

function formatItemsDisplay(items: any[]): string {
  if (!items || items.length === 0) return 'Sin items'
  return items
    .map((item) => `${item.product?.name || 'Item'} (${item.quantity})`)
    .join(', ')
}

function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return 'Hora desconocida'
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

function EventsPage() {
  const [events, setEvents] = useState<EventTimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await apiFetch<Order[]>('/orders/mis-pedidos')

        const timeline: EventTimelineEntry[] = []

        if (Array.isArray(response)) {
          response.forEach((order, idx) => {
            const orderNumber = `#${String(idx + 1).padStart(4, '0')}`

            timeline.push({
              orderId: order.id,
              orderNumber,
              items: order.items ? order.items.map((i) => i.product?.name || 'Item') : [],
              total: order.total,
              status: order.status,
              createdAt: order.createdAt,
              updatedAt: order.updatedAt,
              eventType: getEventTypeLabel(order.status),
              timestamp: order.createdAt,
            })
          })
        }

        setEvents(timeline)
        setError('')
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Error al cargar los eventos'
        )
      } finally {
        setLoading(false)
      }
    }

    void fetchOrders()

    const intervalId = window.setInterval(() => {
      void fetchOrders()
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [])

  if (loading && events.length === 0) {
    return (
      <div className="events-page">
        <div className="events-page__container">
          <header className="events-header">
            <h1 className="events-header__title">Timeline de Eventos EDA</h1>
            <p className="events-header__subtitle">
              Visualización en tiempo real del flujo de eventos
            </p>
          </header>

          <div className="events-loading">
            <div className="events-loading__spinner" />
            <p className="events-loading__text">Cargando eventos...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="events-page">
      <div className="events-page__container">
        <header className="events-header">
          <h1 className="events-header__title">Timeline de Eventos EDA</h1>
          <p className="events-header__subtitle">
            Visualización en tiempo real del flujo de eventos
          </p>
          <p className="events-header__info">
            Los eventos se actualizan automáticamente cada 5 segundos
          </p>
        </header>

        {error && <div className="events-error">{error}</div>}

        {events.length === 0 ? (
          <div className="events-empty">
            <p className="events-empty__text">
              No hay eventos registrados aún. Realiza un pedido para ver el flujo
              EDA en acción.
            </p>
            <button
              type="button"
              className="events-empty__button"
              onClick={() => navigate('/menu')}
            >
              Ir al menú
            </button>
          </div>
        ) : (
          <div className="events-timeline">
            {events.map((event, index) => (
              <div key={event.orderId} className="events-timeline__item">
                <div className="events-timeline__rail">
                  <div
                    className="events-timeline__dot"
                    style={{ backgroundColor: getStatusColor(event.status) }}
                  />
                  {index < events.length - 1 && (
                    <div className="events-timeline__line" />
                  )}
                </div>

                <div className="events-timeline__content">
                  <div className="events-card">
                    <div className="events-card__header">
                      <div className="events-card__title-group">
                        <h3 className="events-card__order-number">
                          {event.orderNumber}
                        </h3>
                        <span className={getStatusBadgeClass(event.status)}>
                          {event.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="events-card__event-type">
                        {event.eventType}
                      </div>
                    </div>

                    <div className="events-card__body">
                      <div className="events-card__section">
                        <label className="events-card__label">Items:</label>
                        <p className="events-card__value">
                          {formatItemsDisplay(event.items)}
                        </p>
                      </div>

                      <div className="events-card__section">
                        <label className="events-card__label">Total:</label>
                        <p className="events-card__value">
                          ${event.total.toLocaleString('es-CO')}
                        </p>
                      </div>

                      <div className="events-card__timeline-flow">
                        <div className="events-state-flow">
                          {['VALIDADO', 'PAGADO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO'].map(
                            (stateLabel, stateIdx) => {
                              const stateOrder = [
                                'created',
                                'confirmed',
                                'ready',
                                'ready',
                                'delivered',
                              ]
                              const isCompleted = stateOrder.indexOf(event.status) >= stateIdx
                              const isActive = stateOrder.indexOf(event.status) === stateIdx

                              return (
                                <div
                                  key={stateLabel}
                                  className={`events-state ${
                                    isCompleted
                                      ? 'events-state--completed'
                                      : isActive
                                        ? 'events-state--active'
                                        : 'events-state--pending'
                                  }`}
                                >
                                  <div className="events-state__dot" />
                                  <span className="events-state__label">
                                    {stateLabel}
                                  </span>
                                </div>
                              )
                            }
                          )}
                        </div>
                      </div>

                      <div className="events-card__footer">
                        <div className="events-card__timestamp">
                          <span className="events-card__timestamp-label">
                            Creado:
                          </span>
                          <time className="events-card__timestamp-value">
                            {formatDate(event.createdAt)}{' '}
                            {formatTime(event.createdAt)}
                          </time>
                        </div>
                        <div className="events-card__timestamp">
                          <span className="events-card__timestamp-label">
                            Actualizado:
                          </span>
                          <time className="events-card__timestamp-value">
                            {formatDate(event.updatedAt)}{' '}
                            {formatTime(event.updatedAt)}
                          </time>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <footer className="events-footer">
          <button
            type="button"
            className="events-footer__button"
            onClick={() => navigate('/menu')}
          >
            ← Volver al menú
          </button>
        </footer>
      </div>
    </div>
  )
}

export default EventsPage
