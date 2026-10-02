import { AXIS_LETTERS, MIN_COUNTED, type QuizAxis } from '../../data/quizQuestions'
import type { AxisResult } from '../../stores/quizStore'

/** A part's place in the progress bar and the desktop part list. */
export type PartState = 'done' | 'current' | 'todo'
/** One question's segment in the part in progress. */
export type SegmentState = 'answered' | 'current' | 'todo' | 'backup'

/** One row of the desktop part list. */
export interface FramePart {
  number: number
  name: string
  state: PartState
  /** Second line: the lean of a finished part, or the question count of the current one. */
  detail: string
  /** A finished part that came out as a close call shows its line in amber. */
  closeCall: boolean
}

/** How each part of the quiz is named on screen, and the words for its two letters. */
export const AXIS_COPY: Record<
  QuizAxis,
  { part: string; pair: string; low: string; high: string; topics: string }
> = {
  hydration: { part: 'Oil and moisture', pair: 'Oily or dry', low: 'Dry', high: 'Oily', topics: 'shine, tightness, dryness' },
  sensitivity: { part: 'Reactions', pair: 'Sensitive or resistant', low: 'Resistant', high: 'Sensitive', topics: 'redness, stinging, itching' },
  pigmentation: { part: 'Dark spots', pair: 'Pigmented or non-pigmented', low: 'Non-pigmented', high: 'Pigmented', topics: 'marks, patches, freckles' },
  aging: { part: 'Lines and firmness', pair: 'Wrinkle-prone or tight', low: 'Tight', high: 'Wrinkle-prone', topics: 'lines, firmness, sun' },
}

/** Each part's number, 1 to 4, in the order the quiz asks them. */
export const AXIS_ORDER_NUMBER: Record<QuizAxis, number> = {
  hydration: 1,
  sensitivity: 2,
  pigmentation: 3,
  aging: 4,
}

/** The word for the letter a part came out as, e.g. "Oily". */
export const letterWord = (axis: QuizAxis, letter: string): string =>
  letter === AXIS_LETTERS[axis].high ? AXIS_COPY[axis].high : AXIS_COPY[axis].low

/** "Leaning oily", or "You chose oily" when the letter is the user's own pick. */
export const leanText = (result: AxisResult): string => {
  const word = letterWord(result.axis, result.letter).toLowerCase()
  return result.choice ? `You chose ${word}` : `Leaning ${word}`
}

export const answersText = (count: number): string => `${count} ${count === 1 ? 'answer' : 'answers'}`

/** "Clear · 4 answers", "Close call · 1 answer", or "Close call · your choice". */
export const confidenceText = (result: AxisResult): string => {
  if (result.choice) return 'Close call · your choice'
  return `${result.closeCall ? 'Close call' : 'Clear'} · ${answersText(result.counted)}`
}

/** Why a part is a close call, for the part-complete screen and the result card. */
export const closeCallText = (result: AxisResult): string => {
  const letter = result.letter
  if (result.choice) {
    return `None of your answers here counted, so ${letter} is the one you chose.`
  }
  if (result.counted < MIN_COUNTED) {
    return `Most answers here didn't apply to you or were unsure, so treat ${letter} as a starting point.`
  }
  return `Your answers here sit close to the middle, so treat ${letter} as a starting point.`
}
