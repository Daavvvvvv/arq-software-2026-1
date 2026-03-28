import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import KitchenEmptyState from '../components/Kitchen/KitchenEmptyState'
import KitchenOrderCard from '../components/Kitchen/KitchenOrderCard'
import {
  cancelKitchenOrder,
  getKitchenOrders,
  markKitchenOrderReady,
} from '../services/kitchenService'
import { getToken, getUser } from '../services/sessionService'
import type { KitchenActionState, KitchenOrder } from '../types/kitchen'
import './KitchenPage.css'

function KitchenPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionLoadingByOrderId, setActionLoadingByOrderId] =
    useState<KitchenActionState>({})

  const loadKitchenOrders = async (showInitialLoading = false) => {
    if (showInitialLoading) {
      setLoading(true)
    }

    try {
      const kitchenOrders = await getKitchenOrders()
      setOrders(kitchenOrders)
      setErrorMessage('')
    } catch (error) {
      console.error(error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los pedidos de cocina.'
      )
    } finally {
      if (showInitialLoading) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const user = getUser()
    const token = getToken()

    if (!user || !token) {
      navigate('/')
      return
    }

    void loadKitchenOrders(true)

    const intervalId = window.setInterval(() => {
      void loadKitchenOrders(false)
    }, 4000)

    return () => window.clearInterval(intervalId)
  }, [navigate])

  const preparingOrders = useMemo(() => {
    return [...orders].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }, [orders])

  const activeCount = preparingOrders.length

  const handleMarkReady = async (orderId: string) => {
    setActionLoadingByOrderId((current) => ({
      ...current,
      [orderId]: 'ready',
    }))

    try {
      await markKitchenOrderReady(orderId)
      await loadKitchenOrders(false)
    } catch (error) {
      console.error(error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo marcar el pedido como listo.'
      )
    } finally {
      setActionLoadingByOrderId((current) => ({
        ...current,
        [orderId]: null,
      }))
    }
  }

  const handleCancel = async (orderId: string) => {
    setActionLoadingByOrderId((current) => ({
      ...current,
      [orderId]: 'cancel',
    }))

    try {
      await cancelKitchenOrder(orderId)
      await loadKitchenOrders(false)
    } catch (error) {
      console.error(error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo cancelar el pedido.'
      )
    } finally {
      setActionLoadingByOrderId((current) => ({
        ...current,
        [orderId]: null,
      }))
    }
  }

  if (loading) {
    return (
      <div className="kitchen-page">
        <div className="kitchen-page__container">
          <section className="kitchen-board">
            <div className="kitchen-loading">
              <h1 className="kitchen-loading__title">Cargando cocina</h1>
              <p className="kitchen-loading__text">
                Estamos trayendo los pedidos en preparación.
              </p>
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="kitchen-page">
      <div className="kitchen-page__container">
        <header className="kitchen-header">
          <div className="kitchen-header__top">
            <div>
              <p className="kitchen-header__eyebrow">Módulo interno</p>
              <h1 className="kitchen-header__title">Pantalla de cocina</h1>
              <p className="kitchen-header__subtitle">
                Gestiona los pedidos que ya entraron en preparación.
              </p>
            </div>

            <div className="kitchen-header__right">
              <span className="kitchen-header__status">● Turno activo</span>
              <span className="kitchen-header__sector">Cocina Sector C</span>
            </div>
          </div>

          <div className="kitchen-summary">
            <div className="kitchen-summary__pill">
              <span className="kitchen-summary__label">Activos</span>
              <span className="kitchen-summary__value">{activeCount}</span>
            </div>

            <button
              type="button"
              className="kitchen-summary__refresh"
              onClick={() => void loadKitchenOrders(false)}
            >
              Actualizar
            </button>
          </div>
        </header>

        <section className="kitchen-board">
          {errorMessage && (
            <div className="kitchen-alert kitchen-alert--error">
              {errorMessage}
            </div>
          )}

          <div className="kitchen-board__tabs">
            <button
              type="button"
              className="kitchen-board__tab kitchen-board__tab--active"
            >
              En preparación
              <span className="kitchen-board__tab-count">{activeCount}</span>
            </button>
          </div>

          <div className="kitchen-board__content">
            {preparingOrders.length === 0 ? (
              <KitchenEmptyState
                title="No hay pedidos en preparación"
                description="Cuando llegue un pago confirmado, el pedido aparecerá aquí automáticamente."
              />
            ) : (
              <div className="kitchen-orders">
                {preparingOrders.map((order) => (
                  <KitchenOrderCard
                    key={order.id}
                    order={order}
                    actionLoading={actionLoadingByOrderId[order.id] ?? null}
                    onMarkReady={handleMarkReady}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default KitchenPage