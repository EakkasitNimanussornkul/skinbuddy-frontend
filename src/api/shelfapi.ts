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

// UPDATED: Added opened_date and pao so TypeScript knows to accept them!
export const addToShelf = async (shelfData: {
  product_id: string,
  status: string,
  opened_date?: string | null,
  expiration_date?: string | null,
  pao?: number | null
}) => {
  const response = await apiClient.post('/shelf/add', shelfData)
  return response.data
}

// Replace your old analyzeProduct with this:
export const analyzeProduct = async (productId: string) => {
  // apiClient automatically adds the base URL and the Token!
  const response = await apiClient.get(`/shelf/analyze/${productId}`);
  return response.data;
};

// Replace your old markItemOpened with this:
export const markItemOpened = async (itemId: string, openedDate: string, expirationDate: string) => {
  const response = await apiClient.patch(`/shelf/${itemId}/open`, {
    opened_date: openedDate,
    expiration_date: expirationDate
  });
  return response.data;
};
export const removeFromShelf = async (itemId: string) => {
  const response = await apiClient.delete(`/shelf/${itemId}`)
  return response.data
}
