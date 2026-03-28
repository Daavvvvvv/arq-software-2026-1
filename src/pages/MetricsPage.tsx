import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../services/api'
import './MetricsPage.css'

interface MetricsData {
  kr1_adopcion_pct: number
  kr2_tiempo_promedio_seg: number
  kr3_fallidos_pct: number
  pedidos_por_hora: Array<{
    hora: string
    total: number
  }>
  top_productos: Array<{
    nombre: string
    count: number
  }>
}

interface KRCardProps {
  title: string
  value: number
  unit: string
  target: number | string
  targetLabel: string
  isMet: boolean
}

function KRCard({ title, value, unit, target, targetLabel, isMet }: KRCardProps) {
  return (
    <div className={`metrics-kr-card ${isMet ? 'metrics-kr-card--met' : 'metrics-kr-card--not-met'}`}>
      <h3 className="metrics-kr-card__title">{title}</h3>
      <div className="metrics-kr-card__value">
        <span className="metrics-kr-card__number">{value.toFixed(1)}</span>
        <span className="metrics-kr-card__unit">{unit}</span>
      </div>
      <div className="metrics-kr-card__target">
        <span className="metrics-kr-card__target-label">{targetLabel}:</span>
        <span className="metrics-kr-card__target-value">{target}</span>
      </div>
      <div className={`metrics-kr-card__indicator ${isMet ? 'metrics-kr-card__indicator--met' : 'metrics-kr-card__indicator--not-met'}`} />
    </div>
  )
}

function MetricsPage() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchMetrics = async () => {
    try {
      setError(null)
      const token = localStorage.getItem('app_token')

      if (!token) {
        setError('No autorizado. Por favor inicia sesión.')
        navigate('/')
        return
      }

      const data = await apiFetch<MetricsData>('/admin/metricas')
      setMetrics(data)
      setLastUpdated(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar las métricas'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()

    const interval = setInterval(fetchMetrics, 10000)
    return () => clearInterval(interval)
  }, [navigate])

  if (loading) {
    return (
      <div className="metrics-page">
        <div className="metrics-page__container">
          <div className="card metrics-loading">
            <h1 className="metrics-loading__title">Cargando métricas</h1>
            <p className="metrics-loading__text">Estamos obteniendo los datos de rendimiento...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="metrics-page">
        <div className="metrics-page__container">
          <div className="card metrics-error">
            <h1 className="metrics-error__title">Error de acceso</h1>
            <p className="metrics-error__text">{error}</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/')}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return null
  }

  // Calculate if KRs are met
  const kr1Met = metrics.kr1_adopcion_pct >= 25
  const kr2Met = metrics.kr2_tiempo_promedio_seg < 600 // 10 min = 600 sec
  const kr3Met = metrics.kr3_fallidos_pct < 1

  // Find max orders count for bar chart scaling
  const maxOrders = Math.max(...metrics.pedidos_por_hora.map(p => p.total), 1)
  const maxProducts = Math.max(...metrics.top_productos.map(p => p.count), 1)

  return (
    <div className="metrics-page">
      <div className="metrics-page__container">
        <header className="metrics-page__header">
          <div>
            <p className="metrics-page__eyebrow">MÉTRICAS</p>
            <h1 className="metrics-page__title">KPIs del Evento</h1>
          </div>
          {lastUpdated && (
            <p className="metrics-page__updated">
              Actualizado: {lastUpdated.toLocaleTimeString('es-CO')}
            </p>
          )}
        </header>

        {/* KR Cards Section */}
        <section className="metrics-krs">
          <KRCard
            title="KR1: Adopción"
            value={metrics.kr1_adopcion_pct}
            unit="%"
            target="25%"
            targetLabel="Meta"
            isMet={kr1Met}
          />
          <KRCard
            title="KR2: Tiempo Promedio"
            value={metrics.kr2_tiempo_promedio_seg / 60}
            unit="min"
            target="<10 min"
            targetLabel="Meta"
            isMet={kr2Met}
          />
          <KRCard
            title="KR3: Pedidos Fallidos"
            value={metrics.kr3_fallidos_pct}
            unit="%"
            target="<1%"
            targetLabel="Meta"
            isMet={kr3Met}
          />
        </section>

        {/* Orders per Hour Section */}
        <section className="card metrics-section">
          <h2 className="metrics-section__title">Pedidos por Hora</h2>
          <div className="metrics-chart">
            {metrics.pedidos_por_hora.length === 0 ? (
              <p className="metrics-chart__empty">No hay datos de pedidos aún</p>
            ) : (
              <div className="metrics-bars">
                {metrics.pedidos_por_hora.map((item, idx) => {
                  const hora = new Date(item.hora).toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const barWidth = (item.total / maxOrders) * 100

                  return (
                    <div key={idx} className="metrics-bar-item">
                      <div className="metrics-bar-container">
                        <div
                          className="metrics-bar"
                          style={{ width: `${barWidth}%` }}
                        />
                        <span className="metrics-bar__label">{item.total}</span>
                      </div>
                      <span className="metrics-bar-item__time">{hora}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Top Products Section */}
        <section className="card metrics-section">
          <h2 className="metrics-section__title">Productos Más Vendidos</h2>
          <div className="metrics-products">
            {metrics.top_productos.length === 0 ? (
              <p className="metrics-products__empty">No hay datos de productos aún</p>
            ) : (
              <ol className="metrics-products-list">
                {metrics.top_productos.map((product, idx) => {
                  const barWidth = (product.count / maxProducts) * 100

                  return (
                    <li key={idx} className="metrics-product-item">
                      <div className="metrics-product-item__content">
                        <span className="metrics-product-item__rank">#{idx + 1}</span>
                        <span className="metrics-product-item__name">{product.nombre}</span>
                      </div>
                      <div className="metrics-product-item__bar-container">
                        <div
                          className="metrics-product-item__bar"
                          style={{ width: `${barWidth}%` }}
                        />
                        <span className="metrics-product-item__count">{product.count}</span>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </section>

        <button
          className="metrics-refresh-btn"
          onClick={fetchMetrics}
        >
          🔄 Actualizar ahora
        </button>
      </div>
    </div>
  )
}

export default MetricsPage
