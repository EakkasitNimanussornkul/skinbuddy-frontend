import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  AXIS_LETTERS,
  CLOSE_CALL_MARGIN,
  HIGH_LETTER_THRESHOLD,
  MAX_BACKUPS_PER_AXIS,
  MIN_COUNTED,
  backupQuestionsFor,
  coreQuestionsFor,
  type Points,
  type QuizAxis,
  type ResolvedQuestion,
  type Sex,
  type SkipKind,
} from '../data/quizQuestions'

// --- Types ------------------------------------------------------------------

/** One answer, keyed by question id in the store, never by position. */
export type QuizAnswer = { kind: 'points'; points: Points } | { kind: SkipKind }

/** The four parts, in the order the quiz asks them. */
export const AXIS_ORDER: QuizAxis[] = ['hydration', 'sensitivity', 'pigmentation', 'aging']

export type QuizStep =
  | { kind: 'start' }
  | { kind: 'about' }
  | { kind: 'question'; axis: QuizAxis; questionId: string }
  | { kind: 'partDone'; axis: QuizAxis }
  | { kind: 'result' }

/** Why a backup is being asked: too few counted answers, or a dead-even tie. */
export type BackupReason = 'none_counted' | 'one_counted' | 'tie'

export interface AxisResult {
  axis: QuizAxis
  /** Answers with points; skips are left out. */
  counted: number
  /** Answers that were a skip ("not sure", "doesn't apply"). */
  skipped: number
  /** Average of the counted answers, or null when none counted. */
  average: number | null
  letter: string
  /** True when no answer in this part counted at all. */
  noEvidence: boolean
  closeCall: boolean
}

// --- Scoring rules ------------------------------------------------------------

/**
 * The letter an axis gets when none of its answers counted: 'high' gives O / S
 * / P / W, which is what the old quiz produced for an all-"not sure" part
 * (4 x 2.5 = 10 met its threshold).
 *
 * PENDING THE OWNER'S DECISION. The owner has not yet chosen whether a part
 * with no evidence should fall to the high letter, the low letter, or block
 * saving; this keeps today's behaviour until then.
 */
export const NO_EVIDENCE_LETTER: 'low' | 'high' = 'high'

/** Counted answers, skips and the average of the counted points. */
export const summariseAnswers = (answers: (QuizAnswer | undefined)[]) => {
  let counted = 0
  let skipped = 0
  let total = 0
  for (const answer of answers) {
    if (!answer) continue
    if (answer.kind === 'points') {
      counted += 1
      total += answer.points
    } else {
      skipped += 1
    }
  }
  return { counted, skipped, average: counted > 0 ? total / counted : null }
}

/** High letter at or above the threshold; the NO_EVIDENCE_LETTER side with no average. */
export const letterFor = (axis: QuizAxis, average: number | null): string => {
  if (average === null) return AXIS_LETTERS[axis][NO_EVIDENCE_LETTER]
  return average >= HIGH_LETTER_THRESHOLD ? AXIS_LETTERS[axis].high : AXIS_LETTERS[axis].low
}

/** Too little to go on, or too near the middle to call with confidence. */
export const isCloseCall = (counted: number, average: number | null): boolean =>
  counted < MIN_COUNTED || average === null || Math.abs(average - HIGH_LETTER_THRESHOLD) < CLOSE_CALL_MARGIN

/**
 * Whether a part needs one more (backup) question: fewer than MIN_COUNTED
 * counted answers, or an average sitting exactly on the threshold. The cap on
 * how many backups is applied by the caller.
 */
export const backupReason = (counted: number, average: number | null): BackupReason | null => {
  if (counted === 0) return 'none_counted'
  if (counted < MIN_COUNTED) return 'one_counted'
  if (average === HIGH_LETTER_THRESHOLD) return 'tie'
  return null
}

/**
 * The questions a part asks for one sex, given the answers so far: its core
 * questions, then backups in order while the part still needs one, up to
 * MAX_BACKUPS_PER_AXIS.
 *
 * Re-derived from the answers every time, so changing an earlier answer
 * re-evaluates the backups: one that is no longer needed drops out of the
 * sequence, and its answer, though kept in the store, stops being counted.
 */
export const questionSequence = (
  axis: QuizAxis,
  sex: Sex,
  answers: Record<string, QuizAnswer>,
): ResolvedQuestion[] => {
  const sequence = coreQuestionsFor(sex).filter((q) => q.axis === axis)
  // Backups are decided only once every core question has an answer.
  if (sequence.some((q) => !answers[q.id])) return sequence

  const pool = backupQuestionsFor(sex, axis)
  for (let i = 0; i < MAX_BACKUPS_PER_AXIS && i < pool.length; i += 1) {
    const { counted, average } = summariseAnswers(sequence.map((q) => answers[q.id]))
    if (backupReason(counted, average) === null) break
    sequence.push(pool[i]!)
    // Stop at the first unanswered backup: it is the next one to ask, and
    // whether another follows depends on its answer.
    if (!answers[pool[i]!.id]) break
  }
  return sequence
}

export const axisResultFor = (
  axis: QuizAxis,
  sex: Sex,
  answers: Record<string, QuizAnswer>,
): AxisResult => {
  const sequence = questionSequence(axis, sex, answers)
  const { counted, skipped, average } = summariseAnswers(sequence.map((q) => answers[q.id]))
  return {
    axis,
    counted,
    skipped,
    average,
    letter: letterFor(axis, average),
    noEvidence: counted === 0,
    closeCall: isCloseCall(counted, average),
  }
}

const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * The scores object sent with saveSkinType. The backend stores
 * `scores: Dict[str, float]`, so the extra keys need no backend change.
 * Sex is never part of it.
 */
