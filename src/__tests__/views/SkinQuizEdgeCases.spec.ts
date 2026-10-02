import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('../../api/quizapi', () => ({
  saveSkinType: vi.fn(),
}))
// Used only by "I already know my type" on the start screen.
vi.mock('../../api/authApi', () => ({
  updateUserSkinType: vi.fn(),
}))

import { saveSkinType } from '../../api/quizapi'
import { updateUserSkinType } from '../../api/authApi'
import SkinQuizView from '../../views/SkinQuizView.vue'
import QuizFrame from '../../components/Quiz/QuizFrame.vue'
import QuizPartComplete from '../../components/Quiz/QuizPartComplete.vue'
import QuizResult from '../../components/Quiz/QuizResult.vue'
import ConfirmCancelModal from '../../components/Shared/ConfirmCancelModal.vue'
import { useQuizStore } from '../../stores/quizStore'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'
import type { Sex } from '../../data/quizQuestions'
import { P, UNSURE, answer, begin, buttonByText, click, mountQuiz, runQuiz } from '../fixtures/quizView'

// Feature #2 - Take skinquiz. Rules of SkinQuizView that the earlier cards
// reached but did not pin: an independent mutation run changed each of them
// and the suite still passed. Each group below breaks if its rule is undone.
// The last group pins an owner decision made with them: the calculating beat
// plays after a full run, but not on the way back from a retaken part.
//
// Every it() string is phrased as the expected result, because the Test Record
// generator lifts it verbatim into the "Expected Unit Output" field.
//
// The shared test setup reports prefers-reduced-motion, so an answer moves on
// at once; the cases about the 220 ms pause override matchMedia for their run.

const { toasts } = useToast()

/** A user who has not asked for reduced motion, for the length of one case. */
const withMotion = () => {
  const original = window.matchMedia
  window.matchMedia = ((query: string) => ({ ...original(query), matches: false })) as typeof window.matchMedia
  return () => {
    window.matchMedia = original
  }
}

const goBack = async (wrapper: VueWrapper) => {
  wrapper.findComponent(QuizFrame).vm.$emit('back')
  await flushPromises()
}

/** The "Question N of 4 in this part" line under the phone progress bar. */
const phoneCount = (wrapper: VueWrapper) => wrapper.get('[data-testid="question-count"]').text()

/** The detail line on the current part in the desktop list of parts. */
const desktopCount = (wrapper: VueWrapper) => {
  const spans = wrapper.get('nav[aria-label="Quiz parts"] [aria-current="step"]').findAll('span')
  return spans[spans.length - 1]!.text()
}

/** Every key and value in localStorage and sessionStorage, as one string. */
const everythingStored = () => {
  const out: string[] = []
  for (const storage of [localStorage, sessionStorage]) {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)!
      out.push(key, storage.getItem(key) ?? '')
    }
  }
  return out.join('\n')
}

/**
 * The quiz mounted on a Pinia set up as src/main.ts sets it up, with
 * pinia-plugin-persistedstate installed before any store is created (a store
 * made before the plugin is installed never gets it).
 */
const mountWithAppPinia = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/quiz', component: SkinQuizView },
    ],
  })
  await router.push('/quiz')
  await router.isReady()

  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  createApp({}).use(pinia)
  setActivePinia(pinia)
  useAuthStore().setAuth('token-1', { id: 'u-1', skin_type: 'OSPW' })

  const wrapper = mount(SkinQuizView, { global: { plugins: [pinia, router] } })
  return { wrapper, store: useQuizStore() }
}

