import type { ApiProblem } from '../../api/apiProblem'
import type { ProductSourceClaim } from '../../api/sources'
import {
  PAO_MONTHS,
  SUBMISSION_LIMITS,
  readCandidates,
  readExistingMatches,
  type AdminQueueFlags,
  type AdminQueueRow,
  type AdminSubmission,
  type ApproveBody,
  type DuplicateCandidate,
  type ExistingMatch,
  type IngredientDecision,
  type NewIngredientDetails,
  type PaoMonths,
  type ReviewIngredient,
  type SubmissionEdit,
  type SubmissionIngredient,
  type SubmissionStatus,
} from '../../api/submissionsApi'
import { formatDay } from './submissionStatus'
import { readPrice, type FieldErrors } from './submissionDraft'

/**
 * The review screens' rules, kept out of the components so they can be tested
 * without mounting a page: what a queue card says, what blocks publishing, the
 * approve body, the corrections PATCH, and the words for every refusal.
 *
 * The backend is the real check on every one of these (approve_submission in
 * migration 0013 refuses anything malformed). These rules exist so the admin
 * sees why before pressing Publish, rather than after.
 */

// ---------------------------------------------------------------------------
// The queue
// ---------------------------------------------------------------------------

export const ADMIN_TABS: { id: SubmissionStatus; label: string }[] = [
  { id: 'pending', label: 'Waiting' },
  { id: 'approved', label: 'Published' },
  { id: 'rejected', label: 'Not added' },
]

export type ChipTone = 'warn' | 'good' | 'plain'

