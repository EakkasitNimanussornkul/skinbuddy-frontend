<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { AXIS_ORDER, useQuizStore, type QuizAnswer } from '../stores/quizStore'
import { saveSkinType } from '../api/quizapi'
import { updateUserSkinType } from '../api/authApi'
import { coreQuestionsFor, MAX_BACKUPS_PER_AXIS, SELF_CHOICE_QUESTIONS, type QuizAxis, type Sex } from '../data/quizQuestions'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import {
  AXIS_COPY,
  AXIS_ORDER_NUMBER,
  leanText,
  type FramePart,
  type PartState,
  type SegmentState,
} from '../components/Quiz/axisCopy'

import QuizStart from '../components/Quiz/QuizStart.vue'
import QuizFrame from '../components/Quiz/QuizFrame.vue'
import QuizProgress from '../components/Quiz/QuizProgress.vue'
import QuizAboutYou from '../components/Quiz/QuizAboutYou.vue'
import QuizQuestionStep from '../components/Quiz/QuizQuestionStep.vue'
import QuizSelfChoiceStep from '../components/Quiz/QuizSelfChoiceStep.vue'
import QuizPartComplete from '../components/Quiz/QuizPartComplete.vue'
import QuizResult from '../components/Quiz/QuizResult.vue'
import ExpressSkinSelectorModal from '../components/Quiz/ExpressSkinSelectorModal.vue'
import ConfirmCancelModal from '../components/Shared/ConfirmCancelModal.vue'
import LoadingScreen from '../components/Shared/LoadingScreen.vue'

const quizStore = useQuizStore()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { addToast } = useToast()

const showCancelModal = ref(false)
const isCalculating = ref(false)
const isSaving = ref(false)
const showSelector = ref(false)
const isExpressSaving = ref(false)

/** How long a tapped answer stays on screen, selected, before the quiz moves on. */
const AUTO_ADVANCE_MS = 220
/** The "calculating" beat between the last part and the result. */
const CALCULATING_MS = 1400

let advanceTimer: ReturnType<typeof setTimeout> | null = null
let calculatingTimer: ReturnType<typeof setTimeout> | null = null

const cancelPendingAdvance = () => {
  if (advanceTimer) clearTimeout(advanceTimer)
  advanceTimer = null
}

onMounted(() => {
  // A finished quiz starts over; one left part-way resumes where it was.
  if (quizStore.step.kind === 'result') quizStore.resetQuiz()
})

onBeforeUnmount(() => {
  cancelPendingAdvance()
  if (calculatingTimer) clearTimeout(calculatingTimer)
  // Leaving from the result (after saving, or otherwise) clears the answers
  // and the "About you" choice from memory.
  if (quizStore.step.kind === 'result') quizStore.resetQuiz()
})

// First-time users (no skin type yet) have nowhere to go back to, so the quiz
// offers them no way out, as before.
const isFirstTimeUser = computed(() => !authStore.user?.skin_type)

const step = computed(() => quizStore.step)

// A purposeful "calculating" beat between the last part and the result,
// instead of an instant page-swap. Only after a full run: a retaken part goes
// straight back to the result it came from. The retake is read from the value
// before the step changed, because next() clears it on reaching the result.
watch(
  () => [step.value.kind, quizStore.retakeAxis] as const,
  ([kind], [previous, wasRetaking]) => {
    if (kind !== 'result' || previous !== 'partDone' || wasRetaking) return
    isCalculating.value = true
    calculatingTimer = setTimeout(() => {
      isCalculating.value = false
      calculatingTimer = null
    }, CALCULATING_MS)
  },
)

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Which way the last step change went. Moving on slides the new step in from
// the right; going back slides it in from the left. Set before the step
// changes, so the <Transition> renders the change under the right name.
const direction = ref<'forward' | 'back'>('forward')
const stepTransition = computed(() => `quiz-step-${direction.value}`)

const goForward = () => {
  direction.value = 'forward'
  quizStore.next()
}

/** Move on after the short pause that lets the tapped answer show as selected. */
const scheduleNext = () => {
  cancelPendingAdvance()
  if (prefersReducedMotion()) {
    goForward()
    return
  }
  advanceTimer = setTimeout(() => {
    advanceTimer = null
    goForward()
  }, AUTO_ADVANCE_MS)
}

const handleStart = () => {
  direction.value = 'forward'
  quizStore.start()
}

