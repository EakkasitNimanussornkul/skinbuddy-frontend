import { apiClient } from './index'

export const getMyShelf = async () => {
  const response = await apiClient.get('/shelf/')
  return response.data || []
}

export const addToShelf = async (shelfData: {
  product_id: string
  usage_state: string
  opened_date?: string | null
  expiration_date?: string | null
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
  expirationDate: string | null,
  usageState: string,
  pao?: number | string | null
) => {
  const parsedPao = pao ? (typeof pao === 'string' ? parseInt(pao.replace('M', '')) : pao) : null

  const response = await apiClient.patch(`/shelf/${itemId}/open`, {
    opened_date: openedDate,
    expiration_date: expirationDate,
    usage_state: usageState,
    pao: parsedPao
  })
  return response.data
}

export const updateShelfStatus = async (
  itemId: string,
  usageState: string,
  metadata?: { outcome?: string | null; notes?: string | null; archived_at?: string | null }
) => {
  const url = `/shelf/${itemId}/status`
  const response = await apiClient.patch(url, {
    usage_state: usageState,
    outcome: metadata?.outcome !== undefined ? metadata.outcome : null,
    notes: metadata?.notes !== undefined ? metadata.notes : null,
    archived_at: metadata?.archived_at !== undefined ? metadata.archived_at : null
  })

  return response.data
}

export const removeFromShelf = async (itemId: string) => {
  const response = await apiClient.delete(`/shelf/${itemId}`)
  return response.data
}
