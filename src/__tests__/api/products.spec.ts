import { describe, it, expect, beforeEach, vi } from 'vitest'

// No network: both HTTP paths are mocked. products.ts deliberately uses two
// clients - the shared apiClient when a token exists, and a bare axios call
// when it does not - so both are replaced here.
vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn() },
}))
vi.mock('axios', () => ({
  default: { get: vi.fn() },
}))

import axios from 'axios'
import { apiClient } from '../../api/index'
import {
  searchProducts,
  pickTopRecommendations,
  buildComparePath,
  resolveCatalogState,
  resolveMatchBand,
  resolveMatchAvailability,
  describeMatchAvailability,
  resolveSimilarityBand,
  describeSimilarityBand,
  resolveComparisonSimilarity,
  resolveProductLabel,
  resolvePairConflictState,
  resolvePairConflicts,
  resolveRequestFailure,
  countProductIngredients,
  MAX_COMPARE_PRODUCTS,
  getProductBySlug,
  getProductById,
  getProductComparison,
  readMatchBreakdown,
  describeMatchWorking,
  describeLimitedMatch,
  describeNothingToScore,
  describeWholeMatch,
  displayMatchPercent,
} from '../../api/products'

const unauthorized = { response: { status: 401 } }

describe('src/api/products.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('searchProducts()', () => {
    it('sends no query parameters when called with no arguments', async () => {
      localStorage.setItem('access_token', 'valid-token')
      vi.mocked(apiClient.get).mockResolvedValue({ data: [] })

      await searchProducts()

      expect(apiClient.get).toHaveBeenCalledWith('/products/search', { params: {} })
    })

    it('sends the search term and both price bounds when all three are supplied', async () => {
      localStorage.setItem('access_token', 'valid-token')
      vi.mocked(apiClient.get).mockResolvedValue({ data: [] })

      await searchProducts('ceramide', 100, 900)

      expect(apiClient.get).toHaveBeenCalledWith('/products/search', {
        params: { q: 'ceramide', min_price: 100, max_price: 900 },
      })
    })

    it('includes a zero price bound rather than dropping it as falsy', async () => {
      localStorage.setItem('access_token', 'valid-token')
      vi.mocked(apiClient.get).mockResolvedValue({ data: [] })

      await searchProducts('', 0, 1500)

      // A `if (minPrice)` check would silently drop 0 and widen the filter.
      expect(apiClient.get).toHaveBeenCalledWith('/products/search', {
        params: { min_price: 0, max_price: 1500 },
      })
    })

    it('searches anonymously without the authenticated client when no token is stored', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: [{ id: 'p-1' }] })

      const result = await searchProducts('ceramide')

      expect(axios.get).toHaveBeenCalled()
      expect(apiClient.get).not.toHaveBeenCalled()
      expect(result).toEqual([{ id: 'p-1' }])
    })

    it('falls back to an anonymous search when the stored token is rejected with 401', async () => {
      localStorage.setItem('access_token', 'expired-token')
      vi.mocked(apiClient.get).mockRejectedValue(unauthorized)
      vi.mocked(axios.get).mockResolvedValue({ data: [{ id: 'p-2' }] })

      const result = await searchProducts('ceramide')

      // Browsing must degrade to anonymous rather than failing outright.
      expect(result).toEqual([{ id: 'p-2' }])
    })

    it('propagates a non-401 failure instead of masking it as an empty result', async () => {
      localStorage.setItem('access_token', 'valid-token')
      vi.mocked(apiClient.get).mockRejectedValue({ response: { status: 500 } })

      await expect(searchProducts('ceramide')).rejects.toEqual({ response: { status: 500 } })
      expect(axios.get).not.toHaveBeenCalled()
    })
  })

  describe('pickTopRecommendations()', () => {
    const scored = (id: string, skin_match_score: number) => ({ id, skin_match_score })

    it('orders products by skin match score from highest to lowest', () => {
      const result = pickTopRecommendations([scored('low', 20), scored('high', 90), scored('mid', 55)])

      expect(result.map((p) => p.id)).toEqual(['high', 'mid', 'low'])
    })

    it('returns at most four products, matching the four-column layout', () => {
      const result = pickTopRecommendations([
        scored('a', 10),
        scored('b', 20),
        scored('c', 30),
        scored('d', 40),
        scored('e', 50),
        scored('f', 60),
      ])

      expect(result).toHaveLength(4)
      expect(result.map((p) => p.id)).toEqual(['f', 'e', 'd', 'c'])
    })

    it('honours an explicit limit when one is given', () => {
      const result = pickTopRecommendations([scored('a', 10), scored('b', 20), scored('c', 30)], 2)

      expect(result.map((p) => p.id)).toEqual(['c', 'b'])
    })

    it('drops products with no skin match score rather than ranking them last', () => {
      // An unscored product is one the backend could not match against the
      // user's skin type - anonymous browsing returns these. Showing it under
      // "recommended for you" would be presenting a match that was never made.
      const result = pickTopRecommendations([
        { id: 'unscored' },
        { id: 'null-score', skin_match_score: null },
        scored('scored', 40),
      ])

      expect(result.map((p) => p.id)).toEqual(['scored'])
    })

    it('sorts, caps and filters in one pass over a realistic response', () => {
      // The three rules above are each pinned on a fixture built to isolate it.
      // This is the shape the function is actually called with: a mixed list,
      // unordered, longer than the cap, with an unscored row in the middle -
      // and no explicit limit, so the default is the one under test.
      //
      // A composition case, not a uniqueness case, and worth saying which. The
      // obvious ordering bug - slicing before filtering and sorting - does fail
      // this, but it also fails two of the isolated cases above, so this is not
      // catching something they would miss. What it adds is the combined
      // outcome on one realistic input: the three rules are known to work
      // apart, and this is the only assertion that they produce the right four
      // products together.
      const result = pickTopRecommendations([
        scored('a', 30),
        scored('b', 90),
        { id: 'null-one', skin_match_score: null },
        scored('c', 10),
        scored('d', 70),
        scored('e', 50),
      ])

      expect(result.map((p) => p.id)).toEqual(['b', 'd', 'e', 'a'])
      expect(result).toHaveLength(4)
    })

    it('returns an empty array when nothing in the response carries a score', () => {
      // The anonymous case. /products/search omits skin_match_score for a
      // caller with no profile, so this is the whole response, not an edge of
      // it - and the widget's empty state is the correct outcome rather than a
      // list of products ranked by nothing.
      const result = pickTopRecommendations([{ id: 'a' }, { id: 'b', skin_match_score: null }])

      expect(result).toEqual([])
    })

    it('drops a NaN score instead of letting it corrupt the ordering', () => {
      const result = pickTopRecommendations([scored('nan', NaN), scored('real', 30)])

      expect(result.map((p) => p.id)).toEqual(['real'])
    })

    it('returns an empty array when the catalog response is empty', () => {
      expect(pickTopRecommendations([])).toEqual([])
    })

    it('returns an empty array when the response is not a list, so a bad payload cannot throw', () => {
      expect(pickTopRecommendations(null as any)).toEqual([])
      expect(pickTopRecommendations(undefined as any)).toEqual([])
    })

    it('leaves the caller\'s array unmodified rather than sorting it in place', () => {
      const input = [scored('a', 10), scored('b', 90)]

      pickTopRecommendations(input)

      expect(input.map((p) => p.id)).toEqual(['a', 'b'])
    })
  })

  describe('buildComparePath()', () => {
    it('produces an address using the a and b parameters CompareView actually reads', () => {
      // FE-DEF-07: Explore sent /compare?slugs=a,b,c, which CompareView reads
      // nowhere, so the comparison rendered its "select two products" prompt.
      expect(buildComparePath(['cerave-cleanser', 'cosrx-sun'])).toBe(
        '/compare?a=cerave-cleanser&b=cosrx-sun',
      )
    })

    it('uses only the first two slugs, since the engine compares exactly two products', () => {
      expect(buildComparePath(['one', 'two', 'three'])).toBe('/compare?a=one&b=two')
    })

    it('returns null when fewer than two products are selected, so the caller can say so', () => {
      expect(buildComparePath([])).toBeNull()
      expect(buildComparePath(['only-one'])).toBeNull()
    })

    it('ignores empty slug entries rather than building an address with a blank product', () => {
      expect(buildComparePath(['', 'real-one'])).toBeNull()
      expect(buildComparePath(['a-slug', '', 'b-slug'])).toBe('/compare?a=a-slug&b=b-slug')
    })

    it('escapes slugs so an unexpected character cannot alter the query string', () => {
      expect(buildComparePath(['a&b=x', 'plain'])).toBe('/compare?a=a%26b%3Dx&b=plain')
    })

    it('returns null when handed something that is not a list, so a bad caller cannot throw', () => {
      expect(buildComparePath(null as never)).toBeNull()
    })

    it('documents the two-product limit that GET /products/compare imposes', () => {
      // Documentation, not enforcement. Nothing in the application reads this
      // constant since FE-DEF-11 removed Explore's multi-select; the limit is
      // actually imposed by buildComparePath, which emits only `a` and `b`, and
      // by both remaining callers picking exactly two products. Phrased as what
      // it verifies rather than "caps comparison at two", which would claim an
      // enforcement that no longer exists.
      expect(MAX_COMPARE_PRODUCTS).toBe(2)
    })
  })

  describe('resolveMatchBand()', () => {
    it('reports a score of 85 or above as a strong match', () => {
      expect(resolveMatchBand(92)).toBe('strong')
      expect(resolveMatchBand(85)).toBe('strong')
    })

    it('reports a score from 60 up to but not including 85 as a moderate match', () => {
      expect(resolveMatchBand(84.9)).toBe('moderate')
      expect(resolveMatchBand(60)).toBe('moderate')
    })

    it('reports a score below 60 as a weak match', () => {
      expect(resolveMatchBand(59.9)).toBe('weak')
      expect(resolveMatchBand(20)).toBe('weak')
    })

    it('reports a score of exactly 84 as a moderate match', () => {
      // The Test Plan names 84 and 59 as its boundary fixtures; these two cases
      // carry those exact values so a plan row and a record row can be matched
      // without a reader having to reason about 84.9 being the same branch.
      //
      // The fractional fixtures above are kept rather than replaced. They are
      // not redundant: 84.9 also rules out a rounding or truncation bug, which
      // would send it to 85 and into the strong band, and 84 cannot show that.
      expect(resolveMatchBand(84)).toBe('moderate')
    })

    it('reports a score of exactly 59 as a weak match', () => {
      expect(resolveMatchBand(59)).toBe('weak')
    })

    it('reports a missing score as unavailable rather than as a weak match', () => {
      // FE-DEF-12's sibling rule: "not computed" is not "scored badly". An
      // anonymous request carries no score, and painting that red would report
      // a verdict nobody produced.
      expect(resolveMatchBand(null)).toBe('unavailable')
      expect(resolveMatchBand(undefined)).toBe('unavailable')
    })

    it('reports a non-numeric or non-finite score as unavailable', () => {
      expect(resolveMatchBand(NaN)).toBe('unavailable')
      expect(resolveMatchBand('85' as never)).toBe('unavailable')
    })

    it('places a score of zero in the weak band, since zero was computed', () => {
      // Distinct from the case above: 0 is a real result, null is the absence
      // of one. Treating them alike is the confusion this function exists for.
      expect(resolveMatchBand(0)).toBe('weak')
    })
  })

  describe('resolveMatchAvailability()', () => {
    it('reports a computed score as scored regardless of the session', () => {
      expect(resolveMatchAvailability(82, true, 'DSPW')).toBe('scored')
    })

    it('reports a missing score for a signed-out visitor as signed-out, not as a failure', () => {
      // FE-DEF-31. The backend returns null because there is no profile to
      // score against, which is the ordinary state for a visitor. The compare
      // header called this "Failed to calculate score".
      expect(resolveMatchAvailability(null, false, null)).toBe('signed-out')
    })

    it('reports a missing score for a signed-in user who has not taken the quiz as no-profile', () => {
      expect(resolveMatchAvailability(null, true, null)).toBe('no-profile')
      expect(resolveMatchAvailability(null, true, '   ')).toBe('no-profile')
    })

    it('reports a missing score for a user who does have a profile as not-scored', () => {
      // The residue, and the only one of the four where something did go wrong.
      expect(resolveMatchAvailability(null, true, 'DSPW')).toBe('not-scored')
    })

    it('prefers the signed-out reading over the profile one, since a signed-out session has no profile to read', () => {
      expect(resolveMatchAvailability(null, false, 'DSPW')).toBe('signed-out')
    })

    it('never describes an absent score as a failure', () => {
      // Pins the defect itself rather than any one branch: whatever the
      // session, the sentence shown in place of a score must not claim the
      // request broke.
      const sessions: Array<[boolean, string | null]> = [
        [false, null],
        [true, null],
        [true, 'DSPW'],
      ]

      for (const [isAuthenticated, skinType] of sessions) {
        const sentence = describeMatchAvailability(
          resolveMatchAvailability(null, isAuthenticated, skinType),
        )

        expect(sentence).not.toMatch(/fail/i)
        expect(sentence.length).toBeGreaterThan(0)
      }
    })
  })

  describe('resolveSimilarityBand()', () => {
    it('bands a high overlap, a moderate one and a low one', () => {
      expect(resolveSimilarityBand(85, 10, 10)).toBe('high')
      expect(resolveSimilarityBand(60, 10, 10)).toBe('high')
      expect(resolveSimilarityBand(59.9, 10, 10)).toBe('moderate')
      expect(resolveSimilarityBand(25, 10, 10)).toBe('moderate')
      expect(resolveSimilarityBand(24.9, 10, 10)).toBe('low')
    })

    it('reports a zero from two products that both list ingredients as a real low overlap', () => {
      // A genuine answer: the union is non-empty and the intersection is empty.
      expect(resolveSimilarityBand(0, 12, 9)).toBe('low')
    })

    it('reports a zero from two products with no ingredients at all as unavailable', () => {
      // The backend's Jaccard returns 0.0 for an empty union, which is "there
      // was nothing to compare" wearing the same shape as "these share
      // nothing". The counts are in the same response and separate them.
      expect(resolveSimilarityBand(0, 0, 0)).toBe('unavailable')
    })

    it('still reports a real zero when only one of the two lists is empty', () => {
      // The union is not empty here, so the zero was computed and means it.
      expect(resolveSimilarityBand(0, 14, 0)).toBe('low')
      expect(resolveSimilarityBand(0, 0, 14)).toBe('low')
    })

    it('reports a missing or non-numeric figure as unavailable', () => {
      expect(resolveSimilarityBand(null, 10, 10)).toBe('unavailable')
      expect(resolveSimilarityBand(undefined, 10, 10)).toBe('unavailable')
      expect(resolveSimilarityBand(NaN, 10, 10)).toBe('unavailable')
      expect(resolveSimilarityBand('60' as never, 10, 10)).toBe('unavailable')
    })
  })

  describe('resolveComparisonSimilarity()', () => {
    const withIngredients = (n: number) => ({
      product_ingredients: Array.from({ length: n }, (_, i) => ({ ingredients: { id: `i-${i}` } })),
    })

    it('reads the figure and both ingredient counts off one comparison payload', () => {
      const outcome = resolveComparisonSimilarity({
        similarity_score: 72,
        product_a: withIngredients(10),
        product_b: withIngredients(8),
      })

      expect(outcome.band).toBe('high')
      expect(outcome.label).toBe('72% shared ingredients')
    })

    it('rounds the figure for display rather than printing the backend decimal', () => {
      const outcome = resolveComparisonSimilarity({
        similarity_score: 12.5,
        product_a: withIngredients(10),
        product_b: withIngredients(8),
      })

      expect(outcome.label).toBe('13% shared ingredients')
    })

    it('omits the figure entirely when neither product has an ingredient list', () => {
      // The backend's Jaccard returns 0.0 for an empty union. Printing that as
      // "0% shared ingredients" states a comparison that never happened.
      const outcome = resolveComparisonSimilarity({
        similarity_score: 0,
        product_a: withIngredients(0),
        product_b: withIngredients(0),
      })

      expect(outcome.band).toBe('unavailable')
      expect(outcome.label).toBe('No overlap figure')
      expect(outcome.label).not.toMatch(/%/)
    })

    it('still prints a real zero when the two products genuinely share nothing', () => {
      const outcome = resolveComparisonSimilarity({
        similarity_score: 0,
        product_a: withIngredients(12),
        product_b: withIngredients(9),
      })

      expect(outcome.band).toBe('low')
      expect(outcome.label).toBe('0% shared ingredients')
    })

    it('gives the same answer to both screens that render this figure', () => {
      // The point of the helper. The overview and the ingredients matrix show
      // one number to one user, and each having its own copy of the rounding
      // and the thresholds is exactly what FE-DEF-12 was.
      const payload = {
        similarity_score: 59.6,
        product_a: withIngredients(10),
        product_b: withIngredients(8),
      }

      expect(resolveComparisonSimilarity(payload)).toEqual(resolveComparisonSimilarity(payload))
      // 59.6 rounds to 60 for display but bands on the raw value, so the badge
      // reads "60%" while the sentence is the moderate one. Pinned because the
      // obvious "round first, then band" refactor would silently change it.
      expect(resolveComparisonSimilarity(payload).label).toBe('60% shared ingredients')
      expect(resolveComparisonSimilarity(payload).band).toBe('moderate')
    })

    it('reports an absent payload as unavailable rather than throwing', () => {
      expect(resolveComparisonSimilarity(null).band).toBe('unavailable')
      expect(resolveComparisonSimilarity(undefined).band).toBe('unavailable')
      expect(resolveComparisonSimilarity({}).band).toBe('unavailable')
    })
  })

  describe('resolveProductLabel()', () => {
    it('returns the brand and the name separately, so a label can show both', () => {
      expect(resolveProductLabel({ brand: 'CeraVe', name: 'Niacinamide Serum' }, 'Formula A')).toEqual({
        brand: 'CeraVe',
        name: 'Niacinamide Serum',
      })
    })

    it('promotes the brand into the name slot when the product has no name', () => {
      // Rather than rendering the brand above an empty line. Both fields are
      // nullable server-side.
      expect(resolveProductLabel({ brand: 'CeraVe', name: null }, 'Formula A')).toEqual({
        brand: '',
        name: 'CeraVe',
      })
    })

    it('falls back to the positional label when the product has neither', () => {
      // A column still has to be callable something the reader can match to a
      // side, and "Formula A" is at least true.
      expect(resolveProductLabel({}, 'Formula A')).toEqual({ brand: '', name: 'Formula A' })
      expect(resolveProductLabel(null, 'Formula B')).toEqual({ brand: '', name: 'Formula B' })
    })

    it('treats a whitespace-only field as absent rather than rendering a blank label', () => {
      expect(resolveProductLabel({ brand: '   ', name: '  ' }, 'Formula A')).toEqual({
        brand: '',
        name: 'Formula A',
      })
    })

    it('ignores non-string fields instead of printing them', () => {
      expect(resolveProductLabel({ brand: 42, name: { toString: () => 'x' } }, 'Formula B')).toEqual({
        brand: '',
        name: 'Formula B',
      })
    })
  })

  describe('resolveRequestFailure()', () => {
    it('reads a 404 as the server answering that the thing is absent', () => {
      expect(resolveRequestFailure({ response: { status: 404 } })).toBe('not-found')
    })

    it('reads every other status as no usable answer, not as absence', () => {
      // FE-DEF-35's rule. Saying "we couldn't find that product" for a 400 or a
      // 500 states something about the catalogue that nobody established - the
      // same fault FE-DEF-09 recorded for an empty filter result.
      expect(resolveRequestFailure({ response: { status: 400 } })).toBe('unavailable')
      expect(resolveRequestFailure({ response: { status: 500 } })).toBe('unavailable')
      expect(resolveRequestFailure({ response: { status: 401 } })).toBe('unavailable')
    })

    it('reads a thrown error with no response at all as unavailable', () => {
      // A network failure, or the parse error CompareView throws itself when
      // the body arrives without both products.
      expect(resolveRequestFailure(new Error('Network Error'))).toBe('unavailable')
      expect(resolveRequestFailure(null)).toBe('unavailable')
      expect(resolveRequestFailure(undefined)).toBe('unavailable')
      expect(resolveRequestFailure('nope')).toBe('unavailable')
    })

    it('does not treat a 404 written as a string as a 404', () => {
      // Guards the strict comparison. A loose one would also match a stray
      // truthy value and start reporting absence for failures that are not.
      expect(resolveRequestFailure({ response: { status: '404' } })).toBe('unavailable')
    })
  })

  describe('resolvePairConflictState()', () => {
    const stocked = (n = 6) => ({
      product_ingredients: Array.from({ length: n }, (_, i) => ({ ingredients: { id: `i-${i}` } })),
    })
    const clash = { alert_type: 'Chemical Interaction Warning', severity: 'high', message: 'Do not layer these.' }

    it('reports clashes when the engine returned any', () => {
      expect(
        resolvePairConflictState({ conflicts: [clash], product_a: stocked(), product_b: stocked() }),
      ).toBe('conflicts')
    })

    it('reports a clean pair when the engine ran on both products and returned none', () => {
      expect(
        resolvePairConflictState({ conflicts: [], product_a: stocked(), product_b: stocked() }),
      ).toBe('clear')
    })

    it('does not call a pair clear when one product has no ingredients to compare', () => {
      // FE-DEF-32's rule, and the one evaluateSafety exists for: an empty list
      // is not on its own evidence of safety. CompareResponse carries no
      // is_safe, so the counts are the only thing that separates a check that
      // found nothing from one that had nothing to check.
      expect(
        resolvePairConflictState({ conflicts: [], product_a: stocked(0), product_b: stocked() }),
      ).toBe('unassessable')
      expect(
        resolvePairConflictState({ conflicts: [], product_a: stocked(), product_b: stocked(0) }),
      ).toBe('unassessable')
    })

    it('never downgrades a reported clash to unassessable, whatever the lists look like', () => {
      // A non-empty list is proof the engine ran. The guard above exists to
      // catch silence and must not be allowed to suppress a warning.
      expect(
        resolvePairConflictState({ conflicts: [clash], product_a: stocked(0), product_b: stocked(0) }),
      ).toBe('conflicts')
    })

    it('treats a response with no conflicts field as unassessable, not as clear', () => {
      // An older or partial payload. Reporting "no clashes" about a field that
      // never arrived is reporting a result nobody produced.
      expect(resolvePairConflictState({ product_a: stocked(), product_b: stocked() })).toBe('unassessable')
      expect(resolvePairConflictState({ conflicts: 'nope', product_a: stocked(), product_b: stocked() })).toBe(
        'unassessable',
      )
      expect(resolvePairConflictState(null)).toBe('unassessable')
    })
  })

  describe('resolvePairConflicts()', () => {
    it('returns the warnings the engine reported', () => {
      const clash = { alert_type: 'Category Conflict', severity: 'high', message: 'Retinoid with BHA.' }

      expect(resolvePairConflicts({ conflicts: [clash] })).toEqual([clash])
    })

    it('drops entries with no message rather than rendering an empty warning card', () => {
      const clash = { alert_type: 'Category Conflict', severity: 'high', message: 'Retinoid with BHA.' }

      expect(resolvePairConflicts({ conflicts: [clash, null, {}, { message: 42 }] as never })).toEqual([clash])
    })

    it('returns an empty list for a malformed or absent field rather than throwing', () => {
      expect(resolvePairConflicts({ conflicts: 'nope' as never })).toEqual([])
      expect(resolvePairConflicts({})).toEqual([])
      expect(resolvePairConflicts(null)).toEqual([])
    })
  })

  describe('countProductIngredients()', () => {
    it('counts only the rows that actually carry an ingredient', () => {
      // The same test the backend applies when it builds the sets it measures,
      // so the counts shown beside the overlap figure describe its input.
      const product = {
        product_ingredients: [
          { ingredients: { id: 'i-1', name: 'Glycerin' } },
          { ingredients: null },
          {},
          { ingredients: { id: 'i-2', name: 'Niacinamide' } },
        ],
      }

      expect(countProductIngredients(product)).toBe(2)
    })

    it('reports zero for a product with no ingredient list, rather than throwing', () => {
      expect(countProductIngredients({ product_ingredients: [] })).toBe(0)
      expect(countProductIngredients({})).toBe(0)
      expect(countProductIngredients(null)).toBe(0)
      expect(countProductIngredients({ product_ingredients: 'nope' })).toBe(0)
    })
  })

  describe('resolveCatalogState()', () => {
    it('shows the product grid when the catalogue arrived and products match the filters', () => {
      expect(resolveCatalogState(false, false, 12)).toBe('results')
    })

    it('shows the empty state when the catalogue arrived and no product matches the filters', () => {
      expect(resolveCatalogState(false, false, 0)).toBe('empty')
    })

    it('shows the failure state, not the empty state, when the catalogue never arrived', () => {
      // FE-DEF-09: on first load the catalogue is still [], so without a
      // separate failure flag this case reported the user's filters as having
      // excluded everything - a conclusion drawn from a request that never ran.
      expect(resolveCatalogState(false, true, 0)).toBe('failed')
    })

    it('shows the failure state rather than the products left over from the previous request', () => {
      // The re-request symptom: price controls display the new bounds while the
      // grid still holds results fetched under the old ones.
      expect(resolveCatalogState(false, true, 12)).toBe('failed')
    })

    it('reports loading while the request is in flight, whatever the previous outcome was', () => {
      expect(resolveCatalogState(true, false, 0)).toBe('loading')
      expect(resolveCatalogState(true, true, 12)).toBe('loading')
    })
  })

  describe('getProductBySlug()', () => {
    it('requests the product by slug through the authenticated client when a token exists', async () => {
      localStorage.setItem('access_token', 'valid-token')
      vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'p-1' } })

      const result = await getProductBySlug('cerave-hydrating-facial-cleanser')

      expect(apiClient.get).toHaveBeenCalledWith('/products/slug/cerave-hydrating-facial-cleanser')
      expect(result).toEqual({ id: 'p-1' })
    })

    it('percent-encodes a slug containing characters that are unsafe in a URL path', async () => {
      localStorage.setItem('access_token', 'valid-token')
      vi.mocked(apiClient.get).mockResolvedValue({ data: {} })

      await getProductBySlug('niacinamide 10% + zinc')

      expect(apiClient.get).toHaveBeenCalledWith('/products/slug/niacinamide%2010%25%20%2B%20zinc')
    })

    it('falls back to an anonymous lookup when the stored token is rejected with 401', async () => {
      localStorage.setItem('access_token', 'expired-token')
      vi.mocked(apiClient.get).mockRejectedValue(unauthorized)
      vi.mocked(axios.get).mockResolvedValue({ data: { id: 'guest-view' } })

      const result = await getProductBySlug('some-slug')

      expect(result).toEqual({ id: 'guest-view' })
    })
  })

  describe('getProductById()', () => {
    it('resolves through the slug endpoint, which accepts a UUID as well as a slug', async () => {
      localStorage.setItem('access_token', 'valid-token')
      vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'uuid-123' } })

      const result = await getProductById('uuid-123')

      expect(apiClient.get).toHaveBeenCalledWith('/products/slug/uuid-123')
      expect(result).toEqual({ id: 'uuid-123' })
    })
  })

  describe('getProductComparison()', () => {
    it('sends both product ids as separate query parameters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { similarity_score: 0 } })

      await getProductComparison('a-1', 'b-2')

      expect(apiClient.get).toHaveBeenCalledWith('/products/compare', {
        params: { product_a_id: 'a-1', product_b_id: 'b-2' },
      })
    })

    it('returns the full comparison payload including shared ingredients and conflicts', async () => {
      const payload = {
        product_a: { id: 'a-1' },
        product_b: { id: 'b-2' },
        shared_ingredients: [{ id: 'i-1', name: 'Glycerin' }],
        similarity_score: 0.42,
        conflicts: [{ alert_type: 'category', severity: 'high', message: 'Do not layer' }],
      }
      vi.mocked(apiClient.get).mockResolvedValue({ data: payload })

      const result = await getProductComparison('a-1', 'b-2')

      expect(result).toEqual(payload)
    })

    it('propagates a comparison failure rather than returning a partial result', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('compare failed'))

      await expect(getProductComparison('a-1', 'b-2')).rejects.toThrow('compare failed')
    })
  })

  // Appended after the request groups rather than beside resolveSimilarityBand,
  // so that adding it moves no group ID already cited in this file.
  describe('describeSimilarityBand()', () => {
    it('says there was nothing to compare when the figure is unavailable', () => {
      // Pinned as the sentence, not only as the band. The band was covered; the
      // words the user reads for it were not, at any level.
      expect(describeSimilarityBand('unavailable')).toBe(
        'Neither formula has an ingredient list on record, so there was nothing to compare.',
      )
    })

    it('warns of redundancy for a high overlap', () => {
      expect(describeSimilarityBand('high')).toBe(
        'These two list most of the same ingredients. Owning both may be redundant.',
      )
    })

    it('describes a moderate overlap without judging it', () => {
      expect(describeSimilarityBand('moderate')).toBe(
        'These two share a noticeable part of their ingredient lists.',
      )
    })

    it('describes a low overlap as different lists rather than as different products', () => {
      // "Different ingredient lists", not "different products": two
      // moisturisers can share most of their base and behave nothing alike, so
      // the sentence says what was measured and stops there.
      expect(describeSimilarityBand('low')).toBe(
        'These two are built from largely different ingredient lists.',
      )
    })

    it('gives four different sentences, so no two bands read alike', () => {
      const sentences = (['unavailable', 'high', 'moderate', 'low'] as const).map(describeSimilarityBand)

      expect(new Set(sentences).size).toBe(4)
    })

    // A limit on the unavailable sentence, recorded rather than covered.
    // resolveSimilarityBand returns 'unavailable' for two different reasons -
    // both ingredient lists empty, or a score that is not a finite number - and
    // this sentence is true only of the first. It is accurate for every response
    // the backend can currently send, because compute_ingredient_similarity
    // always returns a float (0.0 for an empty union) and never null. If
    // similarity_score ever became nullable - which is exactly the change the
    // resolveSimilarityBand comment names as the right fix for a filtered basis -
    // a null score beside two populated lists would be described as having no
    // ingredient list on record.
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('match breakdown', () => {
    // The shape from backend feat/percentage-skin-match (ae1b9c9).
    const breakdown = (overrides: Record<string, unknown> = {}) => ({
      helpful: 6,
      concerns: 2,
      concern_weight: 0.9,
      considered: 7,
      total_ingredients: 26,
      limited: false,
      ...overrides,
    })

    it('reads a breakdown as sent, and nothing that is not one', () => {
      expect(readMatchBreakdown(breakdown())).toEqual(breakdown())
      expect(readMatchBreakdown(null)).toBeNull()
      expect(readMatchBreakdown(undefined)).toBeNull()
      expect(readMatchBreakdown({ helpful: 1 })).toBeNull()
      expect(readMatchBreakdown(breakdown({ considered: 'seven' }))).toBeNull()
    })

    it('treats a missing limited flag as not limited rather than guessing', () => {
      const withoutFlag: Record<string, unknown> = breakdown({ limited: true })
      delete withoutFlag.limited
      expect(readMatchBreakdown(withoutFlag)!.limited).toBe(false)
    })

    it('states the working in one plain sentence', () => {
      expect(describeMatchWorking(readMatchBreakdown(breakdown())!)).toBe(
        'Based on 7 of its 26 ingredients: 6 suit your skin type, 2 may not suit it.',
      )
    })

    it('reads considered from its own field, since one ingredient can count on both sides', () => {
      // Niacinamide for OSPT: suits oily, flagged for sensitive. helpful plus
      // concerns is 2, but only 1 ingredient was considered.
      const sentence = describeMatchWorking(
        readMatchBreakdown(breakdown({ helpful: 1, concerns: 1, considered: 1, total_ingredients: 6 }))!,
      )

      expect(sentence).toBe('Based on 1 of its 6 ingredients: 1 suits your skin type, 1 may not suit it.')
    })

    it('says none rather than zero', () => {
      expect(describeMatchWorking(readMatchBreakdown(breakdown({ helpful: 0, concerns: 1, considered: 1 }))!)).toBe(
        'Based on 1 of its 26 ingredients: none suit your skin type, 1 may not suit it.',
      )
      expect(
        describeMatchWorking(readMatchBreakdown(breakdown({ helpful: 24, concerns: 0, considered: 24, total_ingredients: 52 }))!),
      ).toBe('Based on 24 of its 52 ingredients: 24 suit your skin type, none are a concern for it.')
    })

    it('flags a score resting on very few ingredients', () => {
      expect(describeLimitedMatch(readMatchBreakdown(breakdown({ considered: 1, total_ingredients: 6, limited: true }))!)).toBe(
        'Limited information: only 1 of its 6 ingredients relates to your skin type, so treat this score as a rough guide.',
      )
    })

    it('says why there is nothing to score, without blaming the catalogue', () => {
      expect(describeNothingToScore(readMatchBreakdown(breakdown({ considered: 0, total_ingredients: 9 }))!)).toBe(
        'None of its 9 ingredients are known to suit or trouble your skin type, so there is nothing to score it on.',
      )
      expect(describeNothingToScore(readMatchBreakdown(breakdown({ considered: 0, total_ingredients: 1 }))!)).toBe(
        'Its one ingredient is not known to suit or trouble your skin type, so there is nothing to score it on.',
      )
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('pickTopRecommendations() and limited scores', () => {
    const breakdown = (limited: boolean) => ({
      helpful: 1,
      concerns: 0,
      concern_weight: 0,
      considered: limited ? 1 : 9,
      total_ingredients: 20,
      limited,
    })
    const product = (id: string, skin_match_score: number, limited?: boolean) => ({
      id,
      skin_match_score,
      ...(limited === undefined ? {} : { match_breakdown: breakdown(limited) }),
    })

    it('leaves a limited score out, whatever its number', () => {
      // Owner decision. Live: the BHA exfoliant reads 100% for OSPT on one
      // ingredient of six, and ranked by score it took #1. The page withholds
      // that score by default, so it is no basis for a recommendation.
      const result = pickTopRecommendations([
        product('thin-100', 100, true),
        product('solid-77', 76.9, false),
        product('solid-45', 45.5, false),
      ])

      expect(result.map((p) => p.id)).toEqual(['solid-77', 'solid-45'])
    })

    it('recommends nothing rather than a limited score when every score is limited', () => {
      const result = pickTopRecommendations([product('thin-40', 40, true), product('thin-100', 100, true)])

      expect(result).toEqual([])
    })

    it('does not use a limited score to fill a short list', () => {
      const three = [product('a', 50, false), product('b', 60, false), product('c', 70, false)]

      expect(pickTopRecommendations([...three, product('thin', 100, true)]).map((p) => p.id)).toEqual(['c', 'b', 'a'])
    })

    it('keeps a product without a breakdown, as before the field existed', () => {
      const result = pickTopRecommendations([product('thin', 100, true), product('older-response', 60)])

      expect(result.map((p) => p.id)).toEqual(['older-response'])
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('scores at either end', () => {
    const breakdown = (considered: number) => ({
      helpful: considered,
      concerns: 0,
      concern_weight: 0,
      considered,
      total_ingredients: 30,
      limited: considered < 3,
    })

    it('says a perfect score as its counts rather than 100%', () => {
      // Owner decision: keep the plain ratio, never print 100%. Live example:
      // DRNT with the Moisturising Cream, 11 of 11.
      expect(describeWholeMatch(100, breakdown(11))).toEqual({
        short: 'All 11 suit you',
        long: 'All 11 relevant ingredients suit your skin type.',
      })
    })

    it('says a zero score the same way, as the mirror case', () => {
      expect(describeWholeMatch(0, breakdown(4))).toEqual({
        short: 'None of 4 suit you',
        long: 'None of its 4 relevant ingredients suit your skin type.',
      })
    })

    it('words a single ingredient without "All 1"', () => {
      expect(describeWholeMatch(100, breakdown(1))!.long).toBe('Its one relevant ingredient suits your skin type.')
      expect(describeWholeMatch(0, breakdown(1))!.short).toBe('0 of 1 suits you')
    })

    it('leaves every score in between, and a score without its counts, to the percentage', () => {
      expect(describeWholeMatch(99.9, breakdown(11))).toBeNull()
      expect(describeWholeMatch(0.1, breakdown(11))).toBeNull()
      expect(describeWholeMatch(100, null)).toBeNull()
    })

    it('never rounds a score short of either end onto it', () => {
      expect(displayMatchPercent(99.6)).toBe(99)
      expect(displayMatchPercent(0.4)).toBe(1)
      expect(displayMatchPercent(86.4)).toBe(86)
      expect(displayMatchPercent(100)).toBe(100)
      expect(displayMatchPercent(0)).toBe(0)
    })
  })
})
