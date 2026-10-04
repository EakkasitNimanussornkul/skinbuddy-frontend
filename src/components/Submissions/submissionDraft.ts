import type { InjectionKey } from 'vue'
import type { ProductSourceClaim } from '../../api/sources'
import type { ApiProblem } from '../../api/apiProblem'
import type { IngredientHit, IngredientMatch } from '../../api/ingredientsApi'
import {
  ACCEPTED_IMAGE_TYPES,
  SUBMISSION_LIMITS,
  type IngredientRole,
  type NewIngredientDetails,
  type PaoMonths,
  type SubmissionBody,
  type SubmissionIngredient,
} from '../../api/submissionsApi'

/**
 * The submit-a-product draft and every rule about it, kept out of the
 * components so the rules can be tested without mounting a form.
 *
 * The draft lives in memory only (owner decision): no localStorage, so a
 * half-filled form never outlives the page. Prices are kept as typed and read
 * only when checked, so "12.50" is not rewritten to 12.5 under the user.
 */

export type StepNumber = 1 | 2 | 3

/**
 * One ingredient as listed. `known` was picked from our list (sent by id),
 * `new` is typed in (sent by name, with optional details), and `ambiguous`
 * came from a pasted name that matches several of ours - it cannot be sent
 * until the user picks one or adds it as new.
 */
export interface DraftIngredient {
  /** Client-only, stable across reorders: the v-for key and the error key. */
  key: string
  kind: 'known' | 'new' | 'ambiguous'
  id: string | null
  name: string
  functionalGroup: string | null
  roles: IngredientRole[]
  knownFor: string
  sourceUrl: string
}

export interface DraftSource {
  key: string
  url: string
  title: string
  claims: ProductSourceClaim[]
}

export interface DraftPhoto {
  imagePath: string
  previewUrl: string | null
  fileName: string
}

export interface SubmissionDraft {
  name: string
  brand: string
  category: string
  photo: DraftPhoto | null
  ingredients: DraftIngredient[]
  priceThb: string
  priceUsd: string
  paoMonths: PaoMonths | null
  /** "Not printed" was chosen. Sent as the same null; kept so the chip stays on. */
  paoNotPrinted: boolean
  benefits: string[]
  goodFor: string[]
  sources: DraftSource[]
  note: string
}

/** Field errors, keyed by field: 'name', 'ingredients', `ing.<key>.knownFor`, `source.<key>.url`, ... */
export type FieldErrors = Record<string, string>

/** Provided by SubmitProductView to its step components. */
export interface DraftContext {
  draft: SubmissionDraft
  errors: FieldErrors
}
export const DRAFT_CONTEXT: InjectionKey<DraftContext> = Symbol('submission-draft')

let keySeed = 0
export const nextKey = (prefix: string) => `${prefix}-${++keySeed}`

export const emptySource = (): DraftSource => ({ key: nextKey('src'), url: '', title: '', claims: [] })

export const emptyDraft = (): SubmissionDraft => ({
  name: '',
  brand: '',
  category: '',
  photo: null,
  ingredients: [],
  priceThb: '',
  priceUsd: '',
  paoMonths: null,
  paoNotPrinted: false,
  benefits: [],
  goodFor: [],
  // One blank link card to start, as designed. A card left blank is not sent.
  sources: [emptySource()],
  note: '',
})

const blank = (value: string) => value.trim().length === 0

const isBlankSource = (source: DraftSource) => blank(source.url) && blank(source.title) && source.claims.length === 0

/** Whether anything has been entered, which is when leaving needs a warning. */
export const isDraftDirty = (draft: SubmissionDraft): boolean =>
  !blank(draft.name) ||
  !blank(draft.brand) ||
  draft.category !== '' ||
  draft.photo !== null ||
  draft.ingredients.length > 0 ||
  !blank(draft.priceThb) ||
  !blank(draft.priceUsd) ||
  draft.paoMonths !== null ||
  draft.paoNotPrinted ||
  draft.benefits.length > 0 ||
  draft.goodFor.length > 0 ||
  draft.sources.some((source) => !isBlankSource(source)) ||
  !blank(draft.note)

// ---------------------------------------------------------------------------
// Ingredients
// ---------------------------------------------------------------------------

const ingredient = (kind: DraftIngredient['kind'], name: string, id: string | null, group: string | null): DraftIngredient => ({
  key: nextKey('ing'),
  kind,
  id,
  name,
  functionalGroup: group,
  roles: [],
  knownFor: '',
  sourceUrl: '',
})

export const knownIngredient = (hit: Pick<IngredientHit, 'id' | 'name' | 'functional_group'>) =>
  ingredient('known', hit.name, hit.id, hit.functional_group)

export const newIngredient = (name: string) => ingredient('new', name.trim(), null, null)

