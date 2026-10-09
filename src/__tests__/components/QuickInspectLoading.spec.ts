import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// No network: getWithGuestFallback is what getProductBySlug goes through, so the
// real prefetch and the real modal are judged by the requests they would send.
vi.mock('../../api/optionalAuth', () => ({ getWithGuestFallback: vi.fn() }))
vi.mock('../../api/products', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  searchProducts: vi.fn(),
}))

import { getWithGuestFallback } from '../../api/optionalAuth'
import {
  searchProducts,
  prefetchProductBySlug,
  clearPrefetchedProducts,
  needsProductDetail,
} from '../../api/products'
import UniversalProductModal from '../../components/Catalog/UniversalProductModal.vue'
import ProductSpecContent from '../../components/Catalog/ProductSpecContent.vue'
import ExploreProductCard from '../../components/Catalog/ExploreProductCard.vue'
import EmptyState from '../../components/Shared/EmptyState.vue'
import ExploreView from '../../views/ExploreView.vue'

// Explore's filter chips ask for /meta/facets. There is no network here, so the
// call fails and the chips are derived from the products, as they were before.
vi.mock('../../api/metaApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/metaApi')>()),
  getFacets: () => Promise.reject(new Error('no facets')),
}))

/** A lean-list item: no ingredient tree. */
const LEAN = {
  id: 'p-1',
  brand: 'Paula\'s Choice',
  name: 'Glycolic Serum',
  category: 'Serums',
  slug: 'paulas-choice-glycolic-serum',
  skin_match_score: 78,
  top_ingredients: ['Water', 'Glycolic Acid', 'Glycerin'],
  ingredient_count: 5,
}
/** What GET /products/slug/{slug} answers: the same product with its tree. */
const FULL = {
  ...LEAN,
  description: 'A daily exfoliant.',
  product_ingredients: [{ ingredients: { name: 'Water' } }, { ingredients: { name: 'Glycolic Acid' } }],
}

/** Requests left open, answered in whatever order a test wants. */
interface Open {
  path: string
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}
const opened: Open[] = []
const holdRequests = () => {
  opened.length = 0
  vi.mocked(getWithGuestFallback).mockImplementation(
    (path: string) => new Promise((resolve, reject) => opened.push({ path, resolve, reject })) as never,
  )
}

const mounted: VueWrapper[] = []
const mountModal = async (product: Record<string, unknown>) => {
  const wrapper = mount(UniversalProductModal, {
    props: { product },
    global: { stubs: { ProductSpecContent: true } },
  })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}
const spec = (w: VueWrapper) => w.findComponent(ProductSpecContent)
const loadingLine = (w: VueWrapper) => w.find('.quick-inspect-loading')