const handlePickSex = (value: Sex) => {
  quizStore.chooseSex(value)
  scheduleNext()
}

const handleAnswer = (answer: QuizAnswer) => {
  const question = quizStore.currentQuestion
  if (!question) return
  quizStore.answerQuestion(question.id, answer)
  scheduleNext()
}

/** A pick on the "your choice" question moves on the same way an answer does. */
const handleSelfChoice = (letter: string) => {
  const s = step.value
  if (s.kind !== 'choice') return
  quizStore.answerSelfChoice(s.axis, letter)
  scheduleNext()
}

/** The letter already picked on a part's "your choice" question, if any. */
const selfChoiceSelectedFor = (axis: QuizAxis): string | null => {
  const answer = quizStore.answers[SELF_CHOICE_QUESTIONS[axis].id]
  return answer?.kind === 'self_choice' ? answer.letter : null
}

const handleBack = () => {
  cancelPendingAdvance()
  direction.value = 'back'
  quizStore.back()
}

const handleContinue = () => {
  cancelPendingAdvance()
  goForward()
}

const handleRetakePart = (axis: QuizAxis) => {
  direction.value = 'forward'
  quizStore.retakePart(axis)
}

// --- What the frame around a step shows ---------------------------------------

const currentAxis = computed<QuizAxis | null>(() => {
  const s = step.value
  return s.kind === 'question' || s.kind === 'choice' || s.kind === 'partDone' ? s.axis : null
})

const coreCount = (axis: QuizAxis) =>
  coreQuestionsFor(quizStore.sex ?? 'unspecified').filter((q) => q.axis === axis).length

/** Where the current question sits in its part: index, and whether it is a backup. */
const questionPosition = computed(() => {
  const s = step.value
  if (s.kind !== 'question') return null
  const index = quizStore.sequences[s.axis].findIndex((q) => q.id === s.questionId)
  const core = coreCount(s.axis)
  return { index, core, isBackup: index >= core }
})

const partStates = computed<PartState[]>(() =>
  AXIS_ORDER.map((axis, i) => {
    const s = step.value
    if (quizStore.retakeAxis) {
      if (axis !== quizStore.retakeAxis) return 'done'
      return s.kind === 'partDone' ? 'done' : 'current'
    }
    const at = currentAxis.value ? AXIS_ORDER.indexOf(currentAxis.value) : -1
    if (i < at) return 'done'
    if (i === at) return s.kind === 'partDone' ? 'done' : 'current'
    return 'todo'
  }),
)

const segments = computed<SegmentState[]>(() => {
  const s = step.value
  if (s.kind !== 'question' && s.kind !== 'choice') return []
  const currentId = s.kind === 'question' ? s.questionId : null
  const core = coreCount(s.axis)
  const out = quizStore.sequences[s.axis].map((q, j): SegmentState => {
    if (j >= core && (q.id === currentId || quizStore.answers[q.id])) return 'backup'
    if (q.id === currentId) return 'current'
    return quizStore.answers[q.id] ? 'answered' : 'todo'
  })
  // The "your choice" question, when the part has one, is marked like the
  // extra questions.
  if (quizStore.selfChoiceNeeded[s.axis]) {
    out.push(s.kind === 'choice' || selfChoiceSelectedFor(s.axis) ? 'backup' : 'todo')
  }
  return out
})

const frameParts = computed<FramePart[]>(() =>
  AXIS_ORDER.map((axis, i) => {
    const state = partStates.value[i]!
    const result = quizStore.axisResults[axis]
    let detail = ''
    if (state === 'done') {
      detail = `${leanText(result)} · ${result.closeCall ? 'close call' : 'clear'}`
    } else if (state === 'current' && step.value.kind === 'choice') {
      detail = 'One last question'
    } else if (state === 'current' && questionPosition.value) {
      const { index, core, isBackup } = questionPosition.value
      detail = isBackup ? `Extra question ${index - core + 1}` : `Question ${index + 1} of ${core}`
    }
    return { number: i + 1, name: AXIS_COPY[axis].part, state, detail, closeCall: result.closeCall }
  }),
)

const frameLabel = computed(() => {
  const s = step.value
  if (s.kind === 'about') return { label: 'About you', detail: '' }
  if (s.kind === 'partDone') return { label: `Part ${AXIS_ORDER_NUMBER[s.axis]} of 4 done`, detail: '' }
  if (s.kind === 'question' || s.kind === 'choice') {
    return { label: `Part ${AXIS_ORDER_NUMBER[s.axis]} of 4`, detail: AXIS_COPY[s.axis].part }
  }
  return { label: '', detail: '' }
})

