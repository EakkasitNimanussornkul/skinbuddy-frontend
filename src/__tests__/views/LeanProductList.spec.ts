import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// No network. getWithGuestFallback is what every optional-auth GET goes through,
// so the real searchProducts below is judged by the request it would have sent.
// The page-level cases use the mocked searchProducts, to read what each consumer
// asks for.
vi.mock('../../api/optionalAuth', () => ({ getWithGuestFallback: vi.fn() }))
vi.mock('../../api/shelfapi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/shelfapi')>()),
  getMyShelf: vi.fn(),
}))
vi.mock('../../api/products', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  searchProducts: vi.fn(),
}))

import { getWithGuestFallback } from '../../api/optionalAuth'
import { getMyShelf } from '../../api/shelfapi'
import { searchProducts } from '../../api/products'
import ExploreView from '../../views/ExploreView.vue'
import SkinProfileView from '../../views/SkinProfileView.vue'
import ExploreProductCard from '../../components/Catalog/ExploreProductCard.vue'
import CompareSelectorModal from '../../components/Compare/CompareSelectorModal.vue'
import AddProductModal from '../../components/Shelf/AddProductModal.vue'
import AddToRoutineModal from '../../components/Routine/AddToRoutineModal.vue'
import SearchAutocompleteInput from '../../components/Shared/SearchAutocompleteInput.vue'
import { useAuthStore } from '../../stores/auth'

const { searchProducts: realSearchProducts } = await vi.importActual<typeof import('../../api/products')>('../../api/products')

/** A real row of GET /products/search?view=card (34 products, 45,779 B). */
const CARD_ITEM = {
  id: 'p-1',
  brand: 'Paula\'s Choice',
  name: 'Glycolic Serum',
  category: 'Serums',
  image_url: null,
  description: null,
  price_thb: 990,
  price_usd: 28,
  slug: 'paulas-choice-glycolic-serum',
  source_url: null,
  benefits: [],
  good_for: [],
  pao_months: 12,
  updated_at: '2026-10-01T00:00:00Z',
  skin_match_score: 78,
  match_breakdown: { helpful: 3, concerns: 1, concern_weight: 1, considered: 4, total_ingredients: 5, limited: false, verified_considered: 2 },
  match_reasons: [],
  caution_reasons: [],
  safety_flags: { alcohol_free: true },
  has_conflict: false,
  top_ingredients: ['Water', 'Glycolic Acid', 'Glycerin'],
  ingredient_count: 5,
}

/** The same product as an older backend sends it: the full tree, no ingredient_count. */
const OLD_ITEM = (names: string[]) => {
  const { ingredient_count: _count, top_ingredients: _top, ...rest } = CARD_ITEM
  return { ...rest, product_ingredients: names.map((name) => ({ ingredients: { name } })) }
}

const mountCard = (product: Record<string, unknown>) => mount(ExploreProductCard, { props: { product } })
const summary = (product: Record<string, unknown>) => mountCard(product).get('.card-description').text()

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
})

