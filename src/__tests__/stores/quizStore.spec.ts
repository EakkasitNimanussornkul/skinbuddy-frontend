import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useQuizStore } from '../../stores/quizStore'

// Feature #2 - Take skinquiz.
//
// Every it() string is phrased as the expected result, because the Test Record
// generator lifts it verbatim into the "Expected Unit Output" field. Rewording
// one of these rewords the document.
//
// No network: this store is pure client-side state, so nothing is mocked and
// nothing is reached.

describe('useQuizStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('answerQuestion()', () => {
    it('adds the answer points to the matching axis and advances to the next question', () => {
      const store = useQuizStore()

      store.answerQuestion(0, 'hydration', 4, 1)

      expect(store.scores.hydration).toBe(4)
      expect(store.currentQuestionIndex).toBe(1)
    })

    it('records the answer in history so the chosen option can be restored', () => {
      const store = useQuizStore()

      store.answerQuestion(0, 'sensitivity', 3, 2)

      expect(store.answersHistory[0]).toEqual({ points: 3, optionIndex: 2 })
    })

    it('subtracts the previous points when a question is answered again, so scores are never double-counted', () => {
      const store = useQuizStore()

      store.answerQuestion(0, 'hydration', 4, 1)
      store.answerQuestion(0, 'hydration', 1, 0)

      // 4 then 1 must leave 1, not 5.
      expect(store.scores.hydration).toBe(1)
    })

    it('keeps the four axes independent, so scoring one never alters the others', () => {
      const store = useQuizStore()

      store.answerQuestion(0, 'pigmentation', 4, 1)

      expect(store.scores.pigmentation).toBe(4)
      expect(store.scores.hydration).toBe(0)
      expect(store.scores.sensitivity).toBe(0)
      expect(store.scores.aging).toBe(0)
    })

    it('accepts the "not_sure" option marker as a valid recorded answer', () => {
      const store = useQuizStore()

      store.answerQuestion(0, 'aging', 2.5, 'not_sure')

      expect(store.answersHistory[0]).toEqual({ points: 2.5, optionIndex: 'not_sure' })
      expect(store.scores.aging).toBe(2.5)
    })
  })

  describe('finalSkinType (computed)', () => {
    it('returns DRNT when every axis scores below the threshold of 10', () => {
      const store = useQuizStore()

      expect(store.finalSkinType).toBe('DRNT')
    })

    it('returns OSPW when every axis reaches the threshold of 10', () => {
      const store = useQuizStore()

      store.answerQuestion(0, 'hydration', 10, 0)
      store.answerQuestion(1, 'sensitivity', 10, 0)
      store.answerQuestion(2, 'pigmentation', 10, 0)
      store.answerQuestion(3, 'aging', 10, 0)

      expect(store.finalSkinType).toBe('OSPW')
    })

    it('treats exactly 10 as meeting the threshold, not falling below it', () => {
      const store = useQuizStore()

      store.answerQuestion(0, 'hydration', 9.5, 0)
      expect(store.finalSkinType[0]).toBe('D')

      store.answerQuestion(1, 'hydration', 0.5, 0)
      expect(store.finalSkinType[0]).toBe('O')
    })

    it('returns ORPT for a mix of axes above and below the threshold', () => {
      // The realistic result. Every other case here has none, one, or all four
      // axes above the threshold, so this is the only one where more than one
      // axis is positive while others are negative - the arrangement that shows
      // the four comparisons are independent of each other and that each letter
      // lands in its own position, rather than one verdict being applied across
      // the code.
      const store = useQuizStore()

      store.answerQuestion(0, 'hydration', 12, 0)
      store.answerQuestion(1, 'sensitivity', 8, 0)
      store.answerQuestion(2, 'pigmentation', 14, 0)
      store.answerQuestion(3, 'aging', 6, 0)

      // Asserted so the fixture cannot drift: answerQuestion accumulates, and a
      // change to how it does that could alter these inputs while the type below
      // still came out right for the wrong reason.
      expect(store.scores).toEqual({ hydration: 12, sensitivity: 8, pigmentation: 14, aging: 6 })
      expect(store.finalSkinType).toBe('ORPT')
    })

    it('recomputes as soon as a score changes, rather than caching a stale type', () => {
      const store = useQuizStore()
      expect(store.finalSkinType).toBe('DRNT')

      store.answerQuestion(0, 'sensitivity', 12, 0)

      expect(store.finalSkinType).toBe('DSNT')
    })
  })

  describe('resetQuiz()', () => {
    it('clears all four scores, the question index, and the answer history', () => {
      const store = useQuizStore()
      store.answerQuestion(0, 'hydration', 4, 1)
      store.answerQuestion(1, 'aging', 3, 2)

      store.resetQuiz()

      expect(store.currentQuestionIndex).toBe(0)
      expect(store.scores).toEqual({ hydration: 0, sensitivity: 0, pigmentation: 0, aging: 0 })
      expect(store.answersHistory).toEqual({})
    })

    it('returns the computed skin type to the all-low default after a reset', () => {
      const store = useQuizStore()
      store.answerQuestion(0, 'hydration', 12, 0)
      expect(store.finalSkinType).toBe('ORNT')

      store.resetQuiz()

      expect(store.finalSkinType).toBe('DRNT')
    })
  })
})
