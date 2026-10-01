import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useQuizStore } from '../../stores/quizStore'
import { AXES, NA, P, UNSURE, answerCore, backupIds } from '../fixtures/quizAnswers'

// Feature #2 - Take skinquiz.
//
// Every it() string is phrased as the expected result, because the Test Record
// generator lifts it verbatim into the "Expected Unit Output" field. Rewording
// one of these rewords the document.
//
// No network: this store is pure client-side state, so nothing is mocked and
// nothing is reached. Questions come from src/data/quizQuestions.ts as shipped.
//
// These three groups keep their place in the Test Record. The scoring rules,
// the backups and the step flow added with the redesigned quiz are covered in
// quizScoring.spec.ts.

describe('useQuizStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  describe('answerQuestion()', () => {
    it('records the answer under the question id, not a position', () => {
      const store = useQuizStore()

      store.answerQuestion('hyd-2', P(3))

      expect(store.answers).toEqual({ 'hyd-2': { kind: 'points', points: 3 } })
    })

    it('records the answer without moving the quiz on by itself, so the view can show it selected first', () => {
      const store = useQuizStore()
      store.step = { kind: 'question', axis: 'hydration', questionId: 'hyd-1' }

      store.answerQuestion('hyd-1', P(2))

      expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-1' })
      expect(store.answers['hyd-1']).toEqual(P(2))
    })

    it('replaces an earlier answer to the same question, so it is never counted twice', () => {
      const store = useQuizStore()
      answerCore(store, 'hydration', [P(4), P(4), P(4), P(4)])

      store.answerQuestion('hyd-1', P(1))

      expect(store.axisResults.hydration.counted).toBe(4)
      expect(store.axisResults.hydration.average).toBe(13 / 4)
    })

    it('keeps the four parts independent, so answering one never alters the others', () => {
      const store = useQuizStore()

      answerCore(store, 'pigmentation', [P(4), P(4), P(4), P(4)])

      expect(store.axisResults.pigmentation.average).toBe(4)
      expect(store.axisResults.hydration.counted).toBe(0)
      expect(store.axisResults.sensitivity.counted).toBe(0)
      expect(store.axisResults.aging.counted).toBe(0)
    })

    it('records a skip answer as its kind, with no points', () => {
      const store = useQuizStore()

      store.answerQuestion('hyd-3', NA)

      expect(store.answers['hyd-3']).toEqual({ kind: 'not_applicable' })
    })
  })

  describe('finalSkinType (computed)', () => {
    it('returns DRNT when every part averages below the threshold', () => {
      const store = useQuizStore()
      for (const axis of AXES) answerCore(store, axis, [P(1), P(2), P(1), P(2)])

      expect(store.finalSkinType).toBe('DRNT')
    })

    it('returns OSPW when every part averages at or above the threshold', () => {
      const store = useQuizStore()
      for (const axis of AXES) answerCore(store, axis, [P(3), P(4), P(3), P(4)])

      expect(store.finalSkinType).toBe('OSPW')
    })

    it('treats an average of exactly 2.5 as meeting the threshold, not falling below it', () => {
      const store = useQuizStore()
      // 2 and 3 counted, so 2.5; both extra questions skipped, so it stays there.
      for (const axis of AXES) {
        answerCore(store, axis, [P(2), P(3), UNSURE, UNSURE])
        for (const id of backupIds(axis).slice(0, 2)) store.answerQuestion(id, UNSURE)
        expect(store.axisResults[axis].average).toBe(2.5)
      }

      expect(store.finalSkinType).toBe('OSPW')
    })

    it('returns ORPT for a mix of parts above and below the threshold, each letter in its own place', () => {
      const store = useQuizStore()
      answerCore(store, 'hydration', [P(4), P(3), P(4), P(3)])
      answerCore(store, 'sensitivity', [P(1), P(2), P(2), P(1)])
      answerCore(store, 'pigmentation', [P(3), P(3), P(3), P(3)])
      answerCore(store, 'aging', [P(1), P(1), P(2), P(1)])

      expect(store.finalSkinType).toBe('ORPT')
    })

    it('recomputes as soon as an answer changes, rather than caching a stale type', () => {
      const store = useQuizStore()
      for (const axis of AXES) answerCore(store, axis, [P(1), P(1), P(1), P(1)])
      expect(store.finalSkinType).toBe('DRNT')

      answerCore(store, 'sensitivity', [P(4), P(4), P(4), P(4)])

      expect(store.finalSkinType).toBe('DSNT')
    })
  })

  describe('resetQuiz()', () => {
    it('clears the answers, the "About you" choice, the step and any part being retaken', () => {
      const store = useQuizStore()
      store.start()
      store.chooseSex('female')
      store.answerQuestion('hyd-1', P(4))
      store.retakePart('aging')

      store.resetQuiz()

      expect(store.answers).toEqual({})
      expect(store.sex).toBeNull()
      expect(store.step).toEqual({ kind: 'start' })
      expect(store.retakeAxis).toBeNull()
    })

    it('returns every part to having no evidence after a reset', () => {
      const store = useQuizStore()
      answerCore(store, 'hydration', [P(1), P(1), P(1), P(1)])
      expect(store.axisResults.hydration.noEvidence).toBe(false)

      store.resetQuiz()

      expect(store.axisResults.hydration.noEvidence).toBe(true)
      expect(store.axisResults.hydration.counted).toBe(0)
    })
  })
})
