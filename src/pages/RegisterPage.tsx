import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerRequest } from '../services/sessionService'
import './RegisterPage.css'

export default function RegisterPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.')
      setSuccessMessage('')
      return
    }

    try {
      setIsLoading(true)
      setErrorMessage('')
      setSuccessMessage('')

      await registerRequest({
        nombre: name,
        email,
        password,
      })

      setSuccessMessage('Cuenta creada correctamente. Ahora inicia sesión.')

      navigate('/', {
        state: {
          registeredEmail: email,
        },
      })
    } catch (error) {
      console.error(error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No fue posible crear la cuenta.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="register-page">
      <section className="register-card">
        <div className="register-card__topbar">
          <span className="register-card__brand">PIKEA</span>
          <span className="register-card__badge">Nuevo asistente</span>
        </div>

        <div className="register-card__header">
          <p className="register-card__eyebrow">Crear cuenta</p>
          <h1 className="register-card__title">Regístrate para pedir</h1>
          <p className="register-card__subtitle">
            Crea tu cuenta para vincular tu boleta, ver el menú del evento y
            seguir tu pedido desde el asiento.
          </p>
        </div>

        <form className="register-form" onSubmit={handleRegister}>
          <div className="register-field">
            <label htmlFor="name" className="register-label">
              Nombre
            </label>
            <input
              id="name"
              type="text"
              className="register-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tu nombre completo"
              autoComplete="name"
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="email" className="register-label">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              className="register-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tucorreo@ejemplo.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="password" className="register-label">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="register-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Crea una contraseña"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="confirmPassword" className="register-label">
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="register-input"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirma tu contraseña"
              autoComplete="new-password"
              required
            />
          </div>

          {errorMessage ? (
            <div className="register-alert register-alert--error">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="register-alert register-alert--success">
              {successMessage}
            </div>
          ) : null}

          <button
            type="submit"
            className="register-button"
            disabled={isLoading}
          >
            {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <div className="register-card__footer">
          <p className="register-card__login-text">
            ¿Ya tienes cuenta?{' '}
            <Link to="/" className="register-card__login-link">
              Inicia sesión
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}