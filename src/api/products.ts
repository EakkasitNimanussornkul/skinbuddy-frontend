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
 * Rank a /products/search result set by Baumann skin-match score and keep the
 * best few.
 *
 * Pure and exported deliberately: the caller is a lifecycle hook, and logic
 * left inline in a hook cannot be unit tested in isolation.
 *
 * Products without a numeric score are dropped rather than sorted to the
 * bottom. An unscored product is one the backend could not match against the
 * user's skin type - usually because the request was anonymous - so showing it
 * under "recommended for you" would be inventing a recommendation.
 */
export interface ScoredProduct {
  id: string
  slug: string
  name: string
  brand?: string
  image_url?: string | null
  skin_match_score?: number | null
}

export const pickTopRecommendations = <T extends { skin_match_score?: number | null }>(
  products: T[],
  limit: number = 4,
): T[] => {
  // Runtime guard as well as the type: the search response is untyped JSON, so
  // a malformed payload must not throw inside a lifecycle hook.
  if (!Array.isArray(products)) return []

  return products
    .filter(
      (p): p is T & { skin_match_score: number } =>
        !!p && typeof p.skin_match_score === 'number' && !Number.isNaN(p.skin_match_score),
    )
    .sort((a, b) => b.skin_match_score - a.skin_match_score)
    .slice(0, limit)
}

/**
 * Comparison is a two-product operation. GET /products/compare takes exactly
 * product_a_id and product_b_id, and compare_two_products resolves exactly two.
 *
 * Nothing reads this today. It was the cap on Explore's multi-select, which
 * FE-DEF-11 removed as unreachable; the limit is now imposed by
 * buildComparePath emitting only `a` and `b`, and by both remaining callers
 * choosing exactly two products. Kept as the written statement of why the
 * feature is two-product at all - a future selection UI must cap here rather
 * than offer a capability the engine does not have.
 */
export const MAX_COMPARE_PRODUCTS = 2

/**
 * Build the comparison address from selected slugs.
 *
 * Pure and exported so the contract between a selection screen and CompareView
 * can be asserted without mounting either. CompareView reads `a` and `b`; a
 * caller inventing its own parameter names produces a page that silently shows
 * its "select two products" prompt instead.
 *
 * Returns null when there are not two slugs, so callers surface that rather
 * than navigating to a page that cannot act.
 */
export const buildComparePath = (slugs: string[]): string | null => {
  if (!Array.isArray(slugs)) return null

  const [a, b] = slugs.filter((s) => typeof s === 'string' && s.length > 0)
  if (!a || !b) return null

  return `/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`
}

/**
 * `loading`  the request is in flight
 * `failed`   the request did not complete
 * `empty`    the catalogue arrived and nothing matched the active filters
 * `results`  the catalogue arrived and something matched
 */
export type CatalogViewState = 'loading' | 'failed' | 'empty' | 'results'

/**
 * Choose which of the four catalogue screens to show.
 *
 * Pure and exported for the same reason as buildComparePath: this project has
 * no component-mount layer, so the decision is testable only outside the
 * template.
 *
 * FE-DEF-09 was the absence of the `failed` state. With only three, a request
 * that never completed left the catalogue at its initial [] and fell through to
 * `empty`, telling the user as a fact that their filters excluded everything -
 * and offering a "reset filters" action that reruns the same failing request.
 *
 * Order matters: `failed` is decided before `empty`, because a failure tells us
 * nothing about how many products match. Reversing the two restores the defect.
 */
export const resolveCatalogState = (
  isLoading: boolean,
  failed: boolean,
  matchCount: number,
): CatalogViewState => {
  if (isLoading) return 'loading'
  if (failed) return 'failed'
  return matchCount > 0 ? 'results' : 'empty'
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
