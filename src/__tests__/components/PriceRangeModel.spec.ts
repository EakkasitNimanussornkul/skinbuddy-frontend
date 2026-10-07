import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// The real searchProducts runs, over mocked HTTP clients, so what is asserted is
// the query string the page would send: whether max_price and min_price are
// there at all.
vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn() },
}))
vi.mock('axios', () => ({
  default: { get: vi.fn() },
}))

import axios from 'axios'
import {
  PRICE_CAP_LIMIT,
  PRICE_SCALE_DEFAULT,
  scaleEndFor,
  priceChipLabel,
  priceButtonLabel,
  isPriceFiltered,
  normalizePriceRange,
  parseTypedPrice,
  readBaht,
} from '../../components/Catalog/priceRange'
import ExploreView from '../../views/ExploreView.vue'

describe('feat/27 the price model: a bar to 1,500+ that means no upper limit', () => {
  describe('priceRange (the pure rules)', () => {
    it('ends the default bar at 1,500, which stands for no upper limit', () => {
      expect(PRICE_SCALE_DEFAULT).toBe(1500)
      expect(scaleEndFor(null)).toBe(1500)
      expect(scaleEndFor(800)).toBe(1500)
      expect(scaleEndFor(1499)).toBe(1500)
    })

    it('grows the bar to the next 500 above a typed cap, never above 20,000', () => {
      expect(scaleEndFor(1600)).toBe(2000)
      expect(scaleEndFor(3000)).toBe(3000)
      expect(scaleEndFor(3100)).toBe(3500)
      expect(scaleEndFor(19999)).toBe(20000)
      expect(scaleEndFor(20000)).toBe(20000)
      expect(scaleEndFor(PRICE_CAP_LIMIT + 5000)).toBe(20000)
    })

    it('keeps a cap of exactly 1,500 a real cap, on a bar that runs past it', () => {
      expect(scaleEndFor(1500)).toBe(2000)
    })

    it('words the removable chip "Up to ฿1,000", "฿200 to ฿800" or "From ฿200"', () => {
      expect(priceChipLabel(0, 1000)).toBe('Up to ฿1,000')
      expect(priceChipLabel(200, 800)).toBe('฿200 to ฿800')
      expect(priceChipLabel(200, null)).toBe('From ฿200')
      expect(priceChipLabel(0, 3000)).toBe('Up to ฿3,000')
    })

    it('words the Price button "Price: any", "up to", a range with an en dash, or "from"', () => {
      expect(priceButtonLabel(0, null)).toBe('Price: any')
      expect(priceButtonLabel(0, 800)).toBe('Price: up to ฿800')
      expect(priceButtonLabel(200, 800)).toBe('Price: ฿200 – ฿800')
      expect(priceButtonLabel(200, null)).toBe('Price: from ฿200')
    })

    it('counts a price filter only when the lowest is above 0 or there is a cap', () => {
      expect(isPriceFiltered(0, null)).toBe(false)
      expect(isPriceFiltered(1, null)).toBe(true)
      expect(isPriceFiltered(0, 500)).toBe(true)
    })

    it('reads a lowest price that is not a number as 0 and a highest that is not a number as no limit', () => {
      expect(normalizePriceRange(Number.NaN, Number.NaN)).toEqual({ min: 0, maxCap: null })
      expect(normalizePriceRange(undefined, undefined)).toEqual({ min: 0, maxCap: null })
      expect(normalizePriceRange(-5, -5)).toEqual({ min: 0, maxCap: null })
      expect(normalizePriceRange('x', 'y')).toEqual({ min: 0, maxCap: null })
      expect(readBaht(12.6, 0)).toBe(13)
      expect(readBaht(Number.POSITIVE_INFINITY, 7)).toBe(7)
    })

    it('puts a range given the wrong way round in order, and cuts a cap above 20,000 back to 20,000', () => {
      expect(normalizePriceRange(900, 300)).toEqual({ min: 300, maxCap: 900 })
      expect(normalizePriceRange(0, 25000)).toEqual({ min: 0, maxCap: 20000 })
      expect(normalizePriceRange(200, null)).toEqual({ min: 200, maxCap: null })
    })

    it('reads typed text as blank, a whole number of baht (with commas or a baht sign), or something else', () => {
      expect(parseTypedPrice('')).toEqual({ kind: 'empty' })
      expect(parseTypedPrice('   ')).toEqual({ kind: 'empty' })
      expect(parseTypedPrice('3000')).toEqual({ kind: 'value', value: 3000 })
      expect(parseTypedPrice('฿3,000')).toEqual({ kind: 'value', value: 3000 })
      expect(parseTypedPrice('abc')).toEqual({ kind: 'invalid' })
      expect(parseTypedPrice('12.5')).toEqual({ kind: 'invalid' })
      expect(parseTypedPrice('-5')).toEqual({ kind: 'invalid' })
      expect(parseTypedPrice('1,500+')).toEqual({ kind: 'invalid' })
    })
  })

  describe('ExploreView (what the page asks the server for)', () => {
    const mounted: VueWrapper[] = []

    const mountExplore = async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/:any(.*)*', component: { template: '<div />' } }],
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
            SkinTypeRecommendationsWidget: true,
            ExploreProductCard: true,
            ExploreCategoryBar: true,
            UniversalProductModal: true,
            CompareSelectorModal: true,
            ProductShowcaseMarquee: true,
            EmptyState: true,
          },
        },
        attachTo: document.body,
      })
      mounted.push(wrapper)
      await flushPromises()
      return wrapper
    }

    /** The query strings sent so far; a guest, so the bare axios call carries them. */
    const sentParams = () => vi.mocked(axios.get).mock.calls.map((call) => (call[1] as { params: Record<string, unknown> }).params)

    /** Opens the phone Filters sheet and types into its price boxes, as a shopper would. */
    const typeInSheet = async (w: VueWrapper, box: 'low' | 'high', text: string) => {
      const input = w.get(`.filters-sheet .price-input-${box}`)
      await input.setValue(text)
      await input.trigger('blur')
    }
    // Read again on every move: with Teleport stubbed, the sheet is drawn afresh
    // each time the page re-renders, so an element held from before is stale.
    const dragHighHandle = async (w: VueWrapper, value: number) => {
      const handle = w.get<HTMLInputElement>('.filters-sheet input[aria-label="Highest price"]')
      handle.element.value = String(value)
      await handle.trigger('input')
    }
    const openSheet = async (w: VueWrapper) => {
      await w.get('button.filters-button').trigger('click')
      await flushPromises()
    }
    const showProducts = async (w: VueWrapper) => {
      await w.findAll('[role="dialog"] button').find((b) => b.text().trim() === 'Show products')!.trigger('click')
      await flushPromises()
    }

    beforeEach(() => {
      vi.clearAllMocks()
      localStorage.clear()
      document.body.style.overflow = ''
      vi.mocked(axios.get).mockResolvedValue({ data: [] })
    })
    afterEach(() => {
      while (mounted.length) mounted.pop()!.unmount()
      document.body.innerHTML = ''
    })

    it('sends neither max_price nor min_price when no price filter is set, so nothing above 1,500 is hidden', async () => {
      await mountExplore()

      expect(sentParams()).toEqual([{}])
    })

    it('sends min_price alone for a lowest price with no upper limit', async () => {
      const w = await mountExplore()
      await openSheet(w)
      await typeInSheet(w, 'low', '200')
      await showProducts(w)

      expect(sentParams().pop()).toEqual({ min_price: 200 })
    })

    it('sends max_price alone for a highest price, and not min_price while the lowest is 0', async () => {
      const w = await mountExplore()
      await openSheet(w)
      await typeInSheet(w, 'high', '800')
      await showProducts(w)

      expect(sentParams().pop()).toEqual({ max_price: 800 })
    })

    it('sends a typed 3,000 as max_price=3000 and grows the bar to 3,000', async () => {
      const w = await mountExplore()
      await openSheet(w)
      await typeInSheet(w, 'high', '3000')

      expect(w.get('.filters-sheet .price-scale-end').text()).toBe('฿3,000')
      expect(w.get('.filters-sheet input[aria-label="Highest price"]').attributes('max')).toBe('3000')
      await showProducts(w)

      expect(sentParams().pop()).toEqual({ max_price: 3000 })
      expect(w.findAll('button.active-filter-chip').map((c) => c.text())).toContain('Up to ฿3,000')
    })

    it('cuts a typed highest above 20,000 back to 20,000', async () => {
      const w = await mountExplore()
      await openSheet(w)
      await typeInSheet(w, 'high', '99999')
      await showProducts(w)

      expect(sentParams().pop()).toEqual({ max_price: 20000 })
    })

    it('reads an empty Highest as no limit, and asks for no max_price again', async () => {
      const w = await mountExplore()
      await openSheet(w)
      await typeInSheet(w, 'high', '800')
      await showProducts(w)
      expect(sentParams().pop()).toEqual({ max_price: 800 })

      await openSheet(w)
      await typeInSheet(w, 'high', '')
      await showProducts(w)

      expect(sentParams().pop()).toEqual({})
      expect(w.findAll('button.active-filter-chip')).toHaveLength(0)
    })

    it('treats the end of the default bar as no limit when a handle is dragged there', async () => {
      const w = await mountExplore()
      await openSheet(w)
      await dragHighHandle(w, 900)
      await dragHighHandle(w, 1500)
      await showProducts(w)

      // The first request is the page load; no filter was applied by the drag.
      expect(sentParams()).toEqual([{}])
    })

    it('keeps a typed cap when a handle is moved on the bar it grew', async () => {
      const w = await mountExplore()
      await openSheet(w)
      await typeInSheet(w, 'high', '3000')
      await dragHighHandle(w, 2000)
      await showProducts(w)

      expect(sentParams().pop()).toEqual({ max_price: 2000 })
    })

    it('shows "Up to", a range and "From" on the removable chip for each combination', async () => {
      const w = await mountExplore()
      const chipTexts = () => w.findAll('button.active-filter-chip').map((c) => c.text())

      await openSheet(w)
      await typeInSheet(w, 'high', '1000')
      await showProducts(w)
      expect(chipTexts()).toEqual(['Up to ฿1,000'])

      await openSheet(w)
      await typeInSheet(w, 'low', '200')
      await showProducts(w)
      expect(chipTexts()).toEqual(['฿200 to ฿1,000'])

      await openSheet(w)
      await typeInSheet(w, 'high', '')
      await showProducts(w)
      expect(chipTexts()).toEqual(['From ฿200'])
      expect(w.get('.filters-count').text()).toBe('1')
    })

    it('removes the price chip and asks for no bounds again', async () => {
      const w = await mountExplore()
      await openSheet(w)
      await typeInSheet(w, 'high', '800')
      await showProducts(w)

      await w.get('button.active-filter-chip').trigger('click')
      await flushPromises()

      expect(sentParams().pop()).toEqual({})
      expect(w.findAll('button.active-filter-chip')).toHaveLength(0)
    })
  })
})

describe('feat/27 the phone note about products with no listed price', () => {
  // Mounted in the same way as above; kept as its own group so the ones before
  // it keep their numbers.
  const mounted: VueWrapper[] = []

  const mountExplore = async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:any(.*)*', component: { template: '<div />' } }],
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
          SkinTypeRecommendationsWidget: true,
          ExploreProductCard: true,
          ExploreCategoryBar: true,
          UniversalProductModal: true,
          CompareSelectorModal: true,
          ProductShowcaseMarquee: true,
          EmptyState: true,
          PriceRangeSlider: true,
        },
      },
      attachTo: document.body,
    })
    mounted.push(wrapper)
    await flushPromises()
    return wrapper
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
  })
  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
    document.body.innerHTML = ''
  })

  it('shows "Products with no listed price are hidden while a price filter is on." under the phone chips only while a price filter is on', async () => {
    const w = await mountExplore()
    expect(w.find('.unpriced-note-phone').exists()).toBe(false)

    // The phone sheet's own slider is the one that sets the price, so it is
    // driven the way the sheet drives it.
    await w.get('button.filters-button').trigger('click')
    await flushPromises()
    const sheetSlider = w.findAllComponents({ name: 'PriceRangeSlider' }).find((s) => s.props('variant') === 'sheet')!
    sheetSlider.vm.$emit('update:range', { min: 0, maxCap: 800 })
    await flushPromises()
    await w.findAll('[role="dialog"] button').find((b) => b.text().trim() === 'Show products')!.trigger('click')
    await flushPromises()

    expect(w.get('.unpriced-note-phone').text()).toBe('Products with no listed price are hidden while a price filter is on.')

    await w.get('button.active-filter-chip').trigger('click')
    await flushPromises()
    expect(w.find('.unpriced-note-phone').exists()).toBe(false)
  })

  it('does not show it for a brand filter alone', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [{ id: 'a', brand: 'CeraVe', name: 'A', category: 'Cleanser' }] })
    const w = await mountExplore()

    await w.get('select').setValue('CeraVe')

    expect(w.findAll('button.active-filter-chip')).toHaveLength(1)
    expect(w.find('.unpriced-note-phone').exists()).toBe(false)
  })
})
