import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Order, OrderStatus, OrderStatusHistoryItem } from '../types/models'
import { getLastKnownOrder, getOrder } from '../services/orderService'
import { getTicket } from '../services/sessionService'
import './OrderStatusPage.css'

type VisualStepState = 'completed' | 'active' | 'pending'

function getStatusPresentation(status: OrderStatus) {
  switch (status) {
    case 'created':
      return {
        icon: '🧾',
        title: 'Recibimos tu pedido',
        subtitle: 'Estamos validando el pago para comenzar la preparación.',
        eta: 'Actualizando estado...',
      }
    case 'confirmed':
      return {
        icon: '⏳',
        title: 'Preparando tu pedido',
        subtitle: 'Tiempo estimado: 8-12 min',
        eta: 'En curso',
      }
    case 'ready':
      return {
        icon: '👟',
        title: 'Tu pedido va en camino',
        subtitle: 'Nuestro equipo ya salió hacia tu asiento.',
        eta: 'Entrega próxima',
      }
    case 'delivered':
      return {
        icon: '✅',
        title: 'Pedido entregado',
        subtitle: 'Tu pedido ya fue entregado en tu asiento.',
        eta: 'Completado',
      }
    case 'payment_failed':
      return {
        icon: '❌',
        title: 'No pudimos procesar el pago',
        subtitle: 'Tu pedido no entró en preparación.',
        eta: 'Pago fallido',
      }
    case 'cancelled':
      return {
        icon: '⚠️',
        title: 'Pedido cancelado',
        subtitle: 'Este pedido ya no se encuentra activo.',
        eta: 'Cancelado',
      }
    default:
      return {
        icon: 'ℹ️',
        title: 'Estado del pedido',
        subtitle: 'Estamos revisando la información.',
        eta: 'Actualizando...',
      }
  }
}

function getHistoryEntryForStatus(
  history: OrderStatusHistoryItem[],
  status: OrderStatus
) {
  return history.find((entry) => entry.status === status)
}

