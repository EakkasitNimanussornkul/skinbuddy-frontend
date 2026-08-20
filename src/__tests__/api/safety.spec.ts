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
} from '../../api/safety'

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

    it('reports a response carrying no safety verdict as unavailable, not as cleared', () => {
      const outcome = evaluateSafety({ warnings: [] }, false)

      expect(outcome.status).toBe('unavailable')
    })

    it('treats a null response body as unavailable even when the request did not throw', () => {
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

    it('preserves duplicates on a response that carried them but no safety verdict', () => {
      // Not a contradiction: the data arrived, the verdict did not. Preserving
      // it here is what leaves showsDuplicates() the one place that decides
      // whether an unverdicted response may be rendered.
      const outcome = evaluateSafety({ warnings: [], duplicates: [dupe] }, false)

      expect(outcome.status).toBe('unavailable')
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

    it('hides the section when the check produced no verdict, even though duplicates arrived', () => {
      // The case the status half of the guard exists for. A partial response can
      // carry duplicates without an is_safe verdict; rendering them would imply
      // a shelf comparison completed when it did not.
      expect(
        showsDuplicates({ status: 'unavailable', warnings: [], duplicates: [dupe] }),
      ).toBe(false)
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
})
