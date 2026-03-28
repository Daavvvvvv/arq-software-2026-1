import { getAuthHeaders } from './sessionService';
import { API_URL } from './api';

export async function linkTicketRequest(codigoQR: string) {
  const response = await fetch(`${API_URL}/boletas/vincular`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ codigoQR }),
  });

  if (!response.ok) {
    throw new Error('Error linking ticket');
  }

  const data = await response.json();

  return {
    id: data.id,
    eventName: 'Evento en vivo', // o lo que quieras por ahora
    seat: `${data.zona}-${data.fila}-${data.asiento}`,
    zona: data.zona,
    fila: data.fila,
    asiento: data.asiento,
    linked: data.vinculada ?? true,
  };
}