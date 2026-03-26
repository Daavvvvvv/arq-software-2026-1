import type { Product } from '../types/models'
import { mockProducts } from '../mocks/menuMock'

export const getMenu = async (): Promise<Product[]> => {
  // simulamos latencia de API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockProducts)
    }, 500)
  })
}


