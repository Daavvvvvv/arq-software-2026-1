import { createBrowserRouter } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import LinkTicketPage from '../pages/LinkTicketPage'
import MenuPage from '../pages/MenuPage'
import CartPage from '../pages/CartPage'
import OrderStatusPage from '../pages/OrderStatusPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />,
  },
  {
    path: '/link-ticket',
    element: <LinkTicketPage />,
  },
  {
    path: '/menu',
    element: <MenuPage />,
  },
  {
    path: '/cart',
    element: <CartPage />,
  },
  {
    path: '/order-status',
    element: <OrderStatusPage />,
  },
])