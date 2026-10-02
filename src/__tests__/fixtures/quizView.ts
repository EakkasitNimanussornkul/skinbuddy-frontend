import { vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import SkinQuizView from '../../views/SkinQuizView.vue'
import QuizQuestionStep from '../../components/Quiz/QuizQuestionStep.vue'
import QuizSelfChoiceStep from '../../components/Quiz/QuizSelfChoiceStep.vue'
import { useQuizStore, type QuizAnswer } from '../../stores/quizStore'
import { SELF_CHOICE_QUESTIONS, type QuizAxis, type Sex } from '../../data/quizQuestions'
import { useAuthStore } from '../../stores/auth'

// Shared by the SkinQuizView spec files. Each spec mocks api/quizapi and
// api/authApi itself; vi.mock applies to this module's imports too.

export const P = (points: 1 | 2 | 3 | 4): QuizAnswer => ({ kind: 'points', points })
export const UNSURE: QuizAnswer = { kind: 'unsure' }

/** Every answer scores 1, so the type is DRNT and each part averages 1 from 4 answers. */
export const ALL_ONES_SCORES = {
  hydration: 1,
  sensitivity: 1,
  pigmentation: 1,
  aging: 1,
  hydration_n: 4,
  sensitivity_n: 4,
  pigmentation_n: 4,
  aging_n: 4,
  version: 2,
}

export const mountQuiz = async (
  path = '/quiz',
  skinType: string | null = 'OSPW',
  prepare?: (store: ReturnType<typeof useQuizStore>) => void,
) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/quiz', component: SkinQuizView },
      { path: '/setup-profile', component: { template: '<div />' } },
      { path: '/profile', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  // A user who already has a type is not a first-time user, which is what makes
  // the quiz offer its cancel control at all.
  auth.setAuth('token-1', skinType ? { id: 'u-1', skin_type: skinType } : { id: 'u-1' })
  const store = useQuizStore()
  prepare?.(store)

  const wrapper = mount(SkinQuizView, { global: { plugins: [pinia, router] } })

  return { wrapper, router, auth, store }
}

export const buttonByText = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().trim() === text)

export const click = async (wrapper: VueWrapper, text: string) => {
  const button = buttonByText(wrapper, text)
  if (!button) throw new Error(`No button "${text}"`)
  await button.trigger('click')
  await flushPromises()
}

const SEX_LABEL: Record<Sex, string> = { female: 'Female', male: 'Male', unspecified: 'Prefer not to say' }

/** From the start screen, through "About you", to the first question. */
export const begin = async (wrapper: VueWrapper, sex: Sex = 'female') => {
  await click(wrapper, 'Start the quiz')
  await click(wrapper, SEX_LABEL[sex])
}

export const answer = async (wrapper: VueWrapper, value: QuizAnswer) => {
  wrapper.findComponent(QuizQuestionStep).vm.$emit('answer', value)
  await flushPromises()
}

/** Pick a letter on the "your choice" question on screen. */
export const chooseLetter = async (wrapper: VueWrapper, letter: string) => {
  wrapper.findComponent(QuizSelfChoiceStep).vm.$emit('choose', letter)
  await flushPromises()
}

/**
 * Answer every question the quiz asks with `pick(questionId)`, pick
 * `choose(axis)` on any "your choice" question (by default its first row, the
 * high letter), and continue past each part-complete screen, then run out the
 * calculating beat. The shared test setup reports reduced motion, so each
 * answer moves on at once.
 */
export const runQuiz = async (
  wrapper: VueWrapper,
  pick: (questionId: string) => QuizAnswer = () => P(1),
  sex: Sex = 'female',
  choose: (axis: QuizAxis) => string = (axis) => SELF_CHOICE_QUESTIONS[axis].options[0]!.letter,
) => {
  const store = useQuizStore()
  if (store.step.kind === 'start') await begin(wrapper, sex)
  for (let guard = 0; guard < 60 && store.step.kind !== 'result'; guard += 1) {
    if (store.step.kind === 'question') await answer(wrapper, pick(store.step.questionId))
    else if (store.step.kind === 'choice') await chooseLetter(wrapper, choose(store.step.axis))
    else if (store.step.kind === 'partDone') await click(wrapper, 'Continue')
  }
  vi.advanceTimersByTime(1400)
  await flushPromises()
}