/** A pasted name, as the match answered it. */
export const ingredientFromMatch = (match: IngredientMatch): DraftIngredient => {
  if (match.id) return ingredient('known', match.name ?? match.input, match.id, null)
  if (match.ambiguous) return ingredient('ambiguous', match.input.trim(), null, null)
  return newIngredient(match.input)
}

/**
 * Whether an ingredient is already listed: the same id for one of ours, or the
 * same name (case aside) for one typed in. Adding it twice would only send a
 * duplicate for the team to delete.
 */
export const isAlreadyListed = (list: DraftIngredient[], candidate: Pick<DraftIngredient, 'id' | 'name'>): boolean => {
  if (candidate.id) return list.some((item) => item.id === candidate.id)
  const name = candidate.name.trim().toLowerCase()
  return list.some((item) => !item.id && item.name.trim().toLowerCase() === name)
}

export interface IngredientCounts {
  total: number
  known: number
  fresh: number
  ambiguous: number
}

export const countIngredients = (list: DraftIngredient[]): IngredientCounts => ({
  total: list.length,
  known: list.filter((item) => item.kind === 'known').length,
  fresh: list.filter((item) => item.kind === 'new').length,
  ambiguous: list.filter((item) => item.kind === 'ambiguous').length,
})

/** "7 in our list · 1 new · 1 to pick", leaving out any part that is zero. */
export const describeIngredientCounts = (counts: IngredientCounts): string =>
  [
    counts.known ? `${counts.known} in our list` : '',
    counts.fresh ? `${counts.fresh} new` : '',
    counts.ambiguous ? `${counts.ambiguous} to pick` : '',
  ]
    .filter(Boolean)
    .join(' · ')

