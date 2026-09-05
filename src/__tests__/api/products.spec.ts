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
  pickTopRecommendations,
  buildComparePath,
  resolveCatalogState,
  resolveMatchBand,
  MAX_COMPARE_PRODUCTS,
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

  describe('pickTopRecommendations()', () => {
    const scored = (id: string, skin_match_score: number) => ({ id, skin_match_score })

    it('orders products by skin match score from highest to lowest', () => {
      const result = pickTopRecommendations([scored('low', 20), scored('high', 90), scored('mid', 55)])

      expect(result.map((p) => p.id)).toEqual(['high', 'mid', 'low'])
    })

    it('returns at most four products, matching the four-column layout', () => {
      const result = pickTopRecommendations([
        scored('a', 10),
        scored('b', 20),
        scored('c', 30),
        scored('d', 40),
        scored('e', 50),
        scored('f', 60),
      ])

      expect(result).toHaveLength(4)
      expect(result.map((p) => p.id)).toEqual(['f', 'e', 'd', 'c'])
    })

    it('honours an explicit limit when one is given', () => {
      const result = pickTopRecommendations([scored('a', 10), scored('b', 20), scored('c', 30)], 2)

      expect(result.map((p) => p.id)).toEqual(['c', 'b'])
    })

    it('drops products with no skin match score rather than ranking them last', () => {
      // An unscored product is one the backend could not match against the
      // user's skin type - anonymous browsing returns these. Showing it under
      // "recommended for you" would be presenting a match that was never made.
      const result = pickTopRecommendations([
        { id: 'unscored' },
        { id: 'null-score', skin_match_score: null },
        scored('scored', 40),
      ])

      expect(result.map((p) => p.id)).toEqual(['scored'])
    })

    it('drops a NaN score instead of letting it corrupt the ordering', () => {
      const result = pickTopRecommendations([scored('nan', NaN), scored('real', 30)])

      expect(result.map((p) => p.id)).toEqual(['real'])
    })

    it('returns an empty array when the catalog response is empty', () => {
      expect(pickTopRecommendations([])).toEqual([])
    })

    it('returns an empty array when the response is not a list, so a bad payload cannot throw', () => {
      expect(pickTopRecommendations(null as any)).toEqual([])
      expect(pickTopRecommendations(undefined as any)).toEqual([])
    })

    it('leaves the caller\'s array unmodified rather than sorting it in place', () => {
      const input = [scored('a', 10), scored('b', 90)]

      pickTopRecommendations(input)

      expect(input.map((p) => p.id)).toEqual(['a', 'b'])
    })
  })

  describe('buildComparePath()', () => {
    it('produces an address using the a and b parameters CompareView actually reads', () => {
      // FE-DEF-07: Explore sent /compare?slugs=a,b,c, which CompareView reads
      // nowhere, so the comparison rendered its "select two products" prompt.
      expect(buildComparePath(['cerave-cleanser', 'cosrx-sun'])).toBe(
        '/compare?a=cerave-cleanser&b=cosrx-sun',
      )
    })

    it('uses only the first two slugs, since the engine compares exactly two products', () => {
      expect(buildComparePath(['one', 'two', 'three'])).toBe('/compare?a=one&b=two')
    })

    it('returns null when fewer than two products are selected, so the caller can say so', () => {
      expect(buildComparePath([])).toBeNull()
      expect(buildComparePath(['only-one'])).toBeNull()
    })

    it('ignores empty slug entries rather than building an address with a blank product', () => {
      expect(buildComparePath(['', 'real-one'])).toBeNull()
      expect(buildComparePath(['a-slug', '', 'b-slug'])).toBe('/compare?a=a-slug&b=b-slug')
    })

    it('escapes slugs so an unexpected character cannot alter the query string', () => {
      expect(buildComparePath(['a&b=x', 'plain'])).toBe('/compare?a=a%26b%3Dx&b=plain')
    })

    it('returns null when handed something that is not a list, so a bad caller cannot throw', () => {
      expect(buildComparePath(null as never)).toBeNull()
    })

    it('documents the two-product limit that GET /products/compare imposes', () => {
      // Documentation, not enforcement. Nothing in the application reads this
      // constant since FE-DEF-11 removed Explore's multi-select; the limit is
      // actually imposed by buildComparePath, which emits only `a` and `b`, and
      // by both remaining callers picking exactly two products. Phrased as what
      // it verifies rather than "caps comparison at two", which would claim an
      // enforcement that no longer exists.
      expect(MAX_COMPARE_PRODUCTS).toBe(2)
    })
  })

  describe('resolveMatchBand()', () => {
    it('reports a score of 85 or above as a strong match', () => {
      expect(resolveMatchBand(92)).toBe('strong')
      expect(resolveMatchBand(85)).toBe('strong')
    })

    it('reports a score from 60 up to but not including 85 as a moderate match', () => {
      expect(resolveMatchBand(84.9)).toBe('moderate')
      expect(resolveMatchBand(60)).toBe('moderate')
    })

    it('reports a score below 60 as a weak match', () => {
      expect(resolveMatchBand(59.9)).toBe('weak')
      expect(resolveMatchBand(20)).toBe('weak')
    })

    it('reports a missing score as unavailable rather than as a weak match', () => {
      // FE-DEF-12's sibling rule: "not computed" is not "scored badly". An
      // anonymous request carries no score, and painting that red would report
      // a verdict nobody produced.
      expect(resolveMatchBand(null)).toBe('unavailable')
      expect(resolveMatchBand(undefined)).toBe('unavailable')
    })

    it('reports a non-numeric or non-finite score as unavailable', () => {
      expect(resolveMatchBand(NaN)).toBe('unavailable')
      expect(resolveMatchBand('85' as never)).toBe('unavailable')
    })

    it('places a score of zero in the weak band, since zero was computed', () => {
      // Distinct from the case above: 0 is a real result, null is the absence
      // of one. Treating them alike is the confusion this function exists for.
      expect(resolveMatchBand(0)).toBe('weak')
    })
  })

  describe('resolveCatalogState()', () => {
    it('shows the product grid when the catalogue arrived and products match the filters', () => {
      expect(resolveCatalogState(false, false, 12)).toBe('results')
    })

    it('shows the empty state when the catalogue arrived and no product matches the filters', () => {
      expect(resolveCatalogState(false, false, 0)).toBe('empty')
    })

    it('shows the failure state, not the empty state, when the catalogue never arrived', () => {
      // FE-DEF-09: on first load the catalogue is still [], so without a
      // separate failure flag this case reported the user's filters as having
      // excluded everything - a conclusion drawn from a request that never ran.
      expect(resolveCatalogState(false, true, 0)).toBe('failed')
    })

    it('shows the failure state rather than the products left over from the previous request', () => {
      // The re-request symptom: price controls display the new bounds while the
      // grid still holds results fetched under the old ones.
      expect(resolveCatalogState(false, true, 12)).toBe('failed')
    })

    it('reports loading while the request is in flight, whatever the previous outcome was', () => {
      expect(resolveCatalogState(true, false, 0)).toBe('loading')
      expect(resolveCatalogState(true, true, 12)).toBe('loading')
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
