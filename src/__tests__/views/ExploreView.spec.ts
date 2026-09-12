import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

vi.mock('../../api/products.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  searchProducts: vi.fn(),
}))

import { searchProducts } from '../../api/products.ts'
import ExploreView from '../../views/ExploreView.vue'
import SearchAutocompleteInput from '../../components/Shared/SearchAutocompleteInput.vue'
import SkinTypeRecommendationsWidget from '../../components/Shared/SkinTypeRecommendationsWidget.vue'
import ExploreProductCard from '../../components/Catalog/ExploreProductCard.vue'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'

const { toasts } = useToast()

const catalogProduct = (overrides: Record<string, unknown> = {}) => ({
  id: 'p-1',
  brand: 'CeraVe',
  name: 'Hydrating Facial Cleanser',
  category: 'Cleansers',
  slug: 'cerave-hydrating-facial-cleanser',
  price_thb: 450,
  skin_match_score: 82,
  match_reasons: [],
  product_ingredients: [],
  ...overrides,
})

/**
 * Mount at an address, because the address is this screen's input.
 *
 * Every child is stubbed: none of them is the subject, and several fetch on
 * their own (the search input debounces its own searchProducts, the marquee and
 * the cards render the catalogue) which would put their requests into the same
 * mock these cards count calls on.
 *
 * A guest by default, and deliberately so for the catalogue cards:
 * loadRecommendations returns before calling searchProducts when there is no
 * profile, so every call the mock records is fetchCatalog's own.
 */
const mountExplore = async (
  address = '/explore',
  session: { authenticated?: boolean; skinType?: string | null } = {},
) => {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/explore', component: { template: '<div />' } },
    ],
  })
  await router.push(address)
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  const { authenticated = false, skinType = 'OSPW' } = session
  if (authenticated) auth.setAuth('token-1', { id: 'u-1', skin_type: skinType })

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
  await flushPromises()

  return { wrapper, router, auth }
}

/** Only fetchCatalog passes the price bounds, so this counts its calls alone. */
const catalogRequests = () =>
  vi.mocked(searchProducts).mock.calls.filter((args) => args.length === 3)

const cards = (wrapper: VueWrapper) => wrapper.findAllComponents(ExploreProductCard)

const searchInput = (wrapper: VueWrapper) =>
  wrapper.findAllComponents(SearchAutocompleteInput)[0]!

describe('src/views/ExploreView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    toasts.value.splice(0)
    vi.mocked(searchProducts).mockResolvedValue([catalogProduct()])
  })

  describe('fetchCatalog()', () => {
    it('requests the catalogue with the term already in the address', async () => {
      // FE-DEF-30's first half: syncFiltersFromURL runs before fetchCatalog, so
      // the first request of every Explore load carries the term the user
      // actually searched for rather than an empty one.
      await mountExplore('/explore?q=retinol')

      expect(catalogRequests()).toEqual([['retinol', 0, 1500]])
    })

    it('clears the grid and reports a catalogue that could not be reached', async () => {
      vi.mocked(searchProducts).mockRejectedValue(new Error('network down'))
      const { wrapper } = await mountExplore()

      // FE-DEF-09: not the empty state. An empty array cannot say whether it is
      // empty by result or empty by failure, and the empty state's action would
      // only rerun the same failing request.
      expect(wrapper.text()).toContain('Catalog Unavailable')
      expect(cards(wrapper)).toHaveLength(0)
      expect(toasts.value[0]!.message).toBe('Failed to load product catalog.')
    })

    it('requests again when the retry control is pressed', async () => {
      vi.mocked(searchProducts).mockRejectedValue(new Error('network down'))
      const { wrapper } = await mountExplore()
      vi.mocked(searchProducts).mockResolvedValue([catalogProduct()])

      await wrapper.findAll('button').find((b) => b.text().includes('Retry Retrieval'))!.trigger('click')
      await flushPromises()

      expect(catalogRequests()).toHaveLength(2)
      expect(wrapper.text()).not.toContain('Catalog Unavailable')
      expect(cards(wrapper)).toHaveLength(1)
    })
  })

  describe('search (address term versus in-memory filtering)', () => {
    it('ignores the search input keystroke event rather than filtering the loaded page', async () => {
      // The reported defect, and the third occurrence of FE-DEF-30. Despite its
      // name the child emits `search-submit` from a watcher on every keystroke,
      // so binding it to this page's searchQuery re-ran filteredCatalog over
      // whatever was already in memory - the previous term's at-most-100
      // results. A half-typed search could then report "No Formulation Matches"
      // about a product the catalogue holds.
      const { wrapper } = await mountExplore()
      expect(cards(wrapper)).toHaveLength(1)

      searchInput(wrapper).vm.$emit('search-submit', 'niacinamide')
      await flushPromises()

      // No request, because nothing submitted - and, the half that was the bug,
      // no silent narrowing of the grid either.
      expect(catalogRequests()).toHaveLength(1)
      expect(cards(wrapper)).toHaveLength(1)
      expect(wrapper.text()).not.toContain('No Formulation Matches')
    })

    it('requests the catalogue again when a submitted term reaches the address', async () => {
      // What submitting does instead: the child pushes /explore?q=..., which is
      // the single path the desktop TopNav search also uses.
      const { router } = await mountExplore()

      await router.push('/explore?q=niacinamide')
      await flushPromises()

      expect(catalogRequests()).toEqual([
        ['', 0, 1500],
        ['niacinamide', 0, 1500],
      ])
    })

    it('does not put a request behind a category change', async () => {
      // Category and brand are applied client-side over the same response, and
      // only `q` and the price bounds are sent, so re-fetching for them would
      // cost a round trip and change nothing on screen.
      const { router } = await mountExplore()

      await router.push('/explore?category=Cleansers')
      await flushPromises()

      expect(catalogRequests()).toHaveLength(1)
    })
  })

  describe('showRecommendations', () => {
    it('hides the recommendations panel from a guest', async () => {
      const { wrapper } = await mountExplore()

      // An anonymous catalogue response carries no match score, so there is
      // nothing to rank and an empty state would say nothing useful.
      expect(wrapper.findComponent(SkinTypeRecommendationsWidget).exists()).toBe(false)
      expect(searchProducts).toHaveBeenCalledTimes(1)
    })

    it('hides it from a signed-in user who has not taken the quiz', async () => {
      const { wrapper } = await mountExplore('/explore', {
        authenticated: true,
        skinType: null,
      })

      expect(wrapper.findComponent(SkinTypeRecommendationsWidget).exists()).toBe(false)
    })

    it('shows it, ranked, once a profile exists', async () => {
      const { wrapper } = await mountExplore('/explore', { authenticated: true })

      const widget = wrapper.findComponent(SkinTypeRecommendationsWidget)
      expect(widget.exists()).toBe(true)
      expect(widget.props('userSkinType')).toBe('OSPW')
      expect(widget.props('failed')).toBe(false)
      // Fetched unfiltered rather than derived from the catalogue on screen:
      // fetchCatalog sends the active term and price bounds, so recommendations
      // taken from its result would shift as the user filters.
      expect(searchProducts).toHaveBeenCalledWith()
    })

    it('tells the widget the ranking failed rather than showing it empty', async () => {
      vi.mocked(searchProducts).mockRejectedValue(new Error('network down'))
      const { wrapper } = await mountExplore('/explore', { authenticated: true })

      expect(wrapper.findComponent(SkinTypeRecommendationsWidget).props('failed')).toBe(true)
    })
  })
})
