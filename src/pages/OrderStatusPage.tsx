import { useEffect, useState } from 'react'
import type { Order } from '../types/models'
import { getOrder } from '../services/orderService'

function OrderStatusPage() {
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    const storedOrder = getOrder()
    setOrder(storedOrder)
  }, [])

  if (!order) {
    return <p>No hay pedido activo.</p>
  }

  return (
    <div>
      <h1>Estado del pedido</h1>
      <p>ID: {order.id}</p>
      <p>Estado: {order.status}</p>
      <p>Total: ${order.total}</p>
    </div>
  )
}

export default OrderStatusPage