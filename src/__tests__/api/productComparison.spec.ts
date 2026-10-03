import { describe, it, expect, beforeEach, vi } from 'vitest'

// No network: both HTTP paths are mocked, as in products.spec.ts. Kept in its
// own file, added at the end of SPEC_MAP, so the Test Record IDs the
// documentation already cites do not move.
vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn() },
}))
vi.mock('axios', () => ({
  default: { get: vi.fn() },
}))

import axios from 'axios'
import { apiClient } from '../../api/index'
import { getProductComparison } from '../../api/products'

const params = { product_a_id: 'p-a', product_b_id: 'p-b' }
const comparison = { product_a: { id: 'p-a' }, product_b: { id: 'p-b' } }

describe('src/api/products.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  // Backend fix/expired-login-401: an expired or invalid login on the
  // optional-auth product routes now gets 401 instead of a guest answer.
  describe('getProductComparison() with an expired or missing login', () => {
    it('compares as a signed-in user when the stored token is accepted', async () => {
      localStorage.setItem('access_token', 'token-1')
      vi.mocked(apiClient.get).mockResolvedValue({ data: comparison })

      await expect(getProductComparison('p-a', 'p-b')).resolves.toEqual(comparison)
      expect(apiClient.get).toHaveBeenCalledWith('/products/compare', { params })
      expect(axios.get).not.toHaveBeenCalled()
    })

    it('falls back to a guest comparison when the stored token is rejected with 401', async () => {
      // The interceptor has already cleared the session and opened the login
      // popup; the comparison must still load behind it.
      localStorage.setItem('access_token', 'expired-token')
      vi.mocked(apiClient.get).mockRejectedValue({ response: { status: 401, data: { detail: 'Token expired' } } })
      vi.mocked(axios.get).mockResolvedValue({ data: comparison })

      await expect(getProductComparison('p-a', 'p-b')).resolves.toEqual(comparison)
      expect(axios.get).toHaveBeenCalledTimes(1)
      expect(vi.mocked(axios.get).mock.calls[0]![0]).toMatch(/\/products\/compare$/)
      expect(vi.mocked(axios.get).mock.calls[0]![1]).toEqual({ params })
    })

    it('compares as a guest straight away when there is no stored token', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: comparison })

      await expect(getProductComparison('p-a', 'p-b')).resolves.toEqual(comparison)
      expect(apiClient.get).not.toHaveBeenCalled()
      expect(vi.mocked(axios.get).mock.calls[0]![1]).toEqual({ params })
    })

    it('propagates a failure that is not a 401 instead of retrying as a guest', async () => {
      localStorage.setItem('access_token', 'token-1')
      const serverError = { response: { status: 500 } }
      vi.mocked(apiClient.get).mockRejectedValue(serverError)

      await expect(getProductComparison('p-a', 'p-b')).rejects.toBe(serverError)
      expect(axios.get).not.toHaveBeenCalled()
    })
  })
})
