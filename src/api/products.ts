import { apiClient } from './index'
import axios from 'axios'

export interface SharedIngredient {
  id: string
  name: string
  benefits?: string
}

export interface WarningAlert {
  alert_type: string
  severity: string
  message: string
}

export interface CompareResponse {
  product_a: any
  product_b: any
  shared_ingredients: SharedIngredient[]
  similarity_score: number
  conflicts: WarningAlert[]
}

const API_BASE_URL = import.meta.env.VITE_API_URL

/**
 * Search the product catalog with dynamic Baumann skin-match scoring
 */
export const searchProducts = async (query: string = '', minPrice?: number, maxPrice?: number) => {
  const params: any = {}
  if (query) params.q = query
  if (minPrice !== undefined && minPrice !== null) params.min_price = minPrice
  if (maxPrice !== undefined && maxPrice !== null) params.max_price = maxPrice

  const token = localStorage.getItem('access_token')

  // If no token exists, make a direct unauthenticated request
  if (!token) {
    const response = await axios.get(`${API_BASE_URL}/products/search`, { params })
    return response.data
  }

  try {
    const response = await apiClient.get('/products/search', { params })
    return response.data
  } catch (error: any) {
    // Fallback to guest search if token expired or invalid
    if (error?.response?.status === 401) {
      const response = await axios.get(`${API_BASE_URL}/products/search`, { params })
      return response.data
    }
    throw error
  }
}

/**
 * Rank a /products/search result set by Baumann skin-match score and keep the
 * best few.
 *
 * Pure and exported deliberately: the caller is a lifecycle hook, and logic
 * left inline in a hook cannot be unit tested in isolation.
 *
 * Products without a numeric score are dropped rather than sorted to the
 * bottom. An unscored product is one the backend could not match against the
 * user's skin type - usually because the request was anonymous - so showing it
 * under "recommended for you" would be inventing a recommendation.
 */
export interface ScoredProduct {
  id: string
  slug: string
  name: string
  brand?: string
  image_url?: string | null
  skin_match_score?: number | null
}

export const pickTopRecommendations = <T extends { skin_match_score?: number | null }>(
  products: T[],
  limit: number = 4,
): T[] => {
  // Runtime guard as well as the type: the search response is untyped JSON, so
  // a malformed payload must not throw inside a lifecycle hook.
  if (!Array.isArray(products)) return []

  return products
    .filter(
      (p): p is T & { skin_match_score: number } =>
        !!p && typeof p.skin_match_score === 'number' && !Number.isNaN(p.skin_match_score),
    )
    .sort((a, b) => b.skin_match_score - a.skin_match_score)
    .slice(0, limit)
}

/**
 * Comparison is a two-product operation. GET /products/compare takes exactly
 * product_a_id and product_b_id, and compare_two_products resolves exactly two.
 *
 * Nothing reads this today. It was the cap on Explore's multi-select, which
 * FE-DEF-11 removed as unreachable; the limit is now imposed by
 * buildComparePath emitting only `a` and `b`, and by both remaining callers
 * choosing exactly two products. Kept as the written statement of why the
 * feature is two-product at all - a future selection UI must cap here rather
 * than offer a capability the engine does not have.
 */
export const MAX_COMPARE_PRODUCTS = 2

/**
 * Build the comparison address from selected slugs.
 *
 * Pure and exported so the contract between a selection screen and CompareView
 * can be asserted without mounting either. CompareView reads `a` and `b`; a
 * caller inventing its own parameter names produces a page that silently shows
 * its "select two products" prompt instead.
 *
 * Returns null when there are not two slugs, so callers surface that rather
 * than navigating to a page that cannot act.
 */
export const buildComparePath = (slugs: string[]): string | null => {
  if (!Array.isArray(slugs)) return null

  const [a, b] = slugs.filter((s) => typeof s === 'string' && s.length > 0)
  if (!a || !b) return null

  return `/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`
}

/**
 * `unavailable` no score was computed - anonymous request, or the backend
 *               could not evaluate this product
 * `strong`      >= 85
 * `moderate`    >= 60
 * `weak`        below 60
 */
export type MatchBand = 'unavailable' | 'strong' | 'moderate' | 'weak'

/** Boundaries, named so the three display components cannot drift apart. */
export const MATCH_BAND_STRONG = 85
export const MATCH_BAND_MODERATE = 60

/**
 * Classify a skin match score for display.
 *
 * Extracted because three components render this score and each carried its own
 * copy of the thresholds. ProductHeroSection carried none at all and painted
 * every non-null score the same confident emerald as a perfect match, which is
 * FE-DEF-12. Components map the band to their own palette; only the boundaries
 * live here.
 *
 * A non-numeric score is `unavailable`, never `weak`. "Not computed" is not a
 * bad match - the same distinction pickTopRecommendations and evaluateSafety
 * both turn on.
 */
