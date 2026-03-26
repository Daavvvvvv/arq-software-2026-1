import type { Product } from '../types/models'

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Hamburguesa',
    description: 'Hamburguesa clásica con papas',
    price: 25000,
    imageUrl: 'https://via.placeholder.com/150',
    available: true,
    category: 'food',
  },
  {
    id: '2',
    name: 'Pizza',
    description: 'Pizza personal de pepperoni',
    price: 30000,
    imageUrl: 'https://via.placeholder.com/150',
    available: false, 
    category: 'food',
  },
  {
    id: '3',
    name: 'Cerveza',
    description: 'Cerveza fría 330ml',
    price: 15000,
    imageUrl: 'https://via.placeholder.com/150',
    available: true,
    category: 'drinks',
  },
  {
  id: '4',
  name: 'Combo burger + bebida',
  description: 'Hamburguesa con bebida',
  imageUrl: 'https://via.placeholder.com/150',
  price: 32000,
  available: true,
  category: 'combos',
}
]