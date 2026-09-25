import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import ExploreProductCard from '../../components/Catalog/ExploreProductCard.vue'
import { MATCH_SCORE_BASIS } from '../../api/products'

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

      // Positioned by its wrapper, which also holds the limited-information note.
      expect(badge(wrapper).element.parentElement!.className).toContain('absolute top-4 right-4')
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

    it('says what the score is based on when hovered, and says nothing for no score', () => {
      expect(badge(mountCard()).attributes('title')).toBe(MATCH_SCORE_BASIS)
      expect(badge(mountCard({ skin_match_score: null })).attributes('title')).toBeUndefined()
    })
  })

  describe('inspect', () => {
    it('asks to inspect the product when the card is clicked', async () => {
      const wrapper = mountCard()

      await wrapper.get('.cursor-pointer').trigger('click')

      expect(wrapper.emitted('inspect')).toHaveLength(1)
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('text size', () => {
    it('draws the tags and the description large enough to fill the card', () => {
      // Owner feedback: the card read as mostly blank beside its image.
      const wrapper = mountCard()

      expect(wrapper.get('.card-description').classes()).toEqual(expect.arrayContaining(['text-sm', 'line-clamp-3']))
      expect(wrapper.get('.card-tags').classes()).toContain('text-sm')
      expect(wrapper.get('h3').classes()).toContain('text-lg')
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('limited information', () => {
    const limited = { helpful: 1, concerns: 0, concern_weight: 0, considered: 1, total_ingredients: 6, limited: true }

    it('flags a score resting on very few ingredients beside the badge', () => {
      const wrapper = mountCard({ skin_match_score: 100, match_breakdown: limited })

      expect(wrapper.get('.match-limited').text()).toBe('Limited info')
      expect(wrapper.get('.match-limited').attributes('title')).toContain('only 1 of its 6 ingredients')
    })

    it('adds nothing for a well-founded score, or for no score', () => {
      expect(mountCard({ match_breakdown: { ...limited, considered: 7, limited: false } }).find('.match-limited').exists()).toBe(false)
      expect(mountCard({ skin_match_score: null, match_breakdown: limited }).find('.match-limited').exists()).toBe(false)
    })
  })
})
