import { describe, it, expect, beforeEach, vi } from 'vitest'

// No network: both HTTP paths are mocked. products.ts deliberately uses two
// clients - the shared apiClient when a token exists, and a bare axios call
// when it does not - so both are replaced here.
vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn() },
}))
vi.mock('axios', () => ({
  default: { get: vi.fn() },
}))

import axios from 'axios'
import { apiClient } from '../../api/index'
import {
  searchProducts,
  getProductBySlug,
  getProductById,
  getProductComparison,
} from '../../api/products'

const unauthorized = { response: { status: 401 } }

describe('src/api/products.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('searchProducts()', () => {
    it('sends no query parameters when called with no arguments', async () => {
      localStorage.setItem('access_token', 'valid-token')
      vi.mocked(apiClient.get).mockResolvedValue({ data: [] })

      await searchProducts()

      expect(apiClient.get).toHaveBeenCalledWith('/products/search', { params: {} })
    })

    it('sends the search term and both price bounds when all three are supplied', async () => {
      localStorage.setItem('access_token', 'valid-token')
      vi.mocked(apiClient.get).mockResolvedValue({ data: [] })

      await searchProducts('ceramide', 100, 900)

      expect(apiClient.get).toHaveBeenCalledWith('/products/search', {
        params: { q: 'ceramide', min_price: 100, max_price: 900 },
      })
    })

    it('includes a zero price bound rather than dropping it as falsy', async () => {
      localStorage.setItem('access_token', 'valid-token')
      vi.mocked(apiClient.get).mockResolvedValue({ data: [] })

      await searchProducts('', 0, 1500)

      // A `if (minPrice)` check would silently drop 0 and widen the filter.
      expect(apiClient.get).toHaveBeenCalledWith('/products/search', {
        params: { min_price: 0, max_price: 1500 },
      })
    })

    it('searches anonymously without the authenticated client when no token is stored', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: [{ id: 'p-1' }] })

      const result = await searchProducts('ceramide')

      expect(axios.get).toHaveBeenCalled()
      expect(apiClient.get).not.toHaveBeenCalled()
      expect(result).toEqual([{ id: 'p-1' }])
    })

    it('falls back to an anonymous search when the stored token is rejected with 401', async () => {
      localStorage.setItem('access_token', 'expired-token')
      vi.mocked(apiClient.get).mockRejectedValue(unauthorized)
      vi.mocked(axios.get).mockResolvedValue({ data: [{ id: 'p-2' }] })

      const result = await searchProducts('ceramide')

      // Browsing must degrade to anonymous rather than failing outright.
      expect(result).toEqual([{ id: 'p-2' }])
    })

    it('propagates a non-401 failure instead of masking it as an empty result', async () => {
      localStorage.setItem('access_token', 'valid-token')
      vi.mocked(apiClient.get).mockRejectedValue({ response: { status: 500 } })

      await expect(searchProducts('ceramide')).rejects.toEqual({ response: { status: 500 } })
      expect(axios.get).not.toHaveBeenCalled()
    })
  })

  describe('getProductBySlug()', () => {
    it('requests the product by slug through the authenticated client when a token exists', async () => {
      localStorage.setItem('access_token', 'valid-token')
      vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'p-1' } })

      const result = await getProductBySlug('cerave-hydrating-facial-cleanser')

      expect(apiClient.get).toHaveBeenCalledWith('/products/slug/cerave-hydrating-facial-cleanser')
      expect(result).toEqual({ id: 'p-1' })
    })

    it('percent-encodes a slug containing characters that are unsafe in a URL path', async () => {
      localStorage.setItem('access_token', 'valid-token')
      vi.mocked(apiClient.get).mockResolvedValue({ data: {} })

      await getProductBySlug('niacinamide 10% + zinc')

      expect(apiClient.get).toHaveBeenCalledWith('/products/slug/niacinamide%2010%25%20%2B%20zinc')
    })

    it('falls back to an anonymous lookup when the stored token is rejected with 401', async () => {
      localStorage.setItem('access_token', 'expired-token')
      vi.mocked(apiClient.get).mockRejectedValue(unauthorized)
      vi.mocked(axios.get).mockResolvedValue({ data: { id: 'guest-view' } })

      const result = await getProductBySlug('some-slug')

      expect(result).toEqual({ id: 'guest-view' })
    })
  })

  describe('getProductById()', () => {
    it('resolves through the slug endpoint, which accepts a UUID as well as a slug', async () => {
      localStorage.setItem('access_token', 'valid-token')
      vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'uuid-123' } })

      const result = await getProductById('uuid-123')

      expect(apiClient.get).toHaveBeenCalledWith('/products/slug/uuid-123')
      expect(result).toEqual({ id: 'uuid-123' })
    })
  })

  describe('getProductComparison()', () => {
    it('sends both product ids as separate query parameters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { similarity_score: 0 } })

      await getProductComparison('a-1', 'b-2')

      expect(apiClient.get).toHaveBeenCalledWith('/products/compare', {
        params: { product_a_id: 'a-1', product_b_id: 'b-2' },
      })
    })

    it('returns the full comparison payload including shared ingredients and conflicts', async () => {
      const payload = {
        product_a: { id: 'a-1' },
        product_b: { id: 'b-2' },
        shared_ingredients: [{ id: 'i-1', name: 'Glycerin' }],
        similarity_score: 0.42,
        conflicts: [{ alert_type: 'category', severity: 'high', message: 'Do not layer' }],
      }
      vi.mocked(apiClient.get).mockResolvedValue({ data: payload })

      const result = await getProductComparison('a-1', 'b-2')

      expect(result).toEqual(payload)
    })

    it('propagates a comparison failure rather than returning a partial result', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('compare failed'))

      await expect(getProductComparison('a-1', 'b-2')).rejects.toThrow('compare failed')
    })
  })
})