export const CHIP_TONE: Record<ChipTone, string> = {
  warn: 'bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  good: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  plain: 'bg-brand-bg-light text-brand-text dark:bg-stone-800 dark:text-stone-200',
}

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`)

/** The flags on a queue card, in the design's order: what needs care first. */
export const queueFlagChips = (flags: AdminQueueFlags): { text: string; tone: ChipTone }[] => {
  const chips: { text: string; tone: ChipTone }[] = []
  if (flags.possible_duplicate) chips.push({ text: 'Possible duplicate', tone: 'warn' })
  if (flags.new_ingredient_count > 0) {
    chips.push({ text: plural(flags.new_ingredient_count, 'new ingredient', 'new ingredients'), tone: 'plain' })
  } else {
    chips.push({ text: 'All ingredients known', tone: 'good' })
  }
  if (flags.has_source) chips.push({ text: 'Has a source link', tone: 'plain' })
  if (!flags.has_photo) chips.push({ text: 'No photo', tone: 'plain' })
  return chips
}

/** "From Nok · 1 Oct 2026 · Cleansers · 7 ingredients", leaving out what is unknown. */
export const describeQueueRow = (row: AdminQueueRow): string => {
  const parts: string[] = []
  if (row.submitter_name) parts.push(`From ${row.submitter_name}`)
  const day = formatDay(row.created_at)
  if (day) parts.push(day)
  if (row.summary.category) parts.push(row.summary.category)
  const n = row.summary.ingredient_count
  if (n !== null) parts.push(plural(n, 'ingredient', 'ingredients'))
  return parts.join(' · ')
}

const DAY_MS = 24 * 60 * 60 * 1000

/** "From Nok · sent 1 Oct 2026 · waiting 3 days"; the wait only while it is pending. */
export const describeReviewMeta = (detail: AdminSubmission, now: Date = new Date()): string => {
  const parts: string[] = []
  if (detail.submitter_name) parts.push(`From ${detail.submitter_name}`)
  const day = formatDay(detail.created_at)
  if (day) parts.push(`sent ${day}`)
  const sent = detail.created_at ? new Date(detail.created_at).getTime() : Number.NaN
  if (detail.status === 'pending' && !Number.isNaN(sent)) {
    const days = Math.max(0, Math.floor((now.getTime() - sent) / DAY_MS))
    parts.push(days === 0 ? 'waiting less than a day' : `waiting ${plural(days, 'day', 'days')}`)
  }
  return parts.join(' · ')
}

// ---------------------------------------------------------------------------
// The submission as it stands (payload merged with earlier corrections)
// ---------------------------------------------------------------------------

export interface ReviewSource {
  url: string
  title: string
  claims: ProductSourceClaim[]
}

export interface ReviewPayload {
  name: string
  brand: string
  category: string
  imagePath: string | null
  priceThb: number | null
  priceUsd: number | null
  paoMonths: PaoMonths | null
  benefits: string[]
  goodFor: string[]
  sources: ReviewSource[]
  note: string | null
  /** As stored: POST-shape objects, or a legacy row's plain names. */
  ingredients: unknown[]
}

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0) : []
const CLAIMS: readonly string[] = ['listing', 'description', 'price', 'image']

export const readReviewPayload = (raw: Record<string, unknown>): ReviewPayload => {
  const pao = raw.pao_months
  return {
    name: str(raw.name),
    brand: str(raw.brand),
    category: str(raw.category),
    imagePath: str(raw.image_path) || null,
    priceThb: num(raw.price_thb),
    priceUsd: num(raw.price_usd),
    paoMonths: (PAO_MONTHS as readonly unknown[]).includes(pao) ? (pao as PaoMonths) : null,
    // Kept exactly as stored: approve publishes a ticked benefit only when it
    // is in the submission character for character.
    benefits: strings(raw.benefits),
    goodFor: strings(raw.good_for),
    sources: (Array.isArray(raw.sources) ? raw.sources : []).flatMap((item) => {
      const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
      const url = typeof row.url === 'string' ? row.url : ''
      if (!url) return []
      return [{ url, title: str(row.title), claims: strings(row.claims).filter((c): c is ProductSourceClaim => CLAIMS.includes(c)) }]
    }),
    note: str(raw.note) || null,
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
  }
}

/** A row saved before the current format: its ingredients are plain names. Approve refuses it (SBLEG). */
export const isLegacyPayload = (payload: ReviewPayload): boolean =>
  payload.ingredients.some((item) => typeof item === 'string')

const UPLOADED_PATH = /^(submissions|products)\/[0-9a-f-]{36}\.(jpg|png|webp)$/

/**
 * The public address of an uploaded photo. The detail carries only the
 * image_path, and the bucket is public (backend image_upload.public_url), so
 * the address is built the way Supabase builds it. Only for paths the upload
 * routes create; anything else shows no photo rather than a guessed address.
 */
export const uploadedImageUrl = (path: string | null): string | null => {
  const base = import.meta.env.VITE_SUPABASE_URL
  if (!path || !UPLOADED_PATH.test(path) || typeof base !== 'string' || !base) return null
  return `${base.replace(/\/+$/, '')}/storage/v1/object/public/product-images/${path}`
}

// ---------------------------------------------------------------------------
// Corrections
// ---------------------------------------------------------------------------

export interface Corrections {
  name: string
  brand: string
  category: string
  priceThb: string
  priceUsd: string
  paoMonths: PaoMonths | null
  imagePath: string | null
}

const priceText = (value: number | null) => (value === null ? '' : String(value))

export const correctionsFrom = (payload: ReviewPayload): Corrections => ({
  name: payload.name,
  brand: payload.brand,
  category: payload.category,
  priceThb: priceText(payload.priceThb),
  priceUsd: priceText(payload.priceUsd),
  paoMonths: payload.paoMonths,
  imagePath: payload.imagePath,
})

/** The corrections PATCH: only the fields that differ from the submission as it stands. */
export const correctionChanges = (before: Corrections, now: Corrections): SubmissionEdit => {
  const edit: SubmissionEdit = {}
  if (now.name.trim() !== before.name.trim()) edit.name = now.name.trim()
  if (now.brand.trim() !== before.brand.trim()) edit.brand = now.brand.trim()
  if (now.category !== before.category) edit.category = now.category
  const thb = readPrice(now.priceThb)
  if (thb !== readPrice(before.priceThb)) edit.price_thb = thb ?? null
  const usd = readPrice(now.priceUsd)
  if (usd !== readPrice(before.priceUsd)) edit.price_usd = usd ?? null
  if (now.paoMonths !== before.paoMonths) edit.pao_months = now.paoMonths
  if (now.imagePath !== before.imagePath) edit.image_path = now.imagePath
  return edit
}

export const validateCorrections = (c: Corrections, categories: string[]): FieldErrors => {
  const errors: FieldErrors = {}
  if (!c.name.trim()) errors.name = 'Add the product name'
  else if (c.name.trim().length > SUBMISSION_LIMITS.name) errors.name = `Keep the name to ${SUBMISSION_LIMITS.name} characters`
  if (!c.brand.trim()) errors.brand = 'Add the brand name'
  else if (c.brand.trim().length > SUBMISSION_LIMITS.brand) errors.brand = `Keep the brand to ${SUBMISSION_LIMITS.brand} characters`
  if (!c.category) errors.category = 'Choose a category'
  else if (categories.length > 0 && !categories.includes(c.category)) errors.category = 'Choose one of these categories'
  if (readPrice(c.priceThb) === undefined) errors.priceThb = 'Enter the price in numbers, like 450'
  if (readPrice(c.priceUsd) === undefined) errors.priceUsd = 'Enter the price in numbers, like 12.50'
  return errors
}

// ---------------------------------------------------------------------------
// The ingredient list, for a corrections PATCH
// ---------------------------------------------------------------------------

const DETAIL_KEYS = ['roles', 'known_for', 'source_url'] as const

/**
 * One stored ingredient in the shape PATCH takes. A legacy plain name becomes
 * {new_name}; keys the backend does not take are left out, since it refuses
 * unknown keys. Null for an item that is no ingredient at all.
 */
export const toPostIngredient = (item: unknown): SubmissionIngredient | null => {
  if (typeof item === 'string') {
    const name = item.trim()
    return name ? { new_name: name } : null
  }
  const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
  if (typeof row.ingredient_id === 'string' && row.ingredient_id) return { ingredient_id: row.ingredient_id }
  const name = str(row.new_name)
  if (!name) return null
  const raw = (row.details && typeof row.details === 'object' ? row.details : null) as Record<string, unknown> | null
  if (!raw) return { new_name: name }
  const details: Record<string, unknown> = {}
  for (const key of DETAIL_KEYS) if (raw[key] !== undefined && raw[key] !== null) details[key] = raw[key]
  return Object.keys(details).length ? { new_name: name, details: details as NewIngredientDetails } : { new_name: name }
}

/** The whole list in the POST shape, order kept: what "Convert it" sends for a legacy row. */
export const convertIngredients = (stored: unknown[]): SubmissionIngredient[] =>
  stored.map(toPostIngredient).filter((item): item is SubmissionIngredient => item !== null)

/**
 * The list with the ingredient at `position` replaced - an admin resolving a
 * name that matches several of ours, by picking one. The rest keep their
 * place, so every other position stays what the review showed.
 */
export const replaceIngredientAt = (
  stored: unknown[],
  position: number,
  replacement: SubmissionIngredient,
): SubmissionIngredient[] =>
  stored.flatMap((item, index) => {
    if (index === position) return [replacement]
    const converted = toPostIngredient(item)
    return converted ? [converted] : []
  })

// ---------------------------------------------------------------------------
// Decisions on new ingredients
// ---------------------------------------------------------------------------

export type MatchState = 'none' | 'one' | 'several'

export const matchState = (ingredient: ReviewIngredient): MatchState =>
  ingredient.existing_matches.length === 0 ? 'none' : ingredient.existing_matches.length === 1 ? 'one' : 'several'

export interface DecisionDraft {
  decision: IngredientDecision | null
  functionalGroup: string
  /** Pre-filled with what the user said it is known for: approve stores exactly this, with no fallback. */
  benefits: string
  /** The user's source link for it was opened and matches. Published only with its details. */
  publishSource: boolean
}

/** No decision is made for the admin: each new ingredient is chosen on purpose. */
export const initialDecision = (ingredient: ReviewIngredient): DecisionDraft => ({
  decision: null,
  functionalGroup: '',
  benefits: ingredient.details?.known_for ?? '',
  publishSource: false,
})

export const newIngredients = (detail: AdminSubmission): ReviewIngredient[] =>
  detail.ingredients.filter((ingredient) => ingredient.status === 'new')

/**
 * The choices for one new ingredient. A name that already keys to one of ours
 * is linked to it whatever is chosen (approve never inserts a second row), so
 * it offers linking or dropping only; the link is sent as name_only, which adds
 * nothing to the existing row.
 */
export const decisionOptions = (
  ingredient: ReviewIngredient,
  submitter: string | null,
): { value: IngredientDecision; label: string }[] => {
  if (matchState(ingredient) === 'one') {
    return [
      { value: 'name_only', label: `Link it to ${ingredient.existing_matches[0]!.name}` },
      { value: 'drop', label: 'Not a real ingredient, drop it' },
    ]
  }
  return [
    { value: 'with_details', label: submitter ? `With ${submitter}'s details` : 'With the details given' },
    { value: 'name_only', label: "Name only, I'll describe it later" },
    { value: 'drop', label: 'Not a real ingredient, drop it' },
  ]
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

