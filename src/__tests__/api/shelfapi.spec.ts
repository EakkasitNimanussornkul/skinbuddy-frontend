import { describe, it, expect, beforeEach, vi } from 'vitest'

// No network: the shared axios client is replaced, so nothing reaches a backend.
vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { apiClient } from '../../api/index'
import {
  getMyShelf,
  addToShelf,
  analyzeProduct,
  markItemOpened,
  updateShelfStatus,
  removeFromShelf,
  resolveExpiryDate,
  daysUntilExpiry,
  resolveShelfItemStatus,
} from '../../api/shelfapi'

describe('src/api/shelfapi.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMyShelf()', () => {
    it('returns the shelf items from the response body', async () => {
      const row = {
        id: 'item-1',
        user_id: 'user-1',
        product_id: 'p-1',
        usage_state: 'active',
        opened_date: '2026-08-01',
        expiration_date: '2026-11-01',
        pao: 3,
        archive_outcome: null,
        archive_notes: null,
        archived_at: null,
        products: { id: 'p-1', brand: 'CeraVe', name: 'Cleanser' },
      }
      vi.mocked(apiClient.get).mockResolvedValue({ data: [row] })

      const result = await getMyShelf()

      expect(apiClient.get).toHaveBeenCalledWith('/shelf/')
      expect(result).toEqual([row])
    })

    it('returns an empty array when the response body is empty, so callers can always iterate', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: null })

      const result = await getMyShelf()

      expect(result).toEqual([])
    })

    it('fills in the nullable columns a partial row omits, so templates never read undefined', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: 'item-1', usage_state: 'active' }] })

      const result = await getMyShelf()

      expect(result[0]).toMatchObject({
        opened_date: null,
        expiration_date: null,
        pao: null,
        archived_at: null,
        products: null,
      })
    })

    it('falls back to unopened when the backend sends a usage_state the UI does not know', async () => {
      // Guards the exact drift this normaliser exists for: an unrecognised
      // state must not reach the components as-is.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: 'item-1', usage_state: 'wishlist' }] })

      const result = await getMyShelf()

      expect(result[0]!.usage_state).toBe('unopened')
      expect(warn).toHaveBeenCalled()
      warn.mockRestore()
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

  describe('markItemOpened()', () => {
    it('sends the opened date, expiration date and usage state through to the open endpoint unchanged', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 'item-1' } })

      await markItemOpened('item-1', '2026-08-01', '2026-11-01', 'active', 3)

      expect(apiClient.patch).toHaveBeenCalledWith('/shelf/item-1/open', {
        opened_date: '2026-08-01',
        expiration_date: '2026-11-01',
        usage_state: 'active',
        pao: 3,
      })
    })

    it('converts a PAO string such as "3M" to the integer 3 rather than forwarding the raw string', async () => {
      // Reachable from ProductLifecycleController: activeEditPao is number|null,
      // but line 53 falls back to props.item.pao, which the API can hand back as
      // "3M" - the template formats it with String(item.pao).replace('M', '').
      //
      // Note the .replace('M', '') in shelfapi is redundant: parseInt('3M') is
      // already 3. This asserts the conversion, which is the part that matters -
      // it cannot distinguish the replace from parseInt's own behaviour.
      vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })

      await markItemOpened('item-1', '2026-08-01', null, 'active', '3M')

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/shelf/item-1/open',
        expect.objectContaining({ pao: 3 }),
      )
    })

    it('sends a null PAO when the caller omits the argument', async () => {
      // The `pao ? ... : null` guard also nulls a numeric 0. paoOptions starts
      // at 1 so that is not reachable today; noted so it is not a surprise later.
      vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })

      await markItemOpened('item-1', '2026-08-01', null, 'active')

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/shelf/item-1/open',
        expect.objectContaining({ pao: null }),
      )
    })

    it('returns the updated item from the response body', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 'item-1', usage_state: 'active' } })

      const result = await markItemOpened('item-1', '2026-08-01', null, 'active', 3)

      expect(result).toEqual({ id: 'item-1', usage_state: 'active' })
    })
  })

  describe('updateShelfStatus()', () => {
    it('patches the status endpoint with the usage state and every metadata field supplied', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })

      await updateShelfStatus('item-7', 'archived', {
        outcome: 'empty',
        notes: 'used it up',
        archived_at: '2026-08-10T00:00:00.000Z',
      })

      expect(apiClient.patch).toHaveBeenCalledWith('/shelf/item-7/status', {
        usage_state: 'archived',
        outcome: 'empty',
        notes: 'used it up',
        archived_at: '2026-08-10T00:00:00.000Z',
      })
    })

    it('defaults outcome, notes and archived_at to null when no metadata object is passed', async () => {
      // ProductLifecycleController.vue:101 calls this with no third argument.
      vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })

      await updateShelfStatus('item-7', 'active')

      expect(apiClient.patch).toHaveBeenCalledWith('/shelf/item-7/status', {
        usage_state: 'active',
        outcome: null,
        notes: null,
        archived_at: null,
      })
    })

    it('preserves an empty notes string instead of collapsing it to null', async () => {
      // ArchiveLogForm binds notes to ref(''), so archiving without typing one
      // sends ''. The `!== undefined` checks exist for exactly this case - `||`
      // would turn it into null and lose "left blank" versus "not provided".
      vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })

      await updateShelfStatus('item-7', 'archived', { outcome: 'discarded', notes: '' })

      expect(apiClient.patch).toHaveBeenCalledWith('/shelf/item-7/status', {
        usage_state: 'archived',
        outcome: 'discarded',
        notes: '',
        archived_at: null,
      })
    })

    it('returns the updated item from the response body', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: { id: 'item-7', usage_state: 'archived' },
      })

      const result = await updateShelfStatus('item-7', 'archived')

      expect(result).toEqual({ id: 'item-7', usage_state: 'archived' })
    })
  })

  describe('removeFromShelf()', () => {
    it('sends a delete request for the given shelf item id', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: { ok: true } })

      await removeFromShelf('item-9')

      expect(apiClient.delete).toHaveBeenCalledWith('/shelf/item-9')
    })
  })

  describe('resolveExpiryDate()', () => {
    it('uses the stored expiration date when the item has one', () => {
      const d = resolveExpiryDate({ expiration_date: '2027-03-01', opened_date: '2020-01-01', pao: 3 })

      expect(d?.toISOString().slice(0, 10)).toBe('2027-03-01')
    })

    it('falls back to the opened date plus the period after opening when no date is stored', () => {
      // FE-DEF-16: this branch existed in ShelfCard and was missing from
      // ShelfView's status filter, so the two disagreed about the same item.
      const d = resolveExpiryDate({ opened_date: '2026-01-15', pao: 3 })

      expect(d?.toISOString().slice(0, 10)).toBe('2026-04-15')
    })

    it('accepts a period after opening given as a string such as "6"', () => {
      const d = resolveExpiryDate({ opened_date: '2026-01-15', pao: '6' })

      expect(d?.toISOString().slice(0, 10)).toBe('2026-07-15')
    })

    it('returns null when there is neither a stored date nor an opened date', () => {
      expect(resolveExpiryDate({ pao: 6 })).toBeNull()
    })

    it('returns null when an opened date has no period after opening to add', () => {
      expect(resolveExpiryDate({ opened_date: '2026-01-15', pao: null })).toBeNull()
    })

    it('returns null rather than an Invalid Date when a stored date cannot be parsed', () => {
      expect(resolveExpiryDate({ expiration_date: 'not-a-date' })).toBeNull()
    })
  })

  describe('daysUntilExpiry()', () => {
    it('counts forward to an expiry still in the future', () => {
      const days = daysUntilExpiry({ expiration_date: '2026-01-31' }, new Date('2026-01-01T00:00:00Z'))

      expect(days).toBe(30)
    })

    it('returns a negative count once the expiry has passed', () => {
      const days = daysUntilExpiry({ expiration_date: '2026-01-01' }, new Date('2026-03-01T00:00:00Z'))

      expect(days).toBeLessThan(0)
    })

    it('returns null when no expiry can be determined, rather than treating it as expired', () => {
      expect(daysUntilExpiry({ pao: 6 }, new Date('2026-01-01T00:00:00Z'))).toBeNull()
    })
  })

  describe('resolveShelfItemStatus()', () => {
    const now = new Date('2026-06-01T00:00:00Z')

    it('reports an archived item as Archived whatever its dates say', () => {
      const s = resolveShelfItemStatus({ usage_state: 'archived', expiration_date: '2020-01-01' }, now)

      expect(s).toBe('Archived')
    })

    it('reports an item past its expiry as Expired', () => {
      expect(resolveShelfItemStatus({ usage_state: 'active', expiration_date: '2026-01-01' }, now)).toBe('Expired')
    })

    it('reports an item within thirty days of expiry as Expiring Soon', () => {
      expect(resolveShelfItemStatus({ usage_state: 'active', expiration_date: '2026-06-20' }, now)).toBe('Expiring Soon')
    })

    it('classifies an item by its opened date and period when no expiry date is stored', () => {
      // The case FE-DEF-16 was about: the card called this Expired while the
      // filter called it In Routine, so the Expired pill hid it.
      const s = resolveShelfItemStatus({ usage_state: 'active', opened_date: '2026-01-01', pao: 3 }, now)

      expect(s).toBe('Expired')
    })

    it('reports an opened item with no determinable expiry as In Routine', () => {
      expect(resolveShelfItemStatus({ usage_state: 'active' }, now)).toBe('In Routine')
    })

    it('reports an unopened item with no determinable expiry as Unopened', () => {
      expect(resolveShelfItemStatus({ usage_state: 'unopened' }, now)).toBe('Unopened')
    })
  })
})
