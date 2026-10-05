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

// ---------------------------------------------------------------------------
// Admin review (backend as-built, 2026-10-04). Every route answers 403
// {"detail": "Admin access required"} to anyone who is not an admin; the
// review screens show that as their own state.
// ---------------------------------------------------------------------------

/** The longest review note the backend keeps. */
export const REVIEW_NOTE_LIMIT = 1000

export interface AdminQueueFlags {
  possible_duplicate: boolean
  new_ingredient_count: number
  has_source: boolean
  has_photo: boolean
}

export interface AdminQueueRow {
  id: string
  status: string
  created_at: string | null
  submitter_name: string | null
  summary: MySubmission['summary']
  flags: AdminQueueFlags
}

export interface AdminQueue {
  counts: Record<SubmissionStatus, number>
  submissions: AdminQueueRow[]
}

/**
 * A product that may be the one submitted. `exact` (same brand and name, case
 * aside, or the same slug) means approve will answer 409; otherwise it is a
 * close name under the same brand, for the admin to judge.
 */
export interface DuplicateCandidate {
  id: string
  slug: string | null
  brand: string
  name: string
  exact: boolean
}

export interface ExistingMatch {
  id: string
  name: string
}

/** What the user said about a new ingredient. Never checked, so shown as theirs. */
export interface ReviewIngredientDetails {
  roles: string[]
  known_for: string | null
  source_url: string | null
}

/**
 * One ingredient of the merged payload, numbered from 0 in list order - the
 * position approve expects in a decision. For a new one, existing_matches
 * lists the rows its name already keys to: none, approve inserts it; one,
 * approve links that row; more, approve refuses (SBAMB) until the admin picks.
 */
export interface ReviewIngredient {
  position: number
  ingredient_id: string | null
  name: string | null
  status: 'known' | 'new'
  details: ReviewIngredientDetails | null
  existing_matches: ExistingMatch[]
}

export interface AdminSubmission {
  id: string
  status: string
  created_at: string | null
  /** As sent. Not parsed: nothing here compares it. */
  updated_at: string | null
  submitter_name: string | null
  reviewed_at: string | null
  review_notes: string | null
  product_id: string | null
  has_edits: boolean
  /** The user's payload with the admin's corrections merged over it, as sent. */
  submission: Record<string, unknown>
  duplicate_candidates: DuplicateCandidate[]
  ingredients: ReviewIngredient[]
}

export type IngredientDecision = 'with_details' | 'name_only' | 'drop'

export interface NewIngredientDecision {
  /** 0-based, indexing the merged ingredients list. */
  position: number
  decision: IngredientDecision
  functional_group: string | null
  benefits: string | null
}

/** Only ticked items are published; each must be in the submission as it stands. */
export interface ApproveBody {
  publish_benefits: string[]
  publish_good_for: string[]
  publish_source_urls: string[]
  new_ingredients: NewIngredientDecision[]
}

/**
 * PATCH /submissions/admin/{id}: the POST body, every field optional. Its
 * ingredients take the POST shape; a legacy row's plain names are sent back
 * in that shape.
 */
export type SubmissionEdit = Partial<Omit<SubmissionBody, 'ingredients'>> & {
  ingredients?: SubmissionIngredient[]
}

export interface Approved {
  product_id: string
  slug: string
}

const bool = (value: unknown) => value === true
const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0)
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const readQueueRow = (value: unknown): AdminQueueRow | null => {
  const base = readSubmission(value)
  if (!base) return null
  const row = record(value)
  const flags = record(row.flags)
  return {
    id: base.id,
    status: base.status,
    created_at: base.created_at,
    submitter_name: text(row.submitter_name),
    summary: base.summary,
    flags: {
      possible_duplicate: bool(flags.possible_duplicate),
      new_ingredient_count: count(flags.new_ingredient_count),
      has_source: bool(flags.has_source),
      has_photo: bool(flags.has_photo),
    },
  }
}

