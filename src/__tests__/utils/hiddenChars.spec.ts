import { describe, it, expect } from 'vitest'

import { hasHiddenChars, hiddenCharSegments, revealHiddenChars, stripHiddenChars } from '../../utils/hiddenChars'

// Every character the rule covers, one from each range and both ends.
const COVERED = ['\u200B', '\u200C', '\u200D', '\u200E', '\u200F', '\u202A', '\u202B', '\u202C', '\u202D', '\u202E', '\u2066', '\u2067', '\u2068', '\u2069', '\uFEFF']

describe('src/utils/hiddenChars.ts', () => {
  describe('hasHiddenChars()', () => {
    it('finds each zero-width and bidi control character in U+200B-U+200F, U+202A-U+202E, U+2066-U+2069 and U+FEFF', () => {
      for (const char of COVERED) expect(hasHiddenChars(`Cera${char}Ve`)).toBe(true)
    })

    it('finds none in plain text, in Thai or accented letters, or in characters just outside the ranges', () => {
      for (const text of ['CeraVe', 'เซราวี', 'Crème', ' ', '‐', ' ', '⁥', '⁪', '', null, undefined]) {
        expect(hasHiddenChars(text)).toBe(false)
      }
    })
  })

  describe('revealHiddenChars() and stripHiddenChars()', () => {
    it('replaces each hidden character with a visible marker naming it, such as [U+202E]', () => {
      expect(revealHiddenChars('Cera\u202EeVgnirts')).toBe('Cera[U+202E]eVgnirts')
      expect(revealHiddenChars('\uFEFFA\u200Bb')).toBe('[U+FEFF]A[U+200B]b')
      expect(revealHiddenChars('CeraVe')).toBe('CeraVe')
    })

    it('takes every hidden character out, and leaves other text as it was', () => {
      expect(stripHiddenChars(COVERED.join('x'))).toBe('x'.repeat(COVERED.length - 1))
      expect(stripHiddenChars('Crème \u2067Brand\u2069')).toBe('Crème Brand')
    })
  })

  describe('hiddenCharSegments()', () => {
    it('splits text into plain runs and one marker per hidden character, in order', () => {
      expect(hiddenCharSegments('Cera\u202E\u200BVe')).toEqual([
        { text: 'Cera', hidden: false },
        { text: '[U+202E]', hidden: true },
        { text: '[U+200B]', hidden: true },
        { text: 'Ve', hidden: false },
      ])
      expect(hiddenCharSegments('')).toEqual([])
    })
  })
})
