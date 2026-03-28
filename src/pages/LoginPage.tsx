import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginRequest, saveToken, saveUser } from '../services/sessionService';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('asistente@test.com');
  const [password, setPassword] = useState('test123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsLoading(true);
      setErrorMessage('');

      const data = await loginRequest(email, password);

      saveToken(data.accessToken);

      saveUser({
        id: '1',
        name: 'Asistente',
        email,
      });

      navigate('/link-ticket');
    } catch (error) {
      console.error(error);
      setErrorMessage('Correo o contraseña inválidos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">PIKEA</div>

        <h1 className="login-title">Iniciar sesión</h1>

        <p className="login-subtitle">
          Ingresa para vincular tu boleta, ver el menú del evento y seguir tu pedido.
        </p>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="login-field">
            <label htmlFor="email" className="login-label">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              className="login-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tucorreo@ejemplo.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password" className="login-label">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="login-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Ingresa tu contraseña"
              autoComplete="current-password"
              required
            />
          </div>

          {errorMessage ? (
            <p className="login-error">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Ingresando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}