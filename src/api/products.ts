import { apiClient } from './index'


export const searchProducts = async (query: string) => {
  const response = await apiClient.get(`/products/search?q=${query}`)
  return response.data
}

// Future endpoints like getProductById, getTrendingProducts, etc., will go here!