function formatHistoryTime(changedAt: string) {
  return new Date(changedAt).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getCurrentVisualStep(status: OrderStatus): number {
  switch (status) {
    case 'created':
      return 0
    case 'confirmed':
      return 1
    case 'ready':
      return 2
    case 'delivered':
      return 3
    default:
      return -1
  }
}

function getVisualStepState(
  stepIndex: number,
  currentVisualStep: number
): VisualStepState {
  if (currentVisualStep === -1) return 'pending'
  if (stepIndex < currentVisualStep) return 'completed'
  if (stepIndex === currentVisualStep) return 'active'
  return 'pending'
}

function getConnectorState(
  stepIndex: number,
  currentVisualStep: number
): VisualStepState {
  if (currentVisualStep === -1) return 'pending'
  if (stepIndex < currentVisualStep) return 'completed'
  if (stepIndex === currentVisualStep) return 'active'
  return 'pending'
}

function getStepMeta(
  stepState: VisualStepState,
  entry: OrderStatusHistoryItem | undefined,
  fallbackText: string
) {
  if (stepState !== 'completed' || !entry) {
    return fallbackText
  }

  const time = formatHistoryTime(entry.changedAt)
  const message = entry.message?.trim()

  return message ? `${time} · ${message}` : time
}

function OrderStatusPage() {
  const [order, setOrder] = useState<Order | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()
  const ticket = getTicket()

  useEffect(() => {
    const refreshOrder = () => {
      try {
        const storedOrder = getOrder()

        if (!storedOrder) {
          setOrder(null)
          setErrorMessage('')
          return
        }

        setOrder(storedOrder)
        setErrorMessage('')
      } catch {
        const fallbackOrder = getLastKnownOrder()

        if (fallbackOrder) {
          setOrder(fallbackOrder)
          setErrorMessage(
            'No se pudo actualizar el estado en este momento. Mostrando el último estado conocido.'
          )
          return
        }

        setOrder(null)
        setErrorMessage('No se pudo consultar el pedido.')
      }
    }

    refreshOrder()

    const intervalId = window.setInterval(() => {
      refreshOrder()
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  const presentation = useMemo(() => {
    return order ? getStatusPresentation(order.status) : null
  }, [order])

  if (!order || !presentation) {
    return (
      <div className="order-status-page">
        <div className="order-status-page__container">
          <div className="order-status-card order-status-card--empty">
            <h1 className="order-status-empty__title">No hay pedido activo</h1>
            <p className="order-status-empty__text">
              Cuando realices un pedido podrás seguirlo desde esta pantalla.
            </p>
            <button
              type="button"
              className="order-status-empty__button"
              onClick={() => navigate('/menu')}
            >
              Ir al menú
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isFinalErrorState =
    order.status === 'payment_failed' || order.status === 'cancelled'

  const confirmedEntry = getHistoryEntryForStatus(order.history, 'confirmed')
  const readyEntry = getHistoryEntryForStatus(order.history, 'ready')
  const deliveredEntry = getHistoryEntryForStatus(order.history, 'delivered')
  const currentVisualStep = getCurrentVisualStep(order.status)

  return (
    <div className="order-status-page">
      <div className="order-status-page__container">
        <header className="order-status-header">
          <div className="order-status-header__top">
            <span className="order-status-header__meta">
              {ticket?.seat ?? 'Tu asiento'}
            </span>
          </div>
        </header>

        <section className="order-status-card">
          {errorMessage && (
            <div className="order-status-alert">{errorMessage}</div>
          )}

          <div className="order-status-hero">
            <div
              className={`order-status-hero__icon ${
                isFinalErrorState
                  ? 'order-status-hero__icon--error'
                  : order.status === 'delivered'
                    ? 'order-status-hero__icon--success'
                    : 'order-status-hero__icon--active'
              }`}
            >
              {presentation.icon}
            </div>

            <h1 className="order-status-hero__title">{presentation.title}</h1>
            <p className="order-status-hero__subtitle">{presentation.subtitle}</p>
          </div>

          {!isFinalErrorState && (
            <div className="order-status-timeline">
              {[
                {
                  key: 'received',
                  title: 'Pedido confirmado',
                  icon: '✓',
                  entry: confirmedEntry,
                  fallback: 'Pendiente',
                },
                {
                  key: 'preparing',
                  title: 'En preparación',
                  icon: '🍳',
                  entry: readyEntry,
                  fallback:
                    order.status === 'confirmed'
                      ? 'Cocina Sector C'
                      : 'Pendiente',
                },
                {
                  key: 'delivery',
                  title: 'En camino a tu asiento',
                  icon: '🛵',
                  entry: deliveredEntry,
                  fallback: 'Pendiente',
                },
                {
                  key: 'delivered',
                  title: 'Entregado',
                  icon: '☑',
                  entry: deliveredEntry,
                  fallback: 'Pendiente',
                },
              ].map((step, index, array) => {
                const stepState = getVisualStepState(index, currentVisualStep)
                const connectorState = getConnectorState(index, currentVisualStep)

                return (
                  <div
                    key={step.key}
                    className={`order-status-step ${
                      index === array.length - 1 ? 'order-status-step--last' : ''
                    }`}
                  >
                    <div className="order-status-step__rail">
                      <div
                        className={`order-status-step__icon order-status-step__icon--${stepState}`}
                      >
                        {stepState === 'completed' ? '✓' : step.icon}
                      </div>

                      {index !== array.length - 1 && (
                        <div
                          className={`order-status-step__line order-status-step__line--${connectorState}`}
                        />
                      )}
                    </div>

                    <div className="order-status-step__content">
                      <p
                        className={`order-status-step__title ${
                          stepState === 'active'
                            ? 'order-status-step__title--active'
                            : stepState === 'completed'
                              ? 'order-status-step__title--completed'
                              : ''
                        }`}
                      >
                        {step.title}
                      </p>

                      <p className="order-status-step__meta">
                        {getStepMeta(stepState, step.entry, step.fallback)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {order.status === 'payment_failed' && (
            <div className="order-status-error-box">
              <p className="order-status-error-box__text">
                Hubo un problema con el pago. Puedes volver al menú e intentar
                de nuevo.
              </p>
            </div>
          )}

          {order.status === 'cancelled' && (
            <div className="order-status-error-box">
              <p className="order-status-error-box__text">
                Este pedido fue cancelado y ya no seguirá avanzando.
              </p>
            </div>
          )}

          <button
            type="button"
            className="order-status-back-button"
            onClick={() => navigate('/menu')}
          >
            ← Seguir explorando menú
          </button>
        </section>
      </div>
    </div>
  )
}

export default OrderStatusPage