import { apiClient } from './index'
import type { ShelfItem } from '../stores/shelfStore'

// 1. Fetch user's shelf from database
export const fetchUserShelf = async () => {
  const response = await apiClient.get('/shelf')
  return response.data
}

// 2. Add a new product to the database
export const addProductToBackend = async (productData: Omit<ShelfItem, 'id'>) => {
  const response = await apiClient.post('/shelf/add', productData)
  return response.data
}
