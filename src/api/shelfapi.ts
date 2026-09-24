import { apiClient } from './index'
import { addMonthsAsDateString, parseLocalDate, toLocalDateString } from './dates'
import type { ShelfItem, UsageState } from '../stores/shelfStore'

const USAGE_STATES: readonly string[] = ['unopened', 'active', 'archived']

/**
 * GET /shelf/ returns raw Supabase rows, so this is the one place the response
 * is checked against ShelfItem. Normalising here means a backend rename shows
 * up as a console warning at the boundary instead of as a silently `undefined`
 * field deep inside a template.
 */
const toShelfItem = (row: any): ShelfItem => {
  if (!USAGE_STATES.includes(row?.usage_state)) {
    console.warn(`Unexpected shelf usage_state: ${JSON.stringify(row?.usage_state)}`)
  }

  return {
    ...row,
    usage_state: (USAGE_STATES.includes(row?.usage_state)
      ? row.usage_state
      : 'unopened') as UsageState,
    opened_date: row?.opened_date ?? null,
    expiration_date: row?.expiration_date ?? null,
    pao: row?.pao == null ? null : Number(row.pao),
    archive_outcome: row?.archive_outcome ?? null,
    archive_notes: row?.archive_notes ?? null,
    archived_at: row?.archived_at ?? null,
    products: row?.products ?? null
  }
}

export const getMyShelf = async (): Promise<ShelfItem[]> => {
  const response = await apiClient.get('/shelf/')
  return Array.isArray(response.data) ? response.data.map(toShelfItem) : []
}

// NOTE: unlike GET /shelf/, this response is a bare shelf_items row with no
// `products` join, so the caller gets no brand/name until the shelf reloads.
export const addToShelf = async (shelfData: {
  product_id: string
  usage_state: string
  opened_date?: string | null
  expiration_date?: string | null
  pao?: number | null
}) => {
  const response = await apiClient.post('/shelf/add', shelfData)
  return response.data
}

export const analyzeProduct = async (productId: string) => {
  const response = await apiClient.get(`/shelf/analyze/${productId}`)
  return response.data
}

export const markItemOpened = async (
  itemId: string,
  openedDate: string,
  expirationDate: string | null,
  usageState: string,
  pao?: number | string | null
) => {
  const parsedPao = pao ? (typeof pao === 'string' ? parseInt(pao.replace('M', '')) : pao) : null

  const response = await apiClient.patch(`/shelf/${itemId}/open`, {
    opened_date: openedDate,
    expiration_date: expirationDate,
    usage_state: usageState,
    pao: parsedPao
  })
  return response.data
}

export const updateShelfStatus = async (
  itemId: string,
  usageState: string,
  metadata?: { outcome?: string | null; notes?: string | null; archived_at?: string | null }
) => {
  const url = `/shelf/${itemId}/status`
  const response = await apiClient.patch(url, {
    usage_state: usageState,
    outcome: metadata?.outcome !== undefined ? metadata.outcome : null,
    notes: metadata?.notes !== undefined ? metadata.notes : null,
    archived_at: metadata?.archived_at !== undefined ? metadata.archived_at : null
  })

  return response.data
}

export const removeFromShelf = async (itemId: string) => {
  const response = await apiClient.delete(`/shelf/${itemId}`)
  return response.data
}

/**
 * The date a shelf item expires, or null when it cannot be determined.
 *
 * Two rules, in order: an explicitly stored expiration date wins; failing that,
 * the opened date plus the period after opening. The second is the one
 * ShelfView's status filter was missing (FE-DEF-13's sibling, FE-DEF-16), which
 * let a card read "Expired" while the Expired filter classified the same item
 * as "In Routine".
 *
 * Pure and exported so both consumers share one rule and so the rule can be
 * tested - this project has no component-mount layer.
 *
 * Both dates are read as local calendar days (FE-DEF-22). Under `new Date()`
 * they were read as UTC midnight, which in UTC+7 is 07:00 the same morning - so
 * for the first seven hours of every day an item that expired yesterday counted
 * as zero days left and read "Expiring Soon" on its card while the Expired
 * filter did not list it. That is FE-DEF-16's symptom exactly, reappearing
 * inside the function extracted to end it.
 */
export const resolveExpiryDate = (item: {
  expiration_date?: string | null
  opened_date?: string | null
  pao?: number | string | null
}): Date | null => {
  if (!item) return null

  if (item.expiration_date) {
    return parseLocalDate(item.expiration_date)
  }

  if (!item.opened_date || item.pao === null || item.pao === undefined) return null

  const months = parseInt(String(item.pao))
  if (Number.isNaN(months)) return null

  const opened = parseLocalDate(item.opened_date)
  if (!opened) return null

  opened.setMonth(opened.getMonth() + months)
  return opened
}

