import { useEffect, useState } from 'react'
import type { Order } from '../types/models'
import { getOrder } from '../services/orderService'

function getStatusLabel(status: Order['status']): string {
  switch (status) {
    case 'created':
      return 'Pedido recibido'
    case 'confirmed':
      return 'Pago confirmado, tu pedido está en preparación'
    case 'ready':
      return 'Tu pedido está listo y va en camino'
    case 'delivered':
      return 'Pedido entregado'
    default:
      return 'Estado desconocido'
  }
}

function OrderStatusPage() {
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    const refreshOrder = () => {
      const storedOrder = getOrder()
      setOrder(storedOrder)
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

  return (
    <div>
      <h1>Estado del pedido</h1>
      <p>ID: {order.id}</p>
      <p>Estado: {getStatusLabel(order.status)}</p>
      <p>Total: ${order.total}</p>
    </div>
  )
}

export default OrderStatusPage