/**
 * Characters that change how text looks without showing themselves:
 * zero-width spaces and joiners (U+200B-U+200D), the direction marks
 * (U+200E, U+200F), the bidi embeddings and overrides (U+202A-U+202E), the
 * bidi isolates (U+2066-U+2069) and the zero-width no-break space (U+FEFF).
 *
 * In a submitted name they can make "Brand A" display as another brand, or
 * reverse part of a line, so the review and edit screens show each one as a
 * visible marker such as "[U+202E]" instead of letting it act. The submit
 * form takes them out before sending. What is stored is never changed here;
 * only an admin's own edit changes it.
 */

const HIDDEN_ONE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/
const HIDDEN_ALL = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g

export const HIDDEN_CHARS_WARNING = 'This text contains hidden characters'

export const hasHiddenChars = (text: string | null | undefined): boolean => !!text && HIDDEN_ONE.test(text)

/** "[U+202E]" for one hidden character. */
export const hiddenCharMarker = (char: string): string =>
  `[U+${(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}]`

/** The text with every hidden character replaced by its visible marker. */
export const revealHiddenChars = (text: string): string => text.replace(HIDDEN_ALL, hiddenCharMarker)

/** The text with every hidden character taken out. */
export const stripHiddenChars = (text: string): string => text.replace(HIDDEN_ALL, '')

export interface TextSegment {
  text: string
  /** True for a marker standing in for one hidden character. */
  hidden: boolean
}

/** The text in runs of plain text and markers, so the markers can be styled. */
export const hiddenCharSegments = (text: string): TextSegment[] => {
  const segments: TextSegment[] = []
  let plain = ''
  for (const char of text) {
    if (HIDDEN_ONE.test(char)) {
      if (plain) segments.push({ text: plain, hidden: false })
      plain = ''
      segments.push({ text: hiddenCharMarker(char), hidden: true })
    } else {
      plain += char
    }
  }
  if (plain) segments.push({ text: plain, hidden: false })
  return segments
}
