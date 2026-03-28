import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, saveTicket } from '../services/sessionService'
import { linkTicketRequest } from '../services/ticketService'
import './LinkTicketPage.css'

export default function LinkTicketPage() {
  const navigate = useNavigate()

  const [codigoQR, setCodigoQR] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const user = getUser()

    if (!user) {
      navigate('/')
    }
  }, [navigate])

  const handleLinkTicket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setIsLoading(true)
      setErrorMessage('')

      const data = await linkTicketRequest(codigoQR)

      saveTicket(data)
      navigate('/menu')
    } catch (error) {
      console.error(error)
      setErrorMessage('No se pudo vincular la boleta.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="link-page">
      <section className="link-card">
        <div className="link-card__topbar">
          <span className="link-card__brand">PIKEA</span>
          <span className="link-card__badge">Boleta del evento</span>
        </div>

        <div className="link-card__header">
          <p className="link-card__eyebrow">Paso 1</p>
          <h1 className="link-card__title">Vincula tu boleta</h1>
          <p className="link-card__subtitle">
            Ingresa el código de tu entrada para asociar tu asiento y continuar
            al menú del evento.
          </p>
        </div>

        

        <form className="link-form" onSubmit={handleLinkTicket}>
          <div className="link-field">
            <label htmlFor="codigoQR" className="link-label">
              Código de la entrada
            </label>
            <input
              id="codigoQR"
              type="text"
              className="link-input"
              placeholder="Ej: QR-ASISTENTE-001"
              value={codigoQR}
              onChange={(event) => setCodigoQR(event.target.value)}
              autoComplete="off"
              required
            />
          </div>

          {errorMessage ? (
            <div className="link-alert link-alert--error">{errorMessage}</div>
          ) : null}

          <button
            type="submit"
            className="link-button"
            disabled={isLoading}
          >
            {isLoading ? 'Vinculando...' : 'Vincular boleta'}
          </button>
        </form>
      </section>
    </main>
  )
}