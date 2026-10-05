import { detailClause, photoRefusalMessage, plainDetail, rateLimitMessage, type ApiProblem } from '../../api/apiProblem'
import type { ProductSourceClaim } from '../../api/sources'
import { PAO_MONTHS, readCandidates, type DuplicateCandidate, type PaoMonths } from '../../api/submissionsApi'
import {
  PRODUCT_EDIT_LIMITS,
  SOURCE_TYPES,
  type ProductIngredientRef,
  type ProductPatch,
  type ProductSourceInput,
} from '../../api/productAdminApi'
import { isHttpUrl, nextKey, readPrice, type FieldErrors } from './submissionDraft'
import { productImageUrl } from '../../utils/safeImages'

/**
 * The product edit form and its rules (admin only), kept out of the page so
 * they can be tested without mounting it.
 *
 * Two rules matter most:
 *   - `updated_at` is kept as the exact string the product was read with and
 *     sent back unchanged. It carries microseconds; a trip through new Date()
 *     keeps milliseconds only, and every save would answer 409 "stale".
 *   - Only changed fields are sent, so a save cannot quietly overwrite a field
 *     the admin never touched (or blank it with an empty input).
 */

export interface EditIngredient {
  key: string
  /** Null for a name typed in that is not in our list; the backend adds it name-only. */
  id: string | null
  name: string
  functionalGroup: string | null
}

export interface EditSource {
  key: string
  url: string
  title: string
  publisher: string | null
  sourceType: string | null
  claims: ProductSourceClaim[]
}

/** The product's photo: the one it has, a new upload, or none. */
export type EditPhoto =
  | { kind: 'current'; url: string }
  | { kind: 'new'; imagePath: string; previewUrl: string | null }
  | { kind: 'none' }

export interface ProductForm {
  name: string
  brand: string
  category: string
  description: string
  priceThb: string
  priceUsd: string
  paoMonths: PaoMonths | null
  photo: EditPhoto
  ingredients: EditIngredient[]
  goodFor: string[]
  benefits: string[]
  sources: EditSource[]
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
const str = (value: unknown): string => (typeof value === 'string' ? value : '')
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0) : []
const priceText = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? String(value) : '')

/** The `updated_at` to echo, exactly as read. Null when the product has none, which cannot be saved. */
export const loadedUpdatedAt = (product: unknown): string | null => {
  const value = record(product).updated_at
  return typeof value === 'string' && value.length > 0 ? value : null
}

const PRODUCT_CLAIMS: readonly ProductSourceClaim[] = ['listing', 'description', 'price', 'image']

/**
 * The product's source links as one entry per source, each with the facts it
 * backs. The read gives one row per (claim, source); the PATCH takes one item
 * per source with its claims.
 */
export const sourcesFromProduct = (product: unknown): EditSource[] => {
  const rows = record(product).product_sources
  const bySource = new Map<string, EditSource>()
  for (const row of Array.isArray(rows) ? rows : []) {
    const claim = record(row).claim
    if (typeof claim !== 'string' || !PRODUCT_CLAIMS.includes(claim as ProductSourceClaim)) continue
    const source = record(record(row).sources)
    const url = str(source.url).trim()
    const id = str(source.id) || url
    if (!id) continue
    const existing = bySource.get(id)
    if (existing) {
      if (!existing.claims.includes(claim as ProductSourceClaim)) existing.claims.push(claim as ProductSourceClaim)
      continue
    }
    bySource.set(id, {
      key: nextKey('psrc'),
      url,
      title: str(source.title).trim(),
      publisher: str(source.publisher).trim() || null,
      sourceType: str(source.source_type) || null,
      claims: [claim as ProductSourceClaim],
    })
  }
  return [...bySource.values()]
}

