import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import SafetyInspectionCard, { type WarningAlert } from '../../components/Shelf/SafetyInspectionCard.vue'

const warning = (severity: string, message: string): WarningAlert => ({
  alert_type: 'Chemical Interaction Warning',
  severity,
  message,
})

const mountCard = (warnings: WarningAlert[], scanStatus: string | null = 'warned') =>
  mount(SafetyInspectionCard, { props: { warnings, scanStatus: scanStatus as never } })

const messages = (wrapper: VueWrapper) => wrapper.findAll('p.text-stone-200').map((p) => p.text())

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
})
