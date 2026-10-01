import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

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
import QuizQuestionStep from '../../components/Quiz/QuizQuestionStep.vue'
import QuizPartComplete from '../../components/Quiz/QuizPartComplete.vue'
import QuizResult from '../../components/Quiz/QuizResult.vue'
import QuizResultDashboard from '../../components/Quiz/QuizResultDashboard.vue'
import ExpressSkinSelectorModal from '../../components/Quiz/ExpressSkinSelectorModal.vue'
import { useToast } from '../../composables/useToast'
import {
  ALL_ONES_SCORES,
  P,
  UNSURE,
  answer,
  begin,
  buttonByText,
  click,
  mountQuiz,
  runQuiz,
} from '../fixtures/quizView'

// Feature #2 - Take skinquiz. The quiz's own steps in SkinQuizView: the start
// screen, answering, the part-complete screen, the result, and the motion
// between them. Saving and leaving stay in SkinQuizView.spec.ts.
//
// Every it() string is phrased as the expected result, because the Test Record
// generator lifts it verbatim into the "Expected Unit Output" field.
//
// The shared test setup reports prefers-reduced-motion, so an answer moves on
// at once; the cases about the 220 ms pause override matchMedia for their run.
// VTU stubs <Transition>, so the motion cases read the transition's name and
// each step's key, never what moves on screen.

const { toasts } = useToast()

const lastToast = () => toasts.value[toasts.value.length - 1]

/** A user who has not asked for reduced motion, for the length of one case. */
const withMotion = () => {
  const original = window.matchMedia
  window.matchMedia = ((query: string) => ({ ...original(query), matches: false })) as typeof window.matchMedia
  return () => {
    window.matchMedia = original
  }
}

/** The names on the two step transitions: the screen swap, then the step inside the frame. */
const stepTransitionNames = (wrapper: VueWrapper) =>
  wrapper.findAll('transition-stub[mode="out-in"]').map((t) => t.attributes('name'))

