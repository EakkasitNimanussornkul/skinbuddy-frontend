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
import QuizFrame from '../../components/Quiz/QuizFrame.vue'
import QuizQuestionStep from '../../components/Quiz/QuizQuestionStep.vue'
import QuizSelfChoiceStep from '../../components/Quiz/QuizSelfChoiceStep.vue'
import QuizPartComplete from '../../components/Quiz/QuizPartComplete.vue'
import { useQuizStore } from '../../stores/quizStore'
import { useToast } from '../../composables/useToast'
import { SELF_CHOICE_QUESTIONS, type QuizAxis } from '../../data/quizQuestions'
import { AXES, NA, backupIds, coreIds } from '../fixtures/quizAnswers'
import { P, UNSURE, answer, begin, buttonByText, chooseLetter, click, mountQuiz, runQuiz } from '../fixtures/quizView'

// Feature #2 - Take skinquiz. The "your choice" question in SkinQuizView: the
// owner-approved last resort for a part where nothing counted after its core
// questions and both extra questions. It shows a neutral banner, the heading
// and two rows with no skip buttons; the pick decides the part's letter, and
// the part-complete screen and the result show it as the user's choice.
//
// Every it() string is phrased as the expected result, because the Test Record
// generator lifts it verbatim into the "Expected Unit Output" field.
//
// The shared test setup reports prefers-reduced-motion, so an answer moves on
// at once; the case about the pause overrides matchMedia for its run. VTU
// stubs <Transition>, so the motion case reads the transition's name and the
// step's key, never what moves on screen.

const { toasts } = useToast()

/** A user who has not asked for reduced motion, for the length of one case. */
const withMotion = () => {
  const original = window.matchMedia
  window.matchMedia = ((query: string) => ({ ...original(query), matches: false })) as typeof window.matchMedia
  return () => {
    window.matchMedia = original
  }
}

type Store = ReturnType<typeof useQuizStore>

/** Every question of a part skipped, and the quiz on that part's "your choice" step. */
const onChoiceStep = (axis: QuizAxis) => (store: Store) => {
  store.chooseSex('female')
  for (const id of [...coreIds(axis, 'female'), ...backupIds(axis, 'female').slice(0, 2)]) store.answerQuestion(id, NA)
  store.step = { kind: 'choice', axis }
}

/** From the start, skip all six questions of part one, landing on its "your choice" step. */
const skipPartOne = async (wrapper: VueWrapper) => {
  await begin(wrapper)
  for (let i = 0; i < 6; i += 1) await answer(wrapper, UNSURE)
}

const stepTransitionNames = (wrapper: VueWrapper) =>
  wrapper.findAll('transition-stub[mode="out-in"]').map((t) => t.attributes('name'))

