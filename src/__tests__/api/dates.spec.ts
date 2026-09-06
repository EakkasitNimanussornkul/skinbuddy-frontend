import { describe, it, expect, afterEach, vi } from 'vitest'

import { toLocalDateString, parseLocalDate, addMonthsAsDateString } from '../../api/dates'

/**
 * These three replace `new Date().toISOString().split('T')[0]`, which reads the
 * calendar day in UTC. Every date this application stores is a calendar day in
 * the user's own zone, so the two disagree for part of every day - and that
 * disagreement is what let the expiry picker offer yesterday as a valid date.
 *
 * The suite runs in the machine's own zone rather than pinning one, so the
 * assertions are written against what the local calendar says rather than
 * against fixed strings.
 */
describe('src/api/dates.ts', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('toLocalDateString()', () => {
    it('returns the day the date falls on in the local calendar, zero padded', () => {
      expect(toLocalDateString(new Date(2026, 8, 6))).toBe('2026-09-06')
      expect(toLocalDateString(new Date(2026, 0, 1))).toBe('2026-01-01')
    })

    it('still reports the local day for an instant that falls on a different day in UTC', () => {
      // 23:30 local on the 6th. East of UTC this is still the 6th in UTC; west
      // of it, it is the 7th - and toISOString() would say so. The local
      // calendar says the 6th either way, and that is the day the user picked.
      const lateEvening = new Date(2026, 8, 6, 23, 30)

      expect(toLocalDateString(lateEvening)).toBe('2026-09-06')
    })

    it('reports today when called with no argument', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 8, 6, 2, 0))

      expect(toLocalDateString()).toBe('2026-09-06')
    })
  })

  describe('parseLocalDate()', () => {
    it('reads a date string as local midnight on the day it names', () => {
      const parsed = parseLocalDate('2026-09-06')

      expect(parsed?.getFullYear()).toBe(2026)
      expect(parsed?.getMonth()).toBe(8)
      expect(parsed?.getDate()).toBe(6)
      expect(parsed?.getHours()).toBe(0)
    })

    it('round trips with toLocalDateString in the machine local zone', () => {
      expect(toLocalDateString(parseLocalDate('2026-01-31')!)).toBe('2026-01-31')
    })

    it('ignores a time portion and keeps the calendar day', () => {
      expect(toLocalDateString(parseLocalDate('2026-09-06T22:00:00Z')!)).toBe('2026-09-06')
    })

    it('returns null for an absent date rather than the epoch', () => {
      expect(parseLocalDate(null)).toBeNull()
      expect(parseLocalDate(undefined)).toBeNull()
      expect(parseLocalDate('')).toBeNull()
    })

    it('returns null for a string that names no date', () => {
      expect(parseLocalDate('not a date')).toBeNull()
    })
  })

  describe('addMonthsAsDateString()', () => {
    it('advances the date by the given number of months', () => {
      expect(addMonthsAsDateString(new Date(2026, 8, 6), 3)).toBe('2026-12-06')
    })

    it('carries the year over when the period runs past December', () => {
      expect(addMonthsAsDateString(new Date(2026, 8, 6), 6)).toBe('2027-03-06')
    })

    it('rolls a day the target month does not have into the following month', () => {
      // 31 January plus one month has no 31 February, so setMonth moves it to
      // 3 March. Recorded because it is the standing behaviour of every period
      // button in the shelf, not because it is the desired answer.
      expect(addMonthsAsDateString(new Date(2026, 0, 31), 1)).toBe('2026-03-03')
    })

    it('leaves the source date unchanged', () => {
      const source = new Date(2026, 8, 6)
      addMonthsAsDateString(source, 12)

      expect(toLocalDateString(source)).toBe('2026-09-06')
    })
  })
})