describe('src/views/SkinQuizView.vue (edge cases)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    localStorage.clear()
    sessionStorage.clear()
    toasts.value.splice(0)
    vi.mocked(saveSkinType).mockResolvedValue({})
    vi.mocked(updateUserSkinType).mockResolvedValue({})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('"About you" on screen with the persisted-state plugin', () => {
    it('stores no trace of the "About you" answer in localStorage or sessionStorage after it is picked on screen', async () => {
      const labels: Record<Sex, string> = { female: 'Female', male: 'Male', unspecified: 'Prefer not to say' }
      for (const sex of ['female', 'male', 'unspecified'] as Sex[]) {
        localStorage.clear()
        sessionStorage.clear()
        const { wrapper, store } = await mountWithAppPinia()

        await click(wrapper, 'Start the quiz')
        await click(wrapper, labels[sex])
        await answer(wrapper, P(3))

        expect(store.sex).toBe(sex)
        const stored = everythingStored()
        expect(stored).not.toContain(sex)
        expect(stored).not.toContain('"sex"')
        wrapper.unmount()
      }
    })
  })

  describe('extra-question banner after an extra answer counts', () => {
    it('says "None of your answers in this part counted" on the first extra question when no core answer counted', async () => {
      const { wrapper } = await mountQuiz()
      await begin(wrapper)
      for (let i = 0; i < 4; i += 1) await answer(wrapper, UNSURE)

      expect(wrapper.get('[data-testid="backup-banner"]').text()).toContain('None of your answers in this part counted')
    })

    it('says "Only one of your answers in this part counted", not "None", on the second extra question once the first extra answer counted', async () => {
      const { wrapper, store } = await mountQuiz()
      await begin(wrapper)
      for (let i = 0; i < 4; i += 1) await answer(wrapper, UNSURE)
      await answer(wrapper, P(4))

      expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-b2' })
      expect(store.currentBackupReason).toBe('one_counted')
      const banner = wrapper.get('[data-testid="backup-banner"]').text()
      expect(banner).toContain('Only one of your answers in this part counted')
      expect(banner).not.toContain('None of your answers')
    })
  })

  describe('Back during the 220 ms auto-advance pause', () => {
    it('stays on the previous question when Back is pressed straight after tapping an answer', async () => {
      const restore = withMotion()
      try {
        const { wrapper, store } = await mountQuiz()
        await begin(wrapper)
        vi.advanceTimersByTime(220)
        await flushPromises()
        await answer(wrapper, P(2))
        vi.advanceTimersByTime(220)
        await flushPromises()
        expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-2' })

        await answer(wrapper, P(3))
        await goBack(wrapper)
        vi.advanceTimersByTime(1000)
        await flushPromises()

        expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-1' })
        expect(store.answers['hyd-2']).toEqual(P(3))
      } finally {
        restore()
      }
    })

    it('stays on the start screen when Back is pressed straight after picking an "About you" answer', async () => {
      const restore = withMotion()
      try {
        const { wrapper, store } = await mountQuiz()
        await click(wrapper, 'Start the quiz')
        await click(wrapper, 'Female')

        await goBack(wrapper)
        vi.advanceTimersByTime(1000)
        await flushPromises()

        expect(store.step).toEqual({ kind: 'start' })
      } finally {
        restore()
      }
    })
  })

  describe('leaving after only "About you"', () => {
    it('asks for confirmation when the only thing given so far is the "About you" answer', async () => {
      const { wrapper, router, store } = await mountQuiz()
      const push = vi.spyOn(router, 'push')
      await begin(wrapper)
      expect(store.answers).toEqual({})

      wrapper.findComponent(QuizFrame).vm.$emit('cancel')
      await flushPromises()

      expect(wrapper.findComponent(ConfirmCancelModal).exists()).toBe(true)
      expect(push).not.toHaveBeenCalled()
      expect(store.sex).toBe('female')
    })

    it('clears the "About you" answer and leaves for home once that is confirmed', async () => {
      const { wrapper, router, store } = await mountQuiz()
      const push = vi.spyOn(router, 'push')
      await begin(wrapper)
      wrapper.findComponent(QuizFrame).vm.$emit('cancel')
      await flushPromises()

      wrapper.findComponent(ConfirmCancelModal).vm.$emit('confirm')
      await flushPromises()

      expect(store.sex).toBeNull()
      expect(push).toHaveBeenCalledWith('/')
    })
  })

  describe('part complete while retaking a part', () => {
    it('names the result as next on a retaken part, not the part that follows it, since Continue returns to the result', async () => {
      const { wrapper, store } = await mountQuiz()
      await runQuiz(wrapper, (id) => (id.startsWith('pig') ? UNSURE : P(1)))
      await click(wrapper, 'Retake this part')
      while (store.step.kind === 'question') await answer(wrapper, P(1))

      expect(store.step).toEqual({ kind: 'partDone', axis: 'pigmentation' })
      expect(wrapper.findComponent(QuizPartComplete).props('nextAxis')).toBeNull()
      expect(wrapper.get('[data-testid="next-part"]').text()).toBe('Your result')
    })
  })

  describe('saving from "See what CODE means"', () => {
    it('disables "See what CODE means" while the save is in flight, so a double click sends one save', async () => {
      let finish: (value: unknown) => void = () => {}
      vi.mocked(saveSkinType).mockReturnValue(new Promise((resolve) => { finish = resolve }))
      const { wrapper, router } = await mountQuiz()
      const push = vi.spyOn(router, 'push')
      await runQuiz(wrapper)
      const seeWhat = buttonByText(wrapper, 'See what DRNT means')!

      await seeWhat.trigger('click')
      await seeWhat.trigger('click')

      expect(seeWhat.attributes('disabled')).toBeDefined()
      expect(saveSkinType).toHaveBeenCalledTimes(1)

      finish({})
      await flushPromises()
      expect(push).toHaveBeenCalledTimes(1)
      expect(push).toHaveBeenCalledWith('/profile')
    })
  })

  describe('question counts', () => {
    it('counts the core questions as "Question N of 4", from 1 to 4, on the phone line and in the desktop list of parts', async () => {
      const { wrapper } = await mountQuiz()
      await begin(wrapper)

      for (let n = 1; n <= 4; n += 1) {
        expect(phoneCount(wrapper)).toBe(`Question ${n} of 4 in this part`)
        expect(desktopCount(wrapper)).toBe(`Question ${n} of 4`)
        await answer(wrapper, UNSURE)
      }
    })

    it('counts the extra questions as "Extra question N of up to 2", from 1, on the phone line and in the desktop list of parts', async () => {
      const { wrapper } = await mountQuiz()
      await begin(wrapper)
      for (let i = 0; i < 4; i += 1) await answer(wrapper, UNSURE)

      expect(phoneCount(wrapper)).toBe('Extra question 1 of up to 2 in this part')
      expect(desktopCount(wrapper)).toBe('Extra question 1')

      await answer(wrapper, P(4))

      expect(phoneCount(wrapper)).toBe('Extra question 2 of up to 2 in this part')
      expect(desktopCount(wrapper)).toBe('Extra question 2')
    })
  })

  describe('calculating beat after a full run and after a retake', () => {
    const CALCULATING = 'Calculating your profile...'

    /** Answer every question with 1 up to the last part's complete screen, leaving Continue unpressed. */
    const answerToLastPartDone = async (wrapper: VueWrapper) => {
      const store = useQuizStore()
      if (store.step.kind === 'start') await begin(wrapper)
      for (let guard = 0; guard < 60; guard += 1) {
        const s = store.step
        if (s.kind === 'partDone' && s.axis === 'aging') return
        if (s.kind === 'question') await answer(wrapper, P(1))
        else if (s.kind === 'partDone') await click(wrapper, 'Continue')
      }
    }

    it('shows "Calculating your profile..." for 1400 ms before the result at the end of a full first run', async () => {
      const { wrapper } = await mountQuiz()
      await answerToLastPartDone(wrapper)

      await click(wrapper, 'Continue')

      expect(wrapper.text()).toContain(CALCULATING)
      expect(wrapper.findComponent(QuizResult).exists()).toBe(false)
      vi.advanceTimersByTime(1399)
      await flushPromises()
      expect(wrapper.findComponent(QuizResult).exists()).toBe(false)
      vi.advanceTimersByTime(1)
      await flushPromises()
      expect(wrapper.text()).not.toContain(CALCULATING)
      expect(wrapper.findComponent(QuizResult).exists()).toBe(true)
    })

    it('goes straight back to the result, with no calculating screen, when Continue ends a retaken part', async () => {
      const { wrapper, store } = await mountQuiz()
      await runQuiz(wrapper, (id) => (id.startsWith('pig') ? UNSURE : P(1)))
      await click(wrapper, 'Retake this part')
      while (store.step.kind === 'question') await answer(wrapper, P(1))

      await click(wrapper, 'Continue')

      expect(store.step).toEqual({ kind: 'result' })
      expect(wrapper.text()).not.toContain(CALCULATING)
      expect(wrapper.findComponent(QuizResult).exists()).toBe(true)
      expect(wrapper.get('[data-testid="result-code"]').text()).toBe('DRNT')
    })

    it('shows the calculating screen again on a full run after "Retake the whole quiz" that follows a retaken part', async () => {
      const { wrapper, store } = await mountQuiz()
      await runQuiz(wrapper, (id) => (id.startsWith('pig') ? UNSURE : P(1)))
      await click(wrapper, 'Retake this part')
      while (store.step.kind === 'question') await answer(wrapper, P(1))
      await click(wrapper, 'Continue')
      await click(wrapper, 'Retake the whole quiz')
      await answerToLastPartDone(wrapper)

      await click(wrapper, 'Continue')

      expect(wrapper.text()).toContain(CALCULATING)
      expect(wrapper.findComponent(QuizResult).exists()).toBe(false)
    })
  })
})
