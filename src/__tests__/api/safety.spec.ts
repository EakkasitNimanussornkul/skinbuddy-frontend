import { describe, it, expect } from 'vitest'

// Pure decision logic, no mounting and no network. This is the module that
// answers "what does the product do when it cannot determine safety?" once, so
// the three call sites cannot answer it three different ways again.
import {
  evaluateSafety,
  blocksAction,
  resolveSafety,
  showsDuplicates,
  formatSharedActives,
  describeDuplicateOverlap,
  resolveSeverityBand,
  sortBySeverity,
  hasConflictDetails,
  groupSkinTypeConflicts,
  groupSimilarDetails,
  warningSources,
} from '../../api/safety'
import {
  BUFFET,
  PEPTIDES,
  distinctPair,
  explainedAlcohol,
  explainedNiacinamide,
  mergedBuffet,
  peptidePair,
  singlePair,
  skinAlert,
} from '../fixtures/conflicts'

const conflict = {
  alert_type: 'conflict',
  severity: 'high',
  message: 'Do not layer with retinol',
}

const dupe = {
  product_id: 'p-1',
  name: 'Hydrating Serum',
  brand: 'Test Labs',
  slug: 'hydrating-serum',
  similarity: 82.4,
  shared_actives: ['Niacinamide', 'Hyaluronic Acid'],
}

