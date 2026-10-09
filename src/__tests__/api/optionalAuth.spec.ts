import { describe, it, expect, beforeEach, vi } from 'vitest'

// No network: both HTTP paths are mocked, as in products.spec.ts.
vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn() },
}))
vi.mock('axios', () => ({
  default: { get: vi.fn() },
}))

import axios from 'axios'
import { apiClient } from '../../api/index'
import { getWithGuestFallback } from '../../api/optionalAuth'

const BASE = import.meta.env.VITE_API_URL
const config = { params: { q: 'serum' } }
const unauthorized = { response: { status: 401, data: { detail: 'Token expired' } } }

describe('src/api/optionalAuth.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('getWithGuestFallback()', () => {
    it('sends a guest request, never through apiClient, when no login is stored', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: ['guest'] })

      await expect(getWithGuestFallback('/products/search', config)).resolves.toEqual(['guest'])
      expect(axios.get).toHaveBeenCalledWith(`${BASE}/products/search`, config)
      expect(apiClient.get).not.toHaveBeenCalled()
    })

    it('sends the request through apiClient, which attaches the login, when one is stored', async () => {
      localStorage.setItem('access_token', 'token-1')
      vi.mocked(apiClient.get).mockResolvedValue({ data: ['personalised'] })

      await expect(getWithGuestFallback('/products/search', config)).resolves.toEqual(['personalised'])
      expect(apiClient.get).toHaveBeenCalledWith('/products/search', config)
      expect(axios.get).not.toHaveBeenCalled()
    })

    it('repeats the same request as a guest when the stored login is rejected with 401', async () => {
      localStorage.setItem('access_token', 'expired-token')
      vi.mocked(apiClient.get).mockRejectedValue(unauthorized)
      vi.mocked(axios.get).mockResolvedValue({ data: ['guest'] })

      await expect(getWithGuestFallback('/products/compare', config)).resolves.toEqual(['guest'])
      expect(axios.get).toHaveBeenCalledTimes(1)
      expect(axios.get).toHaveBeenCalledWith(`${BASE}/products/compare`, config)
    })

    it('passes no config at all when none is given, on every path', async () => {
      // The slug lookup calls get(path) with one argument; the helper must not
      // add an empty config.
      vi.mocked(axios.get).mockResolvedValue({ data: {} })
      await getWithGuestFallback('/products/slug/a')
      expect(vi.mocked(axios.get).mock.calls[0]).toEqual([`${BASE}/products/slug/a`])

      localStorage.setItem('access_token', 'token-1')
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: {} })
      await getWithGuestFallback('/products/slug/b')
      expect(vi.mocked(apiClient.get).mock.calls[0]).toEqual(['/products/slug/b'])

      vi.mocked(apiClient.get).mockRejectedValueOnce(unauthorized)
      await getWithGuestFallback('/products/slug/c')
      expect(vi.mocked(axios.get).mock.calls[1]).toEqual([`${BASE}/products/slug/c`])
    })

    it('rethrows a failure that is not a 401, without a guest retry', async () => {
      localStorage.setItem('access_token', 'token-1')
      const serverError = { response: { status: 500 } }
      vi.mocked(apiClient.get).mockRejectedValue(serverError)

      await expect(getWithGuestFallback('/products/search', config)).rejects.toBe(serverError)
      expect(axios.get).not.toHaveBeenCalled()
    })

    it('rethrows a failure with no response at all, such as a network error', async () => {
      localStorage.setItem('access_token', 'token-1')
      const networkError = new Error('Network Error')
      vi.mocked(apiClient.get).mockRejectedValue(networkError)

      await expect(getWithGuestFallback('/products/search', config)).rejects.toBe(networkError)
      expect(axios.get).not.toHaveBeenCalled()
    })

    it('surfaces a failure of the guest retry itself', async () => {
      localStorage.setItem('access_token', 'expired-token')
      vi.mocked(apiClient.get).mockRejectedValue(unauthorized)
      const guestError = { response: { status: 503 } }
      vi.mocked(axios.get).mockRejectedValue(guestError)

      await expect(getWithGuestFallback('/products/search', config)).rejects.toBe(guestError)
    })
  })

  // A guard on the code itself: the guest retry belongs to the optional-auth
  // product routes only. A protected route that retried as a guest would hide
  // a required sign-in; a product route that skipped the helper would fail
  // for anyone whose login had expired.
  describe('which API modules use the guest fallback', () => {
    const sources = import.meta.glob('../../api/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    const named = (file: string) => sources[`../../api/${file}`]!

    it('is used by the product routes, which never call apiClient directly', () => {
      expect(named('products.ts')).toContain('getWithGuestFallback')
      // Real uses only - an import or a call - since a comment there names it.
      expect(named('products.ts')).not.toMatch(/import\s*{[^}]*\bapiClient\b[^}]*}/)
      expect(named('products.ts')).not.toMatch(/\bapiClient\s*\./)
    })

    it('is used by no other API module, so protected routes still require a sign-in', () => {
      const others = Object.entries(sources)
        .filter(([file]) => !/\/(products|optionalAuth)\.ts$/.test(file))
        .filter(([, text]) => text.includes('getWithGuestFallback') || text.includes('optionalAuth'))
        .map(([file]) => file)

      expect(others).toEqual([])
    })
  })
})
