import { apiClient } from './index'

export const getMyShelf = async () => {
  const response = await apiClient.get('/shelf/')
  return response.data
}

export const addToShelf = async (shelfData: {
  product_id: string,
  status: string,
  usage_state: string,
  opened_date?: string | null,
  expiration_date?: string | null,
  pao?: number | null
}) => {
  const response = await apiClient.post('/shelf/add', shelfData)
  return response.data
}

export const analyzeProduct = async (productId: string) => {
  const response = await apiClient.get(`/shelf/analyze/${productId}`)
  return response.data
}

export const markItemOpened = async (
  itemId: string,
  openedDate: string,
  expirationDate: string,
  usageState: string
) => {
  const response = await apiClient.patch(`/shelf/${itemId}/open`, {
    opened_date: openedDate,
    expiration_date: expirationDate,
    usage_state: usageState // Send to backend
  })
  return response.data
}

export const removeFromShelf = async (itemId: string) => {
  const response = await apiClient.delete(`/shelf/${itemId}`)
  return response.data
}
