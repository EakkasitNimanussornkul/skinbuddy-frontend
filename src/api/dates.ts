/**
 * Calendar-day helpers.
 *
 * Everywhere this application stores a date it stores a calendar day - an
 * opened date, an expiration date, `min-date` on the picker - never an instant.
 * `Date` is an instant, so converting between the two has to say which zone the
 * day belongs to, and the answer here is always the user's own: the day the
 * user sees on the calendar in front of them.
 *
 * `new Date().toISOString().split('T')[0]` gets that wrong. It reads the day in
 * UTC, so for any zone ahead of UTC it returns *yesterday* for the whole of the
 * local morning - in UTC+7 that is every day from 00:00 to 07:00 local. That is
 * how "today" became a selectable past date on the expiry picker.
 *
 * Pure and exported so the rule can be tested; this project has no
 * component-mount test layer.
 */

/** `YYYY-MM-DD` for the day `date` falls on in the *local* calendar. */
export const toLocalDateString = (date: Date = new Date()): string => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Local midnight on the calendar day `value` names, or null when it names none.
 *
 * The inverse of `toLocalDateString`. `new Date('2026-09-06')` is *UTC*
 * midnight, which is the previous day west of UTC - so the picker could open on
 * and highlight a day either side of the one that was stored. Parsing the parts
 * by hand keeps the round trip exact in every zone.
 */
export const parseLocalDate = (value: string | null | undefined): Date | null => {
  if (!value) return null

  const [yyyy, mm, dd] = value.slice(0, 10).split('-').map(Number)
  if (yyyy === undefined || mm === undefined || dd === undefined) return null
  if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null

  const parsed = new Date(yyyy, mm - 1, dd)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * `date` advanced by `months`, as a calendar day string.
 *
 * The period-after-opening arithmetic, in one place. `setMonth` rolls a day
 * that the target month does not have forward into the next month - 31 January
 * plus one month is 3 March - which is the standing behaviour here and is left
 * as it is; the point of this helper is that the result is read back in the
 * local calendar rather than in UTC.
 */
export const addMonthsAsDateString = (date: Date, months: number): string => {
  const shifted = new Date(date.getTime())
  shifted.setMonth(shifted.getMonth() + months)
  return toLocalDateString(shifted)
}
