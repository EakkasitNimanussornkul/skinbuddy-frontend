import { describe, it, expect } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'

import { scrollBehavior } from '../../router/scroll'

/** Only the fields scrollBehavior reads. */
const at = (path: string, query: Record<string, string> = {}, meta: Record<string, unknown> = {}, hash = '') =>
  ({ path, query, meta, hash }) as unknown as RouteLocationNormalized

const explore = (query: Record<string, string> = {}, hash = '') =>
  at('/explore', query, { keepScrollOnQueryChange: true }, hash)

const TOP = { top: 0, behavior: 'smooth' }

describe('src/router/scroll.ts', () => {
  describe('scrollBehavior()', () => {
    it('returns to where the user was on back and forward', () => {
      const saved = { left: 0, top: 640 }

      expect(scrollBehavior(explore(), explore({ category: 'Serums' }), saved)).toEqual(saved)
    })

    it('leaves the window alone when only the filters in the address change', () => {
      // Owner report: each category chip on Explore scrolled back to the top,
      // away from the grid being filtered.
      expect(scrollBehavior(explore({ category: 'Serums' }), explore(), null)).toBe(false)
      expect(scrollBehavior(explore(), explore({ category: 'Serums' }), null)).toBe(false)
    })

    it('starts a different page at the top', () => {
      expect(scrollBehavior(explore(), at('/shelf'), null)).toEqual(TOP)
      expect(scrollBehavior(at('/shelf'), explore(), null)).toEqual(TOP)
    })

    it('keeps the old behaviour for a route that has not asked to keep its place', () => {
      expect(scrollBehavior(at('/compare', { a: '1', b: '2' }), at('/compare', { a: '1', b: '3' }), null)).toEqual(TOP)
    })

    it('scrolls to the top when the hash changes, since that is not a filter', () => {
      expect(scrollBehavior(explore({}, '#grid'), explore(), null)).toEqual(TOP)
    })
  })
})