describe('feat/29 Quick Inspect with a lean product', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    clearPrefetchedProducts()
    holdRequests()
  })

  afterEach(() => {
    mounted.splice(0).forEach((w) => w.unmount())
    clearPrefetchedProducts()
  })

  describe('needsProductDetail()', () => {
    it('is true for an item with a slug and no ingredient tree', () => {
      expect(needsProductDetail(LEAN)).toBe(true)
    })

    it('is false for an item that has its ingredient tree, empty or not', () => {
      expect(needsProductDetail(FULL)).toBe(false)
      expect(needsProductDetail({ ...LEAN, product_ingredients: [] })).toBe(false)
    })

    it('is false for an item with no slug to fetch by, and for nothing at all', () => {
      expect(needsProductDetail({ ingredient_count: 5 })).toBe(false)
      expect(needsProductDetail(null)).toBe(false)
      expect(needsProductDetail(undefined)).toBe(false)
    })
  })

  describe('prefetchProductBySlug()', () => {
    it('asks for the product by its slug', () => {
      prefetchProductBySlug('paulas-choice-glycolic-serum')

      expect(opened.map((o) => o.path)).toEqual(['/products/slug/paulas-choice-glycolic-serum'])
    })

    it('sends one request for a slug asked for twice while the first is in flight', () => {
      const first = prefetchProductBySlug('a')
      const second = prefetchProductBySlug('a')

      expect(second).toBe(first)
      expect(opened).toHaveLength(1)
    })

    it('keeps the answer for the slug once it has arrived, rather than asking again', async () => {
      const first = prefetchProductBySlug('a')
      opened[0]!.resolve(FULL)
      await first
      const second = await prefetchProductBySlug('a')

      expect(second).toEqual(FULL)
      expect(opened).toHaveLength(1)
    })

    it('sends a request for each different slug', () => {
      prefetchProductBySlug('a')
      prefetchProductBySlug('b')

      expect(opened.map((o) => o.path)).toEqual(['/products/slug/a', '/products/slug/b'])
    })

    it('forgets a failed request, so the next ask sends a new one', async () => {
      const first = prefetchProductBySlug('a')
      opened[0]!.reject(new Error('offline'))
      await expect(first).rejects.toThrow('offline')
      await flushPromises()
      prefetchProductBySlug('a')

      expect(opened).toHaveLength(2)
    })

    it('keeps the same slug from two different logins apart, since the match score is per user', () => {
      localStorage.setItem('access_token', 'token-a')
      prefetchProductBySlug('a')
      localStorage.setItem('access_token', 'token-b')
      prefetchProductBySlug('a')

      expect(opened).toHaveLength(2)
    })

    it('asks again after the stored products are cleared', async () => {
      const first = prefetchProductBySlug('a')
      opened[0]!.resolve(FULL)
      await first
      clearPrefetchedProducts()
      prefetchProductBySlug('a')

      expect(opened).toHaveLength(2)
    })
  })

  describe('UniversalProductModal', () => {
    it('opens at once, with no request, when the product already has its ingredient tree', async () => {
      const w = await mountModal(FULL)

      expect(getWithGuestFallback).not.toHaveBeenCalled()
      expect(loadingLine(w).exists()).toBe(false)
      expect(spec(w).exists()).toBe(true)
      expect(spec(w).props('product')).toEqual(FULL)
    })

    it('opens at once for a product whose ingredient tree is an empty list', async () => {
      const w = await mountModal({ ...LEAN, product_ingredients: [] })

      expect(getWithGuestFallback).not.toHaveBeenCalled()
      expect(spec(w).exists()).toBe(true)
    })

    it('shows a loading state in the shape of the content while the full product is fetched', async () => {
      const w = await mountModal(LEAN)

      expect(opened.map((o) => o.path)).toEqual(['/products/slug/paulas-choice-glycolic-serum'])
      expect(loadingLine(w).exists()).toBe(true)
      expect(loadingLine(w).attributes('role')).toBe('status')
      expect(loadingLine(w).text()).toContain('Loading product details')
      expect(spec(w).exists()).toBe(false)
    })

    it('keeps the header, with the link to the full page, while it loads', async () => {
      const w = await mountModal(LEAN)

      expect(w.text()).toContain('Quick Inspect')
      expect(w.text()).toContain('View Full Page')
    })

    it('shows the full product, over the card\'s own fields, once it arrives', async () => {
      const w = await mountModal(LEAN)
      opened[0]!.resolve(FULL)
      await flushPromises()

      expect(loadingLine(w).exists()).toBe(false)
      expect(spec(w).props('product').product_ingredients).toEqual(FULL.product_ingredients)
      expect(spec(w).props('product').skin_match_score).toBe(78)
    })

    it('keeps the fields the card had when the full product leaves one out', async () => {
      const { skin_match_score: _score, ...withoutScore } = FULL
      const w = await mountModal(LEAN)
      opened[0]!.resolve(withoutScore)
      await flushPromises()

      expect(spec(w).props('product').skin_match_score).toBe(78)
      expect(spec(w).props('product').product_ingredients).toEqual(FULL.product_ingredients)
    })

    it('ignores the answer for a product the modal no longer shows, and waits for the one it does', async () => {
      const other = { ...LEAN, id: 'p-2', slug: 'other-serum', name: 'Other Serum' }
      const w = await mountModal(LEAN)
      await w.setProps({ product: other })
      await flushPromises()
      expect(opened.map((o) => o.path)).toEqual(['/products/slug/paulas-choice-glycolic-serum', '/products/slug/other-serum'])

      opened[0]!.resolve(FULL)
      await flushPromises()
      expect(loadingLine(w).exists()).toBe(true)
      expect(spec(w).exists()).toBe(false)

      opened[1]!.resolve({ ...other, product_ingredients: [] })
      await flushPromises()
      expect(spec(w).props('product').slug).toBe('other-serum')
    })

    it('shows the plain error state with a Try Again, never a blank modal, when the fetch fails', async () => {
      const w = await mountModal(LEAN)
      opened[0]!.reject(new Error('offline'))
      await flushPromises()

      expect(loadingLine(w).exists()).toBe(false)
      expect(spec(w).exists()).toBe(false)
      expect(w.findComponent(EmptyState).props('title')).toBe("Couldn't Load This Product")
      expect(w.findComponent(EmptyState).props('actionLabel')).toBe('Try Again')
    })

    it('asks again on Try Again, because the failed request was forgotten, and shows the product when it arrives', async () => {
      const w = await mountModal(LEAN)
      opened[0]!.reject(new Error('offline'))
      await flushPromises()

      await w.findComponent(EmptyState).vm.$emit('action')
      await flushPromises()
      expect(opened).toHaveLength(2)
      expect(loadingLine(w).exists()).toBe(true)

      opened[1]!.resolve(FULL)
      await flushPromises()
      expect(spec(w).exists()).toBe(true)
      expect(w.findComponent(EmptyState).exists()).toBe(false)
    })

    it('reuses the request a card started when the pointer reached it, sending none of its own', async () => {
      prefetchProductBySlug(LEAN.slug)
      const w = await mountModal(LEAN)

      expect(opened).toHaveLength(1)
      opened[0]!.resolve(FULL)
      await flushPromises()
      expect(spec(w).exists()).toBe(true)
    })

    it('opens with no wait, and no request, when the prefetch has already arrived', async () => {
      const first = prefetchProductBySlug(LEAN.slug)
      opened[0]!.resolve(FULL)
      await first
      const w = await mountModal(LEAN)

      expect(opened).toHaveLength(1)
      expect(loadingLine(w).exists()).toBe(false)
      expect(spec(w).exists()).toBe(true)
    })
  })

  describe('ExploreProductCard (prefetch)', () => {
    const card = () => mount(ExploreProductCard, { props: { product: LEAN } })

    it('says the pointer has reached the card, for the host to start the fetch', async () => {
      const w = card()
      await w.get('div').trigger('pointerenter')

      expect(w.emitted('prefetch')).toEqual([[LEAN]])
    })

    it('says so when focus moves into the card too', async () => {
      const w = card()
      await w.get('div').trigger('focusin')

      expect(w.emitted('prefetch')).toEqual([[LEAN]])
    })

    it('still inspects on a press, and does not count a press as a prefetch', async () => {
      const w = card()
      await w.get('div').trigger('click')

      expect(w.emitted('inspect')).toEqual([[LEAN]])
      expect(w.emitted('prefetch')).toBeUndefined()
    })
  })

  describe('ExploreView (Quick Inspect)', () => {
    const page = { template: '<div />' }

    const mountExplore = async (items: unknown[]) => {
      vi.mocked(searchProducts).mockResolvedValue(items as never)
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/', component: page }, { path: '/explore', component: page }, { path: '/product/:slug', component: page }],
      })
      await router.push('/explore')
      await router.isReady()
      const pinia = createPinia()
      setActivePinia(pinia)
      const wrapper = mount(ExploreView, {
        global: {
          plugins: [pinia, router],
          stubs: {
            teleport: true,
            SearchAutocompleteInput: true,
            SkinTypeRecommendationsWidget: true,
            ExploreProductCard: true,
            ExploreCategoryBar: true,
            ProductSpecContent: true,
            CompareSelectorModal: true,
            PriceRangeSlider: true,
            ProductShowcaseMarquee: true,
            EmptyState: true,
          },
        },
      })
      mounted.push(wrapper)
      await flushPromises()
      return wrapper
    }
    const firstCard = (w: VueWrapper) => w.findComponent(ExploreProductCard)

    it('starts the fetch for a lean item when the pointer reaches its card', async () => {
      const w = await mountExplore([LEAN])
      firstCard(w).vm.$emit('prefetch', LEAN)

      expect(opened.map((o) => o.path)).toEqual(['/products/slug/paulas-choice-glycolic-serum'])
    })

    it('starts it once for a card the pointer reaches again', async () => {
      const w = await mountExplore([LEAN])
      firstCard(w).vm.$emit('prefetch', LEAN)
      firstCard(w).vm.$emit('prefetch', LEAN)

      expect(opened).toHaveLength(1)
    })

    it('starts nothing for an item that already has its ingredient tree', async () => {
      const w = await mountExplore([FULL])
      firstCard(w).vm.$emit('prefetch', FULL)

      expect(opened).toHaveLength(0)
    })

    it('opens Quick Inspect on a press, loading the full product and then showing it', async () => {
      const w = await mountExplore([LEAN])
      firstCard(w).vm.$emit('inspect', LEAN)
      await flushPromises()

      expect(w.findComponent(UniversalProductModal).exists()).toBe(true)
      expect(w.find('.quick-inspect-loading').exists()).toBe(true)

      opened[0]!.resolve(FULL)
      await flushPromises()
      expect(w.find('.quick-inspect-loading').exists()).toBe(false)
      expect(w.findComponent(ProductSpecContent).props('product').product_ingredients).toEqual(FULL.product_ingredients)
    })

    it('opens at once, with no request, on a press for an item that has its tree', async () => {
      const w = await mountExplore([FULL])
      firstCard(w).vm.$emit('inspect', FULL)
      await flushPromises()

      expect(opened).toHaveLength(0)
      expect(w.findComponent(ProductSpecContent).exists()).toBe(true)
    })

    it('forgets the products fetched on an earlier visit when Explore opens', async () => {
      const earlier = prefetchProductBySlug(LEAN.slug)
      opened[0]!.resolve(FULL)
      await earlier
      const w = await mountExplore([LEAN])
      firstCard(w).vm.$emit('prefetch', LEAN)

      expect(opened).toHaveLength(2)
    })
  })
})
