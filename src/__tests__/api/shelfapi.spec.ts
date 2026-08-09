import { describe, it, expect, beforeEach, vi } from 'vitest'

// No network: the shared axios client is replaced, so nothing reaches a backend.
vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { apiClient } from '../../api/index'
import { getMyShelf, addToShelf, analyzeProduct, removeFromShelf } from '../../api/shelfapi'

describe('src/api/shelfapi.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMyShelf()', () => {
    it('returns the shelf items from the response body', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: 'item-1' }] })

      const result = await getMyShelf()

      expect(apiClient.get).toHaveBeenCalledWith('/shelf/')
      expect(result).toEqual([{ id: 'item-1' }])
    })

    it('returns an empty array when the response body is empty, so callers can always iterate', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: null })

      const result = await getMyShelf()

      expect(result).toEqual([])
    })
  })

  describe('addToShelf()', () => {
    it('posts the shelf payload and returns the created item', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'new-item' } })
      const payload = { product_id: 'p-1', usage_state: 'active', opened_date: null }

      const result = await addToShelf(payload)

      expect(apiClient.post).toHaveBeenCalledWith('/shelf/add', payload)
      expect(result).toEqual({ id: 'new-item' })
    })
  })

  describe('analyzeProduct()', () => {
    it('requests the compatibility analysis for the given product id', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { is_safe: true, warnings: [] } })

      await analyzeProduct('product-123')

      expect(apiClient.get).toHaveBeenCalledWith('/shelf/analyze/product-123')
    })

    it('returns the safety verdict together with its warnings list', async () => {
      const verdict = {
        is_safe: false,
        warnings: [{ alert_type: 'conflict', severity: 'high', message: 'Do not layer with retinol' }],
      }
      vi.mocked(apiClient.get).mockResolvedValue({ data: verdict })

      const result = await analyzeProduct('product-123')

      expect(result).toEqual(verdict)
    })

    it('propagates a failed analysis instead of defaulting to a safe verdict', async () => {
      // Defaulting to "safe" on error is the bug class already fixed in the
      // compare safety checklist - an unknown result must never read as cleared.
      vi.mocked(apiClient.get).mockRejectedValue(new Error('analysis failed'))

      await expect(analyzeProduct('product-123')).rejects.toThrow('analysis failed')
    })
  })

  describe('removeFromShelf()', () => {
    it('sends a delete request for the given shelf item id', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: { ok: true } })

      await removeFromShelf('item-9')

      expect(apiClient.delete).toHaveBeenCalledWith('/shelf/item-9')
    })
  })
})
