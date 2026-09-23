import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import ShowMoreControl from '../../components/Shared/ShowMoreControl.vue'

const mountControl = (props: Record<string, unknown> = {}) =>
  mount(ShowMoreControl, {
    props: { nextCount: 4, remaining: 7, canShowMore: true, canShowLess: false, noun: 'ingredients', ...props },
  })

describe('src/components/Shared/ShowMoreControl.vue', () => {
  describe('render', () => {
    it('names how many more the next press reveals, and how many remain', () => {
      const wrapper = mountControl()

      expect(wrapper.get('button.show-more').text()).toContain('Show 4 more ingredients')
      expect(wrapper.get('button.show-more').text()).toContain('(7 left)')
      expect(wrapper.find('button.show-less').exists()).toBe(false)
    })

    it('uses the singular when exactly one item is left', () => {
      const wrapper = mountControl({ nextCount: 1, remaining: 1, noun: 'conflicts' })

      expect(wrapper.get('button.show-more').text()).toContain('Show 1 more conflict')
      expect(wrapper.get('button.show-more').text()).not.toContain('conflicts')
    })

    it('takes an explicit singular for an irregular noun', () => {
      const wrapper = mountControl({ nextCount: 1, remaining: 1, noun: 'analyses', singular: 'analysis' })

      expect(wrapper.get('button.show-more').text()).toContain('Show 1 more analysis')
    })

    it('reads without a noun when none is given', () => {
      const wrapper = mountControl({ noun: undefined })

      expect(wrapper.get('button.show-more').text()).toMatch(/^Show 4 more\s*\(7 left\)/)
    })

    it('offers both controls part-way through the list', () => {
      const wrapper = mountControl({ canShowLess: true })

      expect(wrapper.find('button.show-more').exists()).toBe(true)
      expect(wrapper.get('button.show-less').text()).toBe('Show less')
    })

    it('offers only Show less once everything is on screen', () => {
      const wrapper = mountControl({ nextCount: 0, remaining: 0, canShowMore: false, canShowLess: true })

      expect(wrapper.find('button.show-more').exists()).toBe(false)
      expect(wrapper.find('button.show-less').exists()).toBe(true)
    })

    it('renders nothing when there is nothing to reveal or fold', () => {
      const wrapper = mountControl({ nextCount: 0, remaining: 0, canShowMore: false, canShowLess: false })

      expect(wrapper.findAll('button')).toHaveLength(0)
    })

    it('points both controls at the list they extend', () => {
      const wrapper = mountControl({ canShowLess: true, controls: 'list-1' })

      expect(wrapper.findAll('button').map((b) => b.attributes('aria-controls'))).toEqual(['list-1', 'list-1'])
    })
  })

  describe('emits', () => {
    it('emits more and less from their own buttons', async () => {
      const wrapper = mountControl({ canShowLess: true })

      await wrapper.get('button.show-more').trigger('click')
      await wrapper.get('button.show-less').trigger('click')

      expect(wrapper.emitted('more')).toHaveLength(1)
      expect(wrapper.emitted('less')).toHaveLength(1)
    })
  })
})