describe('src/views/SkinQuizView.vue ("your choice" question)', () => {
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

  describe('"your choice" question on screen', () => {
    it('comes after both extra questions are skipped, with the neutral "One last question for this part" banner and the heading', async () => {
      const { wrapper, store } = await mountQuiz()
      await skipPartOne(wrapper)

      expect(store.step).toEqual({ kind: 'choice', axis: 'hydration' })
      const banner = wrapper.get('[data-testid="choice-banner"]')
      expect(banner.text()).toContain('One last question for this part')
      expect(banner.text()).toContain(
        'None of your answers here counted, so tell us which sounds more like you. Your result will show this as your choice.',
      )
      expect(banner.classes().join(' ')).not.toMatch(/FFF4DB|amber/)
      expect(wrapper.get('h1').text()).toBe('Which sounds more like your skin, most days?')
      expect(wrapper.find('[data-testid="backup-banner"]').exists()).toBe(false)
    })

    it('offers two rows to pick from and no skip buttons', async () => {
      const { wrapper } = await mountQuiz()
      await skipPartOne(wrapper)

      const step = wrapper.getComponent(QuizSelfChoiceStep)
      expect(step.findAll('[role="radio"]').map((r) => r.text())).toEqual(['Oily or shiny', 'Dry or tight'])
      expect(step.findAll('button').length).toBe(2)
      expect(step.find('[aria-pressed]').exists()).toBe(false)
      expect(step.text()).not.toContain("I'm not sure")
    })

    it('shows each part\'s two rows in order, and gives the part the letter of the row tapped', async () => {
      for (const axis of AXES) {
        for (const [i, option] of SELF_CHOICE_QUESTIONS[axis].options.entries()) {
          const { wrapper, store } = await mountQuiz('/quiz', 'OSPW', onChoiceStep(axis))
          const rows = wrapper.findAll('[role="radio"]')
          expect(rows.map((r) => r.text())).toEqual(SELF_CHOICE_QUESTIONS[axis].options.map((o) => o.text))

          await rows[i]!.trigger('click')
          await flushPromises()

          expect(store.answers[SELF_CHOICE_QUESTIONS[axis].id]).toEqual({ kind: 'self_choice', letter: option.letter })
          expect(store.axisResults[axis]).toMatchObject({ letter: option.letter, choice: true })
          expect(store.step).toEqual({ kind: 'partDone', axis })
          wrapper.unmount()
        }
      }
    })

    it('shows the picked row selected when the user comes back to it', async () => {
      const { wrapper, store } = await mountQuiz()
      await skipPartOne(wrapper)
      await chooseLetter(wrapper, 'D')

      wrapper.findComponent(QuizFrame).vm.$emit('back')
      await flushPromises()

      expect(store.step).toEqual({ kind: 'choice', axis: 'hydration' })
      expect(wrapper.get('[role="radio"][aria-checked="true"]').text()).toBe('Dry or tight')
    })

    it('marks its progress segment like an extra question, and names it "One last question" in the desktop list of parts', async () => {
      const { wrapper } = await mountQuiz()
      await skipPartOne(wrapper)

      const segments = wrapper.findAll('[data-segment]').map((s) => s.attributes('data-segment'))
      expect(segments).toEqual(['answered', 'answered', 'answered', 'answered', 'backup', 'backup', 'backup'])
      const spans = wrapper.get('nav[aria-label="Quiz parts"] [aria-current="step"]').findAll('span')
      expect(spans[spans.length - 1]!.text()).toBe('One last question')
      expect(wrapper.findComponent(QuizFrame).props('label')).toBe('Part 1 of 4')
    })

    it('moves on 220 ms after a row is tapped, and slides in and out like the other steps, keyed on its part', async () => {
      const restore = withMotion()
      try {
        const { wrapper, store } = await mountQuiz('/quiz', 'OSPW', onChoiceStep('aging'))
        expect(wrapper.findComponent(QuizSelfChoiceStep).vm.$.vnode.key).toBe('choice-aging')

        await wrapper.findAll('[role="radio"]')[1]!.trigger('click')
        vi.advanceTimersByTime(219)
        await flushPromises()
        expect(store.step).toEqual({ kind: 'choice', axis: 'aging' })

        vi.advanceTimersByTime(1)
        await flushPromises()
        expect(store.step).toEqual({ kind: 'partDone', axis: 'aging' })
        expect(stepTransitionNames(wrapper)).toEqual(['quiz-step-forward', 'quiz-step-forward'])
      } finally {
        restore()
      }
    })
  })

  describe('part complete and result after "your choice"', () => {
    it('shows "You chose oily", "Close call · your choice" and the marker at the centre on the part-complete screen', async () => {
      const { wrapper } = await mountQuiz()
      await skipPartOne(wrapper)
      await chooseLetter(wrapper, 'O')

      const done = wrapper.getComponent(QuizPartComplete)
      expect(done.get('[data-testid="lean-text"]').text()).toBe('You chose oily')
      const chip = done.get('[data-testid="confidence-chip"]')
      expect(chip.text()).toBe('Close call · your choice')
      expect(chip.classes()).toContain('bg-[#FFF4DB]')
      expect(done.get('[data-testid="lean-bar"]').attributes('data-position')).toBe('50')
      expect((done.get('.quiz-lean-marker').element as HTMLElement).style.left).toBe('50%')
      expect(done.find('.quiz-lean-fill').exists()).toBe(false)
      expect(done.text()).toContain('None of your answers here counted, so O is the one you chose.')
      expect(done.text()).not.toContain('placeholder')
    })

    it('shows the part on the result as the user\'s choice, a close call with "Retake this part" still offered', async () => {
      const { wrapper } = await mountQuiz()
      await runQuiz(wrapper, (id) => (id.startsWith('sen') ? UNSURE : P(1)), 'female', () => 'S')

      expect(wrapper.get('[data-testid="result-code"]').text()).toBe('DSNT')
      const card = wrapper.get('[data-testid="axis-card-sensitivity"]')
      expect(card.get('[data-testid="choice-text"]').text()).toBe('You chose sensitive')
      expect(card.text()).toContain('Close call · your choice')
      expect(card.text()).toContain('Retake this part')
      expect(card.text()).not.toContain("couldn't tell")
      expect(wrapper.find('[data-testid="axis-card-hydration"] [data-testid="choice-text"]').exists()).toBe(false)
    })

    it('saves sensitivity_choice: 1, the threshold and 0 counted for the chosen part, and no other _choice key', async () => {
      const { wrapper } = await mountQuiz()
      await runQuiz(wrapper, (id) => (id.startsWith('sen') ? UNSURE : P(1)), 'female', () => 'R')

      await click(wrapper, 'Save my skin type')

      expect(saveSkinType).toHaveBeenCalledWith('DRNT', {
        hydration: 1,
        sensitivity: 2.5,
        pigmentation: 1,
        aging: 1,
        hydration_n: 4,
        sensitivity_n: 0,
        pigmentation_n: 4,
        aging_n: 4,
        sensitivity_choice: 1,
        version: 2,
      })
    })
  })

  describe('back and retake with "your choice"', () => {
    it('goes back from "your choice" to the second extra question, with its skip still selected', async () => {
      const { wrapper, store } = await mountQuiz()
      await skipPartOne(wrapper)

      wrapper.findComponent(QuizFrame).vm.$emit('back')
      await flushPromises()

      expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-b2' })
      expect(wrapper.findComponent(QuizQuestionStep).props('selected')).toEqual(UNSURE)
    })

    it('skips "your choice" once the second extra question is changed to an answer that counts', async () => {
      const { wrapper, store } = await mountQuiz()
      await skipPartOne(wrapper)
      await chooseLetter(wrapper, 'D')
      wrapper.findComponent(QuizFrame).vm.$emit('back')
      await flushPromises()
      wrapper.findComponent(QuizFrame).vm.$emit('back')
      await flushPromises()
      expect(store.step).toEqual({ kind: 'question', axis: 'hydration', questionId: 'hyd-b2' })

      await answer(wrapper, P(4))

      expect(store.step).toEqual({ kind: 'partDone', axis: 'hydration' })
      expect(wrapper.get('[data-testid="lean-text"]').text()).toBe('Leaning oily')
      expect(wrapper.get('[data-testid="confidence-chip"]').text()).toBe('Close call · 1 answer')
    })

    it('clears the pick on "Retake this part", asking "your choice" again with no row selected if nothing counts again', async () => {
      const { wrapper, store } = await mountQuiz()
      await runQuiz(wrapper, (id) => (id.startsWith('hyd') ? UNSURE : P(1)), 'female', () => 'O')
      expect(wrapper.get('[data-testid="result-code"]').text()).toBe('ORNT')

      await click(wrapper, 'Retake this part')
      while (store.step.kind === 'question') await answer(wrapper, UNSURE)

      expect(store.step).toEqual({ kind: 'choice', axis: 'hydration' })
      expect(wrapper.find('[role="radio"][aria-checked="true"]').exists()).toBe(false)
      await chooseLetter(wrapper, 'D')
      await click(wrapper, 'Continue')
      expect(wrapper.get('[data-testid="result-code"]').text()).toBe('DRNT')
      expect(buttonByText(wrapper, 'Retake this part')).toBeDefined()
    })
  })
})
