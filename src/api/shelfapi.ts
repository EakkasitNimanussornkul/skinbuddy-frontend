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
