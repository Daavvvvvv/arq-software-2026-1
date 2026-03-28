import type { KitchenOrder } from '../../types/kitchen'

type KitchenOrderCardProps = {
  order: KitchenOrder
  actionLoading: 'ready' | 'cancel' | null
  onMarkReady: (orderId: string) => Promise<void>
  onCancel: (orderId: string) => Promise<void>
}

function formatElapsedTime(createdAt: string): string {
  const created = new Date(createdAt).getTime()
  const now = Date.now()
  const diffInMinutes = Math.max(0, Math.floor((now - created) / 60000))

  const minutes = diffInMinutes % 60
  const hours = Math.floor(diffInMinutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes} min`
}

function getElapsedClassName(createdAt: string): string {
  const created = new Date(createdAt).getTime()
  const now = Date.now()
  const diffInMinutes = Math.max(0, Math.floor((now - created) / 60000))

  if (diffInMinutes >= 8) return 'kitchen-order-card__time--critical'
  if (diffInMinutes >= 5) return 'kitchen-order-card__time--warning'
  return 'kitchen-order-card__time--normal'
}

function buildSeatLabel(order: KitchenOrder): string {
  const parts = [
    order.zona ? `Zona ${order.zona}` : null,
    order.fila ? `Fila ${order.fila}` : null,
    order.asiento ? `Asiento ${order.asiento}` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' • ') : 'Ubicación no disponible'
}

function KitchenOrderCard({
  order,
  actionLoading,
  onMarkReady,
  onCancel,
}: KitchenOrderCardProps) {
  const seatLabel = buildSeatLabel(order)
  const elapsedTime = formatElapsedTime(order.createdAt)
  const elapsedClassName = getElapsedClassName(order.createdAt)
  const isReadyLoading = actionLoading === 'ready'
  const isCancelLoading = actionLoading === 'cancel'
  const isAnyActionLoading = actionLoading !== null

  return (
    <article className="kitchen-order-card">
      <div className="kitchen-order-card__header">
        <div>
          <p className="kitchen-order-card__number">#{order.numeroPedido}</p>
          <p className="kitchen-order-card__seat">{seatLabel}</p>
        </div>

        <div className="kitchen-order-card__meta">
          <span
            className={`kitchen-order-card__time ${elapsedClassName}`}
          >
            ⏱ {elapsedTime}
          </span>

          <span className="kitchen-order-card__badge">En preparación</span>
        </div>
      </div>

      <div className="kitchen-order-card__divider" />

      <div className="kitchen-order-card__items">
        {order.items.map((item) => (
          <div key={item.id} className="kitchen-order-card__item">
            <span className="kitchen-order-card__quantity">x{item.cantidad}</span>
            <span className="kitchen-order-card__item-name">
              {item.producto.nombre}
            </span>
          </div>
        ))}
      </div>

      <div className="kitchen-order-card__actions">
        <button
          type="button"
          className="kitchen-order-card__button kitchen-order-card__button--ready"
          onClick={() => void onMarkReady(order.id)}
          disabled={isAnyActionLoading}
        >
          {isReadyLoading ? 'Marcando...' : 'Marcar listo'}
        </button>

        <button
          type="button"
          className="kitchen-order-card__button kitchen-order-card__button--cancel"
          onClick={() => void onCancel(order.id)}
          disabled={isAnyActionLoading}
        >
          {isCancelLoading ? 'Cancelando...' : 'Cancelar'}
        </button>
      </div>
    </article>
  )
}

export default KitchenOrderCard