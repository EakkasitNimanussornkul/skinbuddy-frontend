import { apiClient } from './index'
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
 */
export const resolveExpiryDate = (item: {
  expiration_date?: string | null
  opened_date?: string | null
  pao?: number | string | null
}): Date | null => {
  if (!item) return null

  if (item.expiration_date) {
    const stored = new Date(item.expiration_date)
    return Number.isNaN(stored.getTime()) ? null : stored
  }

  if (!item.opened_date || item.pao === null || item.pao === undefined) return null

  const months = parseInt(String(item.pao))
  if (Number.isNaN(months)) return null

  const opened = new Date(item.opened_date)
  if (Number.isNaN(opened.getTime())) return null

  opened.setMonth(opened.getMonth() + months)
  return opened
}

/**
 * `Archived` `Expired` `Expiring Soon` `In Routine` `Unopened`
 *
 * The single derivation behind both the card badge and the status filter. It
 * previously existed twice, in ShelfCard and ShelfView, and the two disagreed.
 */
export type ShelfItemStatus =
  | 'Archived'
  | 'Expired'
  | 'Expiring Soon'
  | 'In Routine'
  | 'Unopened'

/** Days from `now` until expiry; negative once past. Null when undeterminable. */
export const daysUntilExpiry = (
  item: Parameters<typeof resolveExpiryDate>[0],
  now: Date = new Date(),
): number | null => {
  const target = resolveExpiryDate(item)
  if (!target) return null
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 3600 * 24))
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

  return state === 'active' ? 'In Routine' : 'Unopened'
}