export const formFromProduct = (product: unknown): ProductForm => {
  const p = record(product)
  const pao = p.pao_months
  // Only an http(s) image_url is shown; anything else reads as no photo.
  const imageUrl = productImageUrl(p.image_url)
  const ingredients = (Array.isArray(p.product_ingredients) ? p.product_ingredients : []).flatMap((row) => {
    const ing = record(record(row).ingredients)
    const id = str(ing.id)
    const name = str(ing.name).trim()
    return id && name ? [{ key: nextKey('ping'), id, name, functionalGroup: str(ing.functional_group) || null }] : []
  })
  return {
    name: str(p.name),
    brand: str(p.brand),
    category: str(p.category),
    description: str(p.description),
    priceThb: priceText(p.price_thb),
    priceUsd: priceText(p.price_usd),
    paoMonths: (PAO_MONTHS as readonly unknown[]).includes(pao) ? (pao as PaoMonths) : null,
    photo: imageUrl ? { kind: 'current', url: imageUrl } : { kind: 'none' },
    ingredients,
    goodFor: strings(p.good_for),
    benefits: strings(p.benefits),
    sources: sourcesFromProduct(product),
  }
}

/** A deep copy, so the loaded version stays as it was while the form changes. */
export const cloneForm = (form: ProductForm): ProductForm => ({
  ...form,
  photo: { ...form.photo },
  ingredients: form.ingredients.map((i) => ({ ...i })),
  goodFor: [...form.goodFor],
  benefits: [...form.benefits],
  sources: form.sources.map((s) => ({ ...s, claims: [...s.claims] })),
})

// ---------------------------------------------------------------------------
// What changed
// ---------------------------------------------------------------------------

const ingredientKey = (i: EditIngredient) => (i.id ? `id:${i.id}` : `new:${i.name.trim().toLowerCase()}`)
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((item, index) => item === b[index])
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((item) => b.includes(item))

const sourceKey = (s: EditSource) => `${s.url.trim()}\n${s.title.trim()}\n${[...s.claims].sort().join(',')}`

/** A source as the PATCH takes it. The read's publisher and type are kept, when the backend would accept them. */
export const toSourceInput = (s: EditSource): ProductSourceInput => {
  const input: ProductSourceInput = { url: s.url.trim(), title: s.title.trim(), claims: [...s.claims] }
  if (s.publisher && s.publisher.length <= PRODUCT_EDIT_LIMITS.publisher) input.publisher = s.publisher
  if (s.sourceType && (SOURCE_TYPES as readonly string[]).includes(s.sourceType)) input.source_type = s.sourceType
  return input
}

/** Sources the PATCH cannot carry, since it needs a web link for each. */
export const sourcesWithoutLink = (sources: EditSource[]): EditSource[] => sources.filter((s) => !isHttpUrl(s.url))

export type ProductChanges = Omit<ProductPatch, 'updated_at'>

/**
 * The fields that differ from the loaded product, in the PATCH's shape. The
 * ingredient list is compared in order (order is the pack's), concerns as a
 * set, and the photo by what was done to it: a new upload sends its path, and
 * removing one the product had sends null.
 */
export const productChanges = (before: ProductForm, now: ProductForm): ProductChanges => {
  const changes: ProductChanges = {}
  if (now.name.trim() !== before.name.trim()) changes.name = now.name.trim()
  if (now.brand.trim() !== before.brand.trim()) changes.brand = now.brand.trim()
  if (now.category !== before.category) changes.category = now.category
  if (now.description.trim() !== before.description.trim()) changes.description = now.description.trim() || null
  const thb = readPrice(now.priceThb)
  if (thb !== readPrice(before.priceThb)) changes.price_thb = thb ?? null
  const usd = readPrice(now.priceUsd)
  if (usd !== readPrice(before.priceUsd)) changes.price_usd = usd ?? null
  if (now.paoMonths !== before.paoMonths) changes.pao_months = now.paoMonths
  if (now.photo.kind === 'new') changes.image_path = now.photo.imagePath
  else if (now.photo.kind === 'none' && before.photo.kind !== 'none') changes.image_path = null
  if (!sameList(now.benefits.map((b) => b.trim()), before.benefits.map((b) => b.trim()))) {
    changes.benefits = now.benefits.map((b) => b.trim()).filter(Boolean)
  }
  if (!sameSet(now.goodFor, before.goodFor)) changes.good_for = [...now.goodFor]
  if (!sameList(now.ingredients.map(ingredientKey), before.ingredients.map(ingredientKey))) {
    changes.ingredients = now.ingredients.map(
      (i): ProductIngredientRef => (i.id ? { ingredient_id: i.id } : { new_name: i.name.trim() }),
    )
  }
  if (!sameSet(now.sources.map(sourceKey), before.sources.map(sourceKey))) {
    changes.sources = now.sources.filter((s) => isHttpUrl(s.url) && s.claims.length > 0).map(toSourceInput)
  }
  return changes
}

