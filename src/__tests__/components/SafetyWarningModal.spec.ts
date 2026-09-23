import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import SafetyWarningModal from '../../components/Shelf/SafetyWarningModal.vue'
import { mergedBuffet, skinAlert } from '../fixtures/conflicts'

type Warning = { alert_type: string; severity?: string | null; message: string }

const warning = (overrides: Partial<Warning> = {}): Warning => ({
  alert_type: 'Interaction',
  severity: 'High',
  message: 'Retinol and AHA together may increase irritation.',
  ...overrides,
})

/**
 * Mount the dialogue directly.
 *
 * Both hosts stub or only inspect this component - AddProductModal stubs it
 * outright and ProductHeroSection checks its props - so until now nothing
 * rendered its own template. These cases do.
 */
const mountModal = (warnings: Warning[] = [warning()]) =>
  mount(SafetyWarningModal, { props: { warnings } })

const cards = (wrapper: VueWrapper) => wrapper.findAll('.rounded-2xl')

const badges = (wrapper: VueWrapper) =>
  wrapper.findAll('span.uppercase').map((s) => s.text())

const buttonWith = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().trim() === text)

describe('src/components/Shelf/SafetyWarningModal.vue', () => {
  describe('warning list (render)', () => {
    it('names the alert and says an issue was detected rather than asserted', () => {
      const wrapper = mountModal()

      expect(wrapper.text()).toContain('Interaction Alert')
      // "potential issue" is the honest strength: the backend reported a rule
      // match between ingredients, not a diagnosis about this user's skin.
      expect(wrapper.text()).toContain('SkinBuddy detected a potential issue.')
    })

    it('renders one card per reported warning, with its message', () => {
      const wrapper = mountModal([
        warning({ message: 'First conflict.' }),
        warning({ alert_type: 'Skin Type Conflict', message: 'Second conflict.' }),
      ])

      expect(wrapper.text()).toContain('First conflict.')
      expect(wrapper.text()).toContain('Second conflict.')
      expect(wrapper.findAll('p.text-sm')).toHaveLength(2)
    })

    it('renders no cards when the list is empty, without failing', () => {
      // Reachable only through a caller mistake - both hosts gate this dialogue
      // on a non-empty warnings list - but an empty list must not throw inside
      // the v-for, because the alternative is a blank screen over the add flow.
      const wrapper = mountModal([])

      expect(wrapper.findAll('p.text-sm')).toHaveLength(0)
      expect(wrapper.text()).toContain('Interaction Alert')
    })

    it('clamps each message until it is expanded', () => {
      // expanded[index] is undefined before any toggle, so the clamp is the
      // default state. What is NOT covered here is the expansion itself - see
      // the note below.
      const wrapper = mountModal()

      expect(wrapper.get('p.text-sm').classes()).toContain('line-clamp-2')
    })

    it('does not offer a Read more control that nothing measured', () => {
      // The toggle is gated on useClampedText's measurement, and jsdom performs
      // no layout: scrollHeight and clientHeight both read 0, so nothing ever
      // registers as overflowing. This card pins the consequence rather than
      // pretending to test the toggle - the control's appearance and the
      // expansion behind it need a real browser (FE-DEF-26/27 were verified
      // that way).
      const wrapper = mountModal([
        warning({ message: 'A message long enough to wrap several lines at this width. '.repeat(6) }),
      ])

      expect(buttonWith(wrapper, 'Read more')).toBeUndefined()
    })
  })

  describe('severity badge', () => {
    it('shows the severity alongside the alert type when the backend sent one', () => {
      const wrapper = mountModal([warning({ severity: 'High', alert_type: 'Interaction' })])

      expect(badges(wrapper)[0]).toBe('High • Interaction')
    })

    it('reads the severity however the backend cased it', () => {
      // resolveSeverityBand normalises, so a lowercase or padded value still
      // bands - and the badge prints the backend's own spelling rather than the
      // normalised one, which is what the user is shown.
      const wrapper = mountModal([warning({ severity: '  medium  ' })])

      expect(badges(wrapper)[0]).toContain('medium')
      expect(badges(wrapper)[0]).toContain('Interaction')
    })

    it('omits the severity entirely when the backend sent none', () => {
      // The alternative a previous version took was defaulting to HIGH, which
      // printed the most alarming value nobody computed. Dropping the word is
      // the honest option: the alert type still identifies the warning.
      const wrapper = mountModal([warning({ severity: null })])

      expect(badges(wrapper)[0]).toBe('Interaction')
      expect(badges(wrapper)[0]).not.toContain('HIGH')
    })

    it('omits the severity for a value it does not recognise', () => {
      const wrapper = mountModal([warning({ severity: 'catastrophic' })])

      expect(badges(wrapper)[0]).toBe('Interaction')
    })

    it('paints each recognised band differently, and the unknown band neutrally', () => {
      // FE-DEF-25: a Low warning used to be drawn in the same alarm red as a
      // High one. The palette is this component's own; only the banding is
      // shared, so the assertion is that the four bands do not collapse.
      const wrapper = mountModal([
        warning({ severity: 'High' }),
        warning({ severity: 'Medium' }),
        warning({ severity: 'Low' }),
        warning({ severity: null }),
      ])
      const classes = wrapper.findAll('span.uppercase').map((s) => s.attributes('class'))

      expect(new Set(classes).size).toBe(4)
      expect(classes[0]).toContain('text-semantic-error')
      expect(classes[1]).toContain('text-semantic-warning')
      expect(classes[2]).toContain('text-brand-primary')
      expect(classes[3]).toContain('text-brand-text-muted')
    })
  })

  describe('cancel and proceed', () => {
    it('offers both a refusal and an override, labelled as such', () => {
      // Asserted as text because the labels are the whole contract with the
      // user here, and both hosts quote this decision in their own flows.
      const wrapper = mountModal()

      expect(buttonWith(wrapper, 'Cancel')).toBeTruthy()
      expect(buttonWith(wrapper, 'Proceed Anyway')).toBeTruthy()
    })

    it('emits cancel when the refusal is taken', async () => {
      const wrapper = mountModal()

      await buttonWith(wrapper, 'Cancel')!.trigger('click')

      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(wrapper.emitted('proceed')).toBeUndefined()
    })

    it('emits proceed when the override is taken', async () => {
      const wrapper = mountModal()

      await buttonWith(wrapper, 'Proceed Anyway')!.trigger('click')

      expect(wrapper.emitted('proceed')).toHaveLength(1)
      expect(wrapper.emitted('cancel')).toBeUndefined()
    })

    it('treats a click on the backdrop as a refusal, not an override', async () => {
      // The safe direction for an accidental dismissal. A backdrop wired to
      // proceed would let a stray tap outside the dialogue commit a product the
      // user was being warned about.
      const wrapper = mountModal()

      await wrapper.get('.fixed.inset-0').trigger('click')

      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(wrapper.emitted('proceed')).toBeUndefined()
    })

    it('does not emit anything when the dialogue body itself is clicked', async () => {
      // The handler is @click.self. Without it, reading a warning or pressing
      // Read more would bubble to the backdrop and dismiss the decision.
      const wrapper = mountModal()

      await cards(wrapper)[0]!.trigger('click')

      expect(wrapper.emitted('cancel')).toBeUndefined()
      expect(wrapper.emitted('proceed')).toBeUndefined()
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('sortedWarnings', () => {
    const many = [
      warning({ severity: 'Low', message: 'low one' }),
      warning({ severity: 'High', message: 'high one' }),
      warning({ severity: 'Medium', message: 'medium one' }),
      warning({ severity: 'Low', message: 'low two' }),
      warning({ severity: 'High', message: 'high two' }),
    ]

    it('lists the most severe conflict first', () => {
      const wrapper = mountModal(many)

      expect(wrapper.findAll('p.text-sm').map((p) => p.text())).toEqual([
        'high one', 'high two', 'medium one', 'low one', 'low two',
      ])
    })

    it('shows every conflict, with nothing folded behind a control', () => {
      // Owner decision. This is the consent screen in front of Proceed Anyway,
      // so it must not hide a conflict the user is proceeding past - unlike every
      // other warning list, which shows two and offers more.
      const wrapper = mountModal(many)

      expect(wrapper.findAll('p.text-sm')).toHaveLength(5)
      expect(wrapper.find('button.show-more').exists()).toBe(false)
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('grouped conflicts', () => {
    it('lists every pair of a merged product, with nothing folded', () => {
      // The consent screen: the owner decided no conflict is hidden here, and
      // that now holds inside a card as well as between cards.
      const wrapper = mount(SafetyWarningModal, { props: { warnings: [mergedBuffet()] } })

      expect(wrapper.findAll('li.conflict-detail')).toHaveLength(5)
      expect(wrapper.find('button.show-more').exists()).toBe(false)
    })

    it('groups skin-type alerts into one card here too', () => {
      const wrapper = mount(SafetyWarningModal, { props: { warnings: [skinAlert('a'), skinAlert('b')] } })

      expect(wrapper.text()).toContain('Poorly suited to your skin type · 2 ingredients')
      expect(wrapper.findAll('li.conflict-detail')).toHaveLength(2)
    })
  })
})
