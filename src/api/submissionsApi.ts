import { apiClient } from './index'
import type { ProductSourceClaim } from './sources'

/**
 * A logged-in user's product submissions (backend as-built, 2026-10-04).
 *
 * Protected routes, so apiClient: a 401 here means the user has to sign in
 * again, and the interceptor opens the login popup. Never a guest retry.
 */

/** The fixed list of roles a user can tick for a new ingredient (backend INGREDIENT_ROLES). */
export const INGREDIENT_ROLES = [
  'Moisturising',
  'Soothing',
  'Barrier support',
  'Exfoliating',
  'Brightening',
  'Preservative',
  'Not sure',
] as const
export type IngredientRole = (typeof INGREDIENT_ROLES)[number]

/** Which product facts a source shows, in the order the form offers them. */
export const SUBMISSION_SOURCE_CLAIMS: readonly ProductSourceClaim[] = ['listing', 'description', 'price', 'image']

/** Period after opening, in months. Null is "Not printed" (or not given). */
export const PAO_MONTHS = [6, 12, 24] as const
export type PaoMonths = (typeof PAO_MONTHS)[number]

/** The backend's limits on POST /submissions, so the form checks the same ones. */
export const SUBMISSION_LIMITS = {
  name: 200,
  brand: 200,
  ingredients: 100,
  newName: 120,
  knownFor: 200,
  benefits: 8,
  benefit: 80,
  sources: 5,
  sourceTitle: 120,
  note: 1000,
  imageBytes: 5 * 1024 * 1024,
} as const

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export interface NewIngredientDetails {
  roles?: IngredientRole[]
  known_for?: string
  source_url?: string
}

export type SubmissionIngredient =
  | { ingredient_id: string }
  | { new_name: string; details?: NewIngredientDetails }

export interface SubmissionSource {
  url: string
  title: string
  claims: ProductSourceClaim[]
}

export interface SubmissionBody {
  name: string
  brand: string
  category: string
  image_path: string | null
  ingredients: SubmissionIngredient[]
  price_thb: number | null
  price_usd: number | null
  pao_months: PaoMonths | null
  benefits: string[]
  good_for: string[]
  sources: SubmissionSource[]
  note: string | null
}

export interface CreatedSubmission {
  id: string
  status: string
  created_at: string | null
}

export interface UploadedImage {
  image_path: string
  public_url: string | null
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

export interface MySubmission {
  id: string
  /** As sent; an unknown status is kept, and shows under "All" only. */
  status: string
  created_at: string | null
  reviewed_at: string | null
  review_notes: string | null
  product_id: string | null
  product_slug: string | null
  summary: {
    name: string
    brand: string
    category: string
    ingredient_count: number | null
  }
}

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim().length > 0 ? value : null)

/** Upload the product photo. Answers 413 over 5 MB and 415 for anything but JPG, PNG or WebP. */
export const uploadSubmissionImage = async (file: File): Promise<UploadedImage> => {
  const form = new FormData()
  form.append('file', file)
  const response = await apiClient.post('/submissions/images', form)
  const data = response.data as Record<string, unknown> | null
  const imagePath = text(data?.image_path)
  if (!imagePath) throw new Error('The upload answered without an image_path')
  return { image_path: imagePath, public_url: text(data?.public_url) }
}

export const createSubmission = async (body: SubmissionBody): Promise<CreatedSubmission> => {
  const response = await apiClient.post('/submissions', body)
  const data = response.data as Record<string, unknown> | null
  return {
    id: text(data?.id) ?? '',
    status: text(data?.status) ?? 'pending',
    created_at: text(data?.created_at),
  }
}

const readSubmission = (value: unknown): MySubmission | null => {
  const row = value as Record<string, unknown> | null
  const id = text(row?.id)
  if (!id) return null
  const summary = (row?.summary ?? {}) as Record<string, unknown>
  const count = summary.ingredient_count
  return {
    id,
    status: text(row?.status) ?? 'pending',
    created_at: text(row?.created_at),
    reviewed_at: text(row?.reviewed_at),
    review_notes: text(row?.review_notes),
    product_id: text(row?.product_id),
    product_slug: text(row?.product_slug),
    summary: {
      name: text(summary.name) ?? '',
      brand: text(summary.brand) ?? '',
      category: text(summary.category) ?? '',
      ingredient_count: typeof count === 'number' && Number.isFinite(count) ? count : null,
    },
  }
}

/** The signed-in user's submissions, newest first as the backend sends them. */
export const getMySubmissions = async (): Promise<MySubmission[]> => {
  const response = await apiClient.get('/submissions/mine')
  const rows = Array.isArray(response.data) ? response.data : []
  return rows.map(readSubmission).filter((row): row is MySubmission => row !== null)
}
