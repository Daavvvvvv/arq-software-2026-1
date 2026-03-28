import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerRequest } from '../services/sessionService';
import './RegisterPage.css';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      setSuccessMessage('');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      setSuccessMessage('');

      await registerRequest({
        nombre: name,
        email,
        password,
      });

      setSuccessMessage('Cuenta creada correctamente. Ahora inicia sesión.');
      navigate('/', {
        state: {
          registeredEmail: email,
        },
      });
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No fue posible crear la cuenta.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="register-page">
      <section className="register-card">
        <div className="register-brand">PIKEA</div>

        <h1 className="register-title">Crear cuenta</h1>

        <p className="register-subtitle">
          Regístrate para vincular tu boleta, ver el menú del evento y seguir tu pedido.
        </p>

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
              placeholder="Tu nombre"
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
            <p className="register-error">{errorMessage}</p>
          ) : null}

          {successMessage ? (
            <p className="register-success">{successMessage}</p>
          ) : null}

          <button
            type="submit"
            className="register-button"
            disabled={isLoading}
          >
            {isLoading ? 'Creando cuenta...' : 'Registrarme'}
          </button>
        </form>

        <p className="register-footer">
          ¿Ya tienes cuenta?{' '}
          <Link to="/" className="register-link">
            Inicia sesión
          </Link>
        </p>
      </section>
    </main>
  );
}