export interface PublishTicks {
  benefits: string[]
  goodFor: string[]
  sourceUrls: string[]
}

/**
 * As designed: the user's benefits and concerns start ticked, and their links
 * start unticked - a link is published only once someone has opened it.
 */
export const initialTicks = (payload: ReviewPayload): PublishTicks => ({
  benefits: [...payload.benefits],
  goodFor: [...payload.goodFor],
  sourceUrls: [],
})

export interface ReviewState {
  detail: AdminSubmission
  payload: ReviewPayload
  decisions: Record<number, DecisionDraft>
  ticks: PublishTicks
  correctionsDirty: boolean
}

export const exactDuplicates = (detail: AdminSubmission): DuplicateCandidate[] =>
  detail.duplicate_candidates.filter((candidate) => candidate.exact)

/**
 * Why Publish is off, in the order the admin should deal with them. Empty when
 * it may be pressed.
 */
export const publishBlockers = (state: ReviewState): string[] => {
  const { detail, payload, decisions } = state
  if (detail.status !== 'pending') return ['This submission has already been reviewed.']
  const blockers: string[] = []
  if (exactDuplicates(detail).length > 0) {
    blockers.push("Publishing is off: this product is already in the catalogue. Don't add it, or edit the existing product instead.")
  }
  if (isLegacyPayload(payload)) blockers.push('This submission uses the old format. Convert its ingredients first.')
  if (state.correctionsDirty) blockers.push('Save or undo your corrections first, so you publish what you see.')

  const fresh = newIngredients(detail)
  const several = fresh.filter((i) => matchState(i) === 'several').length
  if (several) blockers.push(`Pick the right match for ${plural(several, 'ingredient', 'ingredients')}.`)
  const undecided = fresh.filter((i) => matchState(i) !== 'several' && !decisions[i.position]?.decision).length
  if (undecided) blockers.push(`Choose what to do with ${plural(undecided, 'new ingredient', 'new ingredients')}.`)
  const noGroup = fresh.filter(
    (i) => decisions[i.position]?.decision === 'with_details' && !decisions[i.position]?.functionalGroup,
  ).length
  if (noGroup) blockers.push(`Choose a functional group for ${plural(noGroup, 'ingredient', 'ingredients')} added with details.`)

  const kept =
    detail.ingredients.filter((i) => i.status === 'known').length +
    fresh.filter((i) => decisions[i.position]?.decision && decisions[i.position]?.decision !== 'drop').length
  const allDecided = fresh.every((i) => decisions[i.position]?.decision)
  if (detail.ingredients.length === 0 || (allDecided && kept === 0)) {
    blockers.push("Keep at least one ingredient. You can't drop them all.")
  }
  return blockers
}

