import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

vi.mock('../../api/products.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  searchProducts: vi.fn(),
}))

import { searchProducts } from '../../api/products.ts'
import ExploreView from '../../views/ExploreView.vue'

const product = (id: string, brand: string, category: string) => ({
  id,
  brand,
  name: `${brand} ${category} ${id}`,
  category,
  slug: id,
  price_thb: 450,
  skin_match_score: null,
  product_ingredients: [],
})

const CATALOGUE = [
  product('c1', 'CeraVe', 'Cleanser'),
  product('t1', 'The Ordinary', 'Toner'),
  product('t2', 'COSRX', 'Toner'),
  product('s1', 'CeraVe', 'Serum'),
]

const mounted: VueWrapper[] = []

/**
 * Explore at an address with the real price slider (the popover is the subject)
 * and everything else stubbed. Attached to the document so focus can be read.
 */
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
  return { wrapper, router }
}

const catalogRequests = () => vi.mocked(searchProducts).mock.calls.filter((args) => args.length === 3)
const lastRequest = () => catalogRequests()[catalogRequests().length - 1]

const toolbar = (w: VueWrapper) => w.get('[role="toolbar"]')
const priceButton = (w: VueWrapper) => w.get<HTMLButtonElement>('button.toolbar-price')
const popover = (w: VueWrapper) => w.find('[role="dialog"][aria-label="Price range"]')
const brandSelect = (w: VueWrapper) => w.get<HTMLSelectElement>('select.toolbar-brand-select')
const chips = (w: VueWrapper) => w.findAll('button.desktop-filter-chip')
const chipTexts = (w: VueWrapper) => chips(w).map((c) => c.text())

const openPrice = async (w: VueWrapper) => {
  await priceButton(w).trigger('click')
  await flushPromises()
}
const typeInPopover = async (w: VueWrapper, box: 'low' | 'high', text: string) => {
  const input = w.get(`[aria-label="Price range"] .price-input-${box}`)
  await input.setValue(text)
  await input.trigger('blur')
}
const popoverButton = (w: VueWrapper, label: string) =>
  w.findAll('[aria-label="Price range"] button').find((b) => b.text() === label)!

const follows = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
// A class that takes an element out of the flow, with or without a breakpoint.
const outOfFlow = (el: Element) => Array.from(el.classList).some((c) => /(^|:)(sticky|fixed|absolute)$/.test(c))

describe('feat/27 the desktop filter bar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.body.style.overflow = ''
    vi.mocked(searchProducts).mockResolvedValue(CATALOGUE as never)
  })
  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
    document.body.innerHTML = ''
  })

  describe('ExploreView (the toolbar)', () => {
    it('is a toolbar labelled "Filters" for lg and up, holding the category chips, a Brand control and a Price button', async () => {
      const { wrapper } = await mountExplore()
      const bar = toolbar(wrapper)

      expect(bar.attributes('aria-label')).toBe('Filters')
      expect(wrapper.get('.explore-filters').classes()).toEqual(expect.arrayContaining(['hidden', 'lg:block']))
      expect(bar.findComponent({ name: 'ExploreCategoryBar' }).exists()).toBe(true)
      expect(bar.find('select[aria-label="Brand"]').exists()).toBe(true)
      expect(bar.get('button.toolbar-price').text()).toBe('Price: any')
      expect(bar.get('.toolbar-categories').element.compareDocumentPosition(bar.get('.toolbar-controls').element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('has no old filter card: no "Filter Formulation" panel, no ceiling box, no 12-column grid', async () => {
      const { wrapper } = await mountExplore()

      expect(wrapper.find('.explore-filter-panel').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Filter Formulation')
      expect(wrapper.text()).not.toContain('Ceiling')
      expect(wrapper.find('.lg\\:grid-cols-12').exists()).toBe(false)
    })

    it('is one row of at least 60px that wraps to a second row rather than overlapping, with its two controls pushed to the right', async () => {
      const { wrapper } = await mountExplore()
      const bar = toolbar(wrapper)

      expect(bar.classes()).toEqual(expect.arrayContaining(['min-h-[60px]', 'flex', 'flex-wrap', 'rounded-[18px]']))
      // The category chips take the room that is left (and may shrink and scroll).
      expect(bar.get('.toolbar-categories').classes()).toEqual(expect.arrayContaining(['flex-1', 'min-w-0']))
      expect(bar.get('.toolbar-controls').classes()).toContain('ml-auto')
    })

    it('has dark mode on the toolbar, the Brand control, the Price button and the popover', async () => {
      const { wrapper } = await mountExplore()
      await openPrice(wrapper)

      for (const el of [toolbar(wrapper), wrapper.get('.toolbar-brand'), priceButton(wrapper), popover(wrapper)]) {
        expect(el.classes().some((c) => c.startsWith('dark:'))).toBe(true)
      }
    })
  })

  describe('ExploreView (no overlap with the product cards)', () => {
    it('is in the normal flow: the toolbar, the active filters and their boxes are not sticky, fixed or absolute', async () => {
      const { wrapper } = await mountExplore('/explore?category=Toners')
      const section = wrapper.get('.explore-filters')

      for (const el of [toolbar(wrapper), section, wrapper.get('.explore-filter-anchor'), wrapper.get('.catalog-heading'), wrapper.get('.active-filters-bar'), wrapper.get('.active-filters')]) {
        expect(outOfFlow(el.element)).toBe(false)
      }
      // Nor any element between the page's column and the toolbar.
      for (let el = toolbar(wrapper).element.parentElement; el && el !== wrapper.element; el = el.parentElement) {
        expect(outOfFlow(el)).toBe(false)
      }
    })

    it('puts the results after the toolbar, the active filters and the % Match note, with a gap of 24px between', async () => {
      const { wrapper } = await mountExplore('/explore?category=Toners')
      const results = wrapper.get('.catalog-results').element
      const column = wrapper.get('.explore-catalogue').element

      expect(follows(toolbar(wrapper).element, results)).toBe(true)
      expect(follows(wrapper.get('.active-filters-bar').element, results)).toBe(true)
      expect(follows(wrapper.get('.match-explainer').element, results)).toBe(true)
      // The results and the filters are siblings in one column spaced by space-y-6 (24px).
      expect(column.classList).toContain('space-y-6')
      expect(results.parentElement).toBe(column)
      expect(wrapper.get('.explore-filters').element.parentElement).toBe(column)
    })

    it('floats only the price popover: it is absolute, below the toolbar, aligned to its right edge, under the top bar in z-order', async () => {
      const { wrapper } = await mountExplore()
      await openPrice(wrapper)
      const box = popover(wrapper)

      expect(box.classes()).toEqual(expect.arrayContaining(['absolute', 'right-0', 'top-full']))
      const z = box.classes().find((c) => /^z-\d+$/.test(c))!
      // The sticky top bar is z-50; the cards sit at z-10 or below.
      expect(Number(z.slice(2))).toBeLessThan(50)
      expect(Number(z.slice(2))).toBeGreaterThan(10)
      expect(wrapper.get('.explore-filter-anchor').classes()).toContain('relative')
      // Every other absolute element in the filter section is inside the popover or the Brand control.
      const floating = wrapper.findAll('.explore-filters *').filter((el) => el.classes().includes('absolute'))
      expect(floating.every((el) => box.element.contains(el.element) || el.element === box.element || wrapper.get('.toolbar-brand').element.contains(el.element) || el.classes().includes('price-handle') || el.element.closest('.price-track') !== null)).toBe(true)
    })

    it('is never wider than the content column, and is 400px wide when there is room', async () => {
      const { wrapper } = await mountExplore()
      await openPrice(wrapper)

      expect(popover(wrapper).classes()).toEqual(expect.arrayContaining(['w-[400px]', 'max-w-full']))
    })
  })

  describe('ExploreView (the Brand control)', () => {
    it('is a native select labelled "Brand" that reads "Brand: All" until a brand is chosen', async () => {
      const { wrapper } = await mountExplore()

      expect(brandSelect(wrapper).attributes('aria-label')).toBe('Brand')
      expect(wrapper.get('.toolbar-brand-text').text()).toBe('Brand: All')
      expect(brandSelect(wrapper).findAll('option').map((o) => o.text())).toEqual(['All brands', 'CeraVe', 'COSRX', 'The Ordinary'])
    })

    it('takes the teal border and tint once a brand is chosen, and names it', async () => {
      const { wrapper } = await mountExplore()
      const control = wrapper.get('.toolbar-brand')
      expect(control.classes()).not.toContain('border-brand-primary-strong')

      await brandSelect(wrapper).setValue('CeraVe')

      expect(wrapper.get('.toolbar-brand-text').text()).toBe('Brand: CeraVe')
      expect(control.classes()).toEqual(expect.arrayContaining(['border-brand-primary-strong', 'bg-brand-primary-light']))
    })

    it('narrows the list to the brand, and shows every brand again on "All brands"', async () => {
      const { wrapper } = await mountExplore()

      await brandSelect(wrapper).setValue('CeraVe')
      expect(wrapper.get('.catalog-count').text()).toBe('2 products')
      await brandSelect(wrapper).setValue('All')
      expect(wrapper.get('.catalog-count').text()).toBe('4 products')
    })
  })

  describe('ExploreView (the Price button)', () => {
    it('reads "Price: any" with nothing chosen, and opens a dialog it announces with aria-haspopup and aria-expanded', async () => {
      const { wrapper } = await mountExplore()

      expect(priceButton(wrapper).text()).toBe('Price: any')
      expect(priceButton(wrapper).attributes('aria-haspopup')).toBe('dialog')
      expect(priceButton(wrapper).attributes('aria-expanded')).toBe('false')
      expect(popover(wrapper).exists()).toBe(false)

      await openPrice(wrapper)
      expect(priceButton(wrapper).attributes('aria-expanded')).toBe('true')
    })

    it('reads "up to", a range with an en dash, or "from", with the teal state, once a price is applied', async () => {
      const { wrapper } = await mountExplore()
      expect(priceButton(wrapper).classes()).not.toContain('border-brand-primary-strong')

      await openPrice(wrapper)
      await typeInPopover(wrapper, 'high', '800')
      await popoverButton(wrapper, 'Apply').trigger('click')
      await flushPromises()
      expect(priceButton(wrapper).text()).toBe('Price: up to ฿800')
      expect(priceButton(wrapper).classes()).toEqual(expect.arrayContaining(['border-brand-primary-strong', 'bg-brand-primary-light']))

      await openPrice(wrapper)
      await typeInPopover(wrapper, 'low', '200')
      await popoverButton(wrapper, 'Apply').trigger('click')
      await flushPromises()
      expect(priceButton(wrapper).text()).toBe('Price: ฿200 – ฿800')

      await openPrice(wrapper)
      await typeInPopover(wrapper, 'high', '')
      await popoverButton(wrapper, 'Apply').trigger('click')
      await flushPromises()
      expect(priceButton(wrapper).text()).toBe('Price: from ฿200')
    })
  })

  describe('ExploreView (the Price popover)', () => {
    it('is a dialog labelled "Price range" with the shared price control and its Clear and Apply buttons, and puts focus in Lowest', async () => {
      const { wrapper } = await mountExplore()
      await openPrice(wrapper)
      const box = popover(wrapper)

      expect(box.exists()).toBe(true)
      expect(box.findComponent({ name: 'PriceRangeSlider' }).props('variant')).toBe('popover')
      expect(box.findAll('button').map((b) => b.text())).toEqual(['Clear', 'Apply'])
      expect(document.activeElement).toBe(box.get('.price-input-low').element)
    })

    it('closes on Escape and gives focus back to the Price button', async () => {
      const { wrapper } = await mountExplore()
      await openPrice(wrapper)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await flushPromises()

      expect(popover(wrapper).exists()).toBe(false)
      expect(document.activeElement).toBe(priceButton(wrapper).element)
      expect(priceButton(wrapper).attributes('aria-expanded')).toBe('false')
    })

    it('closes on Escape pressed inside the popover too', async () => {
      const { wrapper } = await mountExplore()
      await openPrice(wrapper)

      await wrapper.get('[aria-label="Price range"] .price-input-high').trigger('keydown', { key: 'Escape' })
      await flushPromises()

      expect(popover(wrapper).exists()).toBe(false)
      expect(document.activeElement).toBe(priceButton(wrapper).element)
    })

    it('closes on a click outside it, and stays open for a click inside it', async () => {
      const { wrapper } = await mountExplore()
      await openPrice(wrapper)

      await wrapper.get('[aria-label="Price range"] .price-hint').trigger('pointerdown')
      expect(popover(wrapper).exists()).toBe(true)

      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      await flushPromises()

      expect(popover(wrapper).exists()).toBe(false)
    })

    it('closes from the Price button itself, without closing and opening again', async () => {
      const { wrapper } = await mountExplore()
      await openPrice(wrapper)

      await priceButton(wrapper).trigger('pointerdown')
      expect(popover(wrapper).exists()).toBe(true)
      await priceButton(wrapper).trigger('click')
      await flushPromises()

      expect(popover(wrapper).exists()).toBe(false)
    })

    it('closes when Tab takes focus out of it, and not when focus stays inside', async () => {
      const { wrapper } = await mountExplore()
      await openPrice(wrapper)
      const apply = popoverButton(wrapper, 'Apply')

      await apply.trigger('focusout', { relatedTarget: popoverButton(wrapper, 'Clear').element })
      expect(popover(wrapper).exists()).toBe(true)

      await apply.trigger('focusout', { relatedTarget: brandSelect(wrapper).element })
      await flushPromises()
      expect(popover(wrapper).exists()).toBe(false)
    })

    it('applies the typed price on Apply, asks the server for it, closes, and gives focus back to the Price button', async () => {
      const { wrapper } = await mountExplore()
      await openPrice(wrapper)
      await typeInPopover(wrapper, 'low', '200')
      await typeInPopover(wrapper, 'high', '3000')
      expect(catalogRequests()).toHaveLength(1)

      await popoverButton(wrapper, 'Apply').trigger('click')
      await flushPromises()

      expect(lastRequest()).toEqual(['', 200, 3000])
      expect(popover(wrapper).exists()).toBe(false)
      expect(document.activeElement).toBe(priceButton(wrapper).element)
    })

    it('asks for neither bound on Apply when the price was left as it was, since 1,500+ is no limit', async () => {
      const { wrapper } = await mountExplore()
      await openPrice(wrapper)

      await popoverButton(wrapper, 'Apply').trigger('click')
      await flushPromises()

      expect(lastRequest()).toEqual(['', undefined, undefined])
    })

    it('clears the price on Clear, asks again with no bounds, and stays open', async () => {
      const { wrapper } = await mountExplore()
      await openPrice(wrapper)
      await typeInPopover(wrapper, 'high', '800')
      await popoverButton(wrapper, 'Apply').trigger('click')
      await flushPromises()
      await openPrice(wrapper)

      await popoverButton(wrapper, 'Clear').trigger('click')
      await flushPromises()

      expect(lastRequest()).toEqual(['', undefined, undefined])
      expect(popover(wrapper).exists()).toBe(true)
      expect(priceButton(wrapper).text()).toBe('Price: any')
    })

    it('starts from the price applied, with the bar grown to fit a typed cap', async () => {
      const { wrapper } = await mountExplore()
      await openPrice(wrapper)
      await typeInPopover(wrapper, 'high', '3000')
      await popoverButton(wrapper, 'Apply').trigger('click')
      await flushPromises()

      await openPrice(wrapper)

      expect(wrapper.get<HTMLInputElement>('[aria-label="Price range"] .price-input-high').element.value).toBe('3,000')
      expect(wrapper.get('[aria-label="Price range"] .price-scale-end').text()).toBe('฿3,000')
    })

    it('stops listening for Escape and outside clicks once it has closed', async () => {
      const { wrapper } = await mountExplore()
      await openPrice(wrapper)
      await popoverButton(wrapper, 'Apply').trigger('click')
      await flushPromises()
      priceButton(wrapper).element.blur()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await flushPromises()

      // Escape with nothing open does not pull focus to the Price button.
      expect(document.activeElement).not.toBe(priceButton(wrapper).element)
    })
  })

  describe('ExploreView (the heading and the count)', () => {
    it('reads "All formulations" for every category, and the category\'s name when one is chosen', async () => {
      const { wrapper, router } = await mountExplore()
      expect(wrapper.get('.catalog-title').text()).toBe('All formulations')

      await router.push('/explore?category=Toners')
      await flushPromises()
      expect(wrapper.get('.catalog-title').text()).toBe('Toners')
      expect(wrapper.get('.catalog-title').element.tagName).toBe('H2')
    })

    it('spells the category as its chip does, whatever case the address used', async () => {
      const { wrapper } = await mountExplore('/explore?category=toners')

      expect(wrapper.get('.catalog-title').text()).toBe('Toners')
    })

    it('counts the products in the list: "4 products", "2 products" for a category, singular for one', async () => {
      const { wrapper, router } = await mountExplore()
      expect(wrapper.get('.catalog-count').text()).toBe('4 products')

      await router.push('/explore?category=Toners')
      await flushPromises()
      expect(wrapper.get('.catalog-count').text()).toBe('2 products')

      await router.push('/explore?category=Serums')
      await flushPromises()
      expect(wrapper.get('.catalog-count').text()).toBe('1 product')
    })

    it('says "0 products" for a filter that matches nothing', async () => {
      const { wrapper } = await mountExplore('/explore?category=Sun%20Care')

      expect(wrapper.get('.catalog-count').text()).toBe('0 products')
    })

    it('follows the length of what the server returned, not a fixed number: 34 products read "34 products"', async () => {
      vi.mocked(searchProducts).mockResolvedValue(Array.from({ length: 34 }, (_, i) => product(`p${i}`, 'CeraVe', 'Serum')) as never)
      const { wrapper } = await mountExplore()

      expect(wrapper.get('.catalog-count').text()).toBe('34 products')
    })

    it('shows no count while the catalogue loads, and none when it could not be reached', async () => {
      let resolve!: (value: unknown) => void
      vi.mocked(searchProducts).mockReturnValue(new Promise((r) => { resolve = r }) as never)
      const { wrapper } = await mountExplore()
      expect(wrapper.get('.catalog-count').text()).toBe('')

      resolve(CATALOGUE)
      await flushPromises()
      expect(wrapper.get('.catalog-count').text()).toBe('4 products')

      vi.mocked(searchProducts).mockRejectedValue(new Error('network down'))
      await openPrice(wrapper)
      await popoverButton(wrapper, 'Apply').trigger('click')
      await flushPromises()
      expect(wrapper.get('.catalog-count').text()).toBe('')
    })

    it('announces a change of count politely', async () => {
      const { wrapper } = await mountExplore()

      expect(wrapper.get('.catalog-count').attributes('aria-live')).toBe('polite')
    })
  })

  describe('ExploreView (the active filters)', () => {
    it('shows no row while nothing is chosen', async () => {
      const { wrapper } = await mountExplore()

      expect(wrapper.find('.active-filters-bar').exists()).toBe(false)
      expect(chips(wrapper)).toHaveLength(0)
    })

    it('shows the category, the brand and the price as removable chips, each labelled "Remove filter: …", with a Clear all button', async () => {
      const { wrapper } = await mountExplore('/explore?category=Toners')
      await brandSelect(wrapper).setValue('The Ordinary')
      await openPrice(wrapper)
      await typeInPopover(wrapper, 'low', '200')
      await typeInPopover(wrapper, 'high', '800')
      await popoverButton(wrapper, 'Apply').trigger('click')
      await flushPromises()

      expect(chips(wrapper).map((c) => [c.text(), c.attributes('aria-label')])).toEqual([
        ['Toners', 'Remove filter: Toners'],
        ['The Ordinary', 'Remove filter: The Ordinary'],
        ['฿200 to ฿800', 'Remove filter: ฿200 to ฿800'],
      ])
      expect(wrapper.get('button.clear-all-filters').text()).toBe('Clear all')
    })

    it('removes the category when its chip is pressed, through the address', async () => {
      const { wrapper, router } = await mountExplore('/explore?category=Toners')

      await chips(wrapper)[0]!.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({})
      expect(wrapper.get('.catalog-title').text()).toBe('All formulations')
    })

    it('removes the brand when its chip is pressed', async () => {
      const { wrapper } = await mountExplore()
      await brandSelect(wrapper).setValue('CeraVe')

      await chips(wrapper)[0]!.trigger('click')

      expect(brandSelect(wrapper).element.value).toBe('All')
      expect(chips(wrapper)).toHaveLength(0)
    })

    it('removes the price when its chip is pressed, and asks again with no bounds', async () => {
      const { wrapper } = await mountExplore()
      await openPrice(wrapper)
      await typeInPopover(wrapper, 'high', '800')
      await popoverButton(wrapper, 'Apply').trigger('click')
      await flushPromises()

      await chips(wrapper)[0]!.trigger('click')
      await flushPromises()

      expect(lastRequest()).toEqual(['', undefined, undefined])
      expect(priceButton(wrapper).text()).toBe('Price: any')
    })

    it('resets the category, the brand and the price with Clear all, including a brand carried by the address', async () => {
      const { wrapper, router } = await mountExplore('/explore?category=Toners&brand=COSRX')
      await openPrice(wrapper)
      await typeInPopover(wrapper, 'high', '800')
      await popoverButton(wrapper, 'Apply').trigger('click')
      await flushPromises()
      expect(chipTexts(wrapper)).toEqual(['Toners', 'COSRX', 'Up to ฿800'])

      await wrapper.get('button.clear-all-filters').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({})
      expect(brandSelect(wrapper).element.value).toBe('All')
      expect(lastRequest()).toEqual(['', undefined, undefined])
      expect(chips(wrapper)).toHaveLength(0)
    })

    it('says products with no listed price are hidden, in a muted line after the chips, only while a price chip is shown', async () => {
      const { wrapper } = await mountExplore('/explore?category=Toners')
      expect(wrapper.find('.unpriced-note-bar').exists()).toBe(false)

      await openPrice(wrapper)
      await typeInPopover(wrapper, 'low', '100')
      await popoverButton(wrapper, 'Apply').trigger('click')
      await flushPromises()

      const note = wrapper.get('.unpriced-note-bar')
      expect(note.text()).toBe('Products with no listed price are hidden while a price filter is on.')
      expect(follows(wrapper.get('.active-filters').element, note.element)).toBe(true)

      await chips(wrapper).find((c) => c.text() === 'From ฿100')!.trigger('click')
      await flushPromises()
      expect(wrapper.find('.unpriced-note-bar').exists()).toBe(false)
    })

    it('does not show that line for a category or brand alone', async () => {
      const { wrapper } = await mountExplore('/explore?category=Toners')
      await brandSelect(wrapper).setValue('COSRX')

      expect(chips(wrapper)).toHaveLength(2)
      expect(wrapper.find('.unpriced-note-bar').exists()).toBe(false)
    })
  })

  describe('ExploreView (the slim intro)', () => {
    it('is one band for lg and up, with a serif "Explore" title, one line under it and the carousel on the right', async () => {
      const { wrapper } = await mountExplore()
      const hero = wrapper.get('.explore-hero')

      expect(hero.classes()).toEqual(expect.arrayContaining(['hidden', 'lg:flex', 'items-center', 'justify-between', 'max-h-[120px]']))
      expect(hero.get('h1').text()).toBe('Explore')
      expect(hero.get('.explore-hero-line').text()).toBe('Every product in our catalogue, with ingredient breakdowns and a match for your skin type.')
      expect(follows(hero.get('.explore-hero-title').element, hero.get('.explore-hero-thumbs').element)).toBe(true)
      expect(hero.get('.explore-hero-thumbs').findComponent({ name: 'ProductShowcaseMarquee' }).exists()).toBe(true)
    })

    it('drops the old eyebrow, the large title, the paragraph and the four ticks', async () => {
      const { wrapper } = await mountExplore()
      const text = wrapper.text()

      for (const gone of ['Global Formulation Registry', 'Explore Skincare Catalog', 'Detailed ingredient breakdowns', 'Safety & compatibility ratings', 'Personalized Baumann matching', '100% Independent analysis']) {
        expect(text).not.toContain(gone)
      }
    })

    it('leaves the phone intro as it was: a short serif title and one line, below lg only', async () => {
      const { wrapper } = await mountExplore()
      const intro = wrapper.get('.explore-phone-intro')

      expect(intro.classes()).toContain('lg:hidden')
      expect(intro.get('h1').text()).toBe('Explore')
      expect(intro.get('p').text()).toBe('Every product in our catalogue.')
    })

    it('keeps the "What is % Match?" disclosure under the toolbar and the heading, folded', async () => {
      const { wrapper } = await mountExplore()
      const toggle = wrapper.get('.match-explainer .match-info-toggle')

      expect(toggle.attributes('aria-expanded')).toBe('false')
      expect(follows(toolbar(wrapper).element, wrapper.get('.match-explainer').element)).toBe(true)
      expect(follows(wrapper.get('.catalog-heading').element, wrapper.get('.match-explainer').element)).toBe(true)
    })
  })
})
