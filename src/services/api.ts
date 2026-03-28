const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export { API_URL };

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_URL}${path}`;
  const token = localStorage.getItem('app_token');

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}
