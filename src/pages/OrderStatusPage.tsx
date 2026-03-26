import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Order, OrderStatus } from '../types/models'
import { getLastKnownOrder, getOrder } from '../services/orderService'

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'created':
      return 'Pedido recibido'
    case 'confirmed':
      return 'Pago confirmado, tu pedido está en preparación'
    case 'ready':
      return 'Tu pedido está listo y va en camino'
    case 'delivered':
      return 'Pedido entregado'
    case 'payment_failed':
      return 'El pago falló'
    case 'cancelled':
      return 'Pedido cancelado'
    default:
      return 'Estado desconocido'
  }
}

const statusSteps: OrderStatus[] = [
  'created',
  'confirmed',
  'ready',
  'delivered',
]

function getStatusIndex(status: OrderStatus): number {
  return statusSteps.indexOf(status)
}

function OrderStatusPage() {
  const [order, setOrder] = useState<Order | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()

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
      setErrorMessage('No se pudo actualizar el estado en este momento. Mostrando el último estado conocido.')
      return
    }

    setOrder(null)
    setErrorMessage('No se pudo consultar el pedido.')
  }
}

    refreshOrder()

    const intervalId = setInterval(() => {
      refreshOrder()
    }, 1000)

    return () => clearInterval(intervalId)
  }, [])

  if (!order) {
    return <p>No hay pedido activo.</p>
  }

  const isFinalErrorState =
    order.status === 'payment_failed' || order.status === 'cancelled'

  const currentIndex = getStatusIndex(order.status)

  return (
    <div>
      <h1>Estado del pedido</h1>
      <p>ID: {order.id}</p>
      <p>Total: ${order.total}</p>
      <p>Estado actual: {getStatusLabel(order.status)}</p>
      {errorMessage && <p>{errorMessage}</p>} 

      <div>
        {statusSteps.map((step, index) => {
          let symbol = '[ ]'

          if (!isFinalErrorState) {
            if (index < currentIndex) {
              symbol = '[✔]'
            } else if (index === currentIndex) {
              symbol = '[●]'
            }
          }

          return (
            <p key={step}>
              {symbol} {getStatusLabel(step)}
            </p>
          )
        })}
      </div>

      {order.status === 'payment_failed' && (
        <div>
          <p>Hubo un problema con el pago. Intenta nuevamente.</p>
          <button onClick={() => navigate('/menu')}>
            Volver al menú
          </button>
        </div>
      )}

      <div>
        <h2>Historial</h2>
        {order.history.map((entry) => (
          <p key={`${entry.status}-${entry.changedAt}`}>
            {getStatusLabel(entry.status)} —{' '}
            {new Date(entry.changedAt).toLocaleString()}
          </p>
        ))}
      </div>
    </div>
  )
}

export default OrderStatusPage