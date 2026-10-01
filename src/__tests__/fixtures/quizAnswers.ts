import { useQuizStore, type QuizAnswer } from '../../stores/quizStore'
import { backupQuestionsFor, coreQuestionsFor, type QuizAxis, type Sex } from '../../data/quizQuestions'

// Answers and question ids for the quiz store specs. Ids come from
// src/data/quizQuestions.ts as shipped, never typed out by position.

export const P = (points: 1 | 2 | 3 | 4): QuizAnswer => ({ kind: 'points', points })
export const UNSURE: QuizAnswer = { kind: 'unsure' }
export const NA: QuizAnswer = { kind: 'not_applicable' }

export const AXES = ['hydration', 'sensitivity', 'pigmentation', 'aging'] as const

export const coreIds = (axis: QuizAxis, sex: Sex = 'unspecified') =>
  coreQuestionsFor(sex).filter((q) => q.axis === axis).map((q) => q.id)

export const backupIds = (axis: QuizAxis, sex: Sex = 'unspecified') =>
  backupQuestionsFor(sex, axis).map((q) => q.id)

type Store = ReturnType<typeof useQuizStore>

/** Answer a part's core questions in order with the given answers. */
export const answerCore = (store: Store, axis: QuizAxis, answers: QuizAnswer[]) => {
  coreIds(axis, store.sex ?? 'unspecified').forEach((id, i) => store.answerQuestion(id, answers[i]!))
}

/** The id of the question on screen, or null on any other step. */
export const currentQuestionId = (store: Store): string | null =>
  store.step.kind === 'question' ? store.step.questionId : null
