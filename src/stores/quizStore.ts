import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  AXIS_LETTERS,
  CLOSE_CALL_MARGIN,
  HIGH_LETTER_THRESHOLD,
  MAX_BACKUPS_PER_AXIS,
  MIN_COUNTED,
  SELF_CHOICE_QUESTIONS,
  backupQuestionsFor,
  coreQuestionsFor,
  type Points,
  type QuizAxis,
  type ResolvedQuestion,
  type Sex,
  type SkipKind,
} from '../data/quizQuestions'

// --- Types ------------------------------------------------------------------

/**
 * One answer, keyed by question id in the store, never by position. A
 * 'self_choice' answer is the letter picked on a part's "your choice" question;
 * it is neither counted nor a skip.
 */
export type QuizAnswer =
  | { kind: 'points'; points: Points }
  | { kind: SkipKind }
  | { kind: 'self_choice'; letter: string }

/** The four parts, in the order the quiz asks them. */
export const AXIS_ORDER: QuizAxis[] = ['hydration', 'sensitivity', 'pigmentation', 'aging']

export type QuizStep =
  | { kind: 'start' }
  | { kind: 'about' }
  | { kind: 'question'; axis: QuizAxis; questionId: string }
  /** The "your choice" question that ends a part where nothing counted. */
  | { kind: 'choice'; axis: QuizAxis }
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
  /** True when the letter is the user's pick on the "your choice" question. */
  choice: boolean
  closeCall: boolean
}

// --- Scoring rules ------------------------------------------------------------

/** Counted answers, skips and the average of the counted points. A "your choice" pick is neither. */
export const summariseAnswers = (answers: (QuizAnswer | undefined)[]) => {
  let counted = 0
  let skipped = 0
  let total = 0
  for (const answer of answers) {
    if (!answer) continue
    if (answer.kind === 'points') {
      counted += 1
      total += answer.points
    } else if (answer.kind === 'unsure' || answer.kind === 'not_applicable') {
      skipped += 1
    }
  }
  return { counted, skipped, average: counted > 0 ? total / counted : null }
}

/**
 * High letter at or above the threshold. With no average, the letter the user
 * picked on the part's "your choice" question.
 */
export const letterFor = (axis: QuizAxis, average: number | null, chosen: string | null = null): string => {
  if (average === null) {
    if (chosen) return chosen
    // Defensive only: a part with nothing counted cannot finish without the
    // "your choice" pick, so this never reaches a result. It is here because
    // every part has a letter from the start (finalSkinType is a string even
    // before a part is answered), and the type needs one.
    return AXIS_LETTERS[axis].high
  }
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

/**
 * Whether a part ends with its "your choice" question: every question it asked
 * has an answer and none of them counted. With nothing counted the backups run
 * to their cap, so an answered sequence here has had both extra questions.
 * Re-derived like the sequence: an answer changed so that one counts removes
 * the step, and its pick, though kept in the store, stops deciding the letter.
 */
export const needsSelfChoice = (axis: QuizAxis, sex: Sex, answers: Record<string, QuizAnswer>): boolean => {
  const sequence = questionSequence(axis, sex, answers)
  if (sequence.some((q) => !answers[q.id])) return false
  return summariseAnswers(sequence.map((q) => answers[q.id])).counted === 0
}

/** The letter picked on a part's "your choice" question, if it is one of the part's two. */
export const chosenLetter = (axis: QuizAxis, answers: Record<string, QuizAnswer>): string | null => {
  const answer = answers[SELF_CHOICE_QUESTIONS[axis].id]
  if (answer?.kind !== 'self_choice') return null
  const { low, high } = AXIS_LETTERS[axis]
  return answer.letter === low || answer.letter === high ? answer.letter : null
}

export const axisResultFor = (
  axis: QuizAxis,
  sex: Sex,
  answers: Record<string, QuizAnswer>,
): AxisResult => {
  const sequence = questionSequence(axis, sex, answers)
  const { counted, skipped, average } = summariseAnswers(sequence.map((q) => answers[q.id]))
  const chosen = needsSelfChoice(axis, sex, answers) ? chosenLetter(axis, answers) : null
  return {
    axis,
    counted,
    skipped,
    average,
    letter: letterFor(axis, average, chosen),
    noEvidence: counted === 0,
    choice: chosen !== null,
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
  // A part whose letter is the user's own pick says so, as a number to fit the
  // schema. Parts without one leave the key out.
  for (const axis of AXIS_ORDER) {
    if (results[axis].choice) scores[`${axis}_choice`] = 1
  }
  scores.version = 2
  return scores
}

const stepKey = (step: QuizStep): string => {
  if (step.kind === 'question') return `question:${step.questionId}`
  if (step.kind === 'choice') return `choice:${step.axis}`
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

  /** Per part, whether it ends with its "your choice" question. */
  const selfChoiceNeeded = computed(() => {
    const out = {} as Record<QuizAxis, boolean>
    for (const axis of AXIS_ORDER) out[axis] = needsSelfChoice(axis, effectiveSex.value, answers.value)
    return out
  })

  const partSteps = (axis: QuizAxis): QuizStep[] => [
    ...sequences.value[axis].map((q): QuizStep => ({ kind: 'question', axis, questionId: q.id })),
    ...(selfChoiceNeeded.value[axis] ? [{ kind: 'choice', axis } as QuizStep] : []),
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

  /** Record the letter picked on a part's "your choice" question. */
  const answerSelfChoice = (axis: QuizAxis, letter: string) => {
    answerQuestion(SELF_CHOICE_QUESTIONS[axis].id, { kind: 'self_choice', letter })
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

  /**
   * Re-run one part's questions from the result, with the earlier answers
   * selected. A "your choice" pick is cleared, so the part is decided afresh.
   */
  const retakePart = (axis: QuizAxis) => {
    const kept = { ...answers.value }
    delete kept[SELF_CHOICE_QUESTIONS[axis].id]
    answers.value = kept
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
    selfChoiceNeeded,
    flow,
    currentQuestion,
    currentBackupReason,
    axisResults,
    finalSkinType,
    saveScores,
    start,
    chooseSex,
    answerQuestion,
    answerSelfChoice,
    next,
    back,
    retakePart,
    resetQuiz,
  }
})