const unique = (items: string[]) => [...new Set(items)]

/**
 * The approve body. Benefits and concerns go in the submission's own order,
 * only the ticked ones; links only when ticked, and an ingredient's own link
 * only when it is added with its details (only then is it attached to it).
 * Positions are the 0-based ones the detail numbered.
 */
export const buildApproveBody = (state: ReviewState): ApproveBody => {
  const { detail, payload, decisions, ticks } = state
  const fresh = newIngredients(detail).sort((a, b) => a.position - b.position)

  const ingredientUrls = fresh.flatMap((i) => {
    const d = decisions[i.position]
    const url = i.details?.source_url
    return d?.decision === 'with_details' && d.publishSource && url ? [url] : []
  })

  return {
    publish_benefits: payload.benefits.filter((b) => ticks.benefits.includes(b)),
    publish_good_for: payload.goodFor.filter((g) => ticks.goodFor.includes(g)),
    publish_source_urls: unique([
      ...payload.sources.map((s) => s.url).filter((url) => ticks.sourceUrls.includes(url)),
      ...ingredientUrls,
    ]),
    new_ingredients: fresh.map((i) => {
      const d = decisions[i.position]!
      const withDetails = d.decision === 'with_details'
      return {
        position: i.position,
        decision: d.decision!,
        functional_group: withDetails ? d.functionalGroup : null,
        benefits: withDetails ? d.benefits.trim() || null : null,
      }
    }),
  }
}

// ---------------------------------------------------------------------------
// Refusals, in plain words
// ---------------------------------------------------------------------------

export type ReviewAction = 'load' | 'save' | 'approve' | 'reject'

export interface ReviewProblem {
  message: string
  /** The submission is gone or already reviewed: the queue is out of date. */
  reloadQueue: boolean
  forbidden: boolean
  /** From a 409 duplicate: the products it clashes with. */
  candidates: DuplicateCandidate[]
  /** From SBAMB: the rows a name matches. */
  ambiguous: ExistingMatch[]
  /** From a validation 422: per-field messages, keyed as the corrections form names them. */
  fields: FieldErrors
}

