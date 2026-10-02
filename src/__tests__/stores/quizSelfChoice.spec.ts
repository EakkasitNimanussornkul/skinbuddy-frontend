import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  useQuizStore,
  needsSelfChoice,
  summariseAnswers,
  buildSaveScores,
  type QuizAnswer,
} from '../../stores/quizStore'
import { AXIS_LETTERS, HIGH_LETTER_THRESHOLD, SELF_CHOICE_QUESTIONS, type QuizAxis, type Sex } from '../../data/quizQuestions'
import { AXES, NA, P, UNSURE, answerCore, backupIds, coreIds } from '../fixtures/quizAnswers'

// Feature #2 - Take skinquiz. The "your choice" question in stores/quizStore:
// the owner-approved last resort for a part where nothing counted. When a part
// still has no counted answer after its core questions and both extra
// questions, it ends with one more question, with no skip buttons, and the
// user's pick decides the letter. The pick is never counted or averaged; the
// save marks the part with <part>_choice: 1.
//
// Every it() string is phrased as the expected result, because the Test Record
// generator lifts it verbatim into the "Expected Unit Output" field.
//
// No network: the store is pure client-side state. Questions come from
// src/data/quizQuestions.ts as shipped.

type Store = ReturnType<typeof useQuizStore>

/** Skip every question a part asks: its core questions and both extra questions. */
const skipWholePart = (store: Store, axis: QuizAxis, sex: Sex = 'unspecified') => {
  answerCore(store, axis, [UNSURE, NA, UNSURE, UNSURE])
  for (const id of backupIds(axis, sex).slice(0, 2)) store.answerQuestion(id, UNSURE)
}

const flowKinds = (store: Store, axis: QuizAxis) =>
  store.flow
    .filter((s) => 'axis' in s && s.axis === axis)
    .map((s) => (s.kind === 'question' ? s.questionId : s.kind))

