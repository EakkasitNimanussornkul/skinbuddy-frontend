import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  useQuizStore,
  NO_EVIDENCE_LETTER,
  summariseAnswers,
  letterFor,
  isCloseCall,
  backupReason,
  questionSequence,
  buildSaveScores,
  type QuizAnswer,
} from '../../stores/quizStore'
import {
  AXIS_LETTERS,
  CLOSE_CALL_MARGIN,
  HIGH_LETTER_THRESHOLD,
  MAX_BACKUPS_PER_AXIS,
  MIN_COUNTED,
} from '../../data/quizQuestions'
import { NA, P, UNSURE, answerCore, backupIds, coreIds, currentQuestionId } from '../fixtures/quizAnswers'

// Feature #2 - Take skinquiz. The redesigned quiz's rules in stores/quizStore:
// how a part is scored, when it asks extra (backup) questions, when it is a
// close call, what is saved, and how the steps run. The store's original three
// groups stay in quizStore.spec.ts, so their place in the Test Record holds.
//
// Every it() string is phrased as the expected result, because the Test Record
// generator lifts it verbatim into the "Expected Unit Output" field.
//
// No network: the store is pure client-side state, so nothing is mocked and
// nothing is reached. Questions come from src/data/quizQuestions.ts as shipped.

describe('useQuizStore (scoring and steps)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  describe('chooseSex()', () => {
    it('shows the store the questions for the sex chosen in "About you"', () => {
      const store = useQuizStore()

      store.chooseSex('female')
      expect(store.sequences.pigmentation.map((q) => q.id)).toContain('pig-3-hormone')

      store.chooseSex('male')
      expect(store.sequences.pigmentation.map((q) => q.id)).toContain('pig-3-patches')
      expect(store.sequences.pigmentation.find((q) => q.id === 'pig-1')!.text).toContain('razor bump')
    })
  })

  describe('summariseAnswers()', () => {
    it('leaves skips out of the average entirely, as no evidence', () => {
      expect(summariseAnswers([P(4), UNSURE, NA, P(2)])).toEqual({ counted: 2, skipped: 2, average: 3 })
    })

    it('gives no average when every answer was a skip', () => {
      expect(summariseAnswers([UNSURE, NA, UNSURE, NA])).toEqual({ counted: 0, skipped: 4, average: null })
    })

    it('ignores questions not answered yet', () => {
      expect(summariseAnswers([P(1), undefined, P(3)])).toEqual({ counted: 2, skipped: 0, average: 2 })
    })
  })

  describe('letterFor()', () => {
    it('gives the high letter for an average of exactly 2.5, the threshold', () => {
      expect(HIGH_LETTER_THRESHOLD).toBe(2.5)
      expect(letterFor('hydration', 2.5)).toBe('O')
      expect(letterFor('sensitivity', 2.5)).toBe('S')
      expect(letterFor('pigmentation', 2.5)).toBe('P')
      expect(letterFor('aging', 2.5)).toBe('W')
    })

    it('gives the low letter just below the threshold and the high letter above it', () => {
      expect(letterFor('hydration', 2.49)).toBe('D')
      expect(letterFor('hydration', 2.75)).toBe('O')
      expect(letterFor('aging', 1)).toBe('T')
      expect(letterFor('aging', 4)).toBe('W')
    })

    it('gives the NO_EVIDENCE_LETTER side, today the high letter, when nothing counted', () => {
      expect(NO_EVIDENCE_LETTER).toBe('high')
      expect(letterFor('hydration', null)).toBe(AXIS_LETTERS.hydration.high)
      expect(letterFor('pigmentation', null)).toBe('P')
    })
  })

  describe('questionSequence() backups', () => {
    it('asks no backup when at least two answers counted and the average is off the threshold', () => {
      const answers = Object.fromEntries(coreIds('hydration').map((id) => [id, P(4)]))

      expect(questionSequence('hydration', 'unspecified', answers).map((q) => q.id)).toEqual(coreIds('hydration'))
    })

    it('decides nothing about backups until every core question has an answer', () => {
      const answers = { 'hyd-1': UNSURE, 'hyd-2': UNSURE, 'hyd-3': UNSURE }

      expect(questionSequence('hydration', 'unspecified', answers)).toHaveLength(4)
    })

    it('asks the first backup when fewer than two core answers counted', () => {
      const [a, b, c, d] = coreIds('hydration')
      const answers = { [a!]: P(4), [b!]: UNSURE, [c!]: NA, [d!]: UNSURE }

      const ids = questionSequence('hydration', 'unspecified', answers).map((q) => q.id)

      expect(MIN_COUNTED).toBe(2)
      expect(ids).toEqual([...coreIds('hydration'), 'hyd-b1'])
    })

    it('asks the first backup when the average sits exactly on the threshold', () => {
      const [a, b, c, d] = coreIds('aging')
      const answers = { [a!]: P(2), [b!]: P(3), [c!]: P(2), [d!]: P(3) }

      expect(questionSequence('aging', 'unspecified', answers).map((q) => q.id)).toEqual([...coreIds('aging'), 'age-b1'])
    })

    it('asks no backup when exactly two answers counted off the threshold', () => {
      const [a, b, c, d] = coreIds('hydration')
      const answers = { [a!]: P(4), [b!]: P(3), [c!]: UNSURE, [d!]: NA }

      expect(questionSequence('hydration', 'unspecified', answers)).toHaveLength(4)
    })

    it('asks a second backup when the first still leaves the part undecided', () => {
      const answers: Record<string, QuizAnswer> = Object.fromEntries(coreIds('sensitivity').map((id) => [id, UNSURE]))
      answers['sen-b1'] = P(4)

      expect(questionSequence('sensitivity', 'unspecified', answers).map((q) => q.id)).toEqual([
        ...coreIds('sensitivity'),
        'sen-b1',
        'sen-b2',
      ])
    })

    it('stops after the first backup once it settles the part', () => {
      const [a, b, c, d] = coreIds('sensitivity')
      const answers = { [a!]: P(4), [b!]: UNSURE, [c!]: UNSURE, [d!]: UNSURE, 'sen-b1': P(4) }

      expect(questionSequence('sensitivity', 'unspecified', answers).map((q) => q.id)).toEqual([
        ...coreIds('sensitivity'),
        'sen-b1',
      ])
    })

    it('asks at most two backups, even when the part is still undecided after both', () => {
      const answers: Record<string, QuizAnswer> = Object.fromEntries(coreIds('pigmentation').map((id) => [id, UNSURE]))
      for (const id of backupIds('pigmentation')) answers[id] = UNSURE

      const sequence = questionSequence('pigmentation', 'unspecified', answers)

      expect(MAX_BACKUPS_PER_AXIS).toBe(2)
      expect(sequence).toHaveLength(4 + MAX_BACKUPS_PER_AXIS)
      expect(sequence.map((q) => q.id)).not.toContain('pig-b3')
    })

    it('names why a backup is asked: none counted, one counted, or a tie', () => {
      expect(backupReason(0, null)).toBe('none_counted')
      expect(backupReason(1, 4)).toBe('one_counted')
      expect(backupReason(4, 2.5)).toBe('tie')
      expect(backupReason(2, 3.5)).toBeNull()
    })

    it('tells the store the current backup is a tie when the core answers average exactly 2.5', () => {
      const store = useQuizStore()
      answerCore(store, 'hydration', [P(1), P(4), P(2), P(3)])
      store.step = { kind: 'question', axis: 'hydration', questionId: 'hyd-b1' }

      expect(store.currentQuestion!.id).toBe('hyd-b1')
      expect(store.currentBackupReason).toBe('tie')
    })
  })

  describe('isCloseCall()', () => {
    it('calls a part with fewer than two counted answers a close call, however far it leans', () => {
      expect(isCloseCall(1, 4)).toBe(true)
      expect(isCloseCall(0, null)).toBe(true)
    })

    it('calls an average within 0.25 of the threshold a close call', () => {
      expect(CLOSE_CALL_MARGIN).toBe(0.25)
      expect(isCloseCall(4, 2.5)).toBe(true)
      expect(isCloseCall(4, 2.25 + 0.01)).toBe(true)
      expect(isCloseCall(3, 2.67)).toBe(true)
    })

    it('calls an average 0.25 or more from the threshold clear, with two or more counted', () => {
      expect(isCloseCall(4, 2.75)).toBe(false)
      expect(isCloseCall(4, 2.25)).toBe(false)
      expect(isCloseCall(2, 4)).toBe(false)
    })

    it('marks a part a close call when only one answer counted after both extra questions', () => {
      const store = useQuizStore()
      answerCore(store, 'aging', [UNSURE, UNSURE, UNSURE, UNSURE])
      store.answerQuestion('age-b1', UNSURE)
      store.answerQuestion('age-b2', P(4))

      expect(store.axisResults.aging).toMatchObject({ counted: 1, skipped: 5, closeCall: true, noEvidence: false, letter: 'W' })
    })

    it('reports no evidence, and the NO_EVIDENCE_LETTER, when nothing in a part counted', () => {
      const store = useQuizStore()
      answerCore(store, 'hydration', [UNSURE, UNSURE, NA, NA])
      store.answerQuestion('hyd-b1', UNSURE)
      store.answerQuestion('hyd-b2', UNSURE)

      expect(store.axisResults.hydration).toMatchObject({
        counted: 0,
        skipped: 6,
        average: null,
        noEvidence: true,
        closeCall: true,
        letter: AXIS_LETTERS.hydration[NO_EVIDENCE_LETTER],
      })
    })
  })

  describe('saveScores (computed) and buildSaveScores()', () => {
    it('sends each part average to 2 dp, the counted answers per part, and version 2', () => {
      const store = useQuizStore()
      answerCore(store, 'hydration', [P(4), P(4), P(3), P(4)])
      answerCore(store, 'sensitivity', [P(1), P(2), P(2), UNSURE])
      answerCore(store, 'pigmentation', [P(1), P(1), P(1), P(1)])
      answerCore(store, 'aging', [P(3), P(4), P(3), P(3)])

      expect(store.saveScores).toEqual({
        hydration: 3.75,
        sensitivity: 1.67,
        pigmentation: 1,
        aging: 3.25,
        hydration_n: 4,
        sensitivity_n: 3,
        pigmentation_n: 4,
        aging_n: 4,
        version: 2,
      })
    })

    it('sends the threshold, 2.5, and a count of 0 for a part with no evidence', () => {
      const store = useQuizStore()
      answerCore(store, 'hydration', [UNSURE, UNSURE, UNSURE, UNSURE])

      expect(store.saveScores.hydration).toBe(HIGH_LETTER_THRESHOLD)
      expect(store.saveScores.hydration_n).toBe(0)
    })

    it('sends only numbers, so it fits the backend scores Dict[str, float]', () => {
      const results = useQuizStore().axisResults
      const scores = buildSaveScores(results)

      expect(Object.keys(scores)).toHaveLength(9)
      expect(Object.values(scores).every((v) => typeof v === 'number')).toBe(true)
    })
  })

  describe('"About you" privacy', () => {
    it('never writes the chosen sex to localStorage', () => {
      const store = useQuizStore()
      store.start()
      store.chooseSex('female')
      store.next()
      answerCore(store, 'hydration', [P(4), P(4), P(4), P(4)])

      expect(store.sex).toBe('female')
      for (let i = 0; i < localStorage.length; i += 1) {
        const value = localStorage.getItem(localStorage.key(i)!) ?? ''
        expect(value).not.toContain('female')
      }
    })

    it('never puts the chosen sex in the save scores', () => {
      const store = useQuizStore()
      store.chooseSex('male')

      const serialised = JSON.stringify(store.saveScores)

      expect(serialised).not.toContain('male')
      expect(serialised).not.toContain('sex')
    })
  })

  describe('next() and back()', () => {
    it('runs start, "About you", the four core questions of part one, then its part-complete step', () => {
      const store = useQuizStore()
      store.start()
      expect(store.step).toEqual({ kind: 'about' })
      store.chooseSex('unspecified')
      store.next()

      for (const id of coreIds('hydration')) {
        expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: id })
        store.answerQuestion(id, P(4))
        store.next()
      }

      expect(store.step).toEqual({ kind: 'partDone', axis: 'hydration' })
      store.next()
      expect(store.step).toEqual({ kind: 'question', axis: 'sensitivity', questionId: 'sen-1' })
    })

    it('goes from the last part-complete step to the result', () => {
      const store = useQuizStore()
      store.step = { kind: 'partDone', axis: 'aging' }

      store.next()

      expect(store.step).toEqual({ kind: 'result' })
    })

    it('goes to the next backup, not the part-complete step, when the core answers leave the part undecided', () => {
      const store = useQuizStore()
      answerCore(store, 'hydration', [UNSURE, UNSURE, UNSURE, UNSURE])
      store.step = { kind: 'question', axis: 'hydration', questionId: 'hyd-4' }

      store.next()

      expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-b1' })
    })

    it('returns to the previous question with its answer still recorded', () => {
      const store = useQuizStore()
      store.step = { kind: 'question', axis: 'hydration', questionId: 'hyd-1' }
      store.answerQuestion('hyd-1', P(3))
      store.next()

      store.back()

      expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-1' })
      expect(store.answers['hyd-1']).toEqual(P(3))
    })

    it('returns from "About you" to the start screen, and from the first question to "About you"', () => {
      const store = useQuizStore()
      store.step = { kind: 'question', axis: 'hydration', questionId: 'hyd-1' }
      store.back()
      expect(store.step).toEqual({ kind: 'about' })
      store.back()
      expect(store.step).toEqual({ kind: 'start' })
    })

    it('drops a backup that is no longer needed when an earlier answer changes, and stops counting its answer', () => {
      const store = useQuizStore()
      answerCore(store, 'hydration', [UNSURE, UNSURE, UNSURE, UNSURE])
      store.answerQuestion('hyd-b1', P(1))
      store.answerQuestion('hyd-b2', P(1))
      expect(store.sequences.hydration.map((q) => q.id)).toContain('hyd-b1')

      // Back on a core question, the user now gives real answers.
      answerCore(store, 'hydration', [P(4), P(4), P(4), P(4)])

      expect(store.sequences.hydration.map((q) => q.id)).toEqual(coreIds('hydration'))
      expect(store.axisResults.hydration).toMatchObject({ counted: 4, average: 4, letter: 'O' })
    })

    it('adds a backup when an earlier answer is changed to a skip, and goes to it next', () => {
      const store = useQuizStore()
      answerCore(store, 'hydration', [P(4), P(4), UNSURE, UNSURE])
      expect(store.sequences.hydration).toHaveLength(4)
      store.step = { kind: 'question', axis: 'hydration', questionId: 'hyd-4' }

      store.answerQuestion('hyd-2', UNSURE)
      store.next()

      expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-b1' })
    })
  })

  describe('retakePart()', () => {
    it('re-runs just that part from its first question, with the earlier answers kept', () => {
      const store = useQuizStore()
      answerCore(store, 'pigmentation', [P(1), UNSURE, UNSURE, UNSURE])
      store.step = { kind: 'result' }

      store.retakePart('pigmentation')

      expect(store.retakeAxis).toBe('pigmentation')
      expect(store.step).toEqual({ kind: 'question', axis: 'pigmentation', questionId: 'pig-1' })
      expect(store.answers['pig-1']).toEqual(P(1))
    })

    it('returns to the result after that part, without asking any other part', () => {
      const store = useQuizStore()
      store.step = { kind: 'result' }
      store.retakePart('aging')

      const visited: (string | null)[] = []
      for (const id of coreIds('aging')) {
        visited.push(currentQuestionId(store))
        store.answerQuestion(id, P(1))
        store.next()
      }
      expect(store.step).toEqual({ kind: 'partDone', axis: 'aging' })
      store.next()

      expect(visited).toEqual(coreIds('aging'))
      expect(store.step).toEqual({ kind: 'result' })
      expect(store.retakeAxis).toBeNull()
      expect(store.axisResults.aging.letter).toBe('T')
    })

    it('returns to the result when going back from the first question of the retaken part', () => {
      const store = useQuizStore()
      store.step = { kind: 'result' }
      store.retakePart('sensitivity')

      store.back()

      expect(store.step).toEqual({ kind: 'result' })
      expect(store.retakeAxis).toBeNull()
    })
  })
})
