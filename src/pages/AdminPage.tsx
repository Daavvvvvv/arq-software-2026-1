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
  kr1_adoption: number
  kr2_avg_delivery_time: number
  kr3_failed_percentage: number
  orders_per_hour: Array<{ hour: number; count: number }>
  top_products: Array<{ nombre: string; count: number }>
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

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'productos' ? 'active' : ''}`}
          onClick={() => setActiveTab('productos')}
        >
          Productos
        </button>
        <button
          className={`tab-btn ${activeTab === 'eventos' ? 'active' : ''}`}
          onClick={() => setActiveTab('eventos')}
        >
          Eventos
        </button>
        <button
          className={`tab-btn ${activeTab === 'metricas' ? 'active' : ''}`}
          onClick={() => setActiveTab('metricas')}
        >
          Métricas
        </button>
      </div>

      <div className="admin-content">
        {/* Productos Tab */}
        {activeTab === 'productos' && (
          <div className="tab-pane">
            <h2>Gestión de Productos</h2>

            <div className="tienda-selector">
              <label>Selecciona una tienda:</label>
              <select
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
                <div className="form-section">
                  <h3>Agregar Nuevo Producto</h3>
                  <div className="form-grid">
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={newProductForm.nombre}
                      onChange={(e) =>
                        setNewProductForm({ ...newProductForm, nombre: e.target.value })
                      }
                    />
                    <input
                      type="number"
                      placeholder="Precio"
                      value={newProductForm.precio}
                      onChange={(e) =>
                        setNewProductForm({ ...newProductForm, precio: e.target.value })
                      }
                    />
                    <input
                      type="number"
                      placeholder="Stock"
                      value={newProductForm.stock}
                      onChange={(e) =>
                        setNewProductForm({ ...newProductForm, stock: e.target.value })
                      }
                    />
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={newProductForm.disponible}
                        onChange={(e) =>
                          setNewProductForm({ ...newProductForm, disponible: e.target.checked })
                        }
                      />
                      Disponible
                    </label>
                  </div>
                  <button className="action-btn create-btn" onClick={createProducto} disabled={loading}>
                    {loading ? 'Adding...' : 'Agregar Producto'}
                  </button>
                </div>

                <div className="productos-list">
                  <h3>Productos ({productos.length})</h3>
                  {productos.length === 0 ? (
                    <p className="empty-state">No hay productos</p>
                  ) : (
                    <div className="table-container">
                      {productos.map((producto) => (
                        <div key={producto.id} className="producto-row">
                          {editingProductId === producto.id ? (
                            <div className="edit-form">
                              <input
                                type="text"
                                defaultValue={producto.nombre}
                                onBlur={(e) => {
                                  if (e.target.value !== producto.nombre) {
                                    updateProducto(producto.id, { nombre: e.target.value })
                                  }
                                }}
                              />
                              <input
                                type="number"
                                defaultValue={producto.precio}
                                onBlur={(e) => {
                                  if (parseFloat(e.target.value) !== producto.precio) {
                                    updateProducto(producto.id, { precio: parseFloat(e.target.value) })
                                  }
                                }}
                              />
                              <input
                                type="number"
                                defaultValue={producto.stock}
                                onBlur={(e) => {
                                  if (parseInt(e.target.value) !== producto.stock) {
                                    updateProducto(producto.id, { stock: parseInt(e.target.value) })
                                  }
                                }}
                              />
                              <label>
                                <input
                                  type="checkbox"
                                  defaultChecked={producto.disponible}
                                  onChange={(e) =>
                                    updateProducto(producto.id, { disponible: e.target.checked })
                                  }
                                />
                                Disponible
                              </label>
                              <button
                                className="action-btn save-btn"
                                onClick={() => setEditingProductId(null)}
                              >
                                Listo
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="producto-info">
                                <span className="producto-nombre">{producto.nombre}</span>
                                <span className="producto-precio">${producto.precio}</span>
                                <span className="producto-stock">Stock: {producto.stock}</span>
                                <span className={`producto-status ${producto.disponible ? 'available' : 'unavailable'}`}>
                                  {producto.disponible ? 'Disponible' : 'No disponible'}
                                </span>
                              </div>
                              <div className="producto-actions">
                                <button
                                  className="action-btn edit-btn"
                                  onClick={() => setEditingProductId(producto.id)}
                                >
                                  Editar
                                </button>
                                <button
                                  className="action-btn delete-btn"
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
          <div className="tab-pane">
            <h2>Gestión de Eventos</h2>

            <div className="form-section">
              <h3>Crear Nuevo Evento</h3>
              <div className="form-grid">
                <input
                  type="text"
                  placeholder="Nombre del evento"
                  value={newEventoForm.nombre}
                  onChange={(e) => setNewEventoForm({ ...newEventoForm, nombre: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Artista"
                  value={newEventoForm.artista}
                  onChange={(e) => setNewEventoForm({ ...newEventoForm, artista: e.target.value })}
                />
                <input
                  type="datetime-local"
                  placeholder="Fecha y hora"
                  value={newEventoForm.fecha}
                  onChange={(e) => setNewEventoForm({ ...newEventoForm, fecha: e.target.value })}
                />
              </div>
              <button className="action-btn create-btn" onClick={createEvento} disabled={loading}>
                {loading ? 'Creating...' : 'Crear Evento'}
              </button>
            </div>

            <div className="eventos-list">
              <h3>Eventos ({eventos.length})</h3>
              {eventos.length === 0 ? (
                <p className="empty-state">No hay eventos</p>
              ) : (
                <div className="table-container">
                  {eventos.map((evento) => (
                    <div key={evento.id} className="evento-row">
                      <div className="evento-info">
                        <span className="evento-nombre">{evento.nombre}</span>
                        <span className="evento-artista">{evento.artista}</span>
                        <span className="evento-fecha">
                          {new Date(evento.fecha).toLocaleDateString()}
                        </span>
                        <span className={`evento-status ${evento.activo ? 'active' : 'inactive'}`}>
                          {evento.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div className="evento-actions">
                        <button
                          className={`action-btn ${evento.activo ? 'deactivate-btn' : 'activate-btn'}`}
                          onClick={() => toggleEvento(evento.id, evento.activo)}
                        >
                          {evento.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          className="action-btn delete-btn"
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
          <div className="tab-pane">
            <h2>Métricas (Auto-actualiza cada 10s)</h2>

            {metricas ? (
              <>
                <div className="metrics-cards">
                  <div className="metric-card">
                    <h4>KR1: Adopción</h4>
                    <div className="metric-value">{metricas.kr1_adoption.toFixed(1)}%</div>
                    <p className="metric-label">de asistentes usando la plataforma</p>
                  </div>
                  <div className="metric-card">
                    <h4>KR2: Tiempo Promedio</h4>
                    <div className="metric-value">{metricas.kr2_avg_delivery_time.toFixed(1)}min</div>
                    <p className="metric-label">desde el pedido hasta la entrega</p>
                  </div>
                  <div className="metric-card">
                    <h4>KR3: Tasa de Fallo</h4>
                    <div className="metric-value">{metricas.kr3_failed_percentage.toFixed(2)}%</div>
                    <p className="metric-label">de pedidos fallidos</p>
                  </div>
                </div>

                <div className="charts-section">
                  <h3>Pedidos por Hora</h3>
                  <div className="bar-chart">
                    {metricas.orders_per_hour.map((item) => (
                      <div key={item.hour} className="bar-item">
                        <div
                          className="bar"
                          style={{
                            height: `${Math.min((item.count / 100) * 100, 100)}%`,
                          }}
                        />
                        <span className="bar-label">{item.hour}:00</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="top-products-section">
                  <h3>Productos Más Vendidos</h3>
                  <div className="top-products-list">
                    {metricas.top_products.map((product, idx) => (
                      <div key={idx} className="top-product-item">
                        <span className="rank">#{idx + 1}</span>
                        <span className="product-name">{product.nombre}</span>
                        <span className="product-count">{product.count} vendidos</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="empty-state">Cargando métricas...</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
