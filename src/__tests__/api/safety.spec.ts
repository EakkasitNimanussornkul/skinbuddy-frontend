import { describe, it, expect } from 'vitest'

// Pure decision logic, no mounting and no network. This is the module that
// answers "what does the product do when it cannot determine safety?" once, so
// the three call sites cannot answer it three different ways again.
import { evaluateSafety, blocksAction, resolveSafety } from '../../api/safety'

const conflict = {
  alert_type: 'conflict',
  severity: 'high',
  message: 'Do not layer with retinol',
}

describe('src/api/safety.ts', () => {
  describe('evaluateSafety()', () => {
    it('reports a product as cleared only when the backend affirmatively says it is safe', () => {
      const outcome = evaluateSafety({ is_safe: true, warnings: [] }, false)

      expect(outcome).toEqual({ status: 'cleared', warnings: [] })
    })

    it('reports conflicts as warned and carries the warnings through', () => {
      const outcome = evaluateSafety({ is_safe: false, warnings: [conflict] }, false)

      expect(outcome).toEqual({ status: 'warned', warnings: [conflict] })
    })

    it('reports a failed request as unavailable rather than as a product with no conflicts', () => {
      // FE-DEF-01/02/03: the empty-warnings shape of a failed call previously
      // rendered identically to a passed check at all three call sites.
      const outcome = evaluateSafety(null, true)

      expect(outcome).toEqual({ status: 'unavailable', warnings: [] })
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
      expect(blocksAction({ status: 'cleared', warnings: [] })).toBe(false)
    })

    it('blocks the action when conflicts were found', () => {
      expect(blocksAction({ status: 'warned', warnings: [conflict] })).toBe(true)
    })

    it('blocks the action when safety could not be determined, so a save cannot proceed unchecked', () => {
      // This is the assertion that pins FE-DEF-01: the add flow previously fell
      // through to addToShelf when the analysis threw.
      expect(blocksAction({ status: 'unavailable', warnings: [] })).toBe(true)
    })
  })

  describe('resolveSafety()', () => {
    it('converts a thrown request into an unavailable outcome instead of letting it escape', async () => {
      const outcome = await resolveSafety(() => Promise.reject(new Error('network down')))

      expect(outcome).toEqual({ status: 'unavailable', warnings: [] })
    })

    it('interprets a successful response through the same rules as evaluateSafety', async () => {
      const outcome = await resolveSafety(() => Promise.resolve({ is_safe: true, warnings: [] }))

      expect(outcome.status).toBe('cleared')
    })
  })
})
