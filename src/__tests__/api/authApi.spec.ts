import { describe, it, expect, beforeEach, vi } from 'vitest'

// No network: exchangeLineCode uses the global fetch directly rather than the
// shared axios client, so both are replaced here.
vi.mock('../../api/index', () => ({
  apiClient: { patch: vi.fn(), get: vi.fn() },
}))

import { apiClient } from '../../api/index'
import { exchangeLineCode, updateUserSkinType } from '../../api/authApi'

describe('src/api/authApi.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  describe('exchangeLineCode()', () => {
    // NOTE FOR THE TEST RECORD: this unit is currently unreferenced by
    // application code - nothing in src/ calls exchangeLineCode. Authentication
    // runs through the LINE redirect flow in AuthCallbackView instead. The
    // function is tested here because the Test Record documents it, but the
    // document should not imply the app exercises this path.

    it('posts the authorization code as JSON to the LINE exchange endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 't', user: {} }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await exchangeLineCode('auth-code-123')

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/auth/line')
      expect(init.method).toBe('POST')
      expect(init.headers['Content-Type']).toBe('application/json')
      expect(JSON.parse(init.body)).toEqual({ code: 'auth-code-123' })
    })

    it('returns the parsed access token and user on a successful exchange', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ access_token: 'token-abc', user: { id: 'u-1' } }),
        }),
      )

      const result = await exchangeLineCode('auth-code-123')

      expect(result).toEqual({ access_token: 'token-abc', user: { id: 'u-1' } })
    })

    it('throws when the exchange responds with a non-OK status', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }))

      await expect(exchangeLineCode('bad-code')).rejects.toThrow(
        'Failed to exchange authorization code',
      )
    })
  })

  describe('updateUserSkinType()', () => {
    it('patches the current user with the new skin type only', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: { skin_type: 'OSPW' } })

      await updateUserSkinType('OSPW')

      // The backend accepts skin_type on this route and nothing else.
      expect(apiClient.patch).toHaveBeenCalledWith('/auth/me', { skin_type: 'OSPW' })
    })

    it('returns the updated user profile from the response body', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 'u-1', skin_type: 'DRNT' } })

      const result = await updateUserSkinType('DRNT')

      expect(result).toEqual({ id: 'u-1', skin_type: 'DRNT' })
    })
  })
})
