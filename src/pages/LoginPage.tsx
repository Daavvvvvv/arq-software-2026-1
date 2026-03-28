import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginRequest, saveToken, saveUser } from '../services/sessionService';
import './LoginPage.css';

type UserRole = 'CONSUMER' | 'KITCHEN';

type LoginResponse = {
  accessToken: string;
  user?: {
    id?: string;
    nombre?: string;
    name?: string;
    email?: string;
    rol?: string;
    role?: string;
  };
  id?: string;
  nombre?: string;
  name?: string;
  email?: string;
  rol?: string;
  role?: string;
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);

    return JSON.parse(json) as Record<string, unknown>;
  } catch (error) {
    console.error('No se pudo decodificar el JWT', error);
    return null;
  }
}

function normalizeRole(value: unknown): UserRole | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toUpperCase();

  if (normalized === 'KITCHEN') return 'KITCHEN';
  if (normalized === 'CONSUMER') return 'CONSUMER';

  return null;
}

function extractRole(data: LoginResponse): UserRole {
  const directCandidates = [
    data.user?.rol,
    data.user?.role,
    data.rol,
    data.role,
  ];

  for (const candidate of directCandidates) {
    const parsed = normalizeRole(candidate);
    if (parsed) return parsed;
  }

  const jwtPayload = decodeJwtPayload(data.accessToken);

  if (jwtPayload) {
    const tokenCandidates = [
      jwtPayload['rol'],
      jwtPayload['role'],
      jwtPayload['userRole'],
      jwtPayload['tipoUsuario'],
      jwtPayload['https://example.com/role'],
    ];

    for (const candidate of tokenCandidates) {
      const parsed = normalizeRole(candidate);
      if (parsed) return parsed;
    }
  }

  return 'CONSUMER';
}

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

      const data = (await loginRequest(email, password)) as LoginResponse;

      console.log('LOGIN RESPONSE =>', data);

      saveToken(data.accessToken);

      const rol = extractRole(data);
      console.log('ROL DETECTADO =>', rol);

      const userId = data.user?.id ?? data.id ?? '1';
      const userName =
        data.user?.nombre ??
        data.user?.name ??
        data.nombre ??
        data.name ??
        'Usuario';
      const userEmail = data.user?.email ?? data.email ?? email;

      saveUser({
        id: userId,
        name: userName,
        email: userEmail,
        rol,
      });

      if (rol === 'KITCHEN') {
        navigate('/kitchen');
        return;
      }

      if (rol === 'VENUE_ADMIN' || rol === 'SUPER_ADMIN') {
        navigate('/admin');
        return;
      }

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
        <div className="login-card__topbar">
          <span className="login-card__brand">PIKEA</span>
          <span className="login-card__badge">Acceso asistentes</span>
        </div>

        <div className="login-card__header">
          <p className="login-card__eyebrow">Bienvenido</p>
          <h1 className="login-card__title">Entrar a tu cuenta</h1>
        </div>

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
            <div className="login-alert login-alert--error">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Ingresando...' : 'Entrar'}
          </button>
        </form>

        <div className="login-card__footer">
          <p className="login-card__register-text">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="login-card__register-link">
              Regístrate
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