/** The PATCH body: the loaded `updated_at`, untouched, and the changed fields. */
export const buildProductPatch = (updatedAt: string, changes: ProductChanges): ProductPatch => ({
  updated_at: updatedAt,
  ...changes,
})

export const validateProductForm = (form: ProductForm, categories: string[]): FieldErrors => {
  const errors: FieldErrors = {}
  const L = PRODUCT_EDIT_LIMITS
  if (!form.name.trim()) errors.name = 'Add the product name'
  else if (form.name.trim().length > L.name) errors.name = `Keep the name to ${L.name} characters`
  if (!form.brand.trim()) errors.brand = 'Add the brand name'
  else if (form.brand.trim().length > L.brand) errors.brand = `Keep the brand to ${L.brand} characters`
  if (!form.category) errors.category = 'Choose a category'
  else if (categories.length > 0 && !categories.includes(form.category)) errors.category = 'Choose one of these categories'
  if (form.description.trim().length > L.description) errors.description = `Keep the description to ${L.description} characters`
  if (readPrice(form.priceThb) === undefined) errors.priceThb = 'Enter the price in numbers, like 450'
  if (readPrice(form.priceUsd) === undefined) errors.priceUsd = 'Enter the price in numbers, like 12.50'
  if (form.ingredients.length === 0) errors.ingredients = 'Keep at least one ingredient'
  else if (form.ingredients.length > L.ingredients) errors.ingredients = `A product can list up to ${L.ingredients} ingredients`
  if (form.benefits.length > L.benefits) errors.benefits = `Up to ${L.benefits} benefits`
  if (form.sources.length > L.sources) errors.sources = `Up to ${L.sources} links`
  return errors
}

// ---------------------------------------------------------------------------
// Sources, one per fact
// ---------------------------------------------------------------------------

export const PRODUCT_CLAIM_ORDER = PRODUCT_CLAIMS

/** The source backing `claim`, if any. */
export const sourceForClaim = (sources: EditSource[], claim: ProductSourceClaim): EditSource | null =>
  sources.find((s) => s.claims.includes(claim)) ?? null

const withoutClaim = (sources: EditSource[], claim: ProductSourceClaim): EditSource[] =>
  sources
    .map((s) => ({ ...s, claims: s.claims.filter((c) => c !== claim) }))
    .filter((s) => s.claims.length > 0)

/** Unlink `claim` from its source; a source left backing nothing is dropped from the list. */
export const removeClaimSource = (sources: EditSource[], claim: ProductSourceClaim): EditSource[] =>
  withoutClaim(sources, claim)

/**
 * Back `claim` with the link given. A link already listed (same URL) takes the
 * claim as well, so one page backing two facts stays one source.
 */
export const setClaimSource = (
  sources: EditSource[],
  claim: ProductSourceClaim,
  link: { url: string; title: string },
): EditSource[] => {
  const url = link.url.trim()
  const rest = withoutClaim(sources, claim)
  const same = rest.find((s) => s.url.trim() === url)
  if (same) return rest.map((s) => (s === same ? { ...s, claims: [...s.claims, claim] } : s))
  return [...rest, { key: nextKey('psrc'), url, title: link.title.trim(), publisher: null, sourceType: null, claims: [claim] }]
}

export const checkSourceLink = (link: { url: string; title: string }): FieldErrors => {
  const errors: FieldErrors = {}
  if (!isHttpUrl(link.url)) errors.url = 'Use a full web link, starting with http:// or https://'
  if (!link.title.trim()) errors.title = 'Say what the link is, like "Brand product page"'
  else if (link.title.trim().length > PRODUCT_EDIT_LIMITS.sourceTitle) {
    errors.title = `Keep this to ${PRODUCT_EDIT_LIMITS.sourceTitle} characters`
  }
  return errors
}

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

export type EditProblem =
  | { kind: 'stale' }
  | { kind: 'duplicate'; candidates: DuplicateCandidate[] }
  | { kind: 'forbidden' }
  | { kind: 'message'; message: string; fields: FieldErrors; unknownIds: string[] }

