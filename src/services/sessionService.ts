import type { Ticket, User } from '../types/models';
import { API_URL } from './api';

const USER_STORAGE_KEY = 'app_user';
const TICKET_STORAGE_KEY = 'app_ticket';

export function saveUser(user: User): void {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export function saveTicket(ticket: Ticket): void {
  localStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(ticket));
}

export function getTicket(): Ticket | null {
  const raw = localStorage.getItem(TICKET_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Ticket) : null;
}

export function clearSession(): void {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(TICKET_STORAGE_KEY);
}

const TOKEN_STORAGE_KEY = 'app_token';

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export async function loginRequest(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  return response.json();
}

export function getAuthHeaders(): HeadersInit {
  const token = getToken();

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

type RegisterRequestBody = {
  email: string;
  password: string;
  nombre: string;
};

export async function registerRequest(body: RegisterRequestBody) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = 'No fue posible crear la cuenta.';

    try {
      const errorData = await response.json();
      if (errorData?.message) {
        message = Array.isArray(errorData.message)
          ? errorData.message.join(', ')
          : errorData.message;
      }
    } catch {
      // dejamos el mensaje genérico
    }

    throw new Error(message);
  }

  if (response.status === 201) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  return null;
}