import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import ExploreProductCard from '../../components/Catalog/ExploreProductCard.vue'

const product = (overrides: Record<string, unknown> = {}) => ({
  id: 'p-1',
  brand: 'CeraVe',
  name: 'Hydrating Facial Cleanser',
  category: 'Cleanser',
  price_thb: 450,
  price_usd: null,
  image_url: null,
  description: 'A gentle cleanser.',
  skin_match_score: 88,
  product_ingredients: [],
  ...overrides,
})

const mountCard = (overrides: Record<string, unknown> = {}) =>
  mount(ExploreProductCard, { props: { product: product(overrides) } })

const badge = (wrapper: VueWrapper) => wrapper.get('.match-badge')

describe('src/components/Catalog/ExploreProductCard.vue', () => {
  describe('match badge (render)', () => {
    it('sits at the top right of the card, not in its footer', () => {
      // Owner feedback: the 10px footer pill was easy to miss.
      const wrapper = mountCard()

      expect(badge(wrapper).classes()).toEqual(expect.arrayContaining(['absolute', 'top-4', 'right-4']))
      expect(wrapper.findAll('.match-badge')).toHaveLength(1)
    })

    it('is drawn larger for a real score', () => {
      const wrapper = mountCard()

      expect(badge(wrapper).classes()).toEqual(expect.arrayContaining(['text-xs', 'sm:text-sm']))
      expect(badge(wrapper).classes()).not.toContain('text-[10px]')
    })

    it('words each band of the score', () => {
      expect(badge(mountCard({ skin_match_score: 88 })).text()).toBe('88% Match')
      expect(badge(mountCard({ skin_match_score: 64.4 })).text()).toBe('64% Match')
      expect(badge(mountCard({ skin_match_score: 30 })).text()).toBe('30% Caution')
    })

    it('keeps a missing score small and says it is unavailable, rather than calling it 0%', () => {
      // A guest, or a user with no skin type: nothing was computed.
      const wrapper = mountCard({ skin_match_score: null })

      expect(badge(wrapper).text()).toBe('Score Unavailable')
      expect(badge(wrapper).classes()).toContain('text-[10px]')
      expect(badge(wrapper).find('svg').exists()).toBe(false)
    })
  })

  describe('inspect', () => {
    it('asks to inspect the product when the card is clicked', async () => {
      const wrapper = mountCard()

      await wrapper.get('.cursor-pointer').trigger('click')

      expect(wrapper.emitted('inspect')).toHaveLength(1)
    })
  })
})
