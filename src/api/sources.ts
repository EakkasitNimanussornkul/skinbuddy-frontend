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

export interface SourceEntry {
  source: SourceRef
  claim: SourceClaim | null
}

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  regulatory_register: 'Regulatory register',
  safety_review: 'Safety review',
  chemical_database: 'Chemical database',
  peer_reviewed: 'Research paper',
  reference_book: 'Book',
  product_database: 'Product database',
}

export const SOURCE_CLAIM_LABEL: Record<SourceClaim, string> = {
  function: 'What it does',
  benefits: 'Benefits',
  good_for: 'Good for',
  bad_for: 'May not suit',
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
