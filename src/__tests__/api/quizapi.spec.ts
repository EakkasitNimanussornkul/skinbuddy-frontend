import { describe, it, expect, beforeEach, vi } from 'vitest'

// No network: the shared axios client is replaced, so nothing reaches a backend.
vi.mock('../../api/index', () => ({
  apiClient: { post: vi.fn(), get: vi.fn(), patch: vi.fn() },
}))

import { apiClient } from '../../api/index'
import { saveSkinType } from '../../api/quizapi'

describe('src/api/quizapi.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('saveSkinType()', () => {
    it('posts the Baumann code and the four axis scores to the quiz save endpoint', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { skin_type: 'OSPW' } })
      const scores = { hydration: 12, sensitivity: 11, pigmentation: 10, aging: 13 }

      await saveSkinType('OSPW', scores)

      expect(apiClient.post).toHaveBeenCalledWith('/quiz/save', { skinType: 'OSPW', scores })
    })

    it('returns the saved profile from the response body', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { skin_type: 'DRNT', id: 'u-1' } })

      const result = await saveSkinType('DRNT', { hydration: 4, sensitivity: 4, pigmentation: 4, aging: 4 })

      expect(result).toEqual({ skin_type: 'DRNT', id: 'u-1' })
    })

    it('propagates the rejection when the backend refuses an invalid skin type with 422', async () => {
      // The backend validates against the 16 valid Baumann codes and answers 422.
      // The client must surface that, not swallow it into a success path.
      vi.mocked(apiClient.post).mockRejectedValue({ response: { status: 422 } })

      await expect(saveSkinType('XXXX', {})).rejects.toEqual({ response: { status: 422 } })
    })
  })
})
