import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('../../api/quizapi', () => ({
  saveSkinType: vi.fn(),
}))

import { saveSkinType } from '../../api/quizapi'
import SkinQuizView from '../../views/SkinQuizView.vue'
import QuestionCard from '../../components/Quiz/QuestionCard.vue'
import QuizResultDashboard from '../../components/Quiz/QuizResultDashboard.vue'
import ConfirmCancelModal from '../../components/Shared/ConfirmCancelModal.vue'
import { baumannQuiz } from '../../data/baumannQuiz'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'

const { toasts } = useToast()

/** Every answer scores zero, so finalSkinType is deterministically DRNT. */
const ZERO_SCORES = { hydration: 0, sensitivity: 0, pigmentation: 0, aging: 0 }

const mountQuiz = async (path = '/quiz', skinType: string | null = 'OSPW') => {
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

  const wrapper = mount(SkinQuizView, { global: { plugins: [pinia, router] } })

  return { wrapper, router, auth }
}

/**
 * Answer every question with zero points and run out the calculating beat.
 *
 * The results panel is gated behind a 1400ms timer, so reaching the save button
 * means driving that timer rather than waiting on it. The quiz cannot be seeded
 * as already finished instead: onMounted resets a store whose index is past the
 * last question, so a pre-finished fixture would be wiped before the first
 * assertion.
 */
const completeQuiz = async (wrapper: VueWrapper) => {
  for (let i = 0; i < baumannQuiz.length; i += 1) {
    wrapper.findComponent(QuestionCard).vm.$emit('answer', { points: 0, optionIndex: 0 })
    await wrapper.vm.$nextTick()
  }
  vi.advanceTimersByTime(1400)
  await flushPromises()
}

const saveButton = (wrapper: VueWrapper) =>
  wrapper.findAll('button').find((b) => b.text().includes('Save Skin Profile'))!

const lastToast = () => toasts.value[toasts.value.length - 1]

describe('src/views/SkinQuizView.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    localStorage.clear()
    toasts.value.splice(0)
    vi.mocked(saveSkinType).mockResolvedValue({})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('saveAndContinue()', () => {
    it('saves the computed type and the live scores the quiz produced', async () => {
      const { wrapper } = await mountQuiz()
      await completeQuiz(wrapper)

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      // Read from the store at save time, not captured earlier: every answer
      // scored zero, which resolves to DRNT.
      expect(saveSkinType).toHaveBeenCalledWith('DRNT', ZERO_SCORES)
    })

    it('records the new type on the session and marks the quiz complete', async () => {
      const { wrapper, auth } = await mountQuiz()
      await completeQuiz(wrapper)

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(auth.user.skin_type).toBe('DRNT')
      expect(localStorage.getItem('hasCompletedQuiz')).toBe('true')
      expect(lastToast()!.type).toBe('success')
    })

    it('returns the user to the page the guard pulled them away from', async () => {
      const { wrapper, router } = await mountQuiz('/quiz?redirect=/profile')
      const push = vi.spyOn(router, 'push')
      await completeQuiz(wrapper)

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(push).toHaveBeenCalledWith('/profile')
    })

    it('falls back to home when no redirect was carried', async () => {
      const { wrapper, router } = await mountQuiz('/quiz')
      const push = vi.spyOn(router, 'push')
      await completeQuiz(wrapper)

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(push).toHaveBeenCalledWith('/')
    })

    it('closes the LINE in-app browser instead of navigating, when running inside it', async () => {
      // The only place in the codebase that touches liff. Inside the LINE
      // client there is no app to navigate back to - the quiz is the whole
      // webview - so a router.push would leave the user staring at a page
      // behind a window that should have closed.
      const closeWindow = vi.fn()
      vi.stubGlobal('liff', { closeWindow })
      const { wrapper, router } = await mountQuiz('/quiz?redirect=/profile')
      const push = vi.spyOn(router, 'push')
      await completeQuiz(wrapper)

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(closeWindow).toHaveBeenCalledTimes(1)
      expect(push).not.toHaveBeenCalled()
      // The save itself still happened; only the exit differs.
      expect(saveSkinType).toHaveBeenCalledWith('DRNT', ZERO_SCORES)
    })

    it('reports a failed save without recording the type anywhere', async () => {
      vi.mocked(saveSkinType).mockRejectedValue(new Error('network down'))
      const { wrapper, router, auth } = await mountQuiz()
      const push = vi.spyOn(router, 'push')
      await completeQuiz(wrapper)

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(lastToast()!.message).toBe('Failed to save to database. Please try again.')
      expect(lastToast()!.type).toBe('error')
      // None of the three writes may happen on a failed save, or the app would
      // believe the user has a profile the backend never stored.
      expect(auth.user.skin_type).toBe('OSPW')
      expect(localStorage.getItem('hasCompletedQuiz')).toBeNull()
      expect(push).not.toHaveBeenCalled()
    })

    it('leaves the result on screen after a failed save, so it can be retried', async () => {
      vi.mocked(saveSkinType).mockRejectedValue(new Error('network down'))
      const { wrapper } = await mountQuiz()
      await completeQuiz(wrapper)

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      // Sixteen questions of work. Unmounting the dashboard on a transport
      // failure would discard all of it and offer no way back to the answer.
      const dashboard = wrapper.findComponent(QuizResultDashboard)
      expect(dashboard.exists()).toBe(true)
      expect(dashboard.props('skinType')).toBe('DRNT')
      expect(saveButton(wrapper).exists()).toBe(true)
    })
  })

  describe('executeCancel()', () => {
    it('asks for confirmation rather than discarding the answers on the first click', async () => {
      const { wrapper } = await mountQuiz()

      expect(wrapper.findComponent(ConfirmCancelModal).exists()).toBe(false)
      wrapper.findComponent(QuestionCard).vm.$emit('cancel')
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(ConfirmCancelModal).exists()).toBe(true)
    })

    it('keeps the answers when the confirmation is dismissed', async () => {
      const { wrapper } = await mountQuiz()
      wrapper.findComponent(QuestionCard).vm.$emit('answer', { points: 4, optionIndex: 1 })
      await wrapper.vm.$nextTick()
      wrapper.findComponent(QuestionCard).vm.$emit('cancel')
      await wrapper.vm.$nextTick()

      wrapper.findComponent(ConfirmCancelModal).vm.$emit('cancel')
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(ConfirmCancelModal).exists()).toBe(false)
      // Still on question two, with the first answer intact.
      expect(wrapper.findComponent(QuestionCard).props('currentStep')).toBe(2)
    })

    it('clears the quiz and leaves for home once cancelling is confirmed', async () => {
      const { wrapper, router } = await mountQuiz()
      const push = vi.spyOn(router, 'push')
      wrapper.findComponent(QuestionCard).vm.$emit('answer', { points: 4, optionIndex: 1 })
      await wrapper.vm.$nextTick()
      wrapper.findComponent(QuestionCard).vm.$emit('cancel')
      await wrapper.vm.$nextTick()

      wrapper.findComponent(ConfirmCancelModal).vm.$emit('confirm')
      await flushPromises()

      // Back to question one: resetQuiz ran before the navigation, so a user who
      // re-enters the quiz starts clean rather than mid-way through the answers
      // they just abandoned.
      expect(wrapper.findComponent(QuestionCard).props('currentStep')).toBe(1)
      expect(push).toHaveBeenCalledWith('/')
    })
  })
})
