import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import SafetyInspectionCard, { type WarningAlert } from '../../components/Shelf/SafetyInspectionCard.vue'
import { mergedBuffet, singlePair, skinAlert } from '../fixtures/conflicts'

const warning = (severity: string, message: string): WarningAlert => ({
  alert_type: 'Chemical Interaction Warning',
  severity,
  message,
})

const mountCard = (warnings: WarningAlert[], scanStatus: string | null = 'warned') =>
  mount(SafetyInspectionCard, { props: { warnings, scanStatus: scanStatus as never } })

/** Each warning card's message, by structure rather than by a colour class. */
const messages = (wrapper: VueWrapper) =>
  wrapper.findAll('[id] > div.rounded-2xl > p').map((p) => p.text())

describe('src/components/Shelf/SafetyInspectionCard.vue', () => {
  describe('warning list (render)', () => {
    it('puts the most severe warning first, whatever order the backend sent', () => {
      // Owner decision: most severe first. This is what makes folding safe -
      // the worst clash is always among the warnings on screen.
      const wrapper = mountCard([
        warning('Low', 'low one'),
        warning('Medium', 'medium one'),
        warning('High', 'high one'),
      ])

      expect(messages(wrapper)[0]).toBe('high one')
      expect(messages(wrapper)[1]).toBe('medium one')
    })

    it('shows two warnings, then two more at a time', async () => {
      const wrapper = mountCard([
        warning('High', 'a'),
        warning('High', 'b'),
        warning('Medium', 'c'),
        warning('Low', 'd'),
        warning('Low', 'e'),
      ])
      const more = () => wrapper.find('button.show-more')

      expect(messages(wrapper)).toEqual(['a', 'b'])
      expect(more().text()).toContain('Show 2 more conflicts')

      await more().trigger('click')
      expect(messages(wrapper)).toEqual(['a', 'b', 'c', 'd'])
      expect(more().text()).toContain('Show 1 more conflict')
      expect(more().text()).not.toContain('conflicts')

      await more().trigger('click')
      expect(messages(wrapper)).toHaveLength(5)
    })

    it('keeps the full count in the header while folded', () => {
      const wrapper = mountCard([warning('High', 'a'), warning('Low', 'b'), warning('Low', 'c')])

      expect(wrapper.text()).toContain('3 Warnings')
      expect(messages(wrapper)).toHaveLength(2)
    })

    it('offers no control for two warnings or fewer', () => {
      const wrapper = mountCard([warning('High', 'a'), warning('Low', 'b')])

      expect(wrapper.find('button.show-more').exists()).toBe(false)
    })
  })

  describe('render states', () => {
    it('shows the scanning state while the check runs', () => {
      const wrapper = mount(SafetyInspectionCard, { props: { warnings: [], isLoading: true } })

      expect(wrapper.text()).toContain('Routine Safety Scan')
    })

    it('shows the clean panel only for a cleared status', () => {
      expect(mountCard([], 'cleared').text()).toContain('No Conflicts Found')
      expect(mountCard([], 'unavailable').text()).toContain('Safety Scan Unavailable')
      expect(mountCard([], 'unassessed').text()).toContain('Not Assessed')
    })

    it('never lets the clean panel hide a reported conflict', () => {
      // `cleared` with warnings cannot come out of evaluateSafety, but these are
      // props; the warnings branch is ordered first so a conflict always wins.
      const wrapper = mountCard([warning('High', 'real clash')], 'cleared')

      expect(wrapper.text()).toContain('real clash')
      expect(wrapper.text()).not.toContain('No Conflicts Found')
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('light mode', () => {
    /**
     * Every class in the rendered card that sets a dark stone or dark tint
     * without a `dark:` prefix. Those are what made the card near-black in
     * light mode: the surfaces, the message text and the badges had no light
     * variant at all.
     */
    const darkOnlyClasses = (wrapper: VueWrapper) =>
      wrapper
        .findAll('*')
        .flatMap((el) => el.classes())
        // Dark surfaces and borders, and the pale message text that only reads on
        // them. Dark *text* such as text-rose-700 is the correct light variant,
        // so it is not matched.
        .filter((c) => /^(bg|border)-(stone|rose|amber)-[789]\d\d\b/.test(c) || c === 'text-stone-200')

    it('draws no surface, border or text in a dark-only colour', async () => {
      // One warning per band, all revealed, so every badge colour is rendered.
      const wrapper = mountCard([warning('High', 'a'), warning('Medium', 'b'), warning('Low', 'c')])
      await wrapper.get('button.show-more').trigger('click')
      expect(messages(wrapper)).toHaveLength(3)

      expect(darkOnlyClasses(wrapper)).toEqual([])
    })

    it('keeps the dark palette for dark mode, behind the dark: prefix', () => {
      const wrapper = mountCard([warning('High', 'a')])
      const badge = wrapper.get('.rounded-2xl .inline-flex')

      expect(badge.classes()).toContain('bg-rose-50')
      expect(badge.classes()).toContain('dark:bg-rose-950/80')
    })

    it('gives the scanning panel a light surface too', () => {
      const wrapper = mount(SafetyInspectionCard, { props: { warnings: [], isLoading: true } })

      expect(darkOnlyClasses(wrapper)).toEqual([])
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('grouped conflicts', () => {
    it('shows one card per clashing product, listing its pairs rather than the summary', () => {
      const wrapper = mountCard([mergedBuffet() as never])

      expect(wrapper.text()).toContain('1 Warning')
      expect(wrapper.text()).toContain('With "Buffet" Multi-Technology Peptide Serum · 5 ingredient clashes')
      expect(wrapper.findAll('li.conflict-detail')).toHaveLength(2)
      // The summary names the pairs without the why; the pairs below say both.
      expect(wrapper.text()).not.toContain('5 ingredient clashes. Salicylic Acid with')
    })

    it('keeps a single-pair warning as its own sentence', () => {
      const wrapper = mountCard([singlePair() as never])

      expect(wrapper.text()).toContain('layering two exfoliating acids')
      expect(wrapper.find('li.conflict-detail').exists()).toBe(false)
    })

    it('merges several skin-type alerts into one card, and counts cards in the header', () => {
      // Owner request: skin-type conflicts the same way as product clashes.
      const wrapper = mountCard([
        skinAlert('Heavy occlusive.') as never,
        skinAlert('Drying alcohol.') as never,
        skinAlert('Fragrance.', 'Medium') as never,
      ])

      expect(wrapper.text()).toContain('1 Warning')
      expect(wrapper.text()).not.toContain('3 Warnings')
      expect(wrapper.text()).toContain('Poorly suited to your skin type · 3 ingredients')
      expect(wrapper.findAll('li.conflict-detail')).toHaveLength(2)
    })
  })
})
