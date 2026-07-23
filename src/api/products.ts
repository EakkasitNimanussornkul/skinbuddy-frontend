import { apiClient } from './index'
import axios from 'axios'

export interface SharedIngredient {
  id: string
  name: string
  benefits?: string
}

export interface WarningAlert {
  alert_type: string
  severity: string
  message: string
}

export interface CompareResponse {
  product_a: any
  product_b: any
  shared_ingredients: SharedIngredient[]
  similarity_score: number
  conflicts: WarningAlert[]
}

const API_BASE_URL = import.meta.env.VITE_API_URL

/**
 * Search the product catalog with dynamic Baumann skin-match scoring
 */
export const searchProducts = async (query: string = '', minPrice?: number, maxPrice?: number) => {
  const params: any = {}
  if (query) params.q = query
  if (minPrice !== undefined && minPrice !== null) params.min_price = minPrice
  if (maxPrice !== undefined && maxPrice !== null) params.max_price = maxPrice

  const token = localStorage.getItem('access_token')

  // If no token exists, make a direct unauthenticated request
  if (!token) {
    const response = await axios.get(`${API_BASE_URL}/products/search`, { params })
    return response.data
  }

  try {
    const response = await apiClient.get('/products/search', { params })
    return response.data
  } catch (error: any) {
    // Fallback to guest search if token expired or invalid
    if (error?.response?.status === 401) {
      const response = await axios.get(`${API_BASE_URL}/products/search`, { params })
      return response.data
    }
    throw error
  }
}

/**
 * Fetch full product specification and Baumann compatibility matrix by URL Slug or UUID
 */
export const getProductBySlug = async (slug: string) => {
  const token = localStorage.getItem('access_token')

  if (!token) {
    const res = await axios.get(`${API_BASE_URL}/products/slug/${encodeURIComponent(slug)}`)
    return res.data
  }

  try {
    // 🌟 FIXED: Changed 'api' to 'apiClient'
    const res = await apiClient.get(`/products/slug/${encodeURIComponent(slug)}`)
    return res.data
  } catch (error: any) {
    // Fallback to guest request if token is expired/invalid to prevent blocking product view
    if (error?.response?.status === 401) {
      const res = await axios.get(`${API_BASE_URL}/products/slug/${encodeURIComponent(slug)}`)
      return res.data
    }
    throw error
  }
}

/**
 * Backwards-compatible helper: Resolves product details whether passed a UUID or a slug
 */
export const getProductById = async (productId: string) => {
  return await getProductBySlug(productId)
}

/**
 * Compare two products side-by-side for similarity matrix and category clash rules
 */
export const getProductComparison = async (productAId: string, productBId: string): Promise<CompareResponse> => {
  const response = await apiClient.get(`/products/compare`, {
    params: {
      product_a_id: productAId,
      product_b_id: productBId
    }
  })
  return response.data
}
