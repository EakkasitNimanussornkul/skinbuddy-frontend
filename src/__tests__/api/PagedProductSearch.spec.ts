import { describe, it, expect, beforeEach, vi } from 'vitest'

// No network: both HTTP paths are mocked, as in products.spec.ts. The cases for
// feat/30's additions to the api layer live here, in a file of their own, so that
// the groups of the older specs keep their numbers.
vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn() },
}))
vi.mock('axios', () => ({
  default: { get: vi.fn() },
}))

import axios from 'axios'
import { apiClient } from '../../api/index'
import { getWithGuestFallback, getResponseWithGuestFallback } from '../../api/optionalAuth'
import { searchProducts, readTotalCount } from '../../api/products'
import { clearMetaCache, getFacets } from '../../api/metaApi'

const BASE = import.meta.env.VITE_API_URL
const config = { params: { q: 'serum' } }
const unauthorized = { response: { status: 401, data: { detail: 'Token expired' } } }

describe('feat/30 the api layer for paging and facets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearMetaCache()
    localStorage.clear()
  })

  describe('getResponseWithGuestFallback()', () => {
    it('returns the whole response, headers included, for a guest', async () => {
      const response = { data: ['guest'], headers: { 'x-total-count': '34' } }
      vi.mocked(axios.get).mockResolvedValue(response)

      await expect(getResponseWithGuestFallback('/products/search', config)).resolves.toBe(response)
      expect(axios.get).toHaveBeenCalledWith(`${BASE}/products/search`, config)
      expect(apiClient.get).not.toHaveBeenCalled()
    })

    it('returns the whole response from apiClient when a login is stored', async () => {
      localStorage.setItem('access_token', 'token-1')
      const response = { data: ['personalised'], headers: { 'x-total-count': '34' } }
      vi.mocked(apiClient.get).mockResolvedValue(response)

      await expect(getResponseWithGuestFallback('/products/search', config)).resolves.toBe(response)
      expect(apiClient.get).toHaveBeenCalledWith('/products/search', config)
    })

    it('repeats the request as a guest on 401 and rethrows any other failure', async () => {
      localStorage.setItem('access_token', 'expired-token')
      vi.mocked(apiClient.get).mockRejectedValueOnce(unauthorized)
      vi.mocked(axios.get).mockResolvedValue({ data: ['guest'], headers: {} })

      await expect(getResponseWithGuestFallback('/products/search', config)).resolves.toMatchObject({ data: ['guest'] })

      vi.mocked(apiClient.get).mockRejectedValueOnce({ response: { status: 500 } })
      await expect(getResponseWithGuestFallback('/products/search', config)).rejects.toEqual({ response: { status: 500 } })
    })

    it('leaves getWithGuestFallback returning the body only', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: ['guest'], headers: { 'x-total-count': '34' } })

      await expect(getWithGuestFallback('/products/search', config)).resolves.toEqual(['guest'])
    })
  })

  describe('getFacets()', () => {
    it('reads the categories, brands and total from the public /meta/facets route, with no login', async () => {
      localStorage.setItem('access_token', 'token-1')
      vi.mocked(axios.get).mockResolvedValue({ data: { categories: ['Serums', 'Toners'], brands: ['CeraVe', 'Anessa'], total: 34 } })

      await expect(getFacets()).resolves.toEqual({ categories: ['Serums', 'Toners'], brands: ['CeraVe', 'Anessa'], total: 34 })
      expect(axios.get).toHaveBeenCalledWith(`${BASE}/meta/facets`)
      expect(apiClient.get).not.toHaveBeenCalled()
    })

    it('asks once and serves the cached answer after that, even to two callers at once', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: { categories: ['Serums'], brands: [], total: 1 } })

      const [a, b] = await Promise.all([getFacets(), getFacets()])
      await getFacets()

      expect(a).toBe(b)
      expect(axios.get).toHaveBeenCalledTimes(1)
    })

    it('does not cache a failure (an older backend answers 404), so trying again asks again', async () => {
      vi.mocked(axios.get).mockRejectedValueOnce({ response: { status: 404 } })
      vi.mocked(axios.get).mockResolvedValueOnce({ data: { categories: ['Masks'], brands: [], total: 1 } })

      await expect(getFacets()).rejects.toEqual({ response: { status: 404 } })
      await expect(getFacets()).resolves.toMatchObject({ categories: ['Masks'] })
      expect(axios.get).toHaveBeenCalledTimes(2)
    })

    it('keeps only text entries, reads a missing total as null, and reads a reply that is not an object as null', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({ data: { categories: ['Serums', 3, '', null], brands: 'CeraVe' } })
      await expect(getFacets()).resolves.toEqual({ categories: ['Serums'], brands: [], total: null })

      clearMetaCache()
      vi.mocked(axios.get).mockResolvedValueOnce({ data: '<html></html>' })
      await expect(getFacets()).resolves.toBeNull()
    })
  })

  describe('searchProducts() paging and filters', () => {
    const asGuest = () => vi.mocked(axios.get).mockResolvedValue({ data: [{ id: 'p-1' }], headers: { 'x-total-count': '34' } })
    const sentParams = (call = 0) => (vi.mocked(axios.get).mock.calls[call]![1] as { params: Record<string, unknown> }).params

    it('sends limit, offset, category and brand when given, with an offset of 0 kept', async () => {
      asGuest()

      await searchProducts('', undefined, undefined, { view: 'card', limit: 12, offset: 0, category: 'Serums', brand: 'CeraVe' })

      expect(sentParams()).toEqual({ view: 'card', limit: 12, offset: 0, category: 'Serums', brand: 'CeraVe' })
    })

    it('sends no category or brand for All, an empty value or blank space', async () => {
      asGuest()

      await searchProducts('', undefined, undefined, { limit: 12, category: 'All', brand: '' })
      await searchProducts('x', undefined, undefined, { limit: 12, category: '  ', brand: 'All' })

      expect(sentParams(0)).toEqual({ limit: 12 })
      expect(sentParams(1)).toEqual({ q: 'x', limit: 12 })
    })

    it('trims a category or brand it sends', async () => {
      asGuest()

      await searchProducts('', undefined, undefined, { category: ' Sun Care ', brand: ' La Roche-Posay ' })

      expect(sentParams()).toEqual({ category: 'Sun Care', brand: 'La Roche-Posay' })
    })

    it('hands X-Total-Count to onTotal and still returns the rows', async () => {
      asGuest()
      const onTotal = vi.fn()

      await expect(searchProducts('', undefined, undefined, { limit: 12, offset: 0, onTotal })).resolves.toEqual([{ id: 'p-1' }])
      expect(onTotal).toHaveBeenCalledWith(34)
    })

    it('hands null to onTotal when the reply has no such header, as an older backend sends it', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: [{ id: 'p-1' }], headers: {} })
      const onTotal = vi.fn()

      await searchProducts('', undefined, undefined, { limit: 12, onTotal })

      expect(onTotal).toHaveBeenCalledWith(null)
    })

    it('does not share a paged request with an identical one in flight, since each caller wants its own total', async () => {
      asGuest()
      const first = vi.fn()
      const second = vi.fn()

      await Promise.all([
        searchProducts('', undefined, undefined, { limit: 12, offset: 0, onTotal: first }),
        searchProducts('', undefined, undefined, { limit: 12, offset: 0, onTotal: second }),
      ])

      expect(axios.get).toHaveBeenCalledTimes(2)
      expect(first).toHaveBeenCalledWith(34)
      expect(second).toHaveBeenCalledWith(34)
    })

    it('sends the same request as ever when no option is given', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: [], headers: {} })

      await searchProducts()

      expect(vi.mocked(axios.get).mock.calls[0]).toEqual([`${import.meta.env.VITE_API_URL}/products/search`, { params: {} }])
    })
  })

  describe('readTotalCount()', () => {
    it('reads X-Total-Count as a whole number, from text or a number', () => {
      expect(readTotalCount({ 'x-total-count': '34' })).toBe(34)
      expect(readTotalCount({ 'x-total-count': 0 })).toBe(0)
      expect(readTotalCount({ 'x-total-count': ' 12 ' })).toBe(12)
    })

    it('reads a missing, empty, negative, fractional or non-numeric value as null', () => {
      expect(readTotalCount(undefined)).toBeNull()
      expect(readTotalCount(null)).toBeNull()
      expect(readTotalCount({})).toBeNull()
      expect(readTotalCount({ 'x-total-count': '' })).toBeNull()
      expect(readTotalCount({ 'x-total-count': '-1' })).toBeNull()
      expect(readTotalCount({ 'x-total-count': '3.5' })).toBeNull()
      expect(readTotalCount({ 'x-total-count': 'many' })).toBeNull()
    })
  })
})
