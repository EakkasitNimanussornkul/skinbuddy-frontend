/**
 * Characters that change how text looks without showing themselves - the
 * same set the backend removes when it cleans submitted text
 * (fix/submission-hardening):
 *   - zero-width spaces and joiners, and the direction marks (U+200B-U+200F);
 *   - the bidi embeddings and overrides (U+202A-U+202E), the bidi isolates
 *     and the old shaping controls (U+2066-U+206F);
 *   - the soft hyphen (U+00AD), the Arabic letter mark (U+061C), the
 *     Mongolian vowel separator (U+180E), the word joiner and invisible
 *     operators (U+2060-U+2064), the zero-width no-break space (U+FEFF) and
 *     the interlinear annotation marks (U+FFF9-U+FFFB);
 *   - the tag characters (U+E0000-U+E007F), which can spell hidden text;
 *   - a lone surrogate, half of a character with the other half missing.
 *
 * In a submitted name they can make "Brand A" display as another brand, or
 * reverse part of a line, so the review and edit screens show each one as a
 * visible marker such as "[U+202E]" instead of letting it act. The submit
 * form takes them out before sending, as the server would. What is stored is
 * never changed here; only an admin's own edit changes it.
 *
 * Every character here is written as an escape, never raw, so the rule can
 * be read (a guard in SubmissionHardening.spec checks the source).
 */

const SET = '\\u00AD\\u061C\\u180E\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\u2066-\\u206F\\uFEFF\\uFFF9-\\uFFFB\\u{E0000}-\\u{E007F}'
// The u flag reads text by code point, so a tag character is one match and a
// lone surrogate (\p{Cs}) is found on its own, while a proper pair is not.
const HIDDEN_ONE = new RegExp(`[${SET}]|\\p{Cs}`, 'u')
const HIDDEN_ALL = new RegExp(`[${SET}]|\\p{Cs}`, 'gu')

export const HIDDEN_CHARS_WARNING = 'This text contains hidden characters'

export const hasHiddenChars = (text: string | null | undefined): boolean => !!text && HIDDEN_ONE.test(text)

/** "[U+202E]" for one hidden character; "[U+E0041]" for a tag character. */
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