/**
 * `Archived` `Expired` `Expiring Soon` `Active` `Unopened`
 *
 * The single derivation behind both the card badge and the status filter. It
 * previously existed twice, in ShelfCard and ShelfView, and the two disagreed.
 *
 * `Active` replaces what was called `In Routine`. That name described the
 * lifecycle column, not the routine: every item with usage_state 'active' was
 * listed under it whether or not any routine step used it. Routine membership
 * is now its own fact - see resolveRoutineShelfIds - because an item can be in
 * use without being in the routine, and in the routine without being opened.
 */
export type ShelfItemStatus =
  | 'Archived'
  | 'Expired'
  | 'Expiring Soon'
  | 'Active'
  | 'Unopened'

/**
 * Whether the product has been opened, read from the opened date alone.
 *
 * Not from usage_state. Adding an off-shelf product to a routine stores it with
 * usage_state 'active' and no opened date - the routine modal and the backend's
 * routine apply both do this - so the state column says "active" for a product
 * nobody has opened. The card called that "Active", the filter "In Routine",
 * and the item's own details panel, which reads the opened date, "Status:
 * Unopened". The opened date is what starts the period-after-opening clock, so
 * it is the one field that can answer the question.
 */
export const isShelfItemOpened = (item: { opened_date?: string | null } | null | undefined): boolean =>
  Boolean(item?.opened_date)

/** Days from `now` until expiry; negative once past. Null when undeterminable. */
export const daysUntilExpiry = (
  item: Parameters<typeof resolveExpiryDate>[0],
  now: Date = new Date(),
): number | null => {
  const target = resolveExpiryDate(item)
  if (!target) return null

  // Math.ceil of any value in (-1, 0) is -0, which is what an item expiring
  // later today produces. It behaves as zero everywhere this is currently read
  // - `-0 < 0` is false, and it prints as "0" - but handing a negative zero out
  // of a shared helper is a trap for the next caller. Normalised here, where
  // -0 === 0 makes the comparison do the work.
  const days = Math.ceil((target.getTime() - now.getTime()) / (1000 * 3600 * 24))
  return days === 0 ? 0 : days
}

/**
 * True when a period of `months` begun on `openedDate` has already run out.
 *
 * The other half of FE-DEF-19. The edit panel's period buttons compute an
 * expiry from the item's opened date, so for a product opened longer ago than
 * the period they produce a date in the past - which the calendar sitting
 * beside them refuses. This is the predicate that lets the buttons refuse it
 * too, so one rule governs the whole panel: an expiry date is not set by hand
 * to a day that has already passed.
 *
 * Nothing is lost by refusing. `resolveExpiryDate` already falls back to
 * opened date plus period when no expiration date is stored, so such an item
 * reads "Expired" on its card and in the status filter whether or not the date
 * is written into the field.
 *
 * The comparison is on `YYYY-MM-DD` strings, whose lexicographic order is
 * their chronological order - no second Date parse, and no time-of-day to make
 * "today" compare as past.
 */
export const paoPeriodHasElapsed = (
  openedDate: string | null | undefined,
  months: number,
  now: Date = new Date(),
): boolean => {
  const opened = parseLocalDate(openedDate)
  if (!opened || !Number.isFinite(months)) return false

  return addMonthsAsDateString(opened, months) < toLocalDateString(now)
}

export const resolveShelfItemStatus = (
  item: Parameters<typeof resolveExpiryDate>[0] & { usage_state?: string | null },
  now: Date = new Date(),
): ShelfItemStatus => {
  const state = item?.usage_state || 'unopened'
  if (state === 'archived') return 'Archived'

  const daysLeft = daysUntilExpiry(item, now)
  if (daysLeft !== null) {
    if (daysLeft < 0) return 'Expired'
    if (daysLeft <= 30) return 'Expiring Soon'
  }

  return isShelfItemOpened(item) ? 'Active' : 'Unopened'
}

/**
 * The ids of the shelf items the active routine uses.
 *
 * A step names its shelf item when it was added with one; a step without one
 * (the add-step request makes it optional) is matched to the shelf by product.
 * Archived items are left out: the shelf lists them apart from everything in
 * use, and an archived product still referenced by a step is not one the user
 * is using.
 */
