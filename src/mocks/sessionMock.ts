import type { Ticket, User } from '../types/models'

export const mockUser: User = {
  id: 'user-1',
  name: 'Daniela',
  email: 'daniela@example.com',
}

export const mockTicket: Ticket = {
  id: 'ticket-1',
  eventName: 'Coldplay',
  seat: 'Section C - Row 8 - Seat 14',
  linked: true,
}