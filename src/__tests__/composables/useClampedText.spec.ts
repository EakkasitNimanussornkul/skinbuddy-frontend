import { describe, it, expect } from 'vitest'

import { exceedsClamp, OVERFLOW_TOLERANCE_PX } from '../../composables/useClampedText'

/**
 * The rule behind rendering a "Read more" control: show it only when the
 * clamped paragraph is holding text back.
 *
 * Only this comparison is covered here. The measurement around it - taking the
 * two heights from a real element on mount, again when the paragraph is
 * resized, and again when a webfont changes the line height - needs a mounted
 * component, which this project has no layer for, and was verified in the
 * browser instead. That is recorded rather than papered over: these cards are
 * not evidence that the control appears and disappears correctly on screen.
 */
describe('src/composables/useClampedText.ts', () => {
  describe('exceedsClamp()', () => {
    it('reports text taller than its clamp as overflowing', () => {
      // Four lines of text shown two lines high - the case where hiding the
      // control leaves the reader unable to reach the rest.
      expect(exceedsClamp(91, 46)).toBe(true)
    })

    it('reports text that fits its clamp exactly as not overflowing', () => {
      expect(exceedsClamp(46, 46)).toBe(false)
    })

    it('reports a single short line as not overflowing', () => {
      expect(exceedsClamp(20, 20)).toBe(false)
    })

    it('absorbs a one pixel difference rather than reporting a hidden line', () => {
      // Sub-pixel line heights round to a scroll height a pixel over the client
      // height on text that is not actually cut off. A real extra line is never
      // less than a whole line tall, so a pixel of slack cannot hide one.
      expect(exceedsClamp(47, 46)).toBe(false)
      expect(OVERFLOW_TOLERANCE_PX).toBe(1)
    })

    it('reports an overflow of more than the tolerance', () => {
      expect(exceedsClamp(48, 46)).toBe(true)
    })
  })
})