export const moveItem = <T>(list: T[], from: number, to: number) => {
  if (to < 0 || to >= list.length || from === to) return
  const [item] = list.splice(from, 1)
  list.splice(to, 0, item as T)
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const HTTP_URL = /^https?:\/\/[^\s/$.?#][^\s]*$/i

export const isHttpUrl = (value: string): boolean => {
  const trimmed = value.trim()
  if (!HTTP_URL.test(trimmed)) return false
  try {
    const url = new URL(trimmed)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0
  } catch {
    return false
  }
}

/**
 * A price as typed, read as a number: "450", "12.50" and "1,200" all read.
 * Blank is null (not given). Anything else is undefined, which is an error.
 */
export const readPrice = (typed: string): number | null | undefined => {
  const trimmed = typed.trim()
  if (!trimmed) return null
  const plain = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(trimmed) ? trimmed.replace(/,/g, '') : trimmed
  if (!/^\d+(\.\d{1,2})?$/.test(plain)) return undefined
  const value = Number(plain)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

/** Why a chosen photo cannot be uploaded, before it is sent; null when it can. */
export const checkPhotoFile = (file: { type: string; size: number }): string | null => {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "That file isn't a JPG, PNG or WebP image. Choose a photo in one of those."
  }
  if (file.size > SUBMISSION_LIMITS.imageBytes) {
    return 'That photo is over 5 MB. Choose a smaller one.'
  }
  return null
}

export const validateBasics = (draft: SubmissionDraft, categories: string[]): FieldErrors => {
  const errors: FieldErrors = {}
  if (blank(draft.name)) errors.name = 'Add the product name'
  else if (draft.name.trim().length > SUBMISSION_LIMITS.name) errors.name = `Keep the name to ${SUBMISSION_LIMITS.name} characters`
  if (blank(draft.brand)) errors.brand = 'Add the brand name'
  else if (draft.brand.trim().length > SUBMISSION_LIMITS.brand) errors.brand = `Keep the brand to ${SUBMISSION_LIMITS.brand} characters`
  if (!draft.category) errors.category = 'Choose a category'
  else if (categories.length > 0 && !categories.includes(draft.category)) errors.category = 'Choose one of these categories'
  return errors
}

export const validateIngredients = (draft: SubmissionDraft): FieldErrors => {
  const errors: FieldErrors = {}
  const list = draft.ingredients
  if (list.length === 0) errors.ingredients = 'Add at least one ingredient'
  else if (list.length > SUBMISSION_LIMITS.ingredients) {
    errors.ingredients = `A product can list up to ${SUBMISSION_LIMITS.ingredients} ingredients`
  }

  let toPick = 0
  for (const item of list) {
    if (item.kind === 'ambiguous') {
      toPick += 1
      errors[`ing.${item.key}.name`] = 'This matches several in our list. Pick one, or add it as new.'
      continue
    }
    if (item.kind !== 'new') continue
    if (blank(item.name)) errors[`ing.${item.key}.name`] = 'Add the ingredient name'
    else if (item.name.trim().length > SUBMISSION_LIMITS.newName) {
      errors[`ing.${item.key}.name`] = `Too long for one ingredient (${SUBMISSION_LIMITS.newName} characters at most). Check the list was split at the commas.`
    }
    if (item.knownFor.trim().length > SUBMISSION_LIMITS.knownFor) {
      errors[`ing.${item.key}.knownFor`] = `Keep this to ${SUBMISSION_LIMITS.knownFor} characters`
    }
    if (!blank(item.sourceUrl) && !isHttpUrl(item.sourceUrl)) {
      errors[`ing.${item.key}.sourceUrl`] = 'Use a full web link, starting with http:// or https://'
    }
  }
  if (toPick > 0 && !errors.ingredients) {
    errors.ingredients = toPick === 1 ? 'Pick a match for 1 ingredient' : `Pick a match for ${toPick} ingredients`
  }
  return errors
}

export const validateExtras = (draft: SubmissionDraft, concernTags: string[]): FieldErrors => {
  const errors: FieldErrors = {}
  if (readPrice(draft.priceThb) === undefined) errors.priceThb = 'Enter the price in numbers, like 450'
  if (readPrice(draft.priceUsd) === undefined) errors.priceUsd = 'Enter the price in numbers, like 12.50'
  if (draft.benefits.length > SUBMISSION_LIMITS.benefits) errors.benefits = `Up to ${SUBMISSION_LIMITS.benefits} benefits`
  if (concernTags.length > 0 && draft.goodFor.some((tag) => !concernTags.includes(tag))) {
    errors.goodFor = 'Choose from these concerns'
  }

  const filled = draft.sources.filter((source) => !isBlankSource(source))
  if (filled.length > SUBMISSION_LIMITS.sources) errors.sources = `Up to ${SUBMISSION_LIMITS.sources} links`
  for (const source of filled) {
    if (!isHttpUrl(source.url)) errors[`source.${source.key}.url`] = 'Use a full web link, starting with http:// or https://'
    if (blank(source.title)) errors[`source.${source.key}.title`] = 'Say what the link is, like "Brand product page"'
    else if (source.title.trim().length > SUBMISSION_LIMITS.sourceTitle) {
      errors[`source.${source.key}.title`] = `Keep this to ${SUBMISSION_LIMITS.sourceTitle} characters`
    }
    if (source.claims.length === 0) errors[`source.${source.key}.claims`] = 'Choose what the link shows'
  }

  if (draft.note.trim().length > SUBMISSION_LIMITS.note) errors.note = `Keep the note to ${SUBMISSION_LIMITS.note} characters`
  return errors
}

/** A benefit about to be added: why it cannot be, or null when it can. */
export const checkBenefit = (benefits: string[], typed: string): string | null => {
  const value = typed.trim()
  if (!value) return 'Type a benefit first'
  if (value.length > SUBMISSION_LIMITS.benefit) return `Keep each benefit to ${SUBMISSION_LIMITS.benefit} characters`
  if (benefits.length >= SUBMISSION_LIMITS.benefits) return `Up to ${SUBMISSION_LIMITS.benefits} benefits`
  if (benefits.some((b) => b.toLowerCase() === value.toLowerCase())) return "That one's already added"
  return null
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

const details = (item: DraftIngredient): NewIngredientDetails | null => {
  const out: NewIngredientDetails = {}
  if (item.roles.length > 0) out.roles = [...item.roles]
  if (!blank(item.knownFor)) out.known_for = item.knownFor.trim()
  if (!blank(item.sourceUrl)) out.source_url = item.sourceUrl.trim()
  return Object.keys(out).length > 0 ? out : null
}

const bodyIngredient = (item: DraftIngredient): SubmissionIngredient => {
  if (item.kind === 'known' && item.id) return { ingredient_id: item.id }
  const extra = details(item)
  return extra ? { new_name: item.name.trim(), details: extra } : { new_name: item.name.trim() }
}

/**
 * The POST /submissions body, in pack order. Assumes the draft passed every
 * step's checks; blank optional fields go as null or empty lists, never as
 * empty strings, and a link card left blank is not sent.
 */
export const buildSubmissionBody = (draft: SubmissionDraft): SubmissionBody => ({
  name: draft.name.trim(),
  brand: draft.brand.trim(),
  category: draft.category,
  image_path: draft.photo?.imagePath ?? null,
  ingredients: draft.ingredients.map(bodyIngredient),
  price_thb: readPrice(draft.priceThb) ?? null,
  price_usd: readPrice(draft.priceUsd) ?? null,
  pao_months: draft.paoMonths,
  benefits: draft.benefits.map((b) => b.trim()).filter(Boolean),
  good_for: [...draft.goodFor],
  sources: draft.sources
    .filter((source) => !isBlankSource(source))
    .map((source) => ({ url: source.url.trim(), title: source.title.trim(), claims: [...source.claims] })),
  note: blank(draft.note) ? null : draft.note.trim(),
})

/** "Price, 2 benefits, 2 concerns, 1 link", or "Nothing added" - for the check before sending. */
export const summariseExtras = (draft: SubmissionDraft): string => {
  const parts: string[] = []
  if (!blank(draft.priceThb) || !blank(draft.priceUsd)) parts.push('Price')
  if (draft.paoMonths) parts.push(`use within ${draft.paoMonths} months`)
  const count = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`)
  if (draft.benefits.length) parts.push(count(draft.benefits.length, 'benefit', 'benefits'))
  if (draft.goodFor.length) parts.push(count(draft.goodFor.length, 'concern', 'concerns'))
  const links = draft.sources.filter((source) => !isBlankSource(source)).length
  if (links) parts.push(count(links, 'link', 'links'))
  if (!blank(draft.note)) parts.push('a note')
  if (parts.length === 0) return 'Nothing added'
  const text = parts.join(', ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export interface ServerErrorReading {
  errors: FieldErrors
  /** The earliest step holding one of the errors, to go back to. */
  step: StepNumber
  /** A line for the top of that step. */
  message: string
}

const STEP_OF_FIELD: Record<string, StepNumber> = {
  name: 1,
  brand: 1,
  category: 1,
  image_path: 1,
  ingredients: 2,
  price_thb: 3,
  price_usd: 3,
  pao_months: 3,
  benefits: 3,
  good_for: 3,
  sources: 3,
  note: 3,
}

const DRAFT_FIELD: Record<string, string> = {
  name: 'name',
  brand: 'brand',
  category: 'category',
  image_path: 'photo',
  price_thb: 'priceThb',
  price_usd: 'priceUsd',
  pao_months: 'paoMonths',
  benefits: 'benefits',
  good_for: 'goodFor',
  note: 'note',
}

const INGREDIENT_FIELD: Record<string, string> = {
  new_name: 'name',
  ingredient_id: 'name',
  known_for: 'knownFor',
  source_url: 'sourceUrl',
  roles: 'name',
}

const SOURCE_FIELD: Record<string, string> = { url: 'url', title: 'title', claims: 'claims' }

/**
 * Read a refused POST /submissions back onto the form.
 *
 * Positions in the server's field paths are indexes into the body as sent,
 * which buildSubmissionBody built in draft order - so ingredient N is
 * draft.ingredients[N], and source N is the Nth link card that was not blank.
 *
 * SBUNK (an ingredient id we no longer recognise) marks each such row, so the
 * user can remove it or add it as new. Null when the refusal is not about the
 * form at all, which the caller words itself.
 */
export const readServerErrors = (problem: ApiProblem, draft: SubmissionDraft): ServerErrorReading | null => {
  if (problem.status !== 422) return null
  const errors: FieldErrors = {}
  let step: StepNumber = 3
  const note = (s: StepNumber) => {
    if (s < step) step = s
  }

  if (problem.code === 'SBUNK') {
    const unknown = Array.isArray(problem.details) ? problem.details.map(String) : []
    for (const item of draft.ingredients) {
      if (item.id && unknown.includes(item.id)) {
        errors[`ing.${item.key}.name`] = "We can't find this one in our list any more. Remove it, or add it as a new ingredient."
      }
    }
    errors.ingredients = 'One or more ingredients need a fix'
    return { errors, step: 2, message: 'Some ingredients need a fix before we can send this.' }
  }

  const sent = draft.sources.filter((source) => !isBlankSource(source))
  for (const { field, message } of problem.fields) {
    const [top = '', index, sub, leaf] = field.split('.')
    const s = STEP_OF_FIELD[top]
    if (!s) continue
    note(s)
    const position = Number(index)

    if (top === 'ingredients' && Number.isInteger(position) && draft.ingredients[position]) {
      const item = draft.ingredients[position]!
      const part = sub === 'details' ? INGREDIENT_FIELD[leaf ?? ''] : INGREDIENT_FIELD[sub ?? '']
      errors[`ing.${item.key}.${part ?? 'name'}`] = message
      errors.ingredients ??= 'One or more ingredients need a fix'
    } else if (top === 'sources' && Number.isInteger(position) && sent[position]) {
      errors[`source.${sent[position]!.key}.${SOURCE_FIELD[sub ?? ''] ?? 'url'}`] = message
    } else if (top === 'ingredients') {
      errors.ingredients = message
    } else {
      errors[DRAFT_FIELD[top] ?? top] = message
    }
  }

  if (Object.keys(errors).length === 0) return null
  return { errors, step, message: 'Some details need a fix before we can send this.' }
}
