import { apiClient } from './index'

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

/**
 * Search the product catalog with dynamic Baumann skin-match scoring
 */
export const searchProducts = async (query: string = '', minPrice?: number, maxPrice?: number) => {
  const params: any = {}
  if (query) params.q = query
  if (minPrice !== undefined && minPrice !== null) params.min_price = minPrice
  if (maxPrice !== undefined && maxPrice !== null) params.max_price = maxPrice

  const response = await apiClient.get('/products/search', { params })
  return response.data
}

/**
 * Fetch full product specification and Baumann compatibility matrix by URL Slug or UUID
 */
export const getProductBySlug = async (slug: string) => {
  const response = await apiClient.get(`/products/slug/${encodeURIComponent(slug)}`)
  return response.data
}

/**
 * Backwards-compatible helper: Resolves product details whether passed a UUID or a slug
 */
export const getProductById = async (productId: string) => {
  const response = await apiClient.get(`/products/slug/${encodeURIComponent(productId)}`)
  return response.data
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
