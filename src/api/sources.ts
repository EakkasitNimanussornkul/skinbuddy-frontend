/**
 * Published sources behind the data the app shows (backend feat/data-sources,
 * 6db0260, over migration 0009).
 *
 * Owner request: the data shown should say what it is based on, with links.
 * Sources are attached by hand after each link has been checked, so most lists
 * are empty today - and an empty list is shown as "no published source linked
 * yet" rather than hidden, so the gap stays visible (the backend's advice, and
 * the point of the exercise).
 *
 * Every reader here is defensive: a response from before the field existed, or
 * a malformed row, reads as "no sources", never as an error.
 */

import { parseLocalDate } from './dates'

export type SourceType =
  | 'regulatory_register'
  | 'safety_review'
  | 'chemical_database'
  | 'peer_reviewed'
  | 'reference_book'
  | 'product_database'

export interface SourceRef {
  id: string
  title: string
  publisher: string | null
  url: string | null
  source_type: SourceType | string
  accessed_on: string | null
  notes: string | null
}

/** Which stored claim about an ingredient a source backs. */
export type SourceClaim = 'function' | 'benefits' | 'good_for' | 'bad_for'

/**
 * Which fact about a product a source backs (backend feat/product-sources,
 * migration 0010): where its ingredient list, price, photo or description was
 * seen.
 */
export type ProductSourceClaim = 'listing' | 'price' | 'image' | 'description'

export interface SourceEntry {
  source: SourceRef
  claim: SourceClaim | ProductSourceClaim | null
}

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  regulatory_register: 'Regulatory register',
  safety_review: 'Safety review',
  chemical_database: 'Chemical database',
  peer_reviewed: 'Research paper',
  reference_book: 'Book',
  product_database: 'Product database',
}

export const SOURCE_CLAIM_LABEL: Record<SourceClaim | ProductSourceClaim, string> = {
  function: 'What it does',
  benefits: 'Benefits',
  good_for: 'Good for',
  bad_for: 'May not suit',
  listing: 'Ingredient list',
  description: 'Description',
  price: 'Price',
  image: 'Photo',
}

export const NO_SOURCE_YET = 'No published source linked yet'

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null)

// Only http(s) links are rendered as links. A source row is written by hand,
// and a javascript: or data: URL in an href would run on click.
const safeUrl = (value: unknown): string | null => {
  const url = text(value)
  return url && /^https?:\/\//i.test(url) ? url : null
}

/** One source row as sent, or null for anything that is not one. */
export const readSourceRef = (value: unknown): SourceRef | null => {
  const v = value as Partial<SourceRef> | null | undefined
  const id = text(v?.id)
  const title = text(v?.title)
  if (!id || !title) return null
  return {
    id,
    title,
    publisher: text(v?.publisher),
    url: safeUrl(v?.url),
    source_type: text(v?.source_type) ?? 'reference_book',
    accessed_on: text(v?.accessed_on),
    notes: text(v?.notes),
  }
}

const dedupe = (entries: SourceEntry[]): SourceEntry[] => {
  const seen = new Set<string>()
  return entries.filter((e) => {
    const key = `${e.source.id}:${e.claim ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** A plain SourceRef[] - conflict details[].sources and skin-type reasons[].sources. */
export const readSourceList = (value: unknown): SourceEntry[] =>
  dedupe(
    (Array.isArray(value) ? value : [])
      .map(readSourceRef)
      .filter((s): s is SourceRef => s !== null)
      .map((source) => ({ source, claim: null })),
  )

const CLAIMS: readonly string[] = ['function', 'benefits', 'good_for', 'bad_for']

/** An ingredient's ingredient_sources: [{ claim, sources: SourceRef }]. */
export const readIngredientSources = (value: unknown): SourceEntry[] =>
  dedupe(
    (Array.isArray(value) ? value : []).flatMap((row) => {
      const source = readSourceRef((row as { sources?: unknown })?.sources)
      if (!source) return []
      const claim = (row as { claim?: unknown })?.claim
      return [{ source, claim: typeof claim === 'string' && CLAIMS.includes(claim) ? (claim as SourceClaim) : null }]
    }),
  )

/** A concern's concern_sources: [{ sources: SourceRef }]. */
export const readConcernSources = (value: unknown): SourceEntry[] =>
  readSourceList((Array.isArray(value) ? value : []).map((row) => (row as { sources?: unknown })?.sources))

/** The product's page on the database it was checked against, when known. */
export const readProductSourceUrl = (product: unknown): string | null =>
  safeUrl((product as { source_url?: unknown } | null | undefined)?.source_url)

// Product facts in the order the product page shows them: what is in it first,
// then what it says about itself, then its price and photo.
const PRODUCT_CLAIMS: readonly ProductSourceClaim[] = ['listing', 'description', 'price', 'image']

/**
 * A product's product_sources: [{ claim, sources: SourceRef }], in the page's
 * order. A link with an unknown claim is dropped rather than shown unlabelled:
 * "Sources: X" beside a product would read as backing every detail on it.
 */
export const readProductSources = (product: unknown): SourceEntry[] => {
  const rows = (product as { product_sources?: unknown } | null | undefined)?.product_sources
  const entries = (Array.isArray(rows) ? rows : []).flatMap((row) => {
    const claim = (row as { claim?: unknown })?.claim
    if (typeof claim !== 'string' || !PRODUCT_CLAIMS.includes(claim as ProductSourceClaim)) return []
    const source = readSourceRef((row as { sources?: unknown })?.sources)
    return source ? [{ source, claim: claim as ProductSourceClaim }] : []
  })
  const rank = (e: SourceEntry) => PRODUCT_CLAIMS.indexOf(e.claim as ProductSourceClaim)
  return dedupe(entries).sort((a, b) => rank(a) - rank(b))
}

/**
 * "seen Sep 20, 2026" for a price source: a price is only true on the day it
 * was read, so the date is part of the claim. Null without a readable date.
 */
export const describeSourceSeen = (source: SourceRef): string | null => {
  const date = parseLocalDate(source.accessed_on)
  return date ? `seen ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : null
}
