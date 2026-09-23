import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import TargetedConcernsSection from '../../components/Shelf/TargetedConcernsSection.vue'

const withConcerns = (concerns: unknown) => ({ products: { concerns } })

const mountSection = (item: unknown) => mount(TargetedConcernsSection, { props: { item } })

const chips = (wrapper: VueWrapper) => wrapper.findAll('.flex-wrap > span').map((s) => s.text())

describe('src/components/Shelf/TargetedConcernsSection.vue', () => {
  describe('targetedConcerns (computed)', () => {
    it('collects short concern tags and skips sentence-length descriptions', () => {
      const wrapper = mountSection(
        withConcerns(['Acne', 'Dryness', 'This is a full descriptive sentence rather than a tag']),
      )

      expect(chips(wrapper)).toEqual(['Acne', 'Dryness'])
    })

    it('splits a comma-separated string and drops duplicates', () => {
      const wrapper = mountSection(withConcerns('Acne, Redness, Acne'))

      expect(chips(wrapper)).toEqual(['Acne', 'Redness'])
    })

    it('draws nothing when there are no concerns', () => {
      const wrapper = mountSection(withConcerns([]))

      expect(wrapper.text()).toBe('')
    })
  })

  describe('stepping', () => {
    const twelve = Array.from({ length: 12 }, (_, i) => `Concern ${i + 1}`)

    it('shows five, then five more at a time, then exactly what is left', async () => {
      const wrapper = mountSection(withConcerns(twelve))
      const more = () => wrapper.find('button.show-more')

      expect(chips(wrapper)).toHaveLength(5)
      expect(more().text()).toContain('Show 5 more concerns')

      await more().trigger('click')
      expect(chips(wrapper)).toHaveLength(10)
      expect(more().text()).toContain('Show 2 more concerns')

      await more().trigger('click')
      expect(chips(wrapper)).toHaveLength(12)
      expect(more().exists()).toBe(false)
    })

    it('keeps the full count in the header', () => {
      const wrapper = mountSection(withConcerns(twelve))

      expect(wrapper.text()).toContain('12 Focus Areas')
    })
  })
})