describe('useQuizStore ("your choice" question)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  describe('when the "your choice" question is asked', () => {
    it('asks it, after the second extra question and before the part-complete step, when nothing counted after the core questions and both extra questions', () => {
      const store = useQuizStore()
      skipWholePart(store, 'hydration')

      expect(store.selfChoiceNeeded.hydration).toBe(true)
      expect(flowKinds(store, 'hydration')).toEqual([...coreIds('hydration'), 'hyd-b1', 'hyd-b2', 'choice', 'partDone'])
    })

    it('asks it for every part and every "About you" answer when nothing in that part counted', () => {
      for (const sex of ['female', 'male', 'unspecified'] as Sex[]) {
        for (const axis of AXES) {
          setActivePinia(createPinia())
          const store = useQuizStore()
          store.chooseSex(sex)
          skipWholePart(store, axis, sex)

          expect(store.selfChoiceNeeded[axis]).toBe(true)
        }
      }
    })

    it('does not ask it before both extra questions have an answer', () => {
      const store = useQuizStore()
      answerCore(store, 'hydration', [UNSURE, UNSURE, UNSURE, UNSURE])
      expect(store.selfChoiceNeeded.hydration).toBe(false)

      store.answerQuestion('hyd-b1', UNSURE)
      expect(store.selfChoiceNeeded.hydration).toBe(false)
      expect(flowKinds(store, 'hydration')).not.toContain('choice')
    })

    it('does not ask it when one answer counted after both extra questions', () => {
      const store = useQuizStore()
      answerCore(store, 'aging', [UNSURE, UNSURE, UNSURE, UNSURE])
      store.answerQuestion('age-b1', UNSURE)
      store.answerQuestion('age-b2', P(4))

      expect(store.selfChoiceNeeded.aging).toBe(false)
      expect(flowKinds(store, 'aging')).toEqual([...coreIds('aging'), 'age-b1', 'age-b2', 'partDone'])
      expect(store.axisResults.aging).toMatchObject({ counted: 1, choice: false, letter: 'W' })
    })

    it('does not ask it on a tie that both extra questions leave on the threshold', () => {
      const store = useQuizStore()
      answerCore(store, 'sensitivity', [P(2), P(3), UNSURE, UNSURE])
      store.answerQuestion('sen-b1', UNSURE)
      store.answerQuestion('sen-b2', UNSURE)

      expect(store.axisResults.sensitivity.average).toBe(HIGH_LETTER_THRESHOLD)
      expect(store.selfChoiceNeeded.sensitivity).toBe(false)
      expect(flowKinds(store, 'sensitivity')).not.toContain('choice')
    })

    it('decides it from the answers alone, the same way as the store, through needsSelfChoice()', () => {
      const skipped: Record<string, QuizAnswer> = {}
      for (const id of [...coreIds('pigmentation'), ...backupIds('pigmentation').slice(0, 2)]) skipped[id] = UNSURE

      expect(needsSelfChoice('pigmentation', 'unspecified', skipped)).toBe(true)
      expect(needsSelfChoice('pigmentation', 'unspecified', { ...skipped, 'pig-1': P(1) })).toBe(false)
      expect(needsSelfChoice('pigmentation', 'unspecified', {})).toBe(false)
    })
  })

  describe('the "your choice" answer', () => {
    it('offers each part two rows, the high letter first, with the approved wording and no skip buttons', () => {
      expect(Object.fromEntries(AXES.map((axis) => [axis, SELF_CHOICE_QUESTIONS[axis].options]))).toEqual({
        hydration: [
          { text: 'Oily or shiny', letter: 'O' },
          { text: 'Dry or tight', letter: 'D' },
        ],
        sensitivity: [
          { text: 'Reacts easily, with redness or stinging', letter: 'S' },
          { text: 'Rarely reacts to anything', letter: 'R' },
        ],
        pigmentation: [
          { text: 'Marks and dark spots tend to linger', letter: 'P' },
          { text: 'Marks fade without leaving dark spots', letter: 'N' },
        ],
        aging: [
          { text: 'Lines show easily', letter: 'W' },
          { text: 'Firm, with few lines', letter: 'T' },
        ],
      })
      for (const axis of AXES) {
        expect(SELF_CHOICE_QUESTIONS[axis].text).toBe('Which sounds more like your skin, most days?')
        expect(SELF_CHOICE_QUESTIONS[axis].axis).toBe(axis)
        expect('skips' in SELF_CHOICE_QUESTIONS[axis]).toBe(false)
      }
    })

    it('gives each part the letter of the row picked, for both rows of every part', () => {
      for (const axis of AXES) {
        for (const option of SELF_CHOICE_QUESTIONS[axis].options) {
          setActivePinia(createPinia())
          const store = useQuizStore()
          skipWholePart(store, axis)

          store.answerSelfChoice(axis, option.letter)

          expect(store.axisResults[axis]).toMatchObject({ letter: option.letter, choice: true, closeCall: true })
        }
      }
      expect(AXES.map((axis) => SELF_CHOICE_QUESTIONS[axis].options.map((o) => o.letter))).toEqual(
        AXES.map((axis) => [AXIS_LETTERS[axis].high, AXIS_LETTERS[axis].low]),
      )
    })

    it('puts the picked letter in its place in the four-letter type', () => {
      const store = useQuizStore()
      for (const axis of AXES) answerCore(store, axis, [P(1), P(1), P(1), P(1)])
      answerCore(store, 'sensitivity', [UNSURE, UNSURE, UNSURE, UNSURE])
      store.answerQuestion('sen-b1', NA)
      store.answerQuestion('sen-b2', UNSURE)

      store.answerSelfChoice('sensitivity', 'S')

      expect(store.finalSkinType).toBe('DSNT')
    })

    it('never counts the pick toward the average or the counted number, nor as a skip', () => {
      const store = useQuizStore()
      skipWholePart(store, 'hydration')
      store.answerSelfChoice('hydration', 'O')

      expect(summariseAnswers([{ kind: 'self_choice', letter: 'O' }])).toEqual({ counted: 0, skipped: 0, average: null })
      expect(store.axisResults.hydration).toMatchObject({ counted: 0, skipped: 6, average: null })
    })

    it('stores the pick under the question\'s own id, as its own kind', () => {
      const store = useQuizStore()

      store.answerSelfChoice('pigmentation', 'N')

      expect(store.answers['pig-choice']).toEqual({ kind: 'self_choice', letter: 'N' })
    })

    it('ignores a pick that is not one of the part\'s two letters', () => {
      const store = useQuizStore()
      skipWholePart(store, 'hydration')

      store.answerSelfChoice('hydration', 'S')

      expect(store.axisResults.hydration.choice).toBe(false)
    })
  })

  describe('saveScores with a "your choice" part', () => {
    it('sends <part>_choice: 1 for a part decided by the pick, with the threshold as its score and 0 counted', () => {
      const store = useQuizStore()
      for (const axis of AXES) answerCore(store, axis, [P(4), P(4), P(4), P(4)])
      skipWholePart(store, 'pigmentation')
      store.answerSelfChoice('pigmentation', 'N')

      expect(store.saveScores).toEqual({
        hydration: 4,
        sensitivity: 4,
        pigmentation: HIGH_LETTER_THRESHOLD,
        aging: 4,
        hydration_n: 4,
        sensitivity_n: 4,
        pigmentation_n: 0,
        aging_n: 4,
        pigmentation_choice: 1,
        version: 2,
      })
      expect(Object.values(store.saveScores).every((v) => typeof v === 'number')).toBe(true)
    })

    it('leaves the _choice key out for every part decided by its answers', () => {
      const store = useQuizStore()
      for (const axis of AXES) answerCore(store, axis, [P(1), UNSURE, P(2), UNSURE])

      expect(Object.keys(store.saveScores).filter((k) => k.endsWith('_choice'))).toEqual([])
      expect(Object.keys(buildSaveScores(store.axisResults))).toHaveLength(9)
    })

    it('sends a _choice key for each part decided by a pick, and only for those', () => {
      const store = useQuizStore()
      for (const axis of AXES) answerCore(store, axis, [P(4), P(4), P(4), P(4)])
      skipWholePart(store, 'hydration')
      skipWholePart(store, 'aging')
      store.answerSelfChoice('hydration', 'D')
      store.answerSelfChoice('aging', 'T')

      expect(Object.keys(store.saveScores).filter((k) => k.endsWith('_choice'))).toEqual(['hydration_choice', 'aging_choice'])
    })
  })

  describe('back, changed answers and retake with a "your choice" step', () => {
    it('goes back from the "your choice" step to the second extra question, with its answer kept', () => {
      const store = useQuizStore()
      skipWholePart(store, 'hydration')
      store.step = { kind: 'choice', axis: 'hydration' }

      store.back()

      expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-b2' })
      expect(store.answers['hyd-b2']).toEqual(UNSURE)
    })

    it('moves on from the "your choice" step to the part-complete step', () => {
      const store = useQuizStore()
      skipWholePart(store, 'hydration')
      store.step = { kind: 'question', axis: 'hydration', questionId: 'hyd-b2' }

      store.next()
      expect(store.step).toEqual({ kind: 'choice', axis: 'hydration' })
      store.answerSelfChoice('hydration', 'O')
      store.next()

      expect(store.step).toEqual({ kind: 'partDone', axis: 'hydration' })
    })

    it('removes the "your choice" step, and stops using its pick, when an earlier answer is changed so that one counts', () => {
      const store = useQuizStore()
      skipWholePart(store, 'hydration')
      store.answerSelfChoice('hydration', 'D')
      store.step = { kind: 'question', axis: 'hydration', questionId: 'hyd-b2' }

      store.answerQuestion('hyd-b2', P(4))
      store.next()

      expect(store.selfChoiceNeeded.hydration).toBe(false)
      expect(flowKinds(store, 'hydration')).not.toContain('choice')
      expect(store.step).toEqual({ kind: 'partDone', axis: 'hydration' })
      expect(store.axisResults.hydration).toMatchObject({ counted: 1, choice: false, letter: 'O' })
      expect(store.saveScores).not.toHaveProperty('hydration_choice')
    })

    it('clears the pick when the part is retaken, so the part is decided afresh', () => {
      const store = useQuizStore()
      skipWholePart(store, 'hydration')
      store.answerSelfChoice('hydration', 'D')
      store.step = { kind: 'result' }

      store.retakePart('hydration')

      expect(store.answers['hyd-choice']).toBeUndefined()
      expect(store.axisResults.hydration.choice).toBe(false)
      expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-1' })
      expect(store.answers['hyd-1']).toEqual(UNSURE)
    })

    it('keeps another part\'s pick when a different part is retaken', () => {
      const store = useQuizStore()
      skipWholePart(store, 'hydration')
      store.answerSelfChoice('hydration', 'D')
      store.step = { kind: 'result' }

      store.retakePart('sensitivity')

      expect(store.answers['hyd-choice']).toEqual({ kind: 'self_choice', letter: 'D' })
      expect(store.axisResults.hydration).toMatchObject({ choice: true, letter: 'D' })
    })
  })
})
