import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { h } from 'vue'

vi.mock('../../api/shelfapi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/shelfapi')>()),
  analyzeProduct: vi.fn(),
  addToShelf: vi.fn(),
}))

import { MATCH_SCORE_BASIS, MATCH_SCORE_DISCLAIMER, type CompareResponse } from '../../api/products'
import MatchInfoDisclosure from '../../components/Shared/MatchInfoDisclosure.vue'
import ProductHeroSection from '../../components/Catalog/ProductHeroSection.vue'
import CompareIdentityHeader from '../../components/Compare/CompareIdentityHeader.vue'
import ExploreProductCard from '../../components/Catalog/ExploreProductCard.vue'
import { useAuthStore } from '../../stores/auth'

const makeRouter = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/product/:slug', component: { template: '<div />' } },
      { path: '/how-match-works', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()
  return router
}

const signedInPinia = () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().setAuth('token-1', { id: 'u-1', skin_type: 'OSPW' })
  return pinia
}

const PRODUCT = {
  id: 'p-1',
  slug: 'cerave-hydrating-cleanser',
  brand: 'CeraVe',
  name: 'Hydrating Facial Cleanser',
  category: 'Cleanser',
  skin_match_score: 82,
  match_reasons: [],
  product_ingredients: [],
}

const BREAKDOWN = { helpful: 6, concerns: 0, concern_weight: 0, considered: 7, total_ingredients: 20, limited: false }

const mountHero = async (product: Record<string, unknown> = {}) => {
  const router = await makeRouter()
  const pinia = signedInPinia()
  return mount(ProductHeroSection, {
    props: { product: { ...PRODUCT, ...product }, mode: 'detail' },
    global: { plugins: [pinia, router], stubs: { teleport: true, SafetyCheckModal: true } },
  })
}

const compareData = (): CompareResponse => ({
  product_a: { ...PRODUCT, image_url: null, description: 'A.' },
  product_b: { ...PRODUCT, id: 'p-b', name: 'Foaming Facial Cleanser', skin_match_score: 60, image_url: null, description: 'B.' },
  shared_ingredients: [],
  similarity_score: 40,
  conflicts: [],
})

const toggleOf = (w: VueWrapper) => w.get('button.match-info-toggle')

describe('feat/23 % Match explanations folded behind "What is % Match?"', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('MatchInfoDisclosure', () => {
    const mountDisclosure = () =>
      mount(MatchInfoDisclosure, { slots: { default: () => h('p', { class: 'inside' }, 'The explanation') } })

    it('is folded by default: a real button saying "What is % Match?", reported closed, with nothing inside shown', () => {
      const w = mountDisclosure()

      expect(toggleOf(w).element.tagName).toBe('BUTTON')
      expect(toggleOf(w).attributes('type')).toBe('button')
      expect(toggleOf(w).text()).toBe('What is % Match?')
      expect(toggleOf(w).attributes('aria-expanded')).toBe('false')
      expect(toggleOf(w).attributes('aria-controls')).toBeUndefined()
      expect(toggleOf(w).findAll('svg').every((svg) => svg.attributes('aria-hidden') === 'true')).toBe(true)
      expect(w.find('.inside').exists()).toBe(false)
    })

    it('opens on a click, pointing aria-controls at what it shows, and folds again on a second', async () => {
      const w = mountDisclosure()

      await toggleOf(w).trigger('click')
      expect(toggleOf(w).attributes('aria-expanded')).toBe('true')
      expect(w.get(`#${toggleOf(w).attributes('aria-controls')}`).text()).toBe('The explanation')

      await toggleOf(w).trigger('click')
      expect(toggleOf(w).attributes('aria-expanded')).toBe('false')
      expect(w.find('.inside').exists()).toBe(false)
    })
  })

  describe('ProductHeroSection (% Match folded)', () => {
    it('keeps the score, its verdict and its working in view while the explanation is folded', async () => {
      const w = await mountHero({ match_breakdown: BREAKDOWN })
      await flushPromises()

      expect(w.get('.match-ring').attributes('aria-valuenow')).toBe('82')
      expect(w.find('.match-verdict').exists()).toBe(true)
      expect(w.find('.match-working').exists()).toBe(true)
      expect(toggleOf(w).attributes('aria-expanded')).toBe('false')
      expect(w.find('.match-basis').exists()).toBe(false)
      expect(w.find('.match-disclaimer').exists()).toBe(false)
      expect(w.find('.match-how-link').exists()).toBe(false)
    })

    it('shows the same basis, disclaimer and methodology link once opened', async () => {
      const w = await mountHero()
      await toggleOf(w).trigger('click')

      expect(w.get('.match-basis').text()).toBe(MATCH_SCORE_BASIS)
      expect(w.get('.match-disclaimer').text()).toBe(MATCH_SCORE_DISCLAIMER)
      expect(w.get('a.match-how-link').attributes('href')).toBe('/how-match-works')
      expect(w.get('a.match-how-link').text()).toBe('How % Match is calculated, and our sources')
    })

    it('folds them on a withheld score too, keeping the reason and "Show the score anyway" in view', async () => {
      const w = await mountHero({ skin_match_score: 100, match_breakdown: { ...BREAKDOWN, helpful: 1, considered: 1, limited: true } })

      expect(w.find('.match-withheld-reason').exists()).toBe(true)
      expect(w.find('button.match-reveal').exists()).toBe(true)
      expect(w.find('.match-withheld .match-disclaimer').exists()).toBe(false)

      await w.get('.match-withheld button.match-info-toggle').trigger('click')
      expect(w.get('.match-withheld .match-disclaimer').text()).toBe(MATCH_SCORE_DISCLAIMER)
    })
  })

  describe('CompareIdentityHeader (% Match folded)', () => {
    const mountHeader = () => {
      const pinia = signedInPinia()
      return mount(CompareIdentityHeader, { props: { data: compareData() }, global: { plugins: [pinia], stubs: { RouterLink: true } } })
    }

    it('keeps both scores in view and folds the explanation under them', () => {
      const w = mountHeader()

      expect(w.text()).toContain('82% Match')
      expect(w.text()).toContain('60% Match')
      expect(toggleOf(w).attributes('aria-expanded')).toBe('false')
      expect(w.text()).not.toContain(MATCH_SCORE_BASIS)
      expect(w.find('.match-disclaimer').exists()).toBe(false)
      expect(w.find('.match-how-link').exists()).toBe(false)
    })

    it('shows the explanation, disclaimer and link unchanged once opened', async () => {
      const w = mountHeader()
      await toggleOf(w).trigger('click')

      expect(w.text()).toContain(`Skin Match — ${MATCH_SCORE_BASIS}`)
      expect(w.get('.match-disclaimer').text()).toBe(MATCH_SCORE_DISCLAIMER)
      expect(w.get('.match-how-link').attributes('to')).toBe('/how-match-works')
    })
  })

  describe('ExploreProductCard (badge on phones)', () => {
    const card = (overrides: Record<string, unknown> = {}) =>
      mount(ExploreProductCard, {
        props: { product: { ...PRODUCT, price_thb: 450, image_url: null, description: 'A.', ...overrides } },
      })

    it('draws a real score tighter below sm and as before from sm up', () => {
      const badge = card().get('.match-badge')

      expect(badge.classes()).toEqual(expect.arrayContaining(['text-xs', 'px-2', 'py-1', 'sm:text-sm', 'sm:px-3', 'sm:py-1.5']))
      expect(badge.classes()).not.toContain('px-3')
      expect(badge.get('svg').classes()).toEqual(expect.arrayContaining(['w-3', 'h-3', 'sm:w-3.5', 'sm:h-3.5']))
    })

    it('leaves the fraction off below sm, so the badge covers less of the photo', () => {
      const fraction = card({ match_breakdown: BREAKDOWN }).get('.match-fraction')

      expect(fraction.classes()).toEqual(expect.arrayContaining(['hidden', 'sm:inline']))
      expect(fraction.text()).toBe('6 of 7 suit you')
    })
  })
})