export const resolveRoutineShelfIds = (
  steps: ReadonlyArray<{ shelf_item_id?: string | null; product_id?: string | null }> | null | undefined,
  shelf: ReadonlyArray<{ id: string; product_id?: string | null; usage_state?: string | null }>,
): Set<string> => {
  const ids = new Set<string>()
  const live = shelf.filter((item) => item.usage_state !== 'archived')

  for (const step of steps ?? []) {
    if (step.shelf_item_id) {
      if (live.some((item) => item.id === step.shelf_item_id)) ids.add(step.shelf_item_id)
      continue
    }
    for (const item of live) {
      if (step.product_id && item.product_id === step.product_id) ids.add(item.id)
    }
  }

  return ids
}

/**
 * `attention` `calm` `expiry` `name` `brand`
 *
 * The shelf's sort orders. GET /shelf/ has no ORDER BY, so the shelf used to
 * show rows in whatever order the database returned them - which moves a row
 * whenever it is updated, and read to users as "most recently edited first".
 */
export type ShelfSort = 'attention' | 'calm' | 'expiry' | 'name' | 'brand'

export const SHELF_SORTS: ReadonlyArray<{ value: ShelfSort; label: string }> = [
  { value: 'attention', label: 'Needs attention first' },
  { value: 'calm', label: 'Least urgent first' },
  { value: 'expiry', label: 'Expiry date, soonest first' },
  { value: 'name', label: 'Product name, A to Z' },
  { value: 'brand', label: 'Brand, A to Z' },
]

// Owner's order: expired, then expiring, then what is in use. Unopened after
// those - no clock is running on it - and archived last.
const STATUS_RANK: Record<ShelfItemStatus, number> = {
  Expired: 0,
  'Expiring Soon': 1,
  Active: 2,
  Unopened: 3,
  Archived: 4,
}

type SortableShelfItem = Parameters<typeof resolveShelfItemStatus>[0] & {
  id: string
  archived_at?: string | null
  products?: { name?: string | null; brand?: string | null } | null
}

/** -1, 0 or 1, and safe for Infinity - `Infinity - Infinity` is NaN. */
const compareNumbers = (a: number, b: number) => (a === b ? 0 : a < b ? -1 : 1)

const compareText = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? '').localeCompare(b ?? '', undefined, { sensitivity: 'base' })

/**
 * The shelf in the given order, as a new array.
 *
 * Within one status, items the routine uses come first ("Active & In Routine"),
 * then the soonest expiry - an item with no expiry after every dated one - and
 * then the name, so the order is fully decided and never depends on the order
 * the rows arrived in. Archived items, which only share a status with each
 * other, go most recently archived first.
 */
export const sortShelfItems = <T extends SortableShelfItem>(
  items: readonly T[],
  sort: ShelfSort,
  routineIds: ReadonlySet<string> = new Set(),
  now: Date = new Date(),
): T[] => {
  const status = new Map(items.map((item) => [item.id, STATUS_RANK[resolveShelfItemStatus(item, now)]]))
  const daysLeft = new Map(items.map((item) => [item.id, daysUntilExpiry(item, now) ?? Infinity]))

  const byName = (a: T, b: T) => compareText(a.products?.name, b.products?.name)
  const inRoutineFirst = (a: T, b: T) => Number(routineIds.has(b.id)) - Number(routineIds.has(a.id))
  const soonestFirst = (a: T, b: T) => compareNumbers(daysLeft.get(a.id)!, daysLeft.get(b.id)!)
  const latestArchivedFirst = (a: T, b: T) => compareText(b.archived_at, a.archived_at)
  const withinStatus = (a: T, b: T) =>
    inRoutineFirst(a, b) || soonestFirst(a, b) || latestArchivedFirst(a, b) || byName(a, b)

  const compare: Record<ShelfSort, (a: T, b: T) => number> = {
    attention: (a, b) => compareNumbers(status.get(a.id)!, status.get(b.id)!) || withinStatus(a, b),
    // The owner's order the other way round. Only the statuses are reversed;
    // inside each one the order is the same as above.
    calm: (a, b) => compareNumbers(status.get(b.id)!, status.get(a.id)!) || withinStatus(a, b),
    expiry: (a, b) => soonestFirst(a, b) || byName(a, b),
    name: (a, b) => byName(a, b) || compareText(a.products?.brand, b.products?.brand),
    brand: (a, b) => compareText(a.products?.brand, b.products?.brand) || byName(a, b),
  }

  return [...items].sort(compare[sort])
}