export const resolveMatchBand = (score: number | null | undefined): MatchBand => {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'unavailable'
  if (score >= MATCH_BAND_STRONG) return 'strong'
  if (score >= MATCH_BAND_MODERATE) return 'moderate'
  return 'weak'
}

/**
 * What the match score is a score *of*, in one sentence.
 *
 * The number was rendered on three screens as a bare "82% Match" with nothing
 * saying what it matched against, so it read as a rating of the product. It is
 * not: it is a rating of the fit between this product's ingredients and the
 * viewer's own Baumann skin type, and the same product scores differently for
 * two different people. Shared so the three screens describe it identically.
 */
export const MATCH_SCORE_BASIS =
  "How well this formula's ingredients suit your Baumann skin type. It is personal to your profile, not a rating of the product."

/**
 * `scored`      a score was computed and can be shown
 * `signed-out`  nobody is signed in, so there is no profile to score against
 * `no-profile`  signed in, but the skin quiz has not been taken
 * `not-scored`  a profile exists and the backend still returned no score
 *
 * Why this exists: the backend sets `skin_match_score` to null whenever it has
 * no skin type to score against, which is the ordinary state for a signed-out
 * visitor and for anyone who has not finished the quiz. Nothing has failed in
 * either case. `CompareIdentityHeader` rendered that null as "Failed to
 * calculate score" (FE-DEF-31) - the same fault as FE-DEF-29, a known and
 * permanent state reported as a temporary failure, and the one screen of the
 * three with no signed-out branch of its own to catch it first.
 *
 * The distinction is not in the response and does not need to be: the viewer's
 * own session already holds it. `not-scored` is the residue - signed in, quiz
 * taken, still no number - and is the only one of the four that describes
 * something actually going wrong.
 */
export type MatchAvailability = 'scored' | 'signed-out' | 'no-profile' | 'not-scored'

export const resolveMatchAvailability = (
  score: number | null | undefined,
  isAuthenticated: boolean,
  skinType: string | null | undefined,
): MatchAvailability => {
  if (resolveMatchBand(score) !== 'unavailable') return 'scored'
  if (!isAuthenticated) return 'signed-out'
  if (typeof skinType !== 'string' || skinType.trim().length === 0) return 'no-profile'
  return 'not-scored'
}

/** The sentence shown in place of a score. Never "failed" unless it did. */
export const describeMatchAvailability = (availability: MatchAvailability): string => {
  if (availability === 'signed-out') return 'Sign in to see how this suits your skin.'
  if (availability === 'no-profile') return 'Take the skin quiz to see how this suits your skin.'
  if (availability === 'not-scored') return 'This formula could not be scored against your profile.'
  return ''
}

/**
 * `unavailable` no overlap figure could be computed for this pair
 * `high`        >= 60
 * `moderate`    >= 25
 * `low`         below 25
 *
 * These are display bands over `CompareResponse.similarity_score`, and they are
 * deliberately not borrowed from the backend's DUPE_SIMILARITY_THRESHOLD even
 * though the high boundary lands on the same number. That threshold is applied
 * to a Jaccard over *active* ingredients only; the compare endpoint computes
 * its figure over the *full* ingredient list, fillers included. Same function,
 * two different inputs, so the two percentages are not on the same scale and
 * one cannot inherit the other's cut-off.
 *
 * The full-list basis is settled, though **not pinned anywhere** - see the note
 * on resolveSimilarityBand below. The reason for it is better than the one this
 * comment was first written with. It is not about agreeing with the shelf's
 * duplicate figure on another screen: it is
 * that `shared_ingredients` arrives in the *same* response, is built from the
 * same unfiltered lists, and renders directly beside this number. A filtered
 * score above an unfiltered list would read as "12% shared" over a visibly
 * longer set of shared ingredients, and filtering the list to match would
 * delete real shared ingredients from the one element whose whole job is to
 * show them. The number agrees with the list underneath it; that it therefore
 * disagrees with a different feature on a different screen is the accepted
 * cost, and is why the two are worded as different questions rather than as
 * one figure computed twice.
 *
 * One claim made while deciding this was wrong and is corrected here so it is
 * not repeated: the full-list figure is *not* systematically the higher of the
 * two. Measured over all 21 catalogue pairs, full exceeded actives on 9, was
 * lower on 2 and equal on 10, with a maximum divergence of 10 points. Filtering
 * shrinks the union faster than the intersection when what the two products
 * share is itself an active, so the direction of the difference depends on the
 * pair. Do not band these two figures against each other on the assumption of a
 * fixed bias.
 */
