import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import ExploreProductCard from '../../components/Catalog/ExploreProductCard.vue'
import { MATCH_SCORE_BASIS } from '../../api/products'
import { MATCH_BADGE_CLASS } from '../../components/Catalog/matchBadge'

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

    it('reads Not enough info instead of a percentage, with the real score on hover', () => {
      // Owner decision: a 100% built on one ingredient is not shown as one.
      const wrapper = mountCard({ skin_match_score: 100, match_breakdown: limited })

      expect(badge(wrapper).text()).toBe('Not enough info')
      // Grey, not the green a 100% would be drawn in: no verdict is being shown.
      expect(badge(wrapper).classes()).toEqual(expect.arrayContaining(MATCH_BADGE_CLASS.unavailable.split(' ')))
      expect(badge(wrapper).classes().some((c) => c.includes('emerald'))).toBe(false)
      // Its counts, not "100%", even in the hover text (owner decision).
      expect(badge(wrapper).attributes('title')).toBe(
        'Not enough info to judge a match: 1 of 1 suits you, but only 1 of its 6 ingredients relates to your skin type.',
      )
      expect(wrapper.find('.match-fraction').exists()).toBe(false)
    })

    it('shows the fraction beside a well-founded score, and nothing extra for no score', () => {
      const scored = mountCard({ skin_match_score: 86, match_breakdown: { ...limited, helpful: 6, considered: 7, limited: false } })
      expect(badge(scored).text()).toBe('86% Match')
      expect(scored.get('.match-fraction').text()).toBe('6 of 7 suit you')

      const none = mountCard({ skin_match_score: null, match_breakdown: limited })
      expect(badge(none).text()).toBe('Score Unavailable')
      expect(none.find('.match-fraction').exists()).toBe(false)
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('scores at either end', () => {
    it('reads a perfect score as its counts, with no separate fraction, and never 100%', () => {
      const wrapper = mountCard({
        skin_match_score: 100,
        match_breakdown: { helpful: 11, concerns: 0, concern_weight: 0, considered: 11, total_ingredients: 24, limited: false },
      })

      expect(badge(wrapper).text()).toBe('All 11 suit you')
      expect(wrapper.find('.match-fraction').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('100%')
    })

    it('shows 99% rather than rounding 99.6 up to 100%', () => {
      expect(badge(mountCard({ skin_match_score: 99.6 })).text()).toBe('99% Match')
    })
  })
})