/** The review queue for one status, oldest first as the backend sends it, with the counts for every status. */
export const getAdminQueue = async (status: SubmissionStatus = 'pending'): Promise<AdminQueue> => {
  const response = await apiClient.get('/submissions/admin', { params: { status } })
  const data = record(response.data)
  const counts = record(data.counts)
  const rows = Array.isArray(data.submissions) ? data.submissions : []
  return {
    counts: { pending: count(counts.pending), approved: count(counts.approved), rejected: count(counts.rejected) },
    submissions: rows.map(readQueueRow).filter((row): row is AdminQueueRow => row !== null),
  }
}

const readCandidate = (value: unknown): DuplicateCandidate | null => {
  const row = record(value)
  const id = text(row.id)
  if (!id) return null
  return { id, slug: text(row.slug), brand: text(row.brand) ?? '', name: text(row.name) ?? '', exact: bool(row.exact) }
}

/**
 * Duplicate candidates: a detail's (with `exact`), or a 409 "duplicate"
 * answer's, whose rows carry no `exact` - pass `exact` to set it, since the
 * backend refused because of them.
 */
export const readCandidates = (value: unknown, exact?: boolean): DuplicateCandidate[] =>
  (Array.isArray(value) ? value : [])
    .map(readCandidate)
    .filter((c): c is DuplicateCandidate => c !== null)
    .map((c) => (exact === undefined ? c : { ...c, exact }))

/** [{id, name}] rows: existing_matches, and SBAMB's details. */
export const readExistingMatches = (value: unknown): ExistingMatch[] =>
  (Array.isArray(value) ? value : []).flatMap((item) => {
    const row = record(item)
    const id = text(row.id)
    return id ? [{ id, name: text(row.name) ?? id }] : []
  })

const readDetails = (value: unknown): ReviewIngredientDetails | null => {
  const row = record(value)
  const roles = Array.isArray(row.roles) ? row.roles.filter((r): r is string => typeof r === 'string' && r.length > 0) : []
  const details = { roles, known_for: text(row.known_for), source_url: text(row.source_url) }
  return roles.length || details.known_for || details.source_url ? details : null
}

const readReviewIngredient = (value: unknown, index: number): ReviewIngredient => {
  const row = record(value)
  const position = typeof row.position === 'number' && Number.isInteger(row.position) ? row.position : index
  const id = text(row.ingredient_id)
  return {
    position,
    ingredient_id: id,
    name: text(row.name),
    // Anything not plainly known is treated as new, so it gets a decision.
    status: row.status === 'known' && id ? 'known' : 'new',
    details: readDetails(row.details),
    existing_matches: readExistingMatches(row.existing_matches),
  }
}

const readAdminSubmission = (value: unknown): AdminSubmission => {
  const row = record(value)
  const id = text(row.id)
  if (!id) throw new Error('The submission answered without an id')
  return {
    id,
    status: text(row.status) ?? 'pending',
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
    submitter_name: text(row.submitter_name),
    reviewed_at: text(row.reviewed_at),
    review_notes: text(row.review_notes),
    product_id: text(row.product_id),
    has_edits: bool(row.has_edits),
    submission: record(row.submission),
    duplicate_candidates: readCandidates(row.duplicate_candidates),
    ingredients: (Array.isArray(row.ingredients) ? row.ingredients : []).map(readReviewIngredient),
  }
}

export const getAdminSubmission = async (id: string): Promise<AdminSubmission> => {
  const response = await apiClient.get(`/submissions/admin/${encodeURIComponent(id)}`)
  return readAdminSubmission(response.data)
}

/** Save the admin's corrections. Only the fields sent change; the user's own payload never does. */
export const editAdminSubmission = async (id: string, body: SubmissionEdit): Promise<AdminSubmission> => {
  const response = await apiClient.patch(`/submissions/admin/${encodeURIComponent(id)}`, body)
  return readAdminSubmission(response.data)
}

export const approveSubmission = async (id: string, body: ApproveBody): Promise<Approved> => {
  const response = await apiClient.post(`/submissions/admin/${encodeURIComponent(id)}/approve`, body)
  const data = record(response.data)
  const slug = text(data.slug)
  if (!slug) throw new Error('Approve answered without a slug')
  return { product_id: text(data.product_id) ?? '', slug }
}

export const rejectSubmission = async (id: string, reviewNotes: string | null): Promise<void> => {
  await apiClient.post(`/submissions/admin/${encodeURIComponent(id)}/reject`, { review_notes: reviewNotes })
}