export type SimilarityBand = 'unavailable' | 'high' | 'moderate' | 'low'

export const SIMILARITY_BAND_HIGH = 60
export const SIMILARITY_BAND_MODERATE = 25

/**
 * Band a comparison's ingredient-overlap figure for display.
 *
 * `ingredientCountA/B` are not decoration. The backend computes this as a
 * Jaccard index and returns `0.0` when the union of the two ingredient sets is
 * empty - which happens only when *neither* product has any ingredients on
 * record. That is "there was nothing to compare", and it arrives indistinguishable
 * from a genuine "these two share nothing", which is a real and different
 * answer. The counts are already in the same response, so the caller can tell
 * the two apart without the API being changed; a zero from two empty lists is
 * reported as unavailable rather than as 0%.
 *
 * One empty list and one populated one is a true 0%: the union is non-empty and
 * the intersection really is.
 *
 * **This reads the counts because the score's basis is the full list.** The
 * backend deliberately keeps the `0.0` rather than returning null - two other
 * callers use the value as a threshold test and a sort key, and neither wants
 * an optional - so separating the two cases is the displaying caller's job, and
 * doing it from the lists in the same response is only sound while the score is
 * computed over exactly those lists. If the compare figure is ever computed
 * over a filtered subset of what the response returns, this stops being correct
 * and the answer is a nullable `similarity_score`, not a cleverer count.
 *
 * **That dependency is written down only here.** It was briefly recorded on the
 * backend too, in a docstring and two tests, and that commit was removed on the
 * owner's instruction before it reached any branch. So nothing on the backend
 * side states the requirement, nothing there fails if the compare call is
 * switched to filter actives, and `app/api/products.py` still carries the
 * comment claiming the compare endpoint shares the slug endpoint's definition
 * of "similar" - which it does not, the slug endpoint having a category
 * restriction that compare cannot have. Anyone changing that line sees the
 * misleading comment and no test. Treat this paragraph as the whole of the
 * protection.
 *
 * Note this is *not* the FE-DEF-28 pattern despite the family resemblance, and
 * the difference is worth keeping straight: what made that one a defect was
 * that `is_safe` gated an action and failed open, so an unassessed product was
 * presented as clear and could be added. This figure gates nothing. A value
 * that can mean two things is a problem in proportion to what depends on it.
 */
export const resolveSimilarityBand = (
  score: number | null | undefined,
  ingredientCountA: number,
  ingredientCountB: number,
): SimilarityBand => {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'unavailable'
  if (ingredientCountA <= 0 && ingredientCountB <= 0) return 'unavailable'
  if (score >= SIMILARITY_BAND_HIGH) return 'high'
  if (score >= SIMILARITY_BAND_MODERATE) return 'moderate'
  return 'low'
}

/**
 * The sentence under the overlap figure.
 *
 * Says what was measured - the share of all listed ingredients the two have in
 * common - rather than leaving a bare percentage to be read as "how alike these
 * products are", which it is not. Two moisturisers can share most of their
 * base and behave completely differently.
 */
export const describeSimilarityBand = (band: SimilarityBand): string => {
  if (band === 'unavailable') {
    return 'Neither formula has an ingredient list on record, so there was nothing to compare.'
  }
  if (band === 'high') {
    return 'These two list most of the same ingredients. Owning both may be redundant.'
  }
  if (band === 'moderate') {
    return 'These two share a noticeable part of their ingredient lists.'
  }
  return 'These two are built from largely different ingredient lists.'
}

/**
 * How many ingredients a compare payload lists for one product.
 *
 * Counts the entries that actually carry an ingredient, which is the same test
 * the backend applies when it builds the sets it measures - a row whose join
 * came back empty is not an ingredient either side is counting.
 */
export const countProductIngredients = (product: unknown): number => {
  const rows = (product as { product_ingredients?: unknown } | null)?.product_ingredients
  if (!Array.isArray(rows)) return 0
  return rows.filter((row) => row && typeof row === 'object' && 'ingredients' in row && row.ingredients)
    .length
}

/**
 * Name one of the two products in a comparison, for a label that has room for
 * both parts.
 *
 * The compare screen's panels labelled their two sides by brand alone, which
 * does not say which formula a column holds - and says nothing whatsoever when
 * both products are the same brand, which is among the likeliest comparisons a
 * user runs. The name carries the identity; the brand is context above it.
 *
 * `brand` and `name` are both nullable server-side, so neither can be assumed.
 * When the name is missing the brand is promoted into its place rather than
 * left beside an empty line, and when both are missing the caller's positional
 * fallback is used - a column has to be callable something, and "Formula A" is
 * at least true.
 */