const questionCountText = computed(() => {
  const position = questionPosition.value
  if (!position) return ''
  return position.isBackup
    ? `Extra question ${position.index - position.core + 1} of up to ${MAX_BACKUPS_PER_AXIS} in this part`
    : `Question ${position.index + 1} of ${position.core} in this part`
})

const hint = computed(() => {
  if (step.value.kind === 'partDone') return ''
  if (questionPosition.value?.isBackup) {
    return "At most two extra questions per part. If it's still unclear, your result says so."
  }
  return 'Tap an answer to move on'
})

/** The part after the one just finished, or null when the result is next. */
const nextAxis = computed<QuizAxis | null>(() => {
  const s = step.value
  if (s.kind !== 'partDone' || quizStore.retakeAxis) return null
  return AXIS_ORDER[AXIS_ORDER.indexOf(s.axis) + 1] ?? null
})

// --- Leaving ------------------------------------------------------------------

const requestCancel = () => {
  // Nothing answered yet means nothing to lose, so no confirmation.
  if (!quizStore.sex && Object.keys(quizStore.answers).length === 0) {
    executeCancel()
    return
  }
  showCancelModal.value = true
}

const executeCancel = () => {
  showCancelModal.value = false
  cancelPendingAdvance()
  quizStore.resetQuiz()
  router.push('/')
}

interface LiffWindow extends Window {
  liff?: { closeWindow: () => void }
}

/** Close the LINE in-app browser, or return to where the guard sent the user from. */
const exitQuiz = () => {
  const win = window as LiffWindow
  if (typeof window !== 'undefined' && win.liff) {
    win.liff.closeWindow()
  } else {
    // Honour the guard's redirect now that a skin type exists. Defaults to
    // home, which is where the quiz has always sent people.
    router.push((route.query.redirect as string) || '/')
  }
}

/** Save the result. Returns false (and says so) when the save failed. */
const saveResult = async (): Promise<boolean> => {
  isSaving.value = true
  try {
    // Only the code and the per-part numbers go to the backend; the "About
    // you" answer is never part of the payload.
    await saveSkinType(quizStore.finalSkinType, quizStore.saveScores)
    authStore.updateSkinType(quizStore.finalSkinType)
    localStorage.setItem('hasCompletedQuiz', 'true')
    addToast('Skin profile successfully saved!', 'success')
    return true
  } catch (error) {
    console.error(error)
    addToast('Failed to save to database. Please try again.', 'error')
    return false
  } finally {
    isSaving.value = false
  }
}

const saveAndContinue = async () => {
  if (await saveResult()) exitQuiz()
}

/** "See what CODE means": save the same way, then open the skin profile page. */
const saveAndSeeProfile = async () => {
  if (await saveResult()) router.push('/profile')
}

const retakeWholeQuiz = () => {
  cancelPendingAdvance()
  direction.value = 'forward'
  quizStore.resetQuiz()
}

/** "I already know my type" on the start screen. */
const handleExpressConfirm = async (selectedType: string) => {
  isExpressSaving.value = true
  try {
    if (!authStore.isAuthenticated || !authStore.user) {
      throw new Error('No user logged in locally.')
    }
    await updateUserSkinType(selectedType)
    authStore.updateSkinType(selectedType)
    addToast(`Profile set to ${selectedType}.`, 'success')
    showSelector.value = false
    quizStore.resetQuiz()
    exitQuiz()
  } catch (error) {
    console.error('Express Confirm Error:', error)
    addToast('Failed to save your skin profile. Please try again.', 'error')
  } finally {
    isExpressSaving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark font-sans text-brand-text dark:text-stone-100 relative flex flex-col overflow-x-clip">
    <!-- overflow-x-clip, not hidden: it keeps a step sliding in from the side
         from widening the page, without making a scroll container that would
         stop the result's sticky card from sticking. -->

    <Transition name="fade">
      <LoadingScreen v-if="isCalculating" message="Calculating your profile..." />
    </Transition>

    <!-- One screen at a time: the start, the quiz frame, or the result. A step
         slides in from the right moving on and from the left going back; the
         result fades up instead, after the calculating beat. -->
    <Transition :name="step.kind === 'result' ? 'reveal' : stepTransition" mode="out-in">
      <QuizStart
        v-if="step.kind === 'start'"
        key="start"
        :show-cancel="!isFirstTimeUser"
        @start="handleStart"
        @cancel="requestCancel"
        @know-type="showSelector = true"
      />

      <QuizFrame
        v-else-if="step.kind === 'about' || step.kind === 'question' || step.kind === 'choice' || step.kind === 'partDone'"
        key="frame"
        :label="frameLabel.label"
        :label-detail="frameLabel.detail"
        :show-back="true"
        :back-label="step.kind === 'about' ? 'Back' : 'Previous question'"
        :show-cancel="!isFirstTimeUser"
        :parts="frameParts"
        :hint="hint"
        @back="handleBack"
        @cancel="requestCancel"
      >
        <template #progress>
          <QuizProgress :parts="partStates" :segments="segments" />
          <p v-if="questionCountText" class="mt-2 text-xs text-stone-600 dark:text-stone-400" data-testid="question-count">{{ questionCountText }}</p>
        </template>

        <!-- Keyed per question, so two questions in a row animate too. -->
        <Transition :name="stepTransition" mode="out-in">
          <QuizAboutYou
            v-if="step.kind === 'about'"
            key="about"
            :selected="quizStore.sex"
            @pick="handlePickSex"
          />
          <QuizQuestionStep
            v-else-if="step.kind === 'question' && quizStore.currentQuestion"
            :key="quizStore.currentQuestion.id"
            :question="quizStore.currentQuestion"
            :selected="quizStore.answers[quizStore.currentQuestion.id] ?? null"
            :backup-reason="quizStore.currentBackupReason"
            @answer="handleAnswer"
          />
          <QuizSelfChoiceStep
            v-else-if="step.kind === 'choice'"
            :key="`choice-${step.axis}`"
            :question="SELF_CHOICE_QUESTIONS[step.axis]"
            :selected="selfChoiceSelectedFor(step.axis)"
            @choose="handleSelfChoice"
          />
          <QuizPartComplete
            v-else-if="step.kind === 'partDone'"
            :key="`done-${step.axis}`"
            :result="quizStore.axisResults[step.axis]"
            :next-axis="nextAxis"
          />
        </Transition>

        <template v-if="step.kind === 'partDone'" #footer>
          <button
            type="button"
            class="h-[54px] w-full lg:w-auto lg:px-10 rounded-2xl bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white text-base font-bold transition-colors"
            @click="handleContinue"
          >
            Continue
          </button>
        </template>
      </QuizFrame>

      <QuizResult
        v-else-if="step.kind === 'result' && !isCalculating"
        key="result"
        :skin-type="quizStore.finalSkinType"
        :results="quizStore.axisResults"
        :is-saving="isSaving"
        @save="saveAndContinue"
        @see-profile="saveAndSeeProfile"
        @retake-part="handleRetakePart"
        @retake-all="retakeWholeQuiz"
      />
    </Transition>

    <ConfirmCancelModal
      v-if="showCancelModal"
      @cancel="showCancelModal = false"
      @confirm="executeCancel"
    />

    <ExpressSkinSelectorModal
      :is-open="showSelector"
      :is-saving="isExpressSaving"
      @close="showSelector = false"
      @confirm="handleExpressConfirm"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.6s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.reveal-enter-active {
  transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

/* A step change: the old step fades out quickly, nudging the way it came
   from, then the new one slides in from the side the user is heading to. */
.quiz-step-forward-enter-active,
.quiz-step-back-enter-active {
  transition: opacity 300ms ease, transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
.quiz-step-forward-leave-active,
.quiz-step-back-leave-active {
  transition: opacity 120ms ease, transform 120ms ease-in;
}
.quiz-step-forward-enter-from {
  opacity: 0;
  transform: translateX(26px);
}
.quiz-step-forward-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
.quiz-step-back-enter-from {
  opacity: 0;
  transform: translateX(-26px);
}
.quiz-step-back-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

/* Reduced motion: every swap is instant. With no transition to wait for, Vue
   swaps the steps at once. */
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active,
  .reveal-enter-active,
  .quiz-step-forward-enter-active,
  .quiz-step-back-enter-active,
  .quiz-step-forward-leave-active,
  .quiz-step-back-leave-active {
    transition: none;
  }
  .reveal-enter-from,
  .quiz-step-forward-enter-from,
  .quiz-step-forward-leave-to,
  .quiz-step-back-enter-from,
  .quiz-step-back-leave-to {
    transform: none;
  }
}
</style>