const CORRECTION_FIELD: Record<string, string> = {
  name: 'name',
  brand: 'brand',
  category: 'category',
  price_thb: 'priceThb',
  price_usd: 'priceUsd',
  pao_months: 'paoMonths',
  image_path: 'photo',
  review_notes: 'notes',
}

const NOTHING_DONE: Record<ReviewAction, string> = {
  load: "so it couldn't be loaded",
  save: "so your corrections weren't saved",
  approve: 'so nothing was published',
  reject: "so it wasn't marked as not added",
}

const names = (rows: { brand?: string; name: string }[]) =>
  rows.map((r) => (r.brand ? `${r.brand} ${r.name}` : r.name)).join(', ')

/** Every refusal the review routes give, as one line for the admin and what to offer next. */
export const readReviewProblem = (problem: ApiProblem, action: ReviewAction, candidates: unknown = null): ReviewProblem => {
  const out: ReviewProblem = { message: '', reloadQueue: false, forbidden: false, candidates: [], ambiguous: [], fields: {} }
  const { status, code, detail } = problem

  if (status === null) {
    out.message = `We couldn't reach SkinBuddy, ${NOTHING_DONE[action]}. Check your connection and try again.`
  } else if (status === 401) {
    out.message = `Your sign-in has expired, ${NOTHING_DONE[action]}. Sign in again, then try once more.`
  } else if (status === 403) {
    out.forbidden = true
    out.message = 'Only the SkinBuddy team can review submissions.'
  } else if (status === 404) {
    out.reloadQueue = true
    out.message = 'This submission no longer exists. Reload the queue.'
  } else if (status === 409 && detail === 'duplicate') {
    out.candidates = readCandidates(candidates, true)
    out.message = out.candidates.length
      ? `This product is already in the catalogue as ${names(out.candidates)}, so nothing was published. Edit that product instead, or don't add this one.`
      : 'A product with this brand and name was added a moment ago, so nothing was published. Reload, then edit that product instead.'
  } else if (status === 409 && code === 'SBNPD') {
    out.reloadQueue = true
    out.message = 'Someone has already reviewed this submission. Reload the queue to see where it stands.'
  } else if (code === 'SBDEC') {
    out.message = 'Every new ingredient needs a decision before publishing. Check the ingredient cards and try again.'
  } else if (code === 'SBNON') {
    out.message = "You can't drop every ingredient. Keep at least one, with its details or by name only."
  } else if (code === 'SBLEG') {
    out.message = 'This submission uses the old format. Convert its ingredients first, then publish.'
  } else if (code === 'SBAMB') {
    out.ambiguous = readExistingMatches(problem.details)
    out.message = out.ambiguous.length
      ? `A new ingredient matches more than one in our list (${names(out.ambiguous)}). Pick the right one, then publish.`
      : 'A new ingredient matches more than one in our list. Pick the right one, then publish.'
  } else if (code === 'SBFGR') {
    out.message = "One of the functional groups isn't one we use. Choose it again from the list, then publish."
  } else if (code === 'SBUNK') {
    out.message = "One of the ingredients is no longer in our list. Pick it again, or add it as new, then try again."
  } else if (code === 'SBVAL') {
    out.message = detail
      ? `Something in this submission wasn't accepted: ${detail}. Check it and try again.`
      : "Something in this submission wasn't accepted. Check the details and the ticked extras, then try again."
  } else if (code === '23514') {
    out.message = "One of the values isn't one the catalogue allows, such as a link's type or what it shows. Check the extras and try again."
  } else if (status === 422 && problem.fields.length > 0) {
    for (const { field, message } of problem.fields) {
      const key = CORRECTION_FIELD[field.split('.')[0] ?? '']
      if (key) out.fields[key] ??= message
    }
    const first = problem.fields[0]!
    out.message = `Something wasn't accepted (${first.field || 'the request'}: ${first.message}), ${NOTHING_DONE[action]}.`
  } else if (status === 422) {
    out.message = `Something wasn't accepted, ${NOTHING_DONE[action]}. Check the details and try again.`
  } else if (status >= 500) {
    out.message = `The catalogue refused the change, ${NOTHING_DONE[action]}. Try again in a moment.`
  } else {
    out.message = `Something went wrong, ${NOTHING_DONE[action]}. Try again in a moment.`
  }
  return out
}

/** A 409 duplicate carries its candidates beside `detail`, which readApiProblem does not keep. */
export const readErrorCandidates = (error: unknown): unknown =>
  (error as { response?: { data?: { candidates?: unknown } } } | null)?.response?.data?.candidates ?? null
