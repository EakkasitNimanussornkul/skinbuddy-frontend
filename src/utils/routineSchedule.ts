// Routine scheduling helpers.
//
// A step has two independent schedules:
//   - time_of_day: 'AM' | 'PM' | 'both'  (which session)
//   - frequency:   'daily' | '3x_week' | '2x_week' | 'weekly'  (which days)
//
// Weekdays are AUTO-DERIVED from frequency (no DB column). The same mapping
// drives display (schedule badges + Morning/Evening/Weekly grouping) and, later,
// the 6am / 10pm "due today" notification logic.

export type Frequency = 'daily' | '3x_week' | '2x_week' | 'weekly' | string

export interface Schedulable {
  time_of_day?: string
  frequency?: string
  step_order?: number
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// 0 = Sunday … 6 = Saturday
export function weekdayNumbersFor(frequency: Frequency): number[] {
  switch (frequency) {
    case '3x_week':
      return [1, 3, 5] // Mon, Wed, Fri
    case '2x_week':
      return [2, 6] // Tue, Sat
    case 'weekly':
      return [0] // Sun
    case 'daily':
    default:
      return [0, 1, 2, 3, 4, 5, 6]
  }
}

// A human label for the step's cadence: "Daily", "Tue · Sat", "Mon · Wed · Fri", "Sun".
export function scheduleLabel(frequency: Frequency): string {
  if (!frequency || frequency === 'daily') return 'Daily'
  return weekdayNumbersFor(frequency)
    .map((n) => WEEKDAY_SHORT[n])
    .join(' · ')
}

// Is this cadence active on the given date (defaults to today)?
export function isDueToday(frequency: Frequency, date: Date = new Date()): boolean {
  return weekdayNumbersFor(frequency).includes(date.getDay())
}

const isPeriodic = (s: Schedulable) => !!s.frequency && s.frequency !== 'daily'
const timeOf = (s: Schedulable) => (s.time_of_day || 'both').toLowerCase()

// A step belongs to a session purely by time_of_day. Cadence is a separate axis:
// a 3x/week PM retinoid is still an EVENING step, it just isn't every evening.
// (Previously anything non-daily was dumped into a "Weekly" block, which left the
// user unable to tell whether it belonged to their morning or evening routine.)
const inSession = (s: Schedulable, session: 'am' | 'pm') => {
  const t = timeOf(s)
  return t === session || t === 'both'
}

// Daily steps first, then the periodic ones; application order within each.
const bySessionOrder = (a: Schedulable, b: Schedulable) => {
  const ap = isPeriodic(a) ? 1 : 0
  const bp = isPeriodic(b) ? 1 : 0
  if (ap !== bp) return ap - bp
  return (a.step_order ?? 0) - (b.step_order ?? 0)
}

// Split steps into the two routine sessions. A 'both' step appears in each.
export function groupSteps<T extends Schedulable>(steps: T[]) {
  return {
    morning: steps.filter((s) => inSession(s, 'am')).sort(bySessionOrder),
    evening: steps.filter((s) => inSession(s, 'pm')).sort(bySessionOrder),
  }
}

// Does this step run every day, or only on certain days?
export function isPeriodicStep(s: Schedulable): boolean {
  return isPeriodic(s)
}
