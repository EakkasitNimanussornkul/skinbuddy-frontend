import { apiClient } from './index'

// --- Product Search ---
export const searchProducts = async (query: string) => {
  const response = await apiClient.get(`/products/search?q=${query}`)
  return response.data
}

// --- Shelf Operations ---
export const getMyShelf = async () => {
  const response = await apiClient.get('/shelf/')
  return response.data
}

export const addToShelf = async (shelfData: { product_id: string, status: string, expiration_date?: string | null }) => {
  const response = await apiClient.post('/shelf/add', shelfData)
  return response.data
}

export const removeFromShelf = async (itemId: string) => {
  const response = await apiClient.delete(`/shelf/${itemId}`)
  return response.data
}