const FORM_FIELD: Record<string, string> = {
  name: 'name',
  brand: 'brand',
  category: 'category',
  description: 'description',
  price_thb: 'priceThb',
  price_usd: 'priceUsd',
  pao_months: 'paoMonths',
  image_path: 'photo',
  benefits: 'benefits',
  good_for: 'goodFor',
  ingredients: 'ingredients',
  sources: 'sources',
}

/**
 * A refused save, read into what the page shows: the stale banner, the clash,
 * the 403 state or a message.
 *
 * `sent` is the sources list the save sent, in order, so a refusal naming
 * "sources.1.url" (the link checks) is shown on the facts that link backs, as
 * `source.<claim>`.
 */
export const readEditProblem = (
  problem: ApiProblem,
  candidates: unknown = null,
  sent: { claims: ProductSourceClaim[] }[] = [],
): EditProblem => {
  const { status, code, detail } = problem
  if (status === 409 && detail === 'stale') return { kind: 'stale' }
  if (status === 409 && detail === 'duplicate') return { kind: 'duplicate', candidates: readCandidates(candidates, true) }
  if (status === 403) return { kind: 'forbidden' }

  const plain = (message: string, fields: FieldErrors = {}, unknownIds: string[] = []): EditProblem => ({
    kind: 'message',
    message,
    fields,
    unknownIds,
  })
  if (status === null) return plain("We couldn't reach SkinBuddy, so nothing was saved. Check your connection and try again.")
  if (status === 401) return plain('Your sign-in has expired, so nothing was saved. Sign in again, then save once more.')
  if (status === 429) return plain(rateLimitMessage(problem)!)
  if (status === 404) return plain('This product no longer exists, so nothing was saved.')
  if (code === 'SBUNK') {
    const ids = Array.isArray(problem.details) ? problem.details.map(String) : []
    return plain(
      'One or more ingredients are no longer in our list. Remove them and add them again, then save.',
      { ingredients: 'Remove the ingredients marked below and add them again' },
      ids,
    )
  }
  if (code === 'SBNON') return plain('Keep at least one ingredient, then save.', { ingredients: 'Keep at least one ingredient' })
  if (code === 'SBAMB') {
    return plain("A typed-in ingredient matches more than one in our list. Remove it and pick the right one from the search, then save.", {
      ingredients: 'Pick typed-in ingredients from the search instead',
    })
  }
  if (code === 'SBVAL') return plain(detail ? `Something wasn't accepted: ${detail}. Nothing was saved.` : "Something wasn't accepted, so nothing was saved.")
  if (code === '23514') {
    return plain("One of the values isn't one the catalogue allows, such as a link's type. Nothing was saved.", {
      sources: 'Check these links',
    })
  }
  if (status === 422) {
    const fields: FieldErrors = {}
    for (const { field, message } of problem.fields) {
      const [top = '', index = ''] = field.split('.')
      const source = top === 'sources' && /^\d+$/.test(index) ? sent[Number(index)] : undefined
      if (source) {
        for (const claim of source.claims) fields[`source.${claim}`] ??= message
        continue
      }
      const key = FORM_FIELD[top]
      if (key) fields[key] ??= message
    }
    const said = plainDetail(problem)
    if (Object.keys(fields).length === 0 && said) return plain(`Something wasn't accepted: ${detailClause(said)}. Nothing was saved.`)
    return plain('Some fields need a fix before this can be saved.', fields)
  }
  if (status >= 500) return plain('The catalogue refused the change, so nothing was saved. Try again in a moment.')
  return plain('Something went wrong, so nothing was saved. Try again in a moment.')
}

/**
 * A refused photo upload, in plain words. The rate limit and the size, type
 * and decoding refusals are worded once for every photo field (apiProblem),
 * in the backend's words when it gave some.
 */
export const photoUploadMessage = (status: number | null, detail: string | null = null): string => {
  const refused = photoRefusalMessage({ status, detail })
  if (refused) return refused
  if (status === 403) return 'Only the SkinBuddy team can change product photos.'
  if (status === null) return "We couldn't reach SkinBuddy, so the photo wasn't uploaded. Try again."
  return "The photo couldn't be uploaded. Try again in a moment."
}
