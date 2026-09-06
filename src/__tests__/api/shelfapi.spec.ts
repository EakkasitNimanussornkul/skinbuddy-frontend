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
  paoPeriodHasElapsed,
} from '../../api/shelfapi'
import { toLocalDateString } from '../../api/dates'

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
    // Asserted through toLocalDateString, not toISOString. These three read the
    // result back in UTC until FE-DEF-22, which is the same mistake the function
    // itself was making: an expiry is a calendar day, and reading it in UTC
    // moves it by a day for most of every day.
    it('uses the stored expiration date when the item has one', () => {
      const d = resolveExpiryDate({ expiration_date: '2027-03-01', opened_date: '2020-01-01', pao: 3 })

      expect(toLocalDateString(d!)).toBe('2027-03-01')
    })

    it('falls back to the opened date plus the period after opening when no date is stored', () => {
      // FE-DEF-16: this branch existed in ShelfCard and was missing from
      // ShelfView's status filter, so the two disagreed about the same item.
      const d = resolveExpiryDate({ opened_date: '2026-01-15', pao: 3 })

      expect(toLocalDateString(d!)).toBe('2026-04-15')
    })

    it('accepts a period after opening given as a string such as "6"', () => {
      const d = resolveExpiryDate({ opened_date: '2026-01-15', pao: '6' })

      expect(toLocalDateString(d!)).toBe('2026-07-15')
    })

    it('reads a stored date as local midnight, not as the UTC instant of that day', () => {
      // FE-DEF-22. Under new Date() this returned 07:00 local in UTC+7, which
      // pushed every countdown taken from it into the following morning.
      const d = resolveExpiryDate({ expiration_date: '2026-09-06' })

      expect(d?.getHours()).toBe(0)
      expect(d?.getDate()).toBe(6)
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

    it('reports an item that expired yesterday as past due when checked early in the morning', () => {
      // FE-DEF-22, the case that was live. Checked at 06:00 on the 7th, an
      // expiry of the 6th used to come back as 0 - which reads "In 0 days" on
      // the card and classifies as Expiring Soon, so the Expired filter hid the
      // item it is named after. The same shape as FE-DEF-16, one layer down.
      const days = daysUntilExpiry({ expiration_date: '2026-09-06' }, new Date(2026, 8, 7, 6, 0))

      expect(days).toBe(-1)
    })

    it('reports an item expiring today as having no days left rather than as past due', () => {
      const days = daysUntilExpiry({ expiration_date: '2026-09-06' }, new Date(2026, 8, 6, 18, 0))

      expect(days).toBe(0)
    })
  })

  describe('resolveShelfItemStatus()', () => {
    // A local Date, not a UTC instant: every date these cards reason about is a
    // calendar day, so pinning the clock to one keeps the assertions true in
    // whatever zone the suite is run in.
    const now = new Date(2026, 5, 1)

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

    it('reports an item that expired yesterday as Expired when checked early in the morning', () => {
      // FE-DEF-22 at the level the Expired filter reads. This returned
      // "Expiring Soon" before, so the pill named after the state did not list
      // the item in it.
      const s = resolveShelfItemStatus(
        { usage_state: 'active', expiration_date: '2026-09-06' },
        new Date(2026, 8, 7, 6, 0),
      )

      expect(s).toBe('Expired')
    })
  })

  describe('paoPeriodHasElapsed()', () => {
    // The rule behind the greyed period buttons in the expiry edit panel. It
    // exists so the buttons and the calendar beside them enforce one rule -
    // FE-DEF-19 was that the calendar refused past dates and the buttons wrote
    // them anyway.
    const now = new Date(2026, 8, 6)

    it('reports a period that ran out before today as elapsed', () => {
      // Opened eight months ago, three month period: ran out five months ago.
      expect(paoPeriodHasElapsed('2026-01-06', 3, now)).toBe(true)
    })

    it('reports a period still running as not elapsed', () => {
      expect(paoPeriodHasElapsed('2026-01-06', 12, now)).toBe(false)
    })

    it('treats a period ending today as still running, so today stays selectable', () => {
      // The boundary the calendar draws in the same panel: today is the first
      // day it enables, so the button that lands on today must stay enabled.
      expect(paoPeriodHasElapsed('2026-06-06', 3, now)).toBe(false)
    })

    it('reports a period that ended yesterday as elapsed', () => {
      // One day either side of the boundary, to pin it rather than assume it.
      expect(paoPeriodHasElapsed('2026-06-05', 3, now)).toBe(true)
    })

    it('reports no period as elapsed when the item has no opened date', () => {
      // The panel only shows these buttons for an opened item, so this is a
      // guard rather than a reachable branch - but returning true here would
      // grey out every option on a product with nothing wrong with it.
      expect(paoPeriodHasElapsed(null, 3, now)).toBe(false)
      expect(paoPeriodHasElapsed('', 3, now)).toBe(false)
      expect(paoPeriodHasElapsed('not a date', 3, now)).toBe(false)
    })

    it('reports no period as elapsed when the period is not a number', () => {
      expect(paoPeriodHasElapsed('2020-01-01', Number.NaN, now)).toBe(false)
    })
  })
})
