import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Product, Ticket } from '../types/models'
import { getMenu } from '../services/menuService'
import { getTicket, getUser } from '../services/sessionService'
import { addToCart } from '../services/cartService'

function MenuPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState('')

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

    const fetchMenu = async () => {
      const data = await getMenu()
      setProducts(data)
      setLoading(false)
    }

    fetchMenu()
  }, [navigate])

  const handleAddToCart = (product: Product) => {
    if (!product.available) {
      setFeedbackMessage(`${product.name} no está disponible en este momento`)

      setTimeout(() => {
        setFeedbackMessage('')
      }, 2000)

      return
    }

    addToCart(product)
    setFeedbackMessage(`${product.name} agregado al carrito`)

    setTimeout(() => {
      setFeedbackMessage('')
    }, 2000)
  }

  if (loading) return <p>Cargando menú...</p>

  return (
    <div>
      <h1>Menú</h1>
      <button onClick={() => navigate('/cart')}>Ver carrito</button>
      {feedbackMessage && <p>{feedbackMessage}</p>}

      {ticket && (
        <div>
          <p>{ticket.eventName}</p>
          <p>Asiento: {ticket.seat}</p>
        </div>
      )}

      {products.map((product) => (
        <div key={product.id}>
          <p>{product.name}</p>
          {product.description && <p>{product.description}</p>}
          <p>${product.price}</p>
          <p>{product.available ? 'Disponible' : 'Agotado'}</p>

          <button
            onClick={() => handleAddToCart(product)}
            disabled={!product.available}
          >
            {product.available ? 'Agregar' : 'No disponible'}
          </button>
        </div>
      ))}
    </div>
  )
}

export default MenuPage