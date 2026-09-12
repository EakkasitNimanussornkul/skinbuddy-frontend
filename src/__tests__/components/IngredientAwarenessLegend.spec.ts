import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import IngredientAwarenessLegend from '../../components/Catalog/IngredientAwarenessLegend.vue'

const stats = (overrides: Record<string, number> = {}) => ({
  highPct: 20,
  medPct: 50,
  lowPct: 30,
  highCount: 2,
  medCount: 5,
  lowCount: 3,
  ...overrides,
})

const mountLegend = (s = stats()) => mount(IngredientAwarenessLegend, { props: { stats: s } })

/** The bar's segments, in drawn order, as [title, width]. */
const segments = (wrapper: VueWrapper) =>
  wrapper.findAll('.rounded-full.overflow-hidden > div').map((d) => [
    d.attributes('title'),
    (d.element as HTMLElement).style.width,
  ])

const toggle = (wrapper: VueWrapper) => wrapper.get('button')

describe('src/components/Catalog/IngredientAwarenessLegend.vue', () => {
  describe('tier bar (render)', () => {
    it('draws the three tiers high to low, each at its share and naming its count', () => {
      // High first: the bar is read left to right, and the tier that needs
      // routine planning is the one worth seeing first.
      const wrapper = mountLegend()

      expect(segments(wrapper)).toEqual([
        ['High Awareness (2)', '20%'],
        ['Normal / Medium Awareness (5)', '50%'],
        ['Safe / Low Awareness (3)', '30%'],
      ])
    })

    it('omits a tier with no ingredients rather than drawing a zero-width segment', () => {
      const wrapper = mountLegend(stats({ highPct: 0, highCount: 0, medPct: 70, medCount: 7 }))

      expect(segments(wrapper).map((s) => s[0])).toEqual([
        'Normal / Medium Awareness (7)',
        'Safe / Low Awareness (3)',
      ])
    })

    it('draws an empty track for a product with no tiered ingredients', () => {
      const wrapper = mountLegend(stats({ highPct: 0, medPct: 0, lowPct: 0, highCount: 0, medCount: 0, lowCount: 0 }))

      expect(segments(wrapper)).toEqual([])
    })
  })

  describe('showAwarenessGuide (legend text)', () => {
    it('keeps the explanations collapsed until asked for', () => {
      const wrapper = mountLegend()

      expect(toggle(wrapper).text()).toContain('Understanding Safety & Awareness Tiers')
      expect(toggle(wrapper).text()).toContain('Show Details')
      expect(wrapper.text()).not.toContain('High Awareness (Red)')
    })

    it('explains all three tiers in order once opened, naming each colour', async () => {
      const wrapper = mountLegend()

      await toggle(wrapper).trigger('click')

      const headings = wrapper.findAll('.space-y-1 > div').map((d) => d.text())
      expect(headings).toEqual(['High Awareness (Red)', 'Medium Awareness (Grey)', 'Low Awareness (Green)'])
      expect(toggle(wrapper).text()).toContain('Hide Details')
    })

    it('says what puts an ingredient in each tier', async () => {
      const wrapper = mountLegend()

      await toggle(wrapper).trigger('click')

      expect(wrapper.text()).toContain('Requires careful routine planning to avoid clashing.')
      expect(wrapper.text()).toContain('Safe and necessary structural elements to stabilize the active formula.')
      expect(wrapper.text()).toContain('soothe the lipid barrier and deliver gentle nourishment.')
    })

    it('collapses again on a second press', async () => {
      const wrapper = mountLegend()

      await toggle(wrapper).trigger('click')
      await toggle(wrapper).trigger('click')

      expect(wrapper.text()).not.toContain('High Awareness (Red)')
    })
  })
})