export const buildSaveScores = (results: Record<QuizAxis, AxisResult>): Record<string, number> => {
  const scores: Record<string, number> = {}
  for (const axis of AXIS_ORDER) {
    // A part with no evidence sends the threshold: the middle of the scale.
    scores[axis] = round2(results[axis].average ?? HIGH_LETTER_THRESHOLD)
  }
  for (const axis of AXIS_ORDER) {
    scores[`${axis}_n`] = results[axis].counted
  }
  scores.version = 2
  return scores
}

const stepKey = (step: QuizStep): string => {
  if (step.kind === 'question') return `question:${step.questionId}`
  if (step.kind === 'partDone') return `partDone:${step.axis}`
  return step.kind
}

// --- Store --------------------------------------------------------------------

export const useQuizStore = defineStore('quiz', () => {
  // Held in memory only. This store is not persisted, sex never goes into
  // localStorage or the save payload, and resetQuiz clears it.
  const sex = ref<Sex | null>(null)
  const answers = ref<Record<string, QuizAnswer>>({})
  const step = ref<QuizStep>({ kind: 'start' })
  /** Set while "Retake this part" re-runs one part from the result. */
  const retakeAxis = ref<QuizAxis | null>(null)

  /** Sex for choosing variants; 'unspecified' until the "About you" answer. */
  const effectiveSex = computed<Sex>(() => sex.value ?? 'unspecified')

  const sequences = computed(() => {
    const out = {} as Record<QuizAxis, ResolvedQuestion[]>
    for (const axis of AXIS_ORDER) out[axis] = questionSequence(axis, effectiveSex.value, answers.value)
    return out
  })

  const partSteps = (axis: QuizAxis): QuizStep[] => [
    ...sequences.value[axis].map((q): QuizStep => ({ kind: 'question', axis, questionId: q.id })),
    { kind: 'partDone', axis },
  ]

  /**
   * Every step in order, derived from the answers so far. While retaking a
   * part it is just that part, bracketed by the result it came from and
   * returns to.
   */
  const flow = computed<QuizStep[]>(() => {
    if (retakeAxis.value) {
      return [{ kind: 'result' }, ...partSteps(retakeAxis.value), { kind: 'result' }]
    }
    return [
      { kind: 'start' },
      { kind: 'about' },
      ...AXIS_ORDER.flatMap((axis) => partSteps(axis)),
      { kind: 'result' },
    ]
  })

  const stepIndex = computed(() => {
    const key = stepKey(step.value)
    // While retaking, the result at index 0 is where the part was left from;
    // the one at the end is where it returns to. Search from 1 for the rest.
    const from = retakeAxis.value && step.value.kind !== 'result' ? 1 : 0
    return flow.value.findIndex((s, i) => i >= from && stepKey(s) === key)
  })

  const currentQuestion = computed<ResolvedQuestion | null>(() => {
    const s = step.value
    if (s.kind !== 'question') return null
    return sequences.value[s.axis].find((q) => q.id === s.questionId) ?? null
  })

  /** Why the current question is a backup, or null for a core question. */
  const currentBackupReason = computed<BackupReason | null>(() => {
    const s = step.value
    if (s.kind !== 'question') return null
    const sequence = sequences.value[s.axis]
    const at = sequence.findIndex((q) => q.id === s.questionId)
    const coreCount = coreQuestionsFor(effectiveSex.value).filter((q) => q.axis === s.axis).length
    if (at < coreCount) return null
    const before = summariseAnswers(sequence.slice(0, at).map((q) => answers.value[q.id]))
    return backupReason(before.counted, before.average)
  })

  const axisResults = computed(() => {
    const out = {} as Record<QuizAxis, AxisResult>
    for (const axis of AXIS_ORDER) out[axis] = axisResultFor(axis, effectiveSex.value, answers.value)
    return out
  })

  const finalSkinType = computed(() => AXIS_ORDER.map((axis) => axisResults.value[axis].letter).join(''))

  const saveScores = computed(() => buildSaveScores(axisResults.value))

  // --- Actions ----------------------------------------------------------------

  const start = () => {
    step.value = { kind: 'about' }
  }

  const chooseSex = (value: Sex) => {
    sex.value = value
  }

  const answerQuestion = (questionId: string, answer: QuizAnswer) => {
    answers.value = { ...answers.value, [questionId]: answer }
  }

  /** Move to the next step in the flow, re-derived from the latest answers. */
  const next = () => {
    const at = stepIndex.value
    const following = flow.value[at + 1]
    if (!following) return
    if (following.kind === 'result') retakeAxis.value = null
    step.value = following
  }

  /** Return to the previous step. Its answer is still in the store, so it shows selected. */
  const back = () => {
    const at = stepIndex.value
    if (at <= 0) return
    const previous = flow.value[at - 1]!
    if (previous.kind === 'result') retakeAxis.value = null
    step.value = previous
  }

  /** Re-run one part's questions from the result, with the earlier answers selected. */
  const retakePart = (axis: QuizAxis) => {
    retakeAxis.value = axis
    step.value = partSteps(axis)[0]!
  }

  const resetQuiz = () => {
    sex.value = null
    answers.value = {}
    step.value = { kind: 'start' }
    retakeAxis.value = null
  }

  return {
    sex,
    answers,
    step,
    retakeAxis,
    sequences,
    flow,
    currentQuestion,
    currentBackupReason,
    axisResults,
    finalSkinType,
    saveScores,
    start,
    chooseSex,
    answerQuestion,
    next,
    back,
    retakePart,
    resetQuiz,
  }
})