export interface ProductLabel {
  /** May be empty; render it only when it has content. */
  brand: string
  name: string
}

export const resolveProductLabel = (product: unknown, fallbackName: string): ProductLabel => {
  const record = product as { brand?: unknown; name?: unknown } | null | undefined
  const brand = typeof record?.brand === 'string' ? record.brand.trim() : ''
  const name = typeof record?.name === 'string' ? record.name.trim() : ''

  if (name) return { brand, name }
  if (brand) return { brand: '', name: brand }
  return { brand: '', name: fallbackName }
}

export interface ComparisonSimilarity {
  band: SimilarityBand
  /** The figure as shown, or a phrase saying there is none. */
  label: string
  description: string
}

/**
 * Everything a screen needs to show a comparison's ingredient-overlap figure.
 *
 * Two screens render it - the side-by-side overview and the ingredients matrix
 * - and this exists so it cannot come out differently on the two. That is not a
 * hypothetical: this codebase has already had the same number rendered by three
 * components carrying three private copies of its thresholds, which is FE-DEF-12,
 * and three components banding one severity field three different ways, which is
 * FE-DEF-25. The band, the rounding and the sentence are decided once here; the
 * colours stay each screen's own, which is the split resolveMatchBand
 * established.
 *
 * Reads the counts off the same payload that carries the score, so the caller
 * does not have to know that a zero can mean two things - see
 * resolveSimilarityBand for why it can.
 */
export const resolveComparisonSimilarity = (
  data: { similarity_score?: number | null; product_a?: unknown; product_b?: unknown } | null | undefined,
): ComparisonSimilarity => {
  const score = data?.similarity_score
  const band = resolveSimilarityBand(
    score,
    countProductIngredients(data?.product_a),
    countProductIngredients(data?.product_b),
  )

  return {
    band,
    // Omitted rather than shown as "0%" when the figure could not be computed.
    label: band === 'unavailable' ? 'No overlap figure' : `${Math.round(score as number)}% shared ingredients`,
    description: describeSimilarityBand(band),
  }
}

/**
 * `loading`  the request is in flight
 * `failed`   the request did not complete
 * `empty`    the catalogue arrived and nothing matched the active filters
 * `results`  the catalogue arrived and something matched
 */
export type CatalogViewState = 'loading' | 'failed' | 'empty' | 'results'

/**
 * Choose which of the four catalogue screens to show.
 *
 * Pure and exported for the same reason as buildComparePath: this project has
 * no component-mount layer, so the decision is testable only outside the
 * template.
 *
 * FE-DEF-09 was the absence of the `failed` state. With only three, a request
 * that never completed left the catalogue at its initial [] and fell through to
 * `empty`, telling the user as a fact that their filters excluded everything -
 * and offering a "reset filters" action that reruns the same failing request.
 *
 * Order matters: `failed` is decided before `empty`, because a failure tells us
 * nothing about how many products match. Reversing the two restores the defect.
 */
export const resolveCatalogState = (
  isLoading: boolean,
  failed: boolean,
  matchCount: number,
): CatalogViewState => {
  if (isLoading) return 'loading'
  if (failed) return 'failed'
  return matchCount > 0 ? 'results' : 'empty'
}

/**
 * Fetch full product specification and Baumann compatibility matrix by URL Slug or UUID
 */
export const getProductBySlug = async (slug: string) => {
  const token = localStorage.getItem('access_token')

  if (!token) {
    const res = await axios.get(`${API_BASE_URL}/products/slug/${encodeURIComponent(slug)}`)
    return res.data
  }

  try {
    // 🌟 FIXED: Changed 'api' to 'apiClient'
    const res = await apiClient.get(`/products/slug/${encodeURIComponent(slug)}`)
    return res.data
  } catch (error: any) {
    // Fallback to guest request if token is expired/invalid to prevent blocking product view
    if (error?.response?.status === 401) {
      const res = await axios.get(`${API_BASE_URL}/products/slug/${encodeURIComponent(slug)}`)
      return res.data
    }
    throw error
  }
}

/**
 * Backwards-compatible helper: Resolves product details whether passed a UUID or a slug
 */
export const getProductById = async (productId: string) => {
  return await getProductBySlug(productId)
}

/**
 * Compare two products side-by-side for similarity matrix and category clash rules
 */
export const getProductComparison = async (productAId: string, productBId: string): Promise<CompareResponse> => {
  const response = await apiClient.get(`/products/compare`, {
    params: {
      product_a_id: productAId,
      product_b_id: productBId
    }
  })
  return response.data
}
