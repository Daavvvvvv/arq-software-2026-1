import type { Ticket, User } from '../types/models';

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