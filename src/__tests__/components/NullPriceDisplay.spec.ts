import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('../../api/products', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  searchProducts: vi.fn(),
}))

import { searchProducts } from '../../api/products'
import ExploreProductCard from '../../components/Catalog/ExploreProductCard.vue'
import ProductHeroSection from '../../components/Catalog/ProductHeroSection.vue'
import SearchAutocompleteInput from '../../components/Shared/SearchAutocompleteInput.vue'

// Seventeen of the 34 live products have no price at all. None may show a
// made-up one.
const UNPRICED = {
  id: 'p-1',
  slug: 'no-price-cleanser',
  brand: 'CeraVe',
  name: 'Hydrating Facial Cleanser',
  category: 'Cleanser',
  price_thb: null,
  price_usd: null,
  image_url: null,
  description: 'A gentle cleanser.',
  skin_match_score: null,
  product_ingredients: [],
}

const NEVER = ['฿null', '฿NaN', '$null', '$NaN', '฿undefined', '$undefined', '฿0', '$0']

const mounted: VueWrapper[] = []
const expectNoMadeUpPrice = (text: string) => {
  for (const bad of NEVER) expect(text).not.toContain(bad)
}

afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount()
  document.body.innerHTML = ''
})

describe('feat/27 a product with no price says so rather than showing one', () => {
  describe('ExploreProductCard (no price)', () => {
    it('says "Price unavailable" for a product with no THB and no USD price, and never ฿null or ฿NaN', () => {
      const w = mount(ExploreProductCard, { props: { product: UNPRICED } })
      mounted.push(w)

      expect(w.get('.card-tags').text()).toContain('Price unavailable')
      expectNoMadeUpPrice(w.text())
    })

    it('shows the price it has, and not "Price unavailable", when only one currency is listed', () => {
      const w = mount(ExploreProductCard, { props: { product: { ...UNPRICED, price_thb: 450 } } })
      mounted.push(w)

      expect(w.get('.card-tags').text()).toContain('฿450')
      expect(w.text()).not.toContain('Price unavailable')
    })
  })

  describe('ProductHeroSection (no price)', () => {
    it('says "Price unavailable" for a product with no THB and no USD price, and never ฿null or ฿NaN', async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/', component: { template: '<div />' } },
          { path: '/product/:slug', component: { template: '<div />' } },
        ],
      })
      await router.push('/')
      await router.isReady()
      const pinia = createPinia()
      setActivePinia(pinia)
      const w = mount(ProductHeroSection, {
        props: { product: UNPRICED, mode: 'detail' },
        global: { plugins: [pinia, router], stubs: { teleport: true, SafetyCheckModal: true } },
      })
      mounted.push(w)

      expect(w.text()).toContain('Price unavailable')
      expectNoMadeUpPrice(w.text())
    })
  })

  describe('SearchAutocompleteInput (no price)', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      vi.useFakeTimers()
    })
    afterEach(() => vi.useRealTimers())

    it('says "Price unavailable" on a suggestion with no THB and no USD price, and never ฿null or ฿NaN', async () => {
      vi.mocked(searchProducts).mockResolvedValue([UNPRICED] as never)
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/:any(.*)*', component: { template: '<div />' } }],
      })
      await router.push('/')
      await router.isReady()
      const w = mount(SearchAutocompleteInput, { global: { plugins: [router] }, attachTo: document.body })
      mounted.push(w)

      const input = w.get('input')
      await input.trigger('focus')
      await input.setValue('cleanser')
      await vi.advanceTimersByTimeAsync(300)
      await flushPromises()

      expect(w.text()).toContain('Hydrating Facial Cleanser')
      expect(w.text()).toContain('Price unavailable')
      expectNoMadeUpPrice(w.text())
    })
  })
})
