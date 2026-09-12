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

    it('reports a catalogue that could not be reached in place of the grid', async () => {
      // Retitled from "clears the grid and reports...". Nothing is cleared on
      // a first load that fails - the list starts empty - and the grid is not
      // rendered in the failed state, so the old title claimed something this
      // card could not observe. Clearing is covered where it can be seen, by
      // the price re-request card below, which reads the always-rendered
      // marquee instead.
      vi.mocked(searchProducts).mockRejectedValue(new Error('network down'))
      const { wrapper } = await mountExplore()

      // FE-DEF-09: not the empty state. An empty array cannot say whether it is
      // empty by result or empty by failure, and the empty state's action would
      // only rerun the same failing request.
      expect(wrapper.text()).toContain('Catalog Unavailable')
      // By component, not by its title text: EmptyState is stubbed here, so its
      // title never renders as text and a text assertion would hold either way.
      expect(wrapper.findComponent({ name: 'EmptyState' }).exists()).toBe(false)
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
      // By component rather than by title text, which a stubbed EmptyState
      // never renders - the text form of this line held either way.
      expect(wrapper.findComponent({ name: 'EmptyState' }).exists()).toBe(false)
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

    it('tells the widget it is on the catalogue, so it does not link back to it', async () => {
      // The prop SkinTypeRecommendationsWidget had stopped reading. Pinned from
      // the host side as well, because the widget's own fix is only reachable if
      // this host keeps passing it.
      const { wrapper } = await mountExplore('/explore', { authenticated: true })

      expect(wrapper.findComponent(SkinTypeRecommendationsWidget).props('hideCatalogLink')).toBe(true)
    })
  })

  // Appended after the three groups already cited, so adding these moves none
  // of their IDs.

  describe('filteredCatalog (category and brand)', () => {
    const mixedCatalogue = () => [
      catalogProduct({ id: 'c1', brand: 'CeraVe', name: 'Hydrating Cleanser', category: 'Cleanser' }),
      catalogProduct({ id: 'c2', brand: 'La Roche-Posay', name: 'Toleriane Cleanser', category: 'Cleanser' }),
      catalogProduct({ id: 's1', brand: 'CeraVe', name: 'Resurfacing Serum', category: 'Serum' }),
      catalogProduct({ id: 'u1', brand: 'Beauty of Joseon', name: 'Relief Sun', category: 'Sunscreen' }),
    ]

    const shownIds = (wrapper: VueWrapper) => cards(wrapper).map((c) => c.props('product').id)

    beforeEach(() => {
      vi.mocked(searchProducts).mockResolvedValue(mixedCatalogue())
    })

    it('narrows to the category in the address', async () => {
      const { wrapper } = await mountExplore('/explore?category=Serums')

      expect(shownIds(wrapper)).toEqual(['s1'])
    })

    it('matches a plural category chip against a singular catalogue category', async () => {
      // The chips are plural ("Cleansers") and the catalogue stores singular
      // ("Cleanser"). cleanString strips the trailing s from both before
      // comparing, which is the whole of what makes a chip select anything.
      const { wrapper } = await mountExplore('/explore?category=Cleansers')

      expect(shownIds(wrapper)).toEqual(['c1', 'c2'])
    })

    it('leaves a category that does not end in s as it is', async () => {
      const { wrapper } = await mountExplore('/explore?category=Sunscreen')

      expect(shownIds(wrapper)).toEqual(['u1'])
    })

    // Recorded rather than covered, because there is nothing to cover.
    // cleanString reads `res.endsWith('s') && res !== 'sunscreen'`, and the
    // second clause can never decide anything: "sunscreen" does not end in s,
    // so any value equal to it has already failed the first clause. The
    // exception is dead. A card here was first written claiming it kept
    // "Sunscreen" from being stripped, and it passed - but it would pass with
    // the clause deleted, which is the vacuous shape this project's register
    // keeps recording. Separately, and not verified: the fixed chip is "Sun
    // Care", which cleans to "sun care" and matches no category spelled
    // "Sunscreen". Whether that chip selects anything depends on how the
    // catalogue actually spells the category, which was not checked.

    it('narrows to the brand in the address', async () => {
      const { wrapper } = await mountExplore('/explore?brand=CeraVe')

      expect(shownIds(wrapper)).toEqual(['c1', 's1'])
    })

    it('applies the category and the brand together, not either alone', async () => {
      const { wrapper } = await mountExplore('/explore?category=Cleansers&brand=CeraVe')

      expect(shownIds(wrapper)).toEqual(['c1'])
    })

    it('says nothing matched when the filters exclude everything, not that the catalogue failed', async () => {
      const { wrapper } = await mountExplore('/explore?category=Toners')

      expect(shownIds(wrapper)).toEqual([])
      expect(wrapper.findComponent({ name: 'EmptyState' }).exists()).toBe(true)
      expect(wrapper.text()).not.toContain('Catalog Unavailable')
    })

    it('offers the brands present in the loaded catalogue, sorted', async () => {
      const { wrapper } = await mountExplore()

      const options = wrapper.findAll('select option').map((o) => o.text())
      expect(options).toEqual(['All Curated Brands', 'Beauty of Joseon', 'CeraVe', 'La Roche-Posay'])
    })

    it('follows the address when it changes rather than only on load', async () => {
      const { wrapper, router } = await mountExplore('/explore?category=Serums')
      expect(shownIds(wrapper)).toEqual(['s1'])

      await router.push('/explore')
      await flushPromises()

      expect(shownIds(wrapper)).toEqual(['c1', 'c2', 's1', 'u1'])
    })
  })

  describe('handleCategoryUpdate()', () => {
    it('writes the chosen category into the address, keeping the rest of the query', async () => {
      // Written to the address rather than held in component state, so a
      // filtered view can be linked and survives a reload - and the watcher is
      // what then applies it.
      const { wrapper, router } = await mountExplore('/explore?q=cleanser')

      wrapper.findComponent({ name: 'ExploreCategoryBar' }).vm.$emit('update:selected-category', 'Serums')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({ q: 'cleanser', category: 'Serums' })
    })

    it('removes the category from the address when All is chosen', async () => {
      const { wrapper, router } = await mountExplore('/explore?category=Serums')

      wrapper.findComponent({ name: 'ExploreCategoryBar' }).vm.$emit('update:selected-category', 'All')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({})
    })
  })

  describe('handlePriceApply() and handlePriceClear()', () => {
    it('requests the catalogue again with the new bounds', async () => {
      // Unlike category and brand, the bounds are sent to the backend, so
      // applying them has to re-request rather than re-filter.
      const { wrapper } = await mountExplore('/explore?q=serum')

      wrapper.findComponent({ name: 'PriceRangeSlider' }).vm.$emit('apply', { min: 200, max: 800 })
      await flushPromises()

      expect(catalogRequests()).toEqual([
        ['serum', 0, 1500],
        ['serum', 200, 800],
      ])
    })

    it('passes the applied bounds back to the slider', async () => {
      const { wrapper } = await mountExplore()

      wrapper.findComponent({ name: 'PriceRangeSlider' }).vm.$emit('apply', { min: 200, max: 800 })
      await flushPromises()

      const slider = wrapper.findComponent({ name: 'PriceRangeSlider' })
      expect(slider.props('minPrice')).toBe(200)
      expect(slider.props('maxPrice')).toBe(800)
    })

    it('restores the default bounds and requests again when cleared', async () => {
      const { wrapper } = await mountExplore()
      wrapper.findComponent({ name: 'PriceRangeSlider' }).vm.$emit('apply', { min: 200, max: 800 })
      await flushPromises()

      wrapper.findComponent({ name: 'PriceRangeSlider' }).vm.$emit('clear')
      await flushPromises()

      expect(catalogRequests()[2]).toEqual(['', 0, 1500])
      expect(wrapper.findComponent({ name: 'PriceRangeSlider' }).props('maxPrice')).toBe(1500)
    })

    it('clears the grid rather than keeping the previous bounds’ results when a re-request fails', async () => {
      // The trade fetchCatalog's catch makes. Keeping the old results would show
      // products from the previous bounds while the slider shows the new ones -
      // stale data presented as current, with only a toast to say otherwise.
      const { wrapper } = await mountExplore()
      const marquee = () => wrapper.findComponent({ name: 'ProductShowcaseMarquee' })
      expect(marquee().props('products')).toHaveLength(1)

      vi.mocked(searchProducts).mockRejectedValue(new Error('network down'))
      wrapper.findComponent({ name: 'PriceRangeSlider' }).vm.$emit('apply', { min: 200, max: 800 })
      await flushPromises()

      // Read off the header marquee, not the grid. The first version of this
      // card asserted the grid was empty, and passed with the clearing line
      // deleted: in the failed state the grid is not rendered at all, so it is
      // empty whatever `catalog` holds. The marquee takes :products="catalog"
      // and renders in every state, so it is the one place the list is
      // observable here - the same repair the ShelfView card needed.
      expect(marquee().props('products')).toEqual([])
      expect(wrapper.text()).toContain('Catalog Unavailable')
    })
  })
})
