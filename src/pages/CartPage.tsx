import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CartItem } from '../types/models'
import { clearCart, getCart, getCartTotal } from '../services/cartService'
import { createOrder } from '../services/orderService'

function CartPage() {
  const navigate = useNavigate()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [total, setTotal] = useState(0)

  const handleCheckout = () => {
    createOrder()
    clearCart()
    navigate('/order-status')
  }

  useEffect(() => {
    const storedCart = getCart()
    const storedTotal = getCartTotal()

    setCartItems(storedCart)
    setTotal(storedTotal)
  }, [])

  return (
    <div>
      <h1>Carrito</h1>
      <button onClick={() => navigate('/menu')}>Seguir comprando</button>

      {cartItems.length === 0 ? (
        <p>Tu carrito está vacío.</p>
      ) : (
        <div>
          {cartItems.map((item) => (
            <div key={item.product.id}>
              <p>{item.product.name}</p>
              <p>Precio: ${item.product.price}</p>
              <p>Cantidad: {item.quantity}</p>
            </div>
          ))}

          <h2>Total: ${total}</h2>
          <button onClick={handleCheckout}>Realizar pedido</button>
        </div>
      )}
    </div>
  )
}

export default CartPage