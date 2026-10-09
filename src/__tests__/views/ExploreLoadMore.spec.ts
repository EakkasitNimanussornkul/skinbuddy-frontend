import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

vi.mock('../../api/products.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  searchProducts: vi.fn(),
}))
vi.mock('../../api/metaApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/metaApi')>()),
  getFacets: vi.fn(),
}))

import { searchProducts, type SearchOptions } from '../../api/products.ts'
import { getFacets } from '../../api/metaApi'
import ExploreView from '../../views/ExploreView.vue'
import ExploreProductCard from '../../components/Catalog/ExploreProductCard.vue'
import ExploreCategoryBar from '../../components/Catalog/ExploreCategoryBar.vue'
import LoadMoreStrip from '../../components/Catalog/LoadMoreStrip.vue'
import { useToast } from '../../composables/useToast'

const { toasts } = useToast()

/** GET /meta/facets as the live backend answered it (read-only, 2026-10-10; no Serums product exists). */
const LIVE_FACETS = {
  categories: ['Cleansers', 'Toners', 'Treatments', 'Moisturizers', 'Exfoliators', 'Sun Care'],
  brands: ['Anessa', 'Biore', 'CeraVe', 'COSRX', 'Eucerin', 'Innisfree', 'Klairs', 'La Roche-Posay', 'Neutrogena', "Paula's Choice", 'Pixi', 'Simple', 'SKIN1004', 'Some By Mi', 'The Ordinary'],
  total: 34,
}

/** 34 products: the first 20 Serums and the last 14 Toners, brands alternating. */
const PRODUCTS = Array.from({ length: 34 }, (_, i) => ({
  id: `p${i + 1}`,
  brand: i % 2 === 0 ? 'COSRX' : 'CeraVe',
  name: `Product ${i + 1}`,
  category: i < 20 ? 'Serums' : 'Toners',
  slug: `product-${i + 1}`,
  price_thb: 450,
  skin_match_score: null,
  product_ingredients: [],
}))

type Row = (typeof PRODUCTS)[number]

/**
 * The backend as feat/30 expects it: the category and brand are filtered before the
 * page is cut, and X-Total-Count (here, onTotal) is the number before the cut.
 */
const serve = (all: Row[] = PRODUCTS) =>
  vi.mocked(searchProducts).mockImplementation((async (_q: string, _min?: number, _max?: number, options?: SearchOptions) => {
    let rows = all
    if (options?.category && options.category !== 'All') rows = rows.filter((p) => p.category === options.category)
    if (options?.brand && options.brand !== 'All') rows = rows.filter((p) => p.brand === options.brand)
    options?.onTotal?.(rows.length)
    const offset = options?.offset ?? 0
    return rows.slice(offset, offset + (options?.limit ?? rows.length))
  }) as never)

/** A request held open until the test answers it. */
const hold = () => {
  const held: { options: SearchOptions | undefined; resolve: (rows: unknown[], total?: number | null) => void; reject: (e: Error) => void } = {
    options: undefined,
    resolve: () => {},
    reject: () => {},
  }
  const promise = new Promise<unknown[]>((resolve, reject) => {
    held.resolve = (rows, total = null) => {
      if (total !== null) held.options?.onTotal?.(total)
      resolve(rows)
    }
    held.reject = reject
  })
  vi.mocked(searchProducts).mockImplementationOnce(((_q: string, _a?: number, _b?: number, options?: SearchOptions) => {
    held.options = options
    return promise
  }) as never)
  return held
}

const mounted: VueWrapper[] = []
const mountExplore = async (address = '/explore') => {
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
    attachTo: document.body,
  })
  mounted.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

/** What the grid asked for, one entry per request (a guest sends no shortlist request). */
const asked = () => vi.mocked(searchProducts).mock.calls.map((args) => ({ term: args[0], options: args[3] as SearchOptions }))
const lastAsked = () => asked()[asked().length - 1]!.options

const cardIds = (w: VueWrapper) => w.findAllComponents(ExploreProductCard).map((c) => c.props('product').id as string)
const idsFrom = (from: number, to: number) => PRODUCTS.slice(from - 1, to).map((p) => p.id)
const stripEl = (w: VueWrapper) => w.find('.load-more')
const stripText = (w: VueWrapper) => w.get('.load-more .strip-text').text()
const stripButton = (w: VueWrapper) => w.get<HTMLButtonElement>('.load-more .strip-button')
const showMore = async (w: VueWrapper) => {
  await stripButton(w).trigger('click')
  await flushPromises()
}
const brandSelect = (w: VueWrapper) => w.get<HTMLSelectElement>('select.toolbar-brand-select')

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  toasts.value.splice(0)
  serve()
  vi.mocked(getFacets).mockRejectedValue(new Error('no facets'))
})
afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount()
  document.body.innerHTML = ''
})

describe('feat/30 Explore loads the list a page at a time', () => {
  describe('ExploreView (the first page)', () => {
    it('asks for the first 12 products, from the start, in the lean shape', async () => {
      await mountExplore()

      expect(asked()).toHaveLength(1)
      expect(asked()[0]!.options).toMatchObject({ view: 'card', limit: 12, offset: 0 })
    })

    it('shows those 12 and the strip under them, saying 12 of 34', async () => {
      const { wrapper } = await mountExplore()

      expect(cardIds(wrapper)).toEqual(idsFrom(1, 12))
      expect(stripText(wrapper)).toBe('Showing 12 of 34 products')
      expect(stripButton(wrapper).text()).toBe('Show 12 more')
    })

    it('counts the products in the heading from the server\'s total, not from the 12 on the page', async () => {
      const { wrapper } = await mountExplore()

      expect(wrapper.get('.catalog-count').text()).toBe('34 products')
    })

    it('sends no category or brand while both are All', async () => {
      await mountExplore()

      expect(asked()[0]!.options.category).toBe('All')
      expect(asked()[0]!.options.brand).toBe('All')
    })

    it('puts the strip after the grid and before the "Missing a product?" card', async () => {
      const { wrapper } = await mountExplore()

      const strip = stripEl(wrapper).element
      const missing = wrapper.get('.missing-product').element
      const grid = wrapper.get('.catalog-results').element
      expect(grid.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(strip.compareDocumentPosition(missing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })

  describe('ExploreView (Show more)', () => {
    it('asks for the next 12 from offset 12, with the same search, and adds them under the first 12', async () => {
      const { wrapper } = await mountExplore()

      await showMore(wrapper)

      expect(asked()).toHaveLength(2)
      expect(lastAsked()).toMatchObject({ limit: 12, offset: 12 })
      expect(cardIds(wrapper)).toEqual(idsFrom(1, 24))
      expect(stripText(wrapper)).toBe('Showing 24 of 34 products')
    })

    it('names the last batch "Show the last 10", then says that is all 34 and stops offering more', async () => {
      const { wrapper } = await mountExplore()
      await showMore(wrapper)
      expect(stripButton(wrapper).text()).toBe('Show the last 10')

      await showMore(wrapper)

      expect(lastAsked()).toMatchObject({ limit: 12, offset: 24 })
      expect(cardIds(wrapper)).toEqual(idsFrom(1, 34))
      expect(stripText(wrapper)).toBe('That is all 34 products')
      expect(stripButton(wrapper).text()).toBe('Back to top')
    })

    it('advances the offset by the rows a page brought, not by the page size', async () => {
      const { wrapper } = await mountExplore()
      vi.mocked(searchProducts).mockImplementationOnce((async (_q: string, _a?: number, _b?: number, options?: SearchOptions) => {
        options?.onTotal?.(34)
        return PRODUCTS.slice(12, 17)
      }) as never)

      await showMore(wrapper)
      await showMore(wrapper)

      expect(asked().map((a) => a.options.offset)).toEqual([0, 12, 17])
    })

    it('shows the page on its way as busy, keeps the 12 on screen, and does not ask twice', async () => {
      const { wrapper } = await mountExplore()
      const page = hold()

      await stripButton(wrapper).trigger('click')
      await flushPromises()
      // A second press, and the strip's own event too, while the first is on its way.
      await stripButton(wrapper).trigger('click')
      wrapper.findComponent(LoadMoreStrip).vm.$emit('load-more')
      await flushPromises()

      expect(asked()).toHaveLength(2)
      expect(stripText(wrapper)).toBe('Loading products 13 to 24')
      expect(wrapper.get('.load-more [role="group"]').attributes('aria-busy')).toBe('true')
      expect(cardIds(wrapper)).toEqual(idsFrom(1, 12))

      page.resolve(PRODUCTS.slice(12, 24), 34)
      await flushPromises()
      expect(cardIds(wrapper)).toEqual(idsFrom(1, 24))
    })

    it('keeps the focus on the same button while a page loads and after it has', async () => {
      const { wrapper } = await mountExplore()
      const button = stripButton(wrapper).element
      button.focus()
      const page = hold()

      await stripButton(wrapper).trigger('click')
      await flushPromises()
      expect(document.activeElement).toBe(button)

      page.resolve(PRODUCTS.slice(12, 24), 34)
      await flushPromises()
      expect(stripButton(wrapper).element).toBe(button)
      expect(document.activeElement).toBe(button)
      expect(stripText(wrapper)).toBe('Showing 24 of 34 products')
    })

    it('does not show a product twice when the catalogue shifted between two pages', async () => {
      const { wrapper } = await mountExplore()
      vi.mocked(searchProducts).mockImplementationOnce((async (_q: string, _a?: number, _b?: number, options?: SearchOptions) => {
        options?.onTotal?.(34)
        return PRODUCTS.slice(10, 22)
      }) as never)

      await showMore(wrapper)

      expect(cardIds(wrapper)).toEqual(idsFrom(1, 22))
    })

    it('treats an empty page, while the total says more, as the end of the list', async () => {
      const { wrapper } = await mountExplore()
      vi.mocked(searchProducts).mockImplementationOnce((async (_q: string, _a?: number, _b?: number, options?: SearchOptions) => {
        options?.onTotal?.(34)
        return []
      }) as never)

      await showMore(wrapper)

      expect(stripText(wrapper)).toBe('That is all 12 products')
      expect(asked()).toHaveLength(2)
    })

    it('staggers the new cards from the top of their own page, not from the top of the list', async () => {
      const { wrapper } = await mountExplore()
      await showMore(wrapper)

      const delays = wrapper.findAllComponents(ExploreProductCard).map((c) => c.attributes('style'))
      expect(delays[0]).toContain('--enter-delay: 0ms')
      expect(delays[12]).toContain('--enter-delay: 0ms')
      expect(delays[14]).toContain('--enter-delay: 70ms')
    })
  })

  describe('ExploreView (the next page fails)', () => {
    it('keeps the products shown and says so in an alert', async () => {
      const { wrapper } = await mountExplore()
      const page = hold()

      await stripButton(wrapper).trigger('click')
      page.reject(new Error('offline'))
      await flushPromises()

      expect(cardIds(wrapper)).toEqual(idsFrom(1, 12))
      expect(wrapper.get('.load-more [role="alert"]').text()).toContain('Could not load the next products.')
      expect(wrapper.get('.load-more [role="alert"]').text()).toContain('Your first 12 are still here.')
      expect(stripButton(wrapper).text()).toBe('Try again')
    })

    it('does not replace the page with the catalogue-unavailable message or a toast', async () => {
      const { wrapper } = await mountExplore()
      const page = hold()

      await stripButton(wrapper).trigger('click')
      page.reject(new Error('offline'))
      await flushPromises()

      expect(wrapper.text()).not.toContain('Catalog Unavailable')
      expect(toasts.value).toHaveLength(0)
    })

    it('asks for the same page again on Try again, and adds it when it arrives', async () => {
      const { wrapper } = await mountExplore()
      const page = hold()
      await stripButton(wrapper).trigger('click')
      page.reject(new Error('offline'))
      await flushPromises()

      await showMore(wrapper)

      expect(asked().map((a) => a.options.offset)).toEqual([0, 12, 12])
      expect(cardIds(wrapper)).toEqual(idsFrom(1, 24))
      expect(wrapper.find('.load-more [role="alert"]').exists()).toBe(false)
      expect(stripText(wrapper)).toBe('Showing 24 of 34 products')
    })
  })

  describe('ExploreView (starting the list again)', () => {
    it('goes back to the first page when the brand changes, replacing the list', async () => {
      const { wrapper } = await mountExplore()
      await showMore(wrapper)

      await brandSelect(wrapper).setValue('CeraVe')
      await flushPromises()

      expect(lastAsked()).toMatchObject({ brand: 'CeraVe', offset: 0, limit: 12 })
      expect(cardIds(wrapper)).toEqual(PRODUCTS.filter((p) => p.brand === 'CeraVe').slice(0, 12).map((p) => p.id))
      expect(stripText(wrapper)).toBe('Showing 12 of 17 products')
    })

    it('goes back to the first page when the category changes, asking the server for it', async () => {
      const { wrapper, router } = await mountExplore()
      await showMore(wrapper)

      await router.push('/explore?category=Toners')
      await flushPromises()

      expect(lastAsked()).toMatchObject({ category: 'Toners', offset: 0 })
      expect(cardIds(wrapper)).toEqual(PRODUCTS.filter((p) => p.category === 'Toners').slice(0, 12).map((p) => p.id))
      expect(wrapper.get('.catalog-count').text()).toBe('14 products')
    })

    it('goes back to the first page for a new search term', async () => {
      const { wrapper, router } = await mountExplore()
      await showMore(wrapper)

      await router.push('/explore?q=serum')
      await flushPromises()

      expect(asked()[asked().length - 1]).toMatchObject({ term: 'serum' })
      expect(lastAsked()).toMatchObject({ offset: 0 })
      expect(cardIds(wrapper)).toHaveLength(12)
    })

    it('goes back to the first page when a price is applied', async () => {
      const { wrapper } = await mountExplore()
      await showMore(wrapper)

      await wrapper.get('button.toolbar-price').trigger('click')
      await flushPromises()
      wrapper.findComponent({ name: 'PriceRangeSlider' }).vm.$emit('apply', { min: 0, maxCap: 800 })
      await flushPromises()

      expect(vi.mocked(searchProducts).mock.calls[vi.mocked(searchProducts).mock.calls.length - 1]![2]).toBe(800)
      expect(lastAsked()).toMatchObject({ offset: 0 })
      expect(cardIds(wrapper)).toHaveLength(12)
    })

    it('goes back to the first page on Clear all, in one request that already has every filter cleared', async () => {
      const { wrapper } = await mountExplore('/explore?category=Toners')
      await brandSelect(wrapper).setValue('CeraVe')
      await flushPromises()
      const before = asked().length

      await wrapper.get('button.clear-all-filters').trigger('click')
      await flushPromises()

      expect(asked().length).toBe(before + 1)
      expect(lastAsked()).toMatchObject({ category: 'All', brand: 'All', offset: 0 })
    })

    it('throws away a page that was still on its way when the list started again', async () => {
      const { wrapper } = await mountExplore()
      const page = hold()
      await stripButton(wrapper).trigger('click')
      await flushPromises()

      await brandSelect(wrapper).setValue('CeraVe')
      await flushPromises()
      const fresh = cardIds(wrapper)
      page.resolve(PRODUCTS.slice(12, 24), 34)
      await flushPromises()

      expect(cardIds(wrapper)).toEqual(fresh)
      expect(stripText(wrapper)).toBe('Showing 12 of 17 products')
    })

    it('throws away a page that failed after the list started again', async () => {
      const { wrapper } = await mountExplore()
      const page = hold()
      await stripButton(wrapper).trigger('click')
      await flushPromises()

      await brandSelect(wrapper).setValue('CeraVe')
      await flushPromises()
      page.reject(new Error('late'))
      await flushPromises()

      expect(wrapper.find('.load-more [role="alert"]').exists()).toBe(false)
      expect(stripText(wrapper)).toBe('Showing 12 of 17 products')
    })

    it('lets the button load more again after a reset that cut a page short', async () => {
      const { wrapper } = await mountExplore()
      hold()
      await stripButton(wrapper).trigger('click')
      await flushPromises()
      await brandSelect(wrapper).setValue('CeraVe')
      await flushPromises()

      await showMore(wrapper)

      expect(lastAsked()).toMatchObject({ brand: 'CeraVe', offset: 12 })
      expect(cardIds(wrapper)).toHaveLength(17)
    })
  })

  describe('ExploreView (the end of the list)', () => {
    it('says "matching" when a filter is on, and offers Clear filters next to Back to top', async () => {
      const { wrapper } = await mountExplore('/explore?category=Toners')
      await showMore(wrapper)

      expect(stripText(wrapper)).toBe('That is all 14 matching products')
      expect(wrapper.get('.load-more .strip-button').text()).toBe('Back to top')
      expect(wrapper.get('.load-more .clear-filters-button').text()).toBe('Clear filters')
    })

    it('clears the filters from Clear filters, with the existing clear-all', async () => {
      const { wrapper, router } = await mountExplore('/explore?category=Toners')
      await showMore(wrapper)

      await wrapper.get('.load-more .clear-filters-button').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query.category).toBeUndefined()
      expect(lastAsked()).toMatchObject({ category: 'All', offset: 0 })
      expect(stripText(wrapper)).toBe('Showing 12 of 34 products')
    })

    it('says "matching" for a search term too, but offers no Clear filters since none is on', async () => {
      const { wrapper } = await mountExplore('/explore?q=product')
      await showMore(wrapper)
      await showMore(wrapper)

      expect(stripText(wrapper)).toBe('That is all 34 matching products')
      expect(wrapper.find('.load-more .clear-filters-button').exists()).toBe(false)
    })

    it('says plainly "That is all N products" with nothing filtered and offers no Clear filters', async () => {
      const { wrapper } = await mountExplore()
      await showMore(wrapper)
      await showMore(wrapper)

      expect(stripText(wrapper)).toBe('That is all 34 products')
      expect(wrapper.find('.load-more .clear-filters-button').exists()).toBe(false)
    })

    it('shows the strip as all shown straight away when everything fits on the first page', async () => {
      serve(PRODUCTS.slice(0, 5))
      const { wrapper } = await mountExplore()

      expect(cardIds(wrapper)).toHaveLength(5)
      expect(stripText(wrapper)).toBe('That is all 5 products')
    })
  })

  describe('ExploreView (a backend that does not page)', () => {
    // Before feat/30 the backend ignored limit, offset, category and brand and sent
    // the whole list with no X-Total-Count. Explore must still work on it.
    const serveWholeList = (rows: Row[] = PRODUCTS) => vi.mocked(searchProducts).mockResolvedValue(rows as never)

    it('shows everything it sent and no strip when there is no total and more rows came back than were asked for', async () => {
      serveWholeList()
      const { wrapper } = await mountExplore()

      expect(cardIds(wrapper)).toEqual(idsFrom(1, 34))
      expect(stripEl(wrapper).exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Show 12 more')
    })

    it('counts the heading from the list itself when there is no total', async () => {
      serveWholeList()
      const { wrapper } = await mountExplore()

      expect(wrapper.get('.catalog-count').text()).toBe('34 products')
    })

    it('still narrows the grid to the category and brand in the browser, since the server ignored them', async () => {
      serveWholeList()
      const { wrapper, router } = await mountExplore()

      await router.push('/explore?category=Toners')
      await flushPromises()
      expect(cardIds(wrapper)).toEqual(PRODUCTS.filter((p) => p.category === 'Toners').map((p) => p.id))

      await brandSelect(wrapper).setValue('CeraVe')
      await flushPromises()
      expect(cardIds(wrapper)).toEqual(PRODUCTS.filter((p) => p.category === 'Toners' && p.brand === 'CeraVe').map((p) => p.id))
    })

    it('does not try to load more when the strip is not there', async () => {
      serveWholeList()
      const { wrapper } = await mountExplore()

      expect(wrapper.findComponent(LoadMoreStrip).exists()).toBe(false)
      expect(asked()).toHaveLength(1)
    })
  })

  describe('ExploreView (the category and brand lists)', () => {
    const categoryChips = (w: VueWrapper) => w.findAllComponents(ExploreCategoryBar)[0]!.props('categories') as string[]
    const brandOptions = (w: VueWrapper) => brandSelect(w).findAll('option').map((o) => o.text())

    it('asks for the facets once, when the page opens', async () => {
      await mountExplore()

      expect(getFacets).toHaveBeenCalledTimes(1)
    })

    it('lists the server\'s categories after the fixed ones, and its brands in the order it sent, from the whole catalogue', async () => {
      vi.mocked(getFacets).mockResolvedValue(LIVE_FACETS)
      const { wrapper } = await mountExplore()

      // The fixed list keeps its Serums chip though no Serums product exists; the
      // server adds Moisturizers.
      expect(categoryChips(wrapper)).toEqual(['All', 'Cleansers', 'Toners', 'Serums', 'Treatments', 'Exfoliators', 'Sun Care', 'Moisturizers'])
      expect(brandOptions(wrapper)).toEqual(['All brands', ...LIVE_FACETS.brands])
    })

    it('does not change them as more products load', async () => {
      vi.mocked(getFacets).mockResolvedValue(LIVE_FACETS)
      const { wrapper } = await mountExplore()
      const before = [categoryChips(wrapper), brandOptions(wrapper)]

      await showMore(wrapper)

      expect([categoryChips(wrapper), brandOptions(wrapper)]).toEqual(before)
    })

    it('derives them from the products on the page when the facets could not be read', async () => {
      const { wrapper } = await mountExplore()

      expect(brandOptions(wrapper)).toEqual(['All brands', 'CeraVe', 'COSRX'])
      expect(categoryChips(wrapper)).toContain('Serums')
    })

    it('derives them from the products too when the facets reply was not an object', async () => {
      vi.mocked(getFacets).mockResolvedValue(null)
      const { wrapper } = await mountExplore()

      expect(brandOptions(wrapper)).toEqual(['All brands', 'CeraVe', 'COSRX'])
    })
  })
})
