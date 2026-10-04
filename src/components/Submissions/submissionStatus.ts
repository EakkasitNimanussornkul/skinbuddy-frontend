import type { MySubmission } from '../../api/submissionsApi'

/**
 * How a submission's status is shown to the person who sent it. The words are
 * the design's: "Waiting for review", "Published", "Not added" - never
 * "rejected", which reads as a judgement of the sender.
 */
export type SubmissionTab = 'all' | 'pending' | 'approved' | 'rejected'

export const SUBMISSION_TABS: { id: SubmissionTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Waiting' },
  { id: 'approved', label: 'Published' },
  { id: 'rejected', label: 'Not added' },
]

export const STATUS_CHIP: Record<string, { text: string; tone: string }> = {
  pending: { text: 'Waiting for review', tone: 'bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  approved: { text: 'Published', tone: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  rejected: { text: 'Not added', tone: 'bg-red-50 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
}

/** A status the page does not know (a newer backend) shows as what it says, plainly. */
export const statusChip = (status: string) =>
  STATUS_CHIP[status] ?? { text: status, tone: 'bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-200' }

export const countByTab = (rows: MySubmission[]): Record<SubmissionTab, number> => ({
  all: rows.length,
  pending: rows.filter((r) => r.status === 'pending').length,
  approved: rows.filter((r) => r.status === 'approved').length,
  rejected: rows.filter((r) => r.status === 'rejected').length,
})

export const filterByTab = (rows: MySubmission[], tab: SubmissionTab): MySubmission[] =>
  tab === 'all' ? rows : rows.filter((r) => r.status === tab)

/** "4 Oct 2026". Null for a missing or unreadable date, so nothing invented is shown. */
export const formatDay = (value: string | null): string | null => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * The line under a card's name: when it was sent, then what is most useful for
 * its status - its category and size while waiting, when it was published or
 * reviewed after that.
 */
export const describeSubmission = (row: MySubmission): string => {
  const parts: string[] = []
  const sentOn = formatDay(row.created_at)
  if (sentOn) parts.push(`Sent ${sentOn}`)
  const reviewedOn = formatDay(row.reviewed_at)
  if (row.status === 'approved' && reviewedOn) parts.push(`Published ${reviewedOn}`)
  else if (row.status === 'rejected' && reviewedOn) parts.push(`Reviewed ${reviewedOn}`)
  else {
    if (row.summary.category) parts.push(row.summary.category)
    const n = row.summary.ingredient_count
    if (n !== null) parts.push(n === 1 ? '1 ingredient' : `${n} ingredients`)
  }
  return parts.join(' · ')
}