describe('src/views/SkinQuizView.vue (quiz steps)', () => {
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

  describe('start screen', () => {
    it('opens on the start screen, and "Start the quiz" goes to "About you"', async () => {
      const { wrapper, store } = await mountQuiz()
      expect(wrapper.findComponent(QuizStart).exists()).toBe(true)

      await click(wrapper, 'Start the quiz')

      expect(store.step).toEqual({ kind: 'about' })
      expect(wrapper.text()).toContain('Which best describes your biological sex?')
    })

    it('starts over when it is opened on a finished quiz', async () => {
      const { store } = await mountQuiz('/quiz', 'OSPW', (s) => {
        s.chooseSex('male')
        s.answerQuestion('hyd-1', P(4))
        s.step = { kind: 'result' }
      })

      expect(store.step).toEqual({ kind: 'start' })
      expect(store.answers).toEqual({})
      expect(store.sex).toBeNull()
    })

    it('resumes a quiz left part-way, at the same question', async () => {
      const { store, wrapper } = await mountQuiz('/quiz', 'OSPW', (s) => {
        s.chooseSex('female')
        s.answerQuestion('hyd-1', P(4))
        s.step = { kind: 'question', axis: 'hydration', questionId: 'hyd-2' }
      })

      expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-2' })
      expect(wrapper.findComponent(QuizQuestionStep).props('question').id).toBe('hyd-2')
    })

    it('opens the express selector from "I already know my type", with the modal contract unchanged', async () => {
      const { wrapper } = await mountQuiz()
      const modal = () => wrapper.findComponent(ExpressSkinSelectorModal)
      expect(modal().props('isOpen')).toBe(false)

      await click(wrapper, 'I already know my type')

      expect(modal().props()).toEqual({ isOpen: true, isSaving: false })
      modal().vm.$emit('close')
      await flushPromises()
      expect(modal().props('isOpen')).toBe(false)
    })

    it('saves a type picked in the express selector and leaves the way a saved quiz does', async () => {
      const { wrapper, router, auth } = await mountQuiz('/quiz?redirect=/shelf')
      const push = vi.spyOn(router, 'push')
      await click(wrapper, 'I already know my type')

      wrapper.findComponent(ExpressSkinSelectorModal).vm.$emit('confirm', 'DSNT')
      await flushPromises()

      expect(updateUserSkinType).toHaveBeenCalledWith('DSNT')
      expect(saveSkinType).not.toHaveBeenCalled()
      expect(auth.user.skin_type).toBe('DSNT')
      expect(wrapper.findComponent(ExpressSkinSelectorModal).props('isOpen')).toBe(false)
      expect(push).toHaveBeenCalledWith('/shelf')
    })

    it('keeps the express selector open and the session unchanged when that save fails', async () => {
      vi.mocked(updateUserSkinType).mockRejectedValue(new Error('network down'))
      const { wrapper, router, auth } = await mountQuiz()
      const push = vi.spyOn(router, 'push')
      await click(wrapper, 'I already know my type')

      wrapper.findComponent(ExpressSkinSelectorModal).vm.$emit('confirm', 'DSNT')
      await flushPromises()

      expect(auth.user.skin_type).toBe('OSPW')
      expect(wrapper.findComponent(ExpressSkinSelectorModal).props('isOpen')).toBe(true)
      expect(lastToast()!.type).toBe('error')
      expect(push).not.toHaveBeenCalled()
    })

    it('lists the four parts in order, each with its pair of letters in words', async () => {
      const { wrapper } = await mountQuiz()

      // Number, part name, then the pair, each in its own element.
      const rows = wrapper
        .findAll('[data-testid="start-part"]')
        .map((r) => r.findAll('span').filter((s) => s.findAll('span').length === 0).map((s) => s.text()))

      expect(rows).toEqual([
        ['1', 'Oil and moisture', 'Oily or dry'],
        ['2', 'Reactions', 'Sensitive or resistant'],
        ['3', 'Dark spots', 'Pigmented or non-pigmented'],
        ['4', 'Lines and firmness', 'Wrinkle-prone or tight'],
      ])
    })

    it('offers the desktop "Leave the quiz" button to a returning user, which leaves like the close button', async () => {
      const { wrapper, router } = await mountQuiz()
      const push = vi.spyOn(router, 'push')

      await click(wrapper, 'Leave the quiz')

      expect(push).toHaveBeenCalledWith('/')
    })
  })

  describe('answering', () => {
    it('shows a tapped answer selected and moves on 220 ms later', async () => {
      const restore = withMotion()
      try {
        const { wrapper, store } = await mountQuiz()
        await click(wrapper, 'Start the quiz')
        await click(wrapper, 'Female')
        vi.advanceTimersByTime(220)
        await flushPromises()
        expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-1' })

        await answer(wrapper, P(2))
        expect(wrapper.find('[role="radio"][aria-checked="true"]').text()).toBe('Comfortable, with no shine')
        vi.advanceTimersByTime(219)
        await flushPromises()
        expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-1' })

        vi.advanceTimersByTime(1)
        await flushPromises()
        expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-2' })
      } finally {
        restore()
      }
    })

    it('moves on once, not twice, when a second answer is tapped within the 220 ms', async () => {
      const restore = withMotion()
      try {
        const { wrapper, store } = await mountQuiz()
        store.start()
        store.chooseSex('female')
        store.next()
        await flushPromises()

        await answer(wrapper, P(2))
        vi.advanceTimersByTime(100)
        await answer(wrapper, P(3))
        vi.advanceTimersByTime(220)
        await flushPromises()

        expect(store.answers['hyd-1']).toEqual(P(3))
        expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-2' })
      } finally {
        restore()
      }
    })

    it('moves on at once when the user prefers reduced motion', async () => {
      const { wrapper, store } = await mountQuiz()
      await begin(wrapper)

      await answer(wrapper, P(2))

      expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-2' })
    })

    it('shows the earlier answer still selected after going back', async () => {
      const { wrapper } = await mountQuiz()
      await begin(wrapper)
      await answer(wrapper, P(4))

      wrapper.findComponent(QuizFrame).vm.$emit('back')
      await flushPromises()

      const step = wrapper.findComponent(QuizQuestionStep)
      expect(step.props('question').id).toBe('hyd-1')
      expect(step.props('selected')).toEqual(P(4))
      expect(wrapper.find('[role="radio"][aria-checked="true"]').text()).toBe('Shiny across most of my face')
    })

    it('shows a chosen skip selected after going back', async () => {
      const { wrapper } = await mountQuiz()
      await begin(wrapper)
      await answer(wrapper, P(4))
      await answer(wrapper, P(4))
      await click(wrapper, "I don't wear any of these")

      wrapper.findComponent(QuizFrame).vm.$emit('back')
      await flushPromises()

      expect(buttonByText(wrapper, "I don't wear any of these")!.attributes('aria-pressed')).toBe('true')
      expect(buttonByText(wrapper, "I'm not sure")!.attributes('aria-pressed')).toBe('false')
    })

    it('asks the questions worded for the sex picked in "About you"', async () => {
      const { wrapper, store } = await mountQuiz()
      await begin(wrapper, 'male')
      expect(store.sex).toBe('male')
      for (let i = 0; i < 4; i += 1) await answer(wrapper, P(1))
      await click(wrapper, 'Continue')

      await answer(wrapper, P(1))

      expect(wrapper.findComponent(QuizQuestionStep).props('question').text).toContain('shaving foam')
    })

    it('goes back to the earlier "About you" choice from the first question', async () => {
      const { wrapper } = await mountQuiz()
      await begin(wrapper, 'unspecified')

      wrapper.findComponent(QuizFrame).vm.$emit('back')
      await flushPromises()

      expect(buttonByText(wrapper, 'Prefer not to say')!.attributes('aria-checked')).toBe('true')
    })
  })

  describe('part complete screen', () => {
    it('shows the part name, its lean, "Clear" with the counted answers, and the next part', async () => {
      const { wrapper } = await mountQuiz()
      await begin(wrapper)
      for (const p of [4, 4, 3, 4] as const) await answer(wrapper, P(p))

      const done = wrapper.findComponent(QuizPartComplete)
      expect(done.text()).toContain('Oil and moisture')
      expect(done.find('[data-testid="lean-text"]').text()).toBe('Leaning oily')
      expect(done.find('[data-testid="confidence-chip"]').text()).toBe('Clear · 4 answers')
      expect(done.find('[data-testid="left-out-chip"]').exists()).toBe(false)
      expect(done.find('[data-testid="next-part"]').text()).toBe('Reactions: redness, stinging, itching')
      // (3.75 - 1) / 3 of the way from Dry to Oily.
      expect(done.find('[data-testid="lean-bar"]').attributes('data-position')).toBe('92')
    })

    it('shows "Close call", how many answers were left out, and the marker at the average', async () => {
      const { wrapper } = await mountQuiz()
      await begin(wrapper)
      // One counted core answer, then a backup that ties it at 2.5, then a second.
      for (const a of [P(3), UNSURE, UNSURE, UNSURE, P(2), P(3)]) await answer(wrapper, a)

      const done = wrapper.findComponent(QuizPartComplete)
      expect(done.find('[data-testid="lean-text"]').text()).toBe('Leaning oily')
      expect(done.find('[data-testid="confidence-chip"]').text()).toBe('Close call · 3 answers')
      expect(done.find('[data-testid="left-out-chip"]').text()).toBe('3 left out')
      expect(done.find('[data-testid="lean-bar"]').attributes('data-position')).toBe('56')
    })

    it('says it could not tell a part where no answer counted', async () => {
      const { wrapper } = await mountQuiz()
      await begin(wrapper)
      for (let i = 0; i < 6; i += 1) await answer(wrapper, UNSURE)

      const done = wrapper.findComponent(QuizPartComplete)
      expect(done.find('[data-testid="lean-text"]').text()).toBe("We couldn't tell this part from your answers")
      expect(done.find('[data-testid="confidence-chip"]').text()).toBe('Close call · 0 answers')
      expect(done.find('[data-testid="left-out-chip"]').text()).toBe('6 left out')
    })

    it('names the result as next after the last part', async () => {
      const { wrapper, store } = await mountQuiz()
      store.step = { kind: 'partDone', axis: 'aging' }
      await flushPromises()

      expect(wrapper.findComponent(QuizPartComplete).find('[data-testid="next-part"]').text()).toBe('Your result')
    })

    it('shows the extra-question banner with its reason, and an amber segment, on a backup question', async () => {
      const { wrapper } = await mountQuiz()
      await begin(wrapper)
      for (const a of [P(3), UNSURE, UNSURE, UNSURE]) await answer(wrapper, a)

      const banner = wrapper.find('[data-testid="backup-banner"]')
      expect(banner.exists()).toBe(true)
      expect(banner.text()).toContain('One extra question')
      expect(banner.text()).toContain('Only one of your answers in this part counted')
      expect(wrapper.findAll('[data-segment="backup"]')).toHaveLength(1)
    })

    it('shows no extra-question banner on a core question', async () => {
      const { wrapper } = await mountQuiz()
      await begin(wrapper)

      expect(wrapper.find('[data-testid="backup-banner"]').exists()).toBe(false)
    })
  })

  describe('result screen', () => {
    it('shows the code, its four letters in words, a card per part, and the profile guidance', async () => {
      const { wrapper } = await mountQuiz()
      await runQuiz(wrapper, (id) => (id.startsWith('hyd') || id.startsWith('pig') ? P(4) : P(1)))

      expect(wrapper.find('[data-testid="result-code"]').text()).toBe('ORPT')
      expect(wrapper.find('[data-testid="result-words"]').text()).toBe('Oily · Resistant · Pigmented · Tight')
      for (const axis of ['hydration', 'sensitivity', 'pigmentation', 'aging']) {
        expect(wrapper.find(`[data-testid="axis-card-${axis}"]`).text()).toContain('Clear · 4 answers')
      }
      expect(wrapper.findComponent(QuizResultDashboard).props('skinType')).toBe('ORPT')
      expect(wrapper.text()).toContain('not a diagnosis')
    })

    it('shows the calculating beat for 1400 ms before the result', async () => {
      const { wrapper, store } = await mountQuiz()
      store.step = { kind: 'partDone', axis: 'aging' }
      await flushPromises()
      await click(wrapper, 'Continue')

      expect(wrapper.text()).toContain('Calculating your profile...')
      expect(wrapper.findComponent(QuizResult).exists()).toBe(false)
      vi.advanceTimersByTime(1400)
      await flushPromises()
      expect(wrapper.findComponent(QuizResult).exists()).toBe(true)
    })

    it('says "We couldn\'t tell this part from your answers" for a part with no counted answers, with the NO_EVIDENCE_LETTER', async () => {
      const { wrapper } = await mountQuiz()
      await runQuiz(wrapper, (id) => (id.startsWith('hyd') ? UNSURE : P(1)))

      const card = wrapper.find('[data-testid="axis-card-hydration"]')
      expect(card.text()).toContain("We couldn't tell this part from your answers")
      expect(card.text()).toContain('Close call · 0 answers')
      expect(wrapper.find('[data-testid="result-code"]').text()).toBe('ORNT')
    })

    it('offers "Retake this part" only on close-call cards', async () => {
      const { wrapper } = await mountQuiz()
      await runQuiz(wrapper, (id) => (id.startsWith('pig') ? UNSURE : P(1)))

      expect(wrapper.find('[data-testid="axis-card-pigmentation"]').text()).toContain('Retake this part')
      expect(wrapper.find('[data-testid="axis-card-hydration"]').text()).not.toContain('Retake this part')
      expect(wrapper.findAll('button').filter((b) => b.text().includes('Retake this part'))).toHaveLength(1)
    })

    it('re-runs just the close-call part from "Retake this part", then returns to the result', async () => {
      const { wrapper, store } = await mountQuiz()
      await runQuiz(wrapper, (id) => (id.startsWith('pig') ? UNSURE : P(1)))
      expect(wrapper.find('[data-testid="result-code"]').text()).toBe('DRPT')

      await click(wrapper, 'Retake this part')
      expect(store.step).toEqual({ kind: 'question', axis: 'pigmentation', questionId: 'pig-1' })
      const asked: string[] = []
      while (store.step.kind === 'question') {
        asked.push(store.step.questionId)
        await answer(wrapper, P(1))
      }
      expect(asked).toEqual(['pig-1', 'pig-2', 'pig-3-hormone', 'pig-4'])
      await click(wrapper, 'Continue')
      vi.advanceTimersByTime(1400)
      await flushPromises()

      expect(store.step).toEqual({ kind: 'result' })
      expect(wrapper.find('[data-testid="result-code"]').text()).toBe('DRNT')
      expect(wrapper.find('[data-testid="axis-card-pigmentation"]').text()).toContain('Clear · 4 answers')
    })

    it('"See what CODE means" saves the type the same way, then opens the skin profile page', async () => {
      const { wrapper, router, auth } = await mountQuiz('/quiz?redirect=/shelf')
      const push = vi.spyOn(router, 'push')
      await runQuiz(wrapper)

      await click(wrapper, 'See what DRNT means')

      expect(saveSkinType).toHaveBeenCalledWith('DRNT', ALL_ONES_SCORES)
      expect(auth.user.skin_type).toBe('DRNT')
      expect(localStorage.getItem('hasCompletedQuiz')).toBe('true')
      expect(push).toHaveBeenCalledWith('/profile')
      expect(push).not.toHaveBeenCalledWith('/shelf')
    })

    it('"See what CODE means" opens the profile even inside the LINE browser, rather than closing it', async () => {
      const closeWindow = vi.fn()
      vi.stubGlobal('liff', { closeWindow })
      const { wrapper, router } = await mountQuiz()
      const push = vi.spyOn(router, 'push')
      await runQuiz(wrapper)

      await click(wrapper, 'See what DRNT means')

      expect(push).toHaveBeenCalledWith('/profile')
      expect(closeWindow).not.toHaveBeenCalled()
    })

    it('"See what CODE means" stays on the result when the save fails', async () => {
      vi.mocked(saveSkinType).mockRejectedValue(new Error('network down'))
      const { wrapper, router } = await mountQuiz()
      const push = vi.spyOn(router, 'push')
      await runQuiz(wrapper)

      await click(wrapper, 'See what DRNT means')

      expect(push).not.toHaveBeenCalled()
      expect(wrapper.findComponent(QuizResult).exists()).toBe(true)
      expect(lastToast()!.type).toBe('error')
    })

    it('"Retake the whole quiz" starts over with no answers and no "About you" choice kept', async () => {
      const { wrapper, store } = await mountQuiz()
      await runQuiz(wrapper)

      await click(wrapper, 'Retake the whole quiz')

      expect(store.step).toEqual({ kind: 'start' })
      expect(store.answers).toEqual({})
      expect(store.sex).toBeNull()
      expect(wrapper.findComponent(QuizStart).exists()).toBe(true)
    })

    it('never shows the "About you" answer on the result', async () => {
      const { wrapper } = await mountQuiz()
      await runQuiz(wrapper, () => P(1), 'female')

      const text = wrapper.findComponent(QuizResult).text()
      expect(text).not.toContain('Female')
      expect(text).not.toContain('Prefer not to say')
      expect(text.toLowerCase()).not.toContain('biological sex')
    })

    it('clears the answers and the "About you" choice from memory when the result is left', async () => {
      const { wrapper, store } = await mountQuiz()
      await runQuiz(wrapper)

      wrapper.unmount()

      expect(store.sex).toBeNull()
      expect(store.answers).toEqual({})
    })
  })

  describe('step transitions', () => {
    it('slides the next step in from the right when moving on, on both the screen and the step inside it', async () => {
      const { wrapper } = await mountQuiz()
      await begin(wrapper)

      await answer(wrapper, P(4))

      expect(stepTransitionNames(wrapper)).toEqual(['quiz-step-forward', 'quiz-step-forward'])
    })

    it('slides the step in from the left when going back, and from the right again on the next answer', async () => {
      const { wrapper } = await mountQuiz()
      await begin(wrapper)
      await answer(wrapper, P(4))

      wrapper.findComponent(QuizFrame).vm.$emit('back')
      await flushPromises()
      expect(stepTransitionNames(wrapper)).toEqual(['quiz-step-back', 'quiz-step-back'])

      await answer(wrapper, P(4))
      expect(stepTransitionNames(wrapper)).toEqual(['quiz-step-forward', 'quiz-step-forward'])
    })

    it('slides forward again after going back to the start screen and starting once more', async () => {
      const { wrapper } = await mountQuiz()
      await click(wrapper, 'Start the quiz')
      wrapper.findComponent(QuizFrame).vm.$emit('back')
      await flushPromises()
      expect(stepTransitionNames(wrapper)).toEqual(['quiz-step-back'])

      await click(wrapper, 'Start the quiz')

      expect(stepTransitionNames(wrapper)[0]).toBe('quiz-step-forward')
    })

    it('slides the next part in from the right from "Continue" on a part-complete screen', async () => {
      const { wrapper } = await mountQuiz()
      await begin(wrapper)
      for (const p of [4, 4, 4, 4] as const) await answer(wrapper, P(p))

      await click(wrapper, 'Continue')

      expect(stepTransitionNames(wrapper)).toEqual(['quiz-step-forward', 'quiz-step-forward'])
    })

    it('fades the result up after the calculating beat, rather than sliding it in', async () => {
      const { wrapper } = await mountQuiz()
      await runQuiz(wrapper)

      expect(stepTransitionNames(wrapper)).toEqual(['reveal'])
    })

    it('enters "Retake this part" moving forward, even after going back from a retake to the result', async () => {
      const { wrapper, store } = await mountQuiz()
      await runQuiz(wrapper, (id) => (id.startsWith('pig') ? UNSURE : P(1)))
      await click(wrapper, 'Retake this part')
      wrapper.findComponent(QuizFrame).vm.$emit('back')
      await flushPromises()
      expect(store.step).toEqual({ kind: 'result' })

      await click(wrapper, 'Retake this part')

      expect(stepTransitionNames(wrapper)).toEqual(['quiz-step-forward', 'quiz-step-forward'])
    })

    it('enters the start screen moving forward from "Retake the whole quiz", even after going back to the result', async () => {
      const { wrapper } = await mountQuiz()
      await runQuiz(wrapper, (id) => (id.startsWith('pig') ? UNSURE : P(1)))
      await click(wrapper, 'Retake this part')
      wrapper.findComponent(QuizFrame).vm.$emit('back')
      await flushPromises()

      await click(wrapper, 'Retake the whole quiz')

      expect(wrapper.findComponent(QuizStart).exists()).toBe(true)
      expect(stepTransitionNames(wrapper)).toEqual(['quiz-step-forward'])
    })

    it('keys each question on its id, so one question gives way to the next instead of being patched in place', async () => {
      const { wrapper } = await mountQuiz()
      await begin(wrapper)
      const stepKey = () => wrapper.findComponent(QuizQuestionStep).vm.$.vnode.key

      expect(stepKey()).toBe('hyd-1')
      await answer(wrapper, P(4))
      expect(stepKey()).toBe('hyd-2')
    })
  })

  describe('motion', () => {
    it('staggers the start screen\'s four part rows 60 ms apart', async () => {
      const { wrapper } = await mountQuiz()

      const delays = wrapper.findAll('[data-testid="start-part"]').map((r) => (r.element as HTMLElement).style.animationDelay)

      expect(delays).toEqual(['0ms', '60ms', '120ms', '180ms'])
    })

    it('pops the check on the answer just tapped, but not on one shown selected after going back', async () => {
      const restore = withMotion()
      try {
        const { wrapper } = await mountQuiz()
        await begin(wrapper)
        vi.advanceTimersByTime(220)
        await flushPromises()

        await wrapper.findAll('[role="radio"]')[3]!.trigger('click')
        expect(wrapper.find('[data-testid="choice-check"]').classes()).toContain('quiz-pop')
        vi.advanceTimersByTime(220)
        await flushPromises()

        wrapper.findComponent(QuizFrame).vm.$emit('back')
        await flushPromises()
        expect(wrapper.find('[data-testid="choice-check"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="choice-check"]').classes()).not.toContain('quiz-pop')
      } finally {
        restore()
      }
    })

    it('fades the result cards up one after another, each lean bar starting once its card is in', async () => {
      const { wrapper } = await mountQuiz()
      await runQuiz(wrapper)

      const cards = ['hydration', 'sensitivity', 'pigmentation', 'aging'].map((axis) => wrapper.find(`[data-testid="axis-card-${axis}"]`))
      const cardDelays = cards.map((c) => parseInt((c.element as HTMLElement).style.animationDelay, 10))
      const barDelays = cards.map((c) => parseInt((c.find('.quiz-lean-fill').element as HTMLElement).style.animationDelay, 10))

      expect(cardDelays).toEqual([200, 280, 360, 440])
      barDelays.forEach((delay, i) => expect(delay).toBeGreaterThan(cardDelays[i]!))
      expect(wrapper.find('[data-testid="result-code"]').classes()).toContain('quiz-rise')
    })
  })
})