describe('src/api/safety.ts', () => {
  describe('evaluateSafety()', () => {
    it('reports a product as cleared only when the backend affirmatively says it is safe', () => {
      const outcome = evaluateSafety({ is_safe: true, warnings: [] }, false)

      expect(outcome).toEqual({ status: 'cleared', warnings: [], duplicates: [] })
    })

    it('reports conflicts as warned and carries the warnings through', () => {
      const outcome = evaluateSafety({ is_safe: false, warnings: [conflict] }, false)

      expect(outcome).toEqual({ status: 'warned', warnings: [conflict], duplicates: [] })
    })

    it('reports a failed request as unavailable rather than as a product with no conflicts', () => {
      // FE-DEF-01/02/03: the empty-warnings shape of a failed call previously
      // rendered identically to a passed check at all three call sites.
      const outcome = evaluateSafety(null, true)

      expect(outcome).toEqual({ status: 'unavailable', warnings: [], duplicates: [] })
    })

    it('reports a response carrying no safety verdict as unassessed, not as cleared', () => {
      const outcome = evaluateSafety({ warnings: [] }, false)

      expect(outcome.status).toBe('unassessed')
    })

    it('separates a check that returned no verdict from one that never ran', () => {
      // FE-DEF-29: both were 'unavailable', so all three surfaces had one
      // sentence to describe two situations and it asked the user to retry
      // something that retrying cannot fix.
      expect(evaluateSafety({ warnings: [] }, false).status).toBe('unassessed')
      expect(evaluateSafety(null, true).status).toBe('unavailable')
    })

    it('treats a null response body as unavailable even when the request did not throw', () => {
      // Not unassessed: there is no body, so nothing came back to assess.
      expect(evaluateSafety(null, false).status).toBe('unavailable')
      expect(evaluateSafety(undefined, false).status).toBe('unavailable')
    })

    it('trusts reported conflicts over a contradictory is_safe verdict', () => {
      const outcome = evaluateSafety({ is_safe: true, warnings: [conflict] }, false)

      expect(outcome.status).toBe('warned')
    })

    it('treats a malformed warnings field as no warnings rather than throwing', () => {
      const outcome = evaluateSafety({ is_safe: true, warnings: 'nope' } as never, false)

      expect(outcome.status).toBe('cleared')
    })

    it('reports an explicit unsafe verdict with no listed warnings as still not cleared', () => {
      const outcome = evaluateSafety({ is_safe: false, warnings: [] }, false)

      expect(outcome.status).not.toBe('cleared')
    })

    it('reports an explicit unsafe verdict with no listed warnings as unassessed specifically', () => {
      // Kept alongside the looser assertion above rather than replacing it. That
      // one pins the safety-critical property - this input must never clear -
      // and stays true whatever the non-cleared statuses are later called. This
      // one pins which of them it is, because the three are worded differently
      // on screen and the difference is the whole of FE-DEF-29.
      //
      // The existing 'unassessed' assertion is on a body that omits is_safe.
      // This one sets it to false explicitly: the backend says "not safe" and
      // lists nothing, which is a claim without evidence rather than a verdict,
      // and it must land in the same place as saying nothing at all.
      const outcome = evaluateSafety({ is_safe: false, warnings: [] }, false)

      expect(outcome.status).toBe('unassessed')
    })
  })

  describe('blocksAction()', () => {
    it('allows the action to continue only on a cleared outcome', () => {
      expect(blocksAction({ status: 'cleared', warnings: [], duplicates: [] })).toBe(false)
    })

    it('blocks the action when conflicts were found', () => {
      expect(blocksAction({ status: 'warned', warnings: [conflict], duplicates: [] })).toBe(true)
    })

    it('blocks the action when safety could not be determined, so a save cannot proceed unchecked', () => {
      // This is the assertion that pins FE-DEF-01: the add flow previously fell
      // through to addToShelf when the analysis threw.
      expect(blocksAction({ status: 'unavailable', warnings: [], duplicates: [] })).toBe(true)
    })

    it('blocks the action when the check returned no verdict, which is not a pass either', () => {
      // FE-DEF-29 split this out of 'unavailable' so the two could be worded
      // differently on screen. The gate must not have widened in the process:
      // an unassessed product is still one nobody cleared.
      expect(blocksAction({ status: 'unassessed', warnings: [], duplicates: [] })).toBe(true)
    })

    it('still allows the action when the user already owns a similar product, because a dupe is not a hazard', () => {
      // Pins the rule the backend schema comment also states: duplicates are
      // advisory and must never reach the blocking add-to-shelf gate.
      expect(blocksAction({ status: 'cleared', warnings: [], duplicates: [dupe] })).toBe(false)
    })
  })

  describe('resolveSafety()', () => {
    it('converts a thrown request into an unavailable outcome instead of letting it escape', async () => {
      const outcome = await resolveSafety(() => Promise.reject(new Error('network down')))

      expect(outcome).toEqual({ status: 'unavailable', warnings: [], duplicates: [] })
    })

    it('interprets a successful response through the same rules as evaluateSafety', async () => {
      const outcome = await resolveSafety(() => Promise.resolve({ is_safe: true, warnings: [] }))

      expect(outcome.status).toBe('cleared')
    })
  })

  describe('evaluateSafety() duplicates', () => {
    it('carries shelf duplicates through alongside a cleared verdict', () => {
      const outcome = evaluateSafety({ is_safe: true, warnings: [], duplicates: [dupe] }, false)

      expect(outcome.status).toBe('cleared')
      expect(outcome.duplicates).toEqual([dupe])
    })

    it('carries shelf duplicates through alongside conflict warnings, so both are reported at once', () => {
      const outcome = evaluateSafety(
        { is_safe: false, warnings: [conflict], duplicates: [dupe] },
        false,
      )

      expect(outcome.status).toBe('warned')
      expect(outcome.duplicates).toEqual([dupe])
    })

    it('reports no duplicates when the response omits the field entirely', () => {
      const outcome = evaluateSafety({ is_safe: true, warnings: [] }, false)

      expect(outcome.duplicates).toEqual([])
    })

    it('treats a malformed duplicates field as no duplicates rather than throwing', () => {
      const outcome = evaluateSafety({ is_safe: true, duplicates: 'nope' } as never, false)

      expect(outcome.duplicates).toEqual([])
    })

    it('reports no duplicates when the request failed, because none were received', () => {
      expect(evaluateSafety(null, true).duplicates).toEqual([])
    })

    it('preserves duplicates alongside an explicit unsafe verdict that listed no conflicts', () => {
      // Same body as the unassessed case below but with is_safe: false stated
      // rather than omitted. Both reach the unassessed branch, and the dupes
      // must survive either route - a response that says "not safe" without
      // saying why has still told us what the user already owns, and dropping
      // that would hide a true fact because a different field was unhelpful.
      const outcome = evaluateSafety(
        { is_safe: false, warnings: [], duplicates: [dupe] },
        false,
      )

      expect(outcome.status).toBe('unassessed')
      expect(outcome.duplicates).toEqual([dupe])
    })

    it('preserves duplicates on a response that carried them but no safety verdict', () => {
      // Not a contradiction: the data arrived, the verdict did not. Preserving
      // it here is what leaves showsDuplicates() the one place that decides
      // whether an unverdicted response may be rendered.
      const outcome = evaluateSafety({ warnings: [], duplicates: [dupe] }, false)

      expect(outcome.status).toBe('unassessed')
      expect(outcome.duplicates).toEqual([dupe])
    })
  })

  describe('showsDuplicates()', () => {
    it('shows the section when a completed check found a product the user already owns', () => {
      expect(showsDuplicates({ status: 'cleared', warnings: [], duplicates: [dupe] })).toBe(true)
    })

    it('shows the section alongside conflict warnings, since a dupe is reported independently of them', () => {
      expect(
        showsDuplicates({ status: 'warned', warnings: [conflict], duplicates: [dupe] }),
      ).toBe(true)
    })

    it('hides the section when a completed check found nothing similar', () => {
      expect(showsDuplicates({ status: 'cleared', warnings: [], duplicates: [] })).toBe(false)
    })

    it('hides the section when the check never ran, even though duplicates arrived', () => {
      // The case the status half of the guard exists for. Rendering a list that
      // reached us outside a completed check would imply a shelf comparison
      // that did not happen.
      expect(
        showsDuplicates({ status: 'unavailable', warnings: [], duplicates: [dupe] }),
      ).toBe(false)
    })

    it('shows the section on a response that carried duplicates but no safety verdict, because that check did run', () => {
      // The line this guard draws is answered against unanswered, not safe
      // against unsafe. An unassessed response came back and its duplicate scan
      // completed, so its list means what it says even though the conflict
      // check reached no verdict. FE-DEF-29 is what made the two separable.
      expect(
        showsDuplicates({ status: 'unassessed', warnings: [], duplicates: [dupe] }),
      ).toBe(true)
    })

    it('hides the section when the check failed and returned nothing', () => {
      expect(showsDuplicates({ status: 'unavailable', warnings: [], duplicates: [] })).toBe(false)
    })
  })

  describe('formatSharedActives()', () => {
    it('returns a single ingredient name on its own', () => {
      expect(formatSharedActives(['Niacinamide'])).toBe('Niacinamide')
    })

    it('joins two ingredient names with "and" and no comma', () => {
      expect(formatSharedActives(['Niacinamide', 'Retinol'])).toBe('Niacinamide and Retinol')
    })

    it('joins three or more names with commas and a final "and"', () => {
      expect(formatSharedActives(['Niacinamide', 'Retinol', 'Salicylic Acid'])).toBe(
        'Niacinamide, Retinol and Salicylic Acid',
      )
    })

    it('returns an empty string for an empty list, so the caller can drop the phrase', () => {
      expect(formatSharedActives([])).toBe('')
    })

    it('returns an empty string when the field is missing or not a list', () => {
      expect(formatSharedActives(undefined)).toBe('')
      expect(formatSharedActives(null)).toBe('')
      expect(formatSharedActives('Niacinamide' as never)).toBe('')
    })

    it('discards blank and non-string entries and trims the names it keeps', () => {
      expect(formatSharedActives([' Niacinamide ', '', null as never, 'Retinol'])).toBe(
        'Niacinamide and Retinol',
      )
    })
  })

  describe('describeDuplicateOverlap()', () => {
    it('states the rounded match percentage and lists the shared ingredients', () => {
      expect(describeDuplicateOverlap(dupe)).toBe(
        '82% of its active ingredients match, including Niacinamide and Hyaluronic Acid.',
      )
    })

    it('omits the ingredient list when the backend sent none, leaving no dangling "including"', () => {
      expect(describeDuplicateOverlap({ ...dupe, shared_actives: [] })).toBe(
        '82% of its active ingredients match.',
      )
    })

    it('drops the percentage rather than printing 0% when the similarity is unusable', () => {
      // Reporting a computed-looking 0% for a figure that never arrived is the
      // same class of mistake as reading an empty warnings list as a pass.
      const described = describeDuplicateOverlap({ ...dupe, similarity: NaN })

      expect(described).toBe(
        'Its active ingredients substantially match, including Niacinamide and Hyaluronic Acid.',
      )
    })

    it('rounds a fractional similarity to the nearest whole percent rather than truncating it', () => {
      expect(describeDuplicateOverlap({ ...dupe, similarity: 66.7, shared_actives: [] })).toBe(
        '67% of its active ingredients match.',
      )
    })

    it('clamps a similarity above 100 down to 100 percent', () => {
      expect(describeDuplicateOverlap({ ...dupe, similarity: 140, shared_actives: [] })).toBe(
        '100% of its active ingredients match.',
      )
    })
  })

  describe('resolveSeverityBand()', () => {
    // FE-DEF-25: three components rendered this field and banded it three
    // different ways - three-way, two-way, and not at all. The band is shared
    // now so a Low warning cannot be drawn in the same alarm red as a High one.
    it('bands a high severity as high', () => {
      expect(resolveSeverityBand('High')).toBe('high')
    })

    it('bands a medium severity as medium', () => {
      expect(resolveSeverityBand('Medium')).toBe('medium')
    })

    it('bands a low severity as low, distinctly from medium', () => {
      // The reachable case this entry was about: conflict_rules holds a Low
      // rule, and two of the three components had no band for it.
      expect(resolveSeverityBand('Low')).toBe('low')
    })

    it('reads the severity whatever case and spacing the backend sends', () => {
      expect(resolveSeverityBand('  HIGH  ')).toBe('high')
      expect(resolveSeverityBand('low')).toBe('low')
    })

    it('reports a missing severity as unknown rather than defaulting it to high', () => {
      // The second half of FE-DEF-25. `severity || 'HIGH'` printed a value the
      // backend never sent, and printed the most alarming one.
      expect(resolveSeverityBand(undefined)).toBe('unknown')
      expect(resolveSeverityBand(null)).toBe('unknown')
      expect(resolveSeverityBand('')).toBe('unknown')
    })

    it('reports a severity it does not recognise as unknown rather than guessing', () => {
      expect(resolveSeverityBand('critical')).toBe('unknown')
    })

    it('bands the concerns table grade "Moderate" as medium', () => {
      // ingredient_concerns rows reach the product and compare pages raw, graded
      // High/Moderate/Low. Unbanded, 12 of the 29 live rows read as unknown.
      expect(resolveSeverityBand('Moderate')).toBe('medium')
      expect(resolveSeverityBand(' moderate ')).toBe('medium')
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('sortBySeverity()', () => {
    const w = (severity: string | null, message: string) => ({ alert_type: 'Interaction', severity, message })

    it('orders High, then Medium, then Low', () => {
      const sorted = sortBySeverity([w('Low', 'l'), w('High', 'h'), w('Medium', 'm')])

      expect(sorted.map((x) => x.message)).toEqual(['h', 'm', 'l'])
    })

    it('reads the severity however the backend cased it', () => {
      const sorted = sortBySeverity([w('low', 'l'), w('  HIGH ', 'h')])

      expect(sorted.map((x) => x.message)).toEqual(['h', 'l'])
    })

    it('puts an unbanded warning last rather than first', () => {
      // A missing severity is not more alarming for having no grade - the
      // mistake FE-DEF-25 recorded ran the other way.
      const sorted = sortBySeverity([w(null, 'none'), w('Low', 'l'), w('catastrophic', 'odd')])

      expect(sorted.map((x) => x.message)).toEqual(['l', 'none', 'odd'])
    })

    it('keeps backend order within one severity', () => {
      const sorted = sortBySeverity([w('High', 'first'), w('Low', 'x'), w('High', 'second'), w('High', 'third')])

      expect(sorted.map((x) => x.message)).toEqual(['first', 'second', 'third', 'x'])
    })

    it('returns a new array and leaves the input as it was', () => {
      const input = [w('Low', 'l'), w('High', 'h')]

      const sorted = sortBySeverity(input)

      expect(sorted).not.toBe(input)
      expect(input.map((x) => x.message)).toEqual(['l', 'h'])
    })

    it('treats an absent list as empty', () => {
      expect(sortBySeverity(null)).toEqual([])
      expect(sortBySeverity(undefined)).toEqual([])
    })
  })

  // Appended last, so adding them moves no group ID already cited in this file.
  describe('hasConflictDetails()', () => {
    it('is true only for a merged card with two or more pairs', () => {
      expect(hasConflictDetails(mergedBuffet())).toBe(true)
      expect(hasConflictDetails(singlePair())).toBe(false)
      expect(hasConflictDetails(skinAlert('x'))).toBe(false)
      // An older response with no details field at all renders as before.
      expect(hasConflictDetails({ details: undefined })).toBe(false)
      expect(hasConflictDetails(null)).toBe(false)
    })
  })

  describe('groupSkinTypeConflicts()', () => {
    it('merges every skin-type alert into one card, most severe first', () => {
      const out = groupSkinTypeConflicts([skinAlert('low one', 'Low'), skinAlert('high one', 'High'), skinAlert('medium one', 'Medium')])

      expect(out).toHaveLength(1)
      expect(out[0]!.alert_type).toBe('Skin Type Conflict')
      expect(out[0]!.severity).toBe('High')
      expect(out[0]!.details!.map((d) => d.message)).toEqual(['high one', 'medium one', 'low one'])
      expect(out[0]!.message).toBe('3 ingredients in this formula are poorly suited to your skin type.')
    })

    it('puts the merged card where the first skin-type alert was', () => {
      const out = groupSkinTypeConflicts([singlePair(), skinAlert('a'), mergedBuffet(), skinAlert('b')])

      // singlePair, then the merged skin card where the first skin alert was,
      // then the Buffet card that followed it.
      expect(out.map((w) => w.conflicting_product ?? w.alert_type)).toEqual(['Glycolic Toner', 'Skin Type Conflict', BUFFET])
    })

    it('leaves a single skin-type alert exactly as it arrived', () => {
      const alert = skinAlert('only one')
      const out = groupSkinTypeConflicts([singlePair(), alert])

      expect(out).toEqual([singlePair(), alert])
    })

    it('leaves product conflicts untouched', () => {
      const out = groupSkinTypeConflicts([mergedBuffet(), singlePair()])

      expect(out).toEqual([mergedBuffet(), singlePair()])
    })

    it('treats an absent list as empty', () => {
      expect(groupSkinTypeConflicts(undefined)).toEqual([])
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('groupSimilarDetails()', () => {
    it('folds pairs with the same sentence into one line naming each ingredient', () => {
      // The owner's screenshot: one sentence repeated per peptide.
      const out = groupSimilarDetails(PEPTIDES.map(peptidePair), BUFFET)

      expect(out).toHaveLength(1)
      expect(out[0]!.ingredients).toEqual(PEPTIDES)
      expect(out[0]!.message).toBe(
        'Combining Salicylic Acid with these 5 ingredients is unadvised. Low-pH BHA exfoliants can degrade peptide activity through deamination when layered in the same routine.',
      )
    })

    it('keeps the backend order, a group sitting where its first pair was', () => {
      const out = groupSimilarDetails(mergedBuffet().details, BUFFET)

      expect(out.map((g) => g.severity)).toEqual(['High', 'Medium', 'Low'])
      expect(out.map((g) => g.ingredients.length)).toEqual([1, 5, 1])
    })

    it('never merges pairs with a different explanation', () => {
      const out = groupSimilarDetails([
        distinctPair('Medium', 'A', 'reason one.'),
        distinctPair('Medium', 'B', 'reason two.'),
      ], BUFFET)

      expect(out).toHaveLength(2)
    })

    it('never merges the same sentence at a different severity', () => {
      const lower = { ...peptidePair(PEPTIDES[1]!), severity: 'Low' }
      const out = groupSimilarDetails([peptidePair(PEPTIDES[0]!), lower], BUFFET)

      expect(out).toHaveLength(2)
    })

    it('never merges the same sentence under a different alert type', () => {
      const other = { ...peptidePair(PEPTIDES[1]!), alert_type: 'Chemical Interaction Warning' }
      const out = groupSimilarDetails([peptidePair(PEPTIDES[0]!), other], BUFFET)

      expect(out).toHaveLength(2)
    })

    it('folds identical ingredient-pair sentences, naming each ingredient from its field', () => {
      // The backend's pass-1 sentence never names the other product's
      // ingredient, so two pairs under the same rule text were word for word
      // identical - rendered as two indistinguishable lines. They fold on the
      // exact sentence, which is kept as it is, and the chips name the
      // ingredients from conflicting_ingredient.
      const out = groupSimilarDetails([
        distinctPair('Medium', 'Retinol', 'Use them on alternate nights.'),
        distinctPair('Medium', 'Retinal', 'Use them on alternate nights.'),
      ], BUFFET)

      expect(out).toHaveLength(1)
      expect(out[0]!.ingredients).toEqual(['Retinol', 'Retinal'])
      expect(out[0]!.message).toBe('Layering Salicylic Acid directly alongside it triggers a structural clash. Use them on alternate nights.')
    })

    it('does not fold a category sentence with an ingredient-pair sentence that happens to match it', () => {
      // One names its ingredient and is compared as a template; the other does
      // not and is compared exactly. They are never the same kind of line.
      const category = peptidePair('X')
      const pass1 = { ...category, conflicting_ingredient: 'Y', message: category.message.replace('X', '\u0000') }
      const out = groupSimilarDetails([category, pass1], BUFFET)

      expect(out).toHaveLength(2)
    })

    it('drops an exact duplicate pair rather than naming the same ingredient twice', () => {
      const pair = peptidePair(PEPTIDES[0]!)
      const out = groupSimilarDetails([pair, { ...pair }], BUFFET)

      expect(out).toHaveLength(1)
      expect(out[0]!.ingredients).toEqual([PEPTIDES[0]])
    })

    it('leaves a pair with no conflicting ingredient as its own line', () => {
      const bare = { ...peptidePair('X'), conflicting_ingredient: null }
      const out = groupSimilarDetails([bare, { ...bare }], BUFFET)

      expect(out).toHaveLength(2)
      expect(out[0]!.ingredients).toEqual([])
    })

    it('drops the product prefix only when it names this card\u2019s product', () => {
      const pair = peptidePair(PEPTIDES[0]!)

      expect(groupSimilarDetails([pair], BUFFET)[0]!.message.startsWith('Combining')).toBe(true)
      expect(groupSimilarDetails([pair], 'Some Other Serum')[0]!.message.startsWith('Category Conflict with')).toBe(true)
      expect(groupSimilarDetails([pair], null)[0]!.message.startsWith('Category Conflict with')).toBe(true)
    })

    it('keeps a single pair as its own sentence rather than a count', () => {
      const out = groupSimilarDetails(singlePair().details, 'Glycolic Toner')

      expect(out[0]!.message).toBe('layering two exfoliating acids can over-exfoliate.')
      expect(out[0]!.ingredients).toEqual(['Glycolic Acid'])
    })

    it('treats an absent list as empty', () => {
      expect(groupSimilarDetails(undefined)).toEqual([])
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('skin-type reasons through the merge', () => {
    it('carries each alert reasons into its merged detail', () => {
      // Without this the explanation was lost the moment there were two or
      // more skin-type alerts, since the merge used to keep the message only.
      const merged = groupSkinTypeConflicts([explainedAlcohol(), explainedNiacinamide()])[0]!

      expect(merged.details!.map((d) => d.reasons!.map((r) => r.title))).toEqual([
        ['Barrier Stripping', 'Stinging on Application'],
        ['Flush & Stinging Flare'],
      ])
    })

    it('keeps them through the line grouping as well', () => {
      const merged = groupSkinTypeConflicts([explainedAlcohol(), explainedNiacinamide()])[0]!
      const groups = groupSimilarDetails(merged.details)

      expect(groups).toHaveLength(2)
      expect(groups[1]!.reasons[0]!.title).toBe('Flush & Stinging Flare')
    })

    it('grades the merged card by the worst alert, which may now be below High', () => {
      const merged = groupSkinTypeConflicts([explainedNiacinamide(), { ...explainedNiacinamide(), severity: 'Low' }])[0]!

      expect(merged.severity).toBe('Medium')
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('conflict sources', () => {
    const sourceRef = (id: string) => ({
      id,
      title: 'Source ' + id,
      publisher: 'European Commission',
      url: 'https://example.org/' + id,
      source_type: 'regulatory_register',
      accessed_on: null,
      notes: null,
    })

    it('carries the sources of the rule behind each pair line', () => {
      const pair = { ...distinctPair('High', 'Copper Tripeptide-1', 'Oxidises the acid.'), sources: [sourceRef('rule')] }

      expect(groupSimilarDetails([pair], BUFFET)[0]!.sources.map((e) => e.source.id)).toEqual(['rule'])
    })

    it('keeps every distinct source when identical pairs fold into one line', () => {
      const [a, b, c] = PEPTIDES.map(peptidePair)
      const groups = groupSimilarDetails(
        [
          { ...a!, sources: [sourceRef('shared')] },
          { ...b!, sources: [sourceRef('shared')] },
          { ...c!, sources: [sourceRef('extra')] },
        ],
        BUFFET,
      )

      expect(groups).toHaveLength(1)
      expect(groups[0]!.sources.map((e) => e.source.id)).toEqual(['shared', 'extra'])
    })

    it("gives a one-pair warning its rule's sources, and a skin-type alert none of its own", () => {
      const w = singlePair()
      w.details![0] = { ...w.details![0]!, sources: [sourceRef('rule')] }

      expect(warningSources(w).map((e) => e.source.id)).toEqual(['rule'])
      // A skin-type alert's sources are on its reasons; even a detail carrying
      // sources must not be shown a second time as the alert's own.
      const skin = { ...skinAlert('x'), details: [{ ...distinctPair('High', 'X', 'y'), sources: [sourceRef('leak')] }] }
      expect(warningSources(skin)).toEqual([])
      expect(warningSources({ alert_type: 'Interaction', details: undefined })).toEqual([])
    })
  })
})
