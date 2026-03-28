import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../services/api'
import './AdminPage.css'

interface Tienda {
  id: string
  nombre: string
  tenant_id: string
}

interface Producto {
  id: string
  nombre: string
  precio: number
  stock: number
  disponible: boolean
  tienda_id: string
}

interface Evento {
  id: string
  nombre: string
  artista: string
  fecha: string
  activo: boolean
}

interface MetricasData {
  kr1_adopcion_pct: number
  kr2_tiempo_promedio_seg: number
  kr3_fallidos_pct: number
  pedidos_por_hora: Array<{ hora: string; total: number }>
  top_productos: Array<{ nombre: string; count: number }>
}

export default function AdminPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'productos' | 'eventos' | 'metricas'>('productos')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Productos state
  const [tiendas, setTiendas] = useState<Tienda[]>([])
  const [selectedTienda, setSelectedTienda] = useState<string | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [newProductForm, setNewProductForm] = useState({ nombre: '', precio: '', stock: '', disponible: true })

  // Eventos state
  const [eventos, setEventos] = useState<Evento[]>([])
  const [newEventoForm, setNewEventoForm] = useState({ nombre: '', artista: '', fecha: '' })

  // Metricas state
  const [metricas, setMetricas] = useState<MetricasData | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('app_token')
    if (!token) {
      navigate('/')
      return
    }
  }, [navigate])

  // Productos tab effects
  useEffect(() => {
    if (activeTab === 'productos') {
      loadTiendas()
    }
  }, [activeTab])

  useEffect(() => {
    if (selectedTienda) {
      loadProductos(selectedTienda)
    }
  }, [selectedTienda])

  // Eventos tab effects
  useEffect(() => {
    if (activeTab === 'eventos') {
      loadEventos()
    }
  }, [activeTab])

  // Metricas tab effects
  useEffect(() => {
    if (activeTab === 'metricas') {
      loadMetricas()
      const interval = setInterval(loadMetricas, 10000)
      return () => clearInterval(interval)
    }
  }, [activeTab])

  // API calls
  async function loadTiendas() {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch<Tienda[]>('/admin/tiendas')
      setTiendas(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading tiendas')
    } finally {
      setLoading(false)
    }
  }

  async function loadProductos(tiendaId: string) {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch<Producto[]>(`/admin/tiendas/${tiendaId}/productos`)
      setProductos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading productos')
    } finally {
      setLoading(false)
    }
  }

  async function createProducto() {
    if (!selectedTienda || !newProductForm.nombre || !newProductForm.precio || !newProductForm.stock) {
      setError('All fields are required')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await apiFetch(`/admin/productos`, {
        method: 'POST',
        body: JSON.stringify({
          nombre: newProductForm.nombre,
          precio: parseFloat(newProductForm.precio),
          stock: parseInt(newProductForm.stock),
          tiendaId: selectedTienda,
          disponible: newProductForm.disponible,
        }),
      })
      setNewProductForm({ nombre: '', precio: '', stock: '', disponible: true })
      await loadProductos(selectedTienda)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating producto')
    } finally {
      setLoading(false)
    }
  }

  async function updateProducto(productoId: string, updates: Partial<Producto>) {
    if (!selectedTienda) return

    try {
      setLoading(true)
      setError(null)
      await apiFetch(`/admin/productos/${productoId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })
      setEditingProductId(null)
      await loadProductos(selectedTienda)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating producto')
    } finally {
      setLoading(false)
    }
  }

  async function deleteProducto(productoId: string) {
    if (!selectedTienda || !confirm('Delete this product?')) return

    try {
      setLoading(true)
      setError(null)
      await apiFetch(`/admin/productos/${productoId}`, {
        method: 'DELETE',
      })
      await loadProductos(selectedTienda)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting producto')
    } finally {
      setLoading(false)
    }
  }

  async function loadEventos() {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch<Evento[]>('/admin/eventos')
      setEventos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading eventos')
    } finally {
      setLoading(false)
    }
  }

  async function createEvento() {
    if (!newEventoForm.nombre || !newEventoForm.artista || !newEventoForm.fecha) {
      setError('All fields are required')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await apiFetch('/admin/eventos', {
        method: 'POST',
        body: JSON.stringify({
          nombre: newEventoForm.nombre,
          artista: newEventoForm.artista,
          fecha: newEventoForm.fecha,
          activo: true,
        }),
      })
      setNewEventoForm({ nombre: '', artista: '', fecha: '' })
      await loadEventos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating evento')
    } finally {
      setLoading(false)
    }
  }

  async function toggleEvento(eventoId: string, _currentStatus: boolean) {
    try {
      setLoading(true)
      setError(null)
      await apiFetch(`/admin/eventos/${eventoId}/activar`, {
        method: 'PUT',
      })
      await loadEventos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating evento')
    } finally {
      setLoading(false)
    }
  }

  async function deleteEvento(eventoId: string) {
    if (!confirm('Delete this evento?')) return

    try {
      setLoading(true)
      setError(null)
      await apiFetch(`/admin/eventos/${eventoId}`, {
        method: 'DELETE',
      })
      await loadEventos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting evento')
    } finally {
      setLoading(false)
    }
  }

  async function loadMetricas() {
    try {
      setError(null)
      const data = await apiFetch<MetricasData>('/admin/metricas')
      setMetricas(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading metricas')
    }
  }

  function handleLogout() {
    localStorage.removeItem('app_token')
    navigate('/')
  }

  const getKRColor = (kr: number, target: number, isLessThan = false) => {
    if (isLessThan) {
      return kr <= target ? '#22c55e' : '#ef4444'
    }
    return kr >= target ? '#22c55e' : '#ef4444'
  }

  return (
    <div className="admin-page">
      <div className="admin-page__container">
        {/* Header */}
        <div className="admin-header">
          <div>
            <div className="admin-header__eyebrow">Sistema PIKEA</div>
            <h1 className="admin-header__title">Panel de Administración</h1>
          </div>
          <button className="admin-header__logout" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>

        {/* Error Alert */}
        {error && <div className="admin-error">{error}</div>}

        {/* Tabs */}
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'productos' ? 'admin-tab--active' : ''}`}
            onClick={() => setActiveTab('productos')}
          >
            Productos
          </button>
          <button
            className={`admin-tab ${activeTab === 'eventos' ? 'admin-tab--active' : ''}`}
            onClick={() => setActiveTab('eventos')}
          >
            Eventos
          </button>
          <button
            className={`admin-tab ${activeTab === 'metricas' ? 'admin-tab--active' : ''}`}
            onClick={() => setActiveTab('metricas')}
          >
            Métricas
          </button>
        </div>

        {/* Content */}
        <div className="admin-content">
          {/* Productos Tab */}
          {activeTab === 'productos' && (
            <div className="admin-section">
              <h2 className="admin-section__title">Gestión de Productos</h2>

              {/* Tienda Selector */}
              <div className="admin-card admin-card--input-card">
                <label className="admin-label">Selecciona una tienda:</label>
                <select
                  className="admin-select"
                  value={selectedTienda || ''}
                  onChange={(e) => setSelectedTienda(e.target.value || null)}
                >
                  <option value="">-- Seleccionar --</option>
                  {tiendas.map((tienda) => (
                    <option key={tienda.id} value={tienda.id}>
                      {tienda.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTienda && (
                <>
                  {/* Add Product Form */}
                  <div className="admin-card">
                    <h3 className="admin-card__title">Agregar Nuevo Producto</h3>
                    <div className="admin-form-grid">
                      <input
                        className="admin-input"
                        type="text"
                        placeholder="Nombre del producto"
                        value={newProductForm.nombre}
                        onChange={(e) =>
                          setNewProductForm({ ...newProductForm, nombre: e.target.value })
                        }
                      />
                      <input
                        className="admin-input"
                        type="number"
                        placeholder="Precio"
                        value={newProductForm.precio}
                        onChange={(e) =>
                          setNewProductForm({ ...newProductForm, precio: e.target.value })
                        }
                      />
                      <input
                        className="admin-input"
                        type="number"
                        placeholder="Stock"
                        value={newProductForm.stock}
                        onChange={(e) =>
                          setNewProductForm({ ...newProductForm, stock: e.target.value })
                        }
                      />
                      <label className="admin-checkbox-label">
                        <input
                          type="checkbox"
                          checked={newProductForm.disponible}
                          onChange={(e) =>
                            setNewProductForm({ ...newProductForm, disponible: e.target.checked })
                          }
                        />
                        <span>Disponible</span>
                      </label>
                    </div>
                    <button
                      className="admin-button admin-button--primary"
                      onClick={createProducto}
                      disabled={loading}
                    >
                      {loading ? 'Agregando...' : 'Agregar Producto'}
                    </button>
                  </div>

                  {/* Products List */}
                  <div className="admin-card">
                    <h3 className="admin-card__title">Productos ({productos.length})</h3>
                    {productos.length === 0 ? (
                      <p className="admin-empty-state">No hay productos registrados</p>
                    ) : (
                      <div className="admin-product-grid">
                        {productos.map((producto) => (
                          <div key={producto.id} className="admin-product-card">
                            {editingProductId === producto.id ? (
                              <div className="admin-product-card__edit">
                                <input
                                  className="admin-input admin-input--sm"
                                  type="text"
                                  defaultValue={producto.nombre}
                                  onBlur={(e) => {
                                    if (e.target.value !== producto.nombre) {
                                      updateProducto(producto.id, { nombre: e.target.value })
                                    }
                                  }}
                                />
                                <input
                                  className="admin-input admin-input--sm"
                                  type="number"
                                  defaultValue={producto.precio}
                                  onBlur={(e) => {
                                    if (parseFloat(e.target.value) !== producto.precio) {
                                      updateProducto(producto.id, { precio: parseFloat(e.target.value) })
                                    }
                                  }}
                                />
                                <input
                                  className="admin-input admin-input--sm"
                                  type="number"
                                  defaultValue={producto.stock}
                                  onBlur={(e) => {
                                    if (parseInt(e.target.value) !== producto.stock) {
                                      updateProducto(producto.id, { stock: parseInt(e.target.value) })
                                    }
                                  }}
                                />
                                <label className="admin-checkbox-label admin-checkbox-label--sm">
                                  <input
                                    type="checkbox"
                                    defaultChecked={producto.disponible}
                                    onChange={(e) =>
                                      updateProducto(producto.id, { disponible: e.target.checked })
                                    }
                                  />
                                  <span>Disponible</span>
                                </label>
                                <button
                                  className="admin-button admin-button--sm admin-button--secondary"
                                  onClick={() => setEditingProductId(null)}
                                >
                                  Listo
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="admin-product-card__content">
                                  <div className="admin-product-card__header">
                                    <h4 className="admin-product-card__name">{producto.nombre}</h4>
                                    <span
                                      className={`admin-badge ${
                                        producto.disponible ? 'admin-badge--success' : 'admin-badge--danger'
                                      }`}
                                    >
                                      {producto.disponible ? 'Disponible' : 'No disponible'}
                                    </span>
                                  </div>
                                  <div className="admin-product-card__info">
                                    <div>
                                      <span className="admin-product-card__label">Precio:</span>
                                      <span className="admin-product-card__value">${producto.precio}</span>
                                    </div>
                                    <div>
                                      <span className="admin-product-card__label">Stock:</span>
                                      <span className="admin-product-card__value">{producto.stock}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="admin-product-card__actions">
                                  <button
                                    className="admin-button admin-button--sm admin-button--secondary"
                                    onClick={() => setEditingProductId(producto.id)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    className="admin-button admin-button--sm admin-button--danger"
                                    onClick={() => deleteProducto(producto.id)}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Eventos Tab */}
          {activeTab === 'eventos' && (
            <div className="admin-section">
              <h2 className="admin-section__title">Gestión de Eventos</h2>

              {/* Create Event Form */}
              <div className="admin-card">
                <h3 className="admin-card__title">Crear Nuevo Evento</h3>
                <div className="admin-form-grid">
                  <input
                    className="admin-input"
                    type="text"
                    placeholder="Nombre del evento"
                    value={newEventoForm.nombre}
                    onChange={(e) => setNewEventoForm({ ...newEventoForm, nombre: e.target.value })}
                  />
                  <input
                    className="admin-input"
                    type="text"
                    placeholder="Artista"
                    value={newEventoForm.artista}
                    onChange={(e) => setNewEventoForm({ ...newEventoForm, artista: e.target.value })}
                  />
                  <input
                    className="admin-input"
                    type="datetime-local"
                    value={newEventoForm.fecha}
                    onChange={(e) => setNewEventoForm({ ...newEventoForm, fecha: e.target.value })}
                  />
                </div>
                <button
                  className="admin-button admin-button--primary"
                  onClick={createEvento}
                  disabled={loading}
                >
                  {loading ? 'Creando...' : 'Crear Evento'}
                </button>
              </div>

              {/* Events List */}
              <div className="admin-card">
                <h3 className="admin-card__title">Eventos ({eventos.length})</h3>
                {eventos.length === 0 ? (
                  <p className="admin-empty-state">No hay eventos registrados</p>
                ) : (
                  <div className="admin-event-grid">
                    {eventos.map((evento) => (
                      <div key={evento.id} className="admin-event-card">
                        <div className="admin-event-card__header">
                          <div>
                            <h4 className="admin-event-card__name">{evento.nombre}</h4>
                            <p className="admin-event-card__artist">{evento.artista}</p>
                          </div>
                          <span
                            className={`admin-badge ${
                              evento.activo ? 'admin-badge--success' : 'admin-badge--danger'
                            }`}
                          >
                            {evento.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <p className="admin-event-card__date">
                          {new Date(evento.fecha).toLocaleDateString('es-CO', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <div className="admin-event-card__actions">
                          <button
                            className={`admin-button admin-button--sm ${
                              evento.activo ? 'admin-button--secondary' : 'admin-button--primary'
                            }`}
                            onClick={() => toggleEvento(evento.id, evento.activo)}
                          >
                            {evento.activo ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            className="admin-button admin-button--sm admin-button--danger"
                            onClick={() => deleteEvento(evento.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metricas Tab */}
          {activeTab === 'metricas' && (
            <div className="admin-section">
              <h2 className="admin-section__title">Métricas (Auto-actualiza cada 10s)</h2>

              {metricas ? (
                <>
                  {/* KR Cards */}
                  <div className="admin-kr-grid">
                    <div className="admin-kr-card">
                      <h3 className="admin-kr-card__label">KR1: Adopción</h3>
                      <div
                        className="admin-kr-card__value"
                        style={{ color: getKRColor(metricas.kr1_adopcion_pct, 25) }}
                      >
                        {metricas.kr1_adopcion_pct.toFixed(1)}%
                      </div>
                      <p className="admin-kr-card__target">Target: ≥25%</p>
                      <p className="admin-kr-card__description">Porcentaje de asistentes que piden</p>
                    </div>

                    <div className="admin-kr-card">
                      <h3 className="admin-kr-card__label">KR2: Tiempo Promedio</h3>
                      <div
                        className="admin-kr-card__value"
                        style={{ color: getKRColor(metricas.kr2_tiempo_promedio_seg, 600, true) }}
                      >
                        {(metricas.kr2_tiempo_promedio_seg / 60).toFixed(1)} min
                      </div>
                      <p className="admin-kr-card__target">Target: &lt;10 min</p>
                      <p className="admin-kr-card__description">Tiempo de pedido a entrega</p>
                    </div>

                    <div className="admin-kr-card">
                      <h3 className="admin-kr-card__label">KR3: Tasa de Fallo</h3>
                      <div
                        className="admin-kr-card__value"
                        style={{ color: getKRColor(metricas.kr3_fallidos_pct, 1, true) }}
                      >
                        {metricas.kr3_fallidos_pct.toFixed(2)}%
                      </div>
                      <p className="admin-kr-card__target">Target: &lt;1%</p>
                      <p className="admin-kr-card__description">Porcentaje de pedidos fallidos</p>
                    </div>
                  </div>

                  {/* Pedidos por Hora */}
                  <div className="admin-card">
                    <h3 className="admin-card__title">Pedidos por Hora</h3>
                    <div className="admin-bar-chart">
                      {metricas.pedidos_por_hora.map((item, idx) => (
                        <div key={idx} className="admin-bar-item">
                          <div
                            className="admin-bar"
                            style={{
                              height: `${Math.min((item.total / 20) * 100, 100)}%`,
                            }}
                          />
                          <span className="admin-bar-label">
                            {new Date(item.hora).getHours()}:00
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Productos */}
                  <div className="admin-card">
                    <h3 className="admin-card__title">Productos Más Vendidos</h3>
                    <div className="admin-top-products">
                      {metricas.top_productos.map((product, idx) => (
                        <div key={idx} className="admin-top-product-item">
                          <span className="admin-top-product-rank">#{idx + 1}</span>
                          <span className="admin-top-product-name">{product.nombre}</span>
                          <span className="admin-top-product-count">{product.count} vendidos</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="admin-loading">
                  <p>Cargando métricas...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
