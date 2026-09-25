import { describe, it, expect } from 'vitest'

import {
  readConcernSources,
  readIngredientSources,
  readProductSourceUrl,
  readSourceList,
  readSourceRef,
} from '../../api/sources'

/** A source row in the shape backend feat/data-sources (6db0260) sends. */
const ref = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  title: `Source ${id}`,
  publisher: 'European Commission',
  url: `https://example.org/${id}`,
  source_type: 'regulatory_register',
  accessed_on: '2026-09-25',
  notes: null,
  ...overrides,
})

describe('src/api/sources.ts', () => {
  describe('readSourceRef()', () => {
    it('reads a source row as sent', () => {
      expect(readSourceRef(ref('cosing'))).toEqual({
        id: 'cosing',
        title: 'Source cosing',
        publisher: 'European Commission',
        url: 'https://example.org/cosing',
        source_type: 'regulatory_register',
        accessed_on: '2026-09-25',
        notes: null,
      })
    })

    it('refuses a row with no id or no title, rather than showing a nameless link', () => {
      expect(readSourceRef(ref('a', { id: '' }))).toBeNull()
      expect(readSourceRef(ref('a', { title: '   ' }))).toBeNull()
      expect(readSourceRef(null)).toBeNull()
      expect(readSourceRef('a string')).toBeNull()
    })

    it('keeps only http(s) links, so a hand-written javascript: URL can never run', () => {
      // Source rows are written by hand; an href is executed on click.
      expect(readSourceRef(ref('a', { url: 'javascript:alert(1)' }))!.url).toBeNull()
      expect(readSourceRef(ref('a', { url: 'data:text/html,hi' }))!.url).toBeNull()
      expect(readSourceRef(ref('a', { url: 'http://example.org' }))!.url).toBe('http://example.org')
    })

    it('reads a book with no link as a source without one', () => {
      const book = readSourceRef(ref('book', { url: null, source_type: 'reference_book', publisher: '' }))!

      expect(book.url).toBeNull()
      expect(book.publisher).toBeNull()
    })
  })

  describe('readSourceList()', () => {
    it('reads a list of sources, dropping anything unreadable and any repeat', () => {
      const entries = readSourceList([ref('a'), null, { id: 'x' }, ref('b'), ref('a')])

      expect(entries.map((e) => e.source.id)).toEqual(['a', 'b'])
      expect(entries.every((e) => e.claim === null)).toBe(true)
    })

    it('reads a missing list as no sources, not an error', () => {
      expect(readSourceList(undefined)).toEqual([])
      expect(readSourceList('nope')).toEqual([])
    })
  })

  describe('readIngredientSources()', () => {
    it('keeps which claim each source backs', () => {
      const entries = readIngredientSources([
        { claim: 'good_for', sources: ref('a') },
        { claim: 'bad_for', sources: ref('b') },
      ])

      expect(entries.map((e) => [e.source.id, e.claim])).toEqual([
        ['a', 'good_for'],
        ['b', 'bad_for'],
      ])
    })

    it('keeps one source backing two claims as two entries, and drops an exact repeat', () => {
      const entries = readIngredientSources([
        { claim: 'function', sources: ref('a') },
        { claim: 'benefits', sources: ref('a') },
        { claim: 'benefits', sources: ref('a') },
      ])

      expect(entries.map((e) => e.claim)).toEqual(['function', 'benefits'])
    })

    it('shows a source with an unknown claim without inventing one', () => {
      expect(readIngredientSources([{ claim: 'marketing', sources: ref('a') }])[0]!.claim).toBeNull()
    })

    it('drops a link whose source row is missing', () => {
      expect(readIngredientSources([{ claim: 'good_for', sources: null }])).toEqual([])
    })
  })

  describe('readConcernSources()', () => {
    it('reads the sources behind a concern', () => {
      expect(readConcernSources([{ sources: ref('cir') }, { sources: null }]).map((e) => e.source.id)).toEqual(['cir'])
      expect(readConcernSources(undefined)).toEqual([])
    })
  })

  describe('readProductSourceUrl()', () => {
    it('reads the product page link only when it is an http(s) link', () => {
      expect(readProductSourceUrl({ source_url: 'https://world.openbeautyfacts.org/product/3606000537576' })).toBe(
        'https://world.openbeautyfacts.org/product/3606000537576',
      )
      expect(readProductSourceUrl({ source_url: 'javascript:void(0)' })).toBeNull()
      expect(readProductSourceUrl({ source_url: null })).toBeNull()
      expect(readProductSourceUrl(null)).toBeNull()
    })
  })
})
