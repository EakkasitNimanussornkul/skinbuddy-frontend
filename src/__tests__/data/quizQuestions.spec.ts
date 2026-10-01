import { describe, it, expect } from 'vitest'
import { coreQuestionsFor, type Sex } from '../../data/quizQuestions'
import { AXES, backupIds, coreIds } from '../fixtures/quizAnswers'

// Feature #2 - Take skinquiz. The question bank's per-sex selection. The
// "About you" answer only picks which questions and which wording are shown;
// these cases pin that, using the bank as shipped.
//
// Every it() string is phrased as the expected result, because the Test Record
// generator lifts it verbatim into the "Expected Unit Output" field.

describe('src/data/quizQuestions.ts', () => {
  describe('coreQuestionsFor() and backupQuestionsFor() per sex', () => {
    it('asks the hormone question in the third dark-spots slot for female, and the patches question for male and unspecified', () => {
      expect(coreIds('pigmentation', 'female')).toEqual(['pig-1', 'pig-2', 'pig-3-hormone', 'pig-4'])
      expect(coreIds('pigmentation', 'male')).toEqual(['pig-1', 'pig-2', 'pig-3-patches', 'pig-4'])
      expect(coreIds('pigmentation', 'unspecified')).toEqual(['pig-1', 'pig-2', 'pig-3-patches', 'pig-4'])
    })

    it('asks sixteen core questions, four per part, for every sex', () => {
      for (const sex of ['female', 'male', 'unspecified'] as const) {
        const core = coreQuestionsFor(sex)
        expect(core).toHaveLength(16)
        for (const axis of AXES) {
          expect(core.filter((q) => q.axis === axis)).toHaveLength(4)
        }
      }
    })

    it('gives female the patches backup and male and unspecified the tanning backup', () => {
      expect(backupIds('pigmentation', 'female')).toEqual(['pig-b1', 'pig-b2-patches', 'pig-b3'])
      expect(backupIds('pigmentation', 'male')).toEqual(['pig-b1', 'pig-b2-tan', 'pig-b3'])
      expect(backupIds('pigmentation', 'unspecified')).toEqual(['pig-b1', 'pig-b2-tan', 'pig-b3'])
    })

    it('applies the male wording to the shaving-related questions, and the base wording otherwise', () => {
      const pig1 = (sex: Sex) => coreQuestionsFor(sex).find((q) => q.id === 'pig-1')!
      expect(pig1('male').text).toContain('razor bump')
      expect(pig1('female').text).not.toContain('razor bump')
      expect(pig1('unspecified').text).not.toContain('razor bump')

      const sen1 = (sex: Sex) => coreQuestionsFor(sex).find((q) => q.id === 'sen-1')!
      expect(sen1('female').subtext).toBe('If this changes over your cycle, think of an average month.')
      expect(sen1('male').subtext).toContain('after shaving')
      expect(sen1('unspecified').subtext).toBeUndefined()
    })
  })
})
