import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

vi.mock('../../api/quizapi', () => ({
  saveSkinType: vi.fn(),
}))
// Used only by "I already know my type" on the start screen.
vi.mock('../../api/authApi', () => ({
  updateUserSkinType: vi.fn(),
}))

import { saveSkinType } from '../../api/quizapi'
import { updateUserSkinType } from '../../api/authApi'
import QuizStart from '../../components/Quiz/QuizStart.vue'
import QuizFrame from '../../components/Quiz/QuizFrame.vue'
import QuizResult from '../../components/Quiz/QuizResult.vue'
import ConfirmCancelModal from '../../components/Shared/ConfirmCancelModal.vue'
import { useToast } from '../../composables/useToast'
import {
  ALL_ONES_SCORES,
  P,
  answer,
  begin,
  buttonByText,
  click,
  mountQuiz,
  runQuiz,
} from '../fixtures/quizView'

// Feature #2 - Take skinquiz. Saving and leaving the quiz. The steps of the
// quiz itself (start screen, answering, part complete, result) are covered in
// SkinQuizFlow.spec.ts, so that these two groups keep their place in the
// Test Record.

const { toasts } = useToast()

const lastToast = () => toasts.value[toasts.value.length - 1]

describe('src/views/SkinQuizView.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    localStorage.clear()
    toasts.value.splice(0)
    vi.mocked(saveSkinType).mockResolvedValue({})
    vi.mocked(updateUserSkinType).mockResolvedValue({})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('saveAndContinue()', () => {
    it('saves the computed type with each part average, its counted answers and version 2', async () => {
      const { wrapper } = await mountQuiz()
      await runQuiz(wrapper)

      await click(wrapper, 'Save my skin type')

      expect(saveSkinType).toHaveBeenCalledWith('DRNT', ALL_ONES_SCORES)
    })

    it('records the new type on the session and marks the quiz complete', async () => {
      const { wrapper, auth } = await mountQuiz()
      await runQuiz(wrapper)

      await click(wrapper, 'Save my skin type')

      expect(auth.user.skin_type).toBe('DRNT')
      expect(localStorage.getItem('hasCompletedQuiz')).toBe('true')
      expect(lastToast()!.type).toBe('success')
    })

    it('returns the user to the page the guard pulled them away from', async () => {
      const { wrapper, router } = await mountQuiz('/quiz?redirect=/shelf')
      const push = vi.spyOn(router, 'push')
      await runQuiz(wrapper)

      await click(wrapper, 'Save my skin type')

      expect(push).toHaveBeenCalledWith('/shelf')
    })

    it('falls back to home when no redirect was carried', async () => {
      const { wrapper, router } = await mountQuiz('/quiz')
      const push = vi.spyOn(router, 'push')
      await runQuiz(wrapper)

      await click(wrapper, 'Save my skin type')

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
      await runQuiz(wrapper)

      await click(wrapper, 'Save my skin type')

      expect(closeWindow).toHaveBeenCalledTimes(1)
      expect(push).not.toHaveBeenCalled()
      expect(saveSkinType).toHaveBeenCalledWith('DRNT', ALL_ONES_SCORES)
    })

    it('reports a failed save without recording the type anywhere', async () => {
      vi.mocked(saveSkinType).mockRejectedValue(new Error('network down'))
      const { wrapper, router, auth } = await mountQuiz()
      const push = vi.spyOn(router, 'push')
      await runQuiz(wrapper)

      await click(wrapper, 'Save my skin type')

      expect(lastToast()!.message).toBe('Failed to save to database. Please try again.')
      expect(lastToast()!.type).toBe('error')
      expect(auth.user.skin_type).toBe('OSPW')
      expect(localStorage.getItem('hasCompletedQuiz')).toBeNull()
      expect(push).not.toHaveBeenCalled()
    })

    it('leaves the result on screen after a failed save, so it can be retried', async () => {
      vi.mocked(saveSkinType).mockRejectedValue(new Error('network down'))
      const { wrapper } = await mountQuiz()
      await runQuiz(wrapper)

      await click(wrapper, 'Save my skin type')

      const result = wrapper.findComponent(QuizResult)
      expect(result.exists()).toBe(true)
      expect(result.props('skinType')).toBe('DRNT')
      expect(buttonByText(wrapper, 'Save my skin type')).toBeTruthy()
    })

    it('never sends the "About you" answer with the save', async () => {
      const { wrapper } = await mountQuiz()
      await runQuiz(wrapper, () => P(1), 'female')

      await click(wrapper, 'Save my skin type')

      const sent = JSON.stringify(vi.mocked(saveSkinType).mock.calls)
      expect(sent).not.toContain('female')
      expect(sent).not.toContain('sex')
    })
  })

  describe('executeCancel()', () => {
    it('asks for confirmation rather than discarding the answers on the first click', async () => {
      const { wrapper } = await mountQuiz()
      await begin(wrapper)
      await answer(wrapper, P(4))

      expect(wrapper.findComponent(ConfirmCancelModal).exists()).toBe(false)
      wrapper.findComponent(QuizFrame).vm.$emit('cancel')
      await flushPromises()

      expect(wrapper.findComponent(ConfirmCancelModal).exists()).toBe(true)
    })

    it('keeps the answers when the confirmation is dismissed', async () => {
      const { wrapper, store } = await mountQuiz()
      await begin(wrapper)
      await answer(wrapper, P(4))
      wrapper.findComponent(QuizFrame).vm.$emit('cancel')
      await flushPromises()

      wrapper.findComponent(ConfirmCancelModal).vm.$emit('cancel')
      await flushPromises()

      expect(wrapper.findComponent(ConfirmCancelModal).exists()).toBe(false)
      expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-2' })
      expect(store.answers['hyd-1']).toEqual(P(4))
    })

    it('clears the quiz and leaves for home once cancelling is confirmed', async () => {
      const { wrapper, router, store } = await mountQuiz()
      const push = vi.spyOn(router, 'push')
      await begin(wrapper)
      await answer(wrapper, P(4))
      wrapper.findComponent(QuizFrame).vm.$emit('cancel')
      await flushPromises()

      wrapper.findComponent(ConfirmCancelModal).vm.$emit('confirm')
      await flushPromises()

      expect(store.step).toEqual({ kind: 'start' })
      expect(store.answers).toEqual({})
      expect(store.sex).toBeNull()
      expect(push).toHaveBeenCalledWith('/')
    })

    it('leaves straight away from the start screen, where there is nothing to lose', async () => {
      const { wrapper, router } = await mountQuiz()
      const push = vi.spyOn(router, 'push')

      await wrapper.find('button[aria-label="Close the quiz"]').trigger('click')
      await flushPromises()

      expect(wrapper.findComponent(ConfirmCancelModal).exists()).toBe(false)
      expect(push).toHaveBeenCalledWith('/')
    })

    it('offers a first-time user (no skin type yet) no way out, on the start screen or in the quiz', async () => {
      const { wrapper } = await mountQuiz('/quiz', null)

      expect(wrapper.findComponent(QuizStart).props('showCancel')).toBe(false)
      expect(wrapper.find('button[aria-label="Close the quiz"]').exists()).toBe(false)
      expect(buttonByText(wrapper, 'Leave the quiz')).toBeUndefined()
      await begin(wrapper)

      expect(wrapper.findComponent(QuizFrame).props('showCancel')).toBe(false)
      expect(wrapper.find('button[aria-label="Leave the quiz"]').exists()).toBe(false)
      expect(buttonByText(wrapper, 'Leave the quiz')).toBeUndefined()
    })
  })
})