describe('feat/29 the lean product list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(searchProducts).mockResolvedValue([])
    vi.mocked(getMyShelf).mockResolvedValue([])
  })

  describe('searchProducts() (the view option)', () => {
    // searchProducts keeps a request until it settles, so every one a test left
    // open is answered after it, or the next test would be handed it.
    const everOpened: Array<(v: unknown) => void> = []
    afterEach(async () => {
      everOpened.splice(0).forEach((resolve) => resolve([]))
      await flushPromises()
    })

    /** A request left open, so a second call can be made while the first is in flight. */
    const open = () => {
      const resolvers: Array<(v: unknown) => void> = []
      vi.mocked(getWithGuestFallback).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvers.push(resolve)
            everOpened.push(resolve)
          }) as never,
      )
      return resolvers
    }

    it('sends view=card when the lean list is asked for', () => {
      open()
      realSearchProducts('', undefined, undefined, { view: 'card' })

      expect(getWithGuestFallback).toHaveBeenCalledWith('/products/search', { params: { view: 'card' } })
    })

    it('sends view=card together with the term and the price bounds', () => {
      open()
      realSearchProducts('retinol', 100, 900, { view: 'card' })

      expect(getWithGuestFallback).toHaveBeenCalledWith('/products/search', {
        params: { q: 'retinol', min_price: 100, max_price: 900, view: 'card' },
      })
    })

    it('sends no view at all when no option is given, so the default request is the one it always was', () => {
      open()
      realSearchProducts()
      realSearchProducts('retinol', 100, 900)

      expect(getWithGuestFallback).toHaveBeenNthCalledWith(1, '/products/search', { params: {} })
      expect(getWithGuestFallback).toHaveBeenNthCalledWith(2, '/products/search', {
        params: { q: 'retinol', min_price: 100, max_price: 900 },
      })
    })

    it('sends no view for an option that is not the card view', () => {
      open()
      realSearchProducts('', undefined, undefined, { view: 'full' as never })
      realSearchProducts('', undefined, undefined, {})

      expect(getWithGuestFallback).toHaveBeenNthCalledWith(1, '/products/search', { params: {} })
      expect(getWithGuestFallback).toHaveBeenCalledTimes(1)
    })

    it('keeps a lean request and a default request for the same search apart', () => {
      open()
      const lean = realSearchProducts('', undefined, undefined, { view: 'card' })
      const full = realSearchProducts()

      expect(lean).not.toBe(full)
      expect(getWithGuestFallback).toHaveBeenCalledTimes(2)
    })

    it('shares one request between two lean requests for the same search', () => {
      open()
      realSearchProducts('', undefined, undefined, { view: 'card' })
      realSearchProducts(undefined, undefined, undefined, { view: 'card' })

      expect(getWithGuestFallback).toHaveBeenCalledTimes(1)
    })

    it('settles the shared lean request, so the next one after it is sent afresh', async () => {
      const resolvers = open()
      const first = realSearchProducts('', undefined, undefined, { view: 'card' })
      resolvers[0]!([CARD_ITEM])
      await first
      realSearchProducts('', undefined, undefined, { view: 'card' })

      expect(getWithGuestFallback).toHaveBeenCalledTimes(2)
    })
  })

  describe('ExploreProductCard (the summary line without a description)', () => {
    it('names the first three ingredients and "and more" from top_ingredients and ingredient_count', () => {
      expect(summary(CARD_ITEM)).toBe('Formulated with Water, Glycolic Acid, Glycerin, and more.')
    })

    it('leaves out "and more" when the count is three', () => {
      expect(summary({ ...CARD_ITEM, ingredient_count: 3 })).toBe('Formulated with Water, Glycolic Acid, Glycerin.')
    })

    it('names what there is when the product has fewer than three ingredients', () => {
      expect(summary({ ...CARD_ITEM, top_ingredients: ['Water'], ingredient_count: 1 })).toBe('Formulated with Water.')
    })

    it('says "Active formula composition." when the count is 0', () => {
      expect(summary({ ...CARD_ITEM, top_ingredients: [], ingredient_count: 0 })).toBe('Active formula composition.')
    })

    it('says "Active formula composition." when the names did not arrive, rather than naming nothing', () => {
      const { top_ingredients: _top, ...noNames } = CARD_ITEM
      expect(summary(noNames)).toBe('Active formula composition.')
    })

    it('reads an older backend\'s product_ingredients when the card fields are absent, in the same words', () => {
      const old = OLD_ITEM(['Water', 'Glycolic Acid', 'Glycerin', 'Panthenol', 'Sodium Hyaluronate'])

      expect(summary(old)).toBe('Formulated with Water, Glycolic Acid, Glycerin, and more.')
      expect(summary(old)).toBe(summary(CARD_ITEM))
    })

    it('says "Active formula composition." for an older backend\'s empty list and for a product with neither', () => {
      expect(summary({ ...OLD_ITEM([]) })).toBe('Active formula composition.')
      const { top_ingredients: _top, ingredient_count: _count, ...neither } = CARD_ITEM
      expect(summary(neither)).toBe('Active formula composition.')
    })

    it('shows the description instead when there is one, whichever shape the product is', () => {
      expect(summary({ ...CARD_ITEM, description: 'A daily exfoliant.' })).toBe('A daily exfoliant.')
    })

    it('still draws the match badge from match_breakdown on a lean item', () => {
      expect(mountCard(CARD_ITEM).get('.match-badge').text()).toContain('78')
    })
  })

  describe('which pages ask for the lean list', () => {
    const page = { template: '<div />' }

    const mountExplore = async (signedIn: boolean) => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/', component: page }, { path: '/explore', component: page }],
      })
      await router.push('/explore')
      await router.isReady()
      const pinia = createPinia()
      setActivePinia(pinia)
      if (signedIn) useAuthStore().setAuth('token-1', { id: 'u-1', skin_type: 'OSPW' })
      const wrapper = mount(ExploreView, {
        global: {
          plugins: [pinia, router],
          stubs: {
            teleport: true,
            SearchAutocompleteInput: true,
            SkinTypeRecommendationsWidget: true,
            ExploreProductCard: true,
            ExploreCategoryBar: true,
            UniversalProductModal: true,
            CompareSelectorModal: true,
            PriceRangeSlider: true,
            ProductShowcaseMarquee: true,
            EmptyState: true,
          },
        },
      })
      mounted.push(wrapper)
      await flushPromises()
    }

    it('has Explore ask for the lean list for its grid', async () => {
      await mountExplore(false)

      expect(searchProducts).toHaveBeenCalledWith('', undefined, undefined, { view: 'card' })
    })

    it('has Explore ask for the lean list for its recommendations too', async () => {
      await mountExplore(true)

      expect(searchProducts).toHaveBeenCalledTimes(2)
      expect(searchProducts).toHaveBeenCalledWith(undefined, undefined, undefined, { view: 'card' })
    })

    it('has the skin profile page ask for the lean list for its recommendations', async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/profile', component: SkinProfileView }, { path: '/:rest(.*)', component: page }],
      })
      await router.push('/profile')
      await router.isReady()
      const pinia = createPinia()
      setActivePinia(pinia)
      useAuthStore().setAuth('token-1', { id: 'u-1', skin_type: 'OSNT' })
      mounted.push(mount(SkinProfileView, { global: { plugins: [pinia, router], stubs: { teleport: true } } }))
      await flushPromises()

      expect(searchProducts).toHaveBeenCalledWith(undefined, undefined, undefined, { view: 'card' })
    })

    it('has the compare selector ask for the lean list', async () => {
      const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: page }] })
      await router.push('/')
      mounted.push(mount(CompareSelectorModal, { props: { baseProduct: CARD_ITEM }, global: { plugins: [router] } }))
      await flushPromises()

      expect(searchProducts).toHaveBeenCalledWith('', undefined, undefined, { view: 'card' })
    })

    it('has the search suggestions ask for the lean list', async () => {
      vi.useFakeTimers()
      try {
        const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: page }] })
        await router.push('/')
        const w = mount(SearchAutocompleteInput, { global: { plugins: [router] } })
        mounted.push(w)
        await w.get('input').setValue('serum')
        await vi.advanceTimersByTimeAsync(300)
        await flushPromises()

        expect(searchProducts).toHaveBeenCalledWith('serum', undefined, undefined, { view: 'card' })
      } finally {
        vi.useRealTimers()
      }
    })

    it('leaves the shelf\'s Add product on the full list, because choosing one shows its key actives', async () => {
      mounted.push(mount(AddProductModal, { global: { stubs: { teleport: true, CatalogSearchView: true } } }))
      await flushPromises()

      expect(searchProducts).toHaveBeenCalledTimes(1)
      expect(vi.mocked(searchProducts).mock.calls[0]).toEqual([''])
    })

    it('leaves the routine\'s Add step on the request it always sent', async () => {
      vi.useFakeTimers()
      try {
        const w = mount(AddToRoutineModal, {
          props: { existingProductIds: [] },
          global: { stubs: { teleport: true, SafetyWarningModal: true } },
        })
        mounted.push(w)
        await flushPromises()
        await w.get('input[type="text"]').setValue('serum')
        await vi.advanceTimersByTimeAsync(400)
        await flushPromises()

        expect(searchProducts).toHaveBeenCalledTimes(1)
        expect(vi.mocked(searchProducts).mock.calls[0]).toEqual(['serum'])
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
