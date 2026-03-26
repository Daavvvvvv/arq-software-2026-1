import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Product, Ticket } from '../types/models'
import { getMenu } from '../services/menuService'
import { getTicket } from '../services/sessionService'
import { addToCart } from '../services/cartService'

function MenuPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState<Ticket | null>(null)

  useEffect(() => {
    const fetchMenu = async () => {
      const data = await getMenu()
      setProducts(data)
      setLoading(false)
    }

    fetchMenu()
    setTicket(getTicket())
  }, [])

  if (loading) return <p>Cargando menú...</p>

  return (
    <div>
      <h1>Menú</h1>
      <button onClick={() => navigate('/cart')}>Ver carrito</button>

      {ticket && (
        <div>
          <p>{ticket.eventName}</p>
          <p>Asiento: {ticket.seat}</p>
        </div>
      )}

      {products.map((product) => (
        <div key={product.id}>
          <p>{product.name}</p>
          <p>${product.price}</p>
          <button onClick={() => addToCart(product)}>Agregar</button>
        </div>
      ))}
    </div>
  )
}

export default MenuPage