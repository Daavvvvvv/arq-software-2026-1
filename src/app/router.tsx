import { createBrowserRouter } from 'react-router-dom'
import RegisterPage from '../pages/RegisterPage';
import LoginPage from '../pages/LoginPage'
import LinkTicketPage from '../pages/LinkTicketPage'
import MenuPage from '../pages/MenuPage'
import CartPage from '../pages/CartPage'
import OrderStatusPage from '../pages/OrderStatusPage'
import KitchenPage from '../pages/KitchenPage'
import EventsPage from '../pages/EventsPage'
import MetricsPage from '../pages/MetricsPage'
import AdminPage from '../pages/AdminPage'

export const router = createBrowserRouter([
  {
    path: '/register',
    element: <RegisterPage />,
  },
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
  {
    path: '/kitchen',
    element: <KitchenPage />,
  },
  {
    path: '/events',
    element: <EventsPage />,
  },
  {
    path: '/metrics',
    element: <MetricsPage />,
  },
  {
    path: '/admin',
    element: <AdminPage />,
  },
])