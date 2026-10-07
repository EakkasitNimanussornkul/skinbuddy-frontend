import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

vi.mock('../../api/products.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  searchProducts: vi.fn(),
}))

import { searchProducts, MATCH_SCORE_BASIS, MATCH_SCORE_DISCLAIMER } from '../../api/products.ts'
import ExploreView from '../../views/ExploreView.vue'
import { useAuthStore } from '../../stores/auth'

const product = (id: string, brand: string, category: string) => ({
  id,
  brand,
  name: `${brand} ${category}`,
  category,
  slug: id,
  price_thb: 450,
  skin_match_score: null,
  product_ingredients: [],
})

const CATALOGUE = [
  product('c1', 'CeraVe', 'Cleanser'),
  product('s1', 'CeraVe', 'Serum'),
  product('l1', 'La Roche-Posay', 'Serum'),
]

const mounted: VueWrapper[] = []

/**
 * Explore at an address, attached to the document so focus can be read, with
 * Teleport stubbed so the sheets render inside the wrapper. A guest, so every
 * searchProducts call with three arguments is fetchCatalog's own.
 */
const mountExplore = async (address = '/explore') => {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/explore', component: { template: '<div />' } },
      { path: '/how-match-works', component: { template: '<div />' } },
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

const catalogRequests = () => vi.mocked(searchProducts).mock.calls.filter((args) => args.length === 3)
const lastRequest = () => catalogRequests()[catalogRequests().length - 1]
const filtersButton = (w: VueWrapper) => w.get('button.filters-button')
const sheet = (w: VueWrapper) => w.find('[role="dialog"]')
const chips = (w: VueWrapper) => w.findAll('button.active-filter-chip')
// The Price popover's slider. The popover is drawn only while open (feat/27), so
// it is opened from the toolbar's Price button first if it is not.
const priceSlider = async (w: VueWrapper) => {
  if (!w.find('[role="dialog"][aria-label="Price range"]').exists()) {
    await w.get('button.toolbar-price').trigger('click')
    await flushPromises()
  }
  return w.findComponent({ name: 'PriceRangeSlider' })
}
// The price slider in the filters sheet (feat/26).
const sheetSlider = (w: VueWrapper) => w.findAllComponents({ name: 'PriceRangeSlider' }).find((s) => s.props('variant') === 'sheet')!
const dragSheetPrice = async (w: VueWrapper, min: number, maxCap: number | null) => {
  sheetSlider(w).vm.$emit('update:range', { min, maxCap })
  await flushPromises()
}

const openSheet = async (w: VueWrapper) => {
  await filtersButton(w).trigger('click')
  await flushPromises()
  return sheet(w)
}
const sheetButton = (w: VueWrapper, text: string) => {
  const found = w.findAll('[role="dialog"] button').find((b) => b.text().trim() === text)
  if (!found) throw new Error(`No sheet button "${text}"`)
  return found
}

describe('feat/23 phone Explore and the folded % Match note', () => {
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

  describe('ExploreView (phone intro)', () => {
    it('shows a short serif "Explore" title and "Every product in our catalogue." below lg only', async () => {
      const { wrapper } = await mountExplore()
      const intro = wrapper.get('.explore-phone-intro')

      expect(intro.classes()).toContain('lg:hidden')
      expect(intro.get('h1').text()).toBe('Explore')
      expect(intro.get('h1').classes()).toContain('font-serif')
      expect(intro.get('p').text()).toBe('Every product in our catalogue.')
    })

    it('keeps one compact band with a smaller product carousel for lg and up only, and no tick marks', async () => {
      // Rewritten in feat/27: the banner with its large title, paragraph and four
      // ticks became one short band. The ticks were dropped, and with them the
      // "100% Independent analysis" claim.
      const { wrapper } = await mountExplore()
      const hero = wrapper.get('.explore-hero')

      expect(hero.classes()).toEqual(expect.arrayContaining(['hidden', 'lg:flex', 'max-h-[120px]']))
      expect(hero.get('h1').text()).toBe('Explore')
      expect(hero.get('h1').classes()).toContain('font-serif')
      expect(hero.get('p').text()).toBe('Every product in our catalogue, with ingredient breakdowns and a match for your skin type.')
      expect(hero.findComponent({ name: 'ProductShowcaseMarquee' }).exists()).toBe(true)
      expect(hero.text()).not.toContain('Independent analysis')
      expect(hero.find('svg').exists()).toBe(false)
    })

    it('hides the catalogue heading below lg, where the intro already says it, and keeps it for lg and up', async () => {
      // Rewritten in feat/27: "Complete Registry / All Formulations" and its
      // sentence became a serif "All formulations" with a count.
      const { wrapper } = await mountExplore()
      const section = wrapper.get('.explore-filters')
      const heading = section.get('.catalog-heading')

      expect(section.classes()).toEqual(expect.arrayContaining(['hidden', 'lg:block']))
      expect(heading.get('h2').text()).toBe('All formulations')
      expect(heading.get('h2').classes()).toContain('font-serif')
      expect(wrapper.text()).not.toContain('Complete Registry')
    })
  })

  describe('ExploreView (phone filter bar)', () => {
    it('puts a Filters button before the category chips below lg, and keeps the filter bar for lg and up', async () => {
      // Reworded in feat/27: the big filter panel became the toolbar. Its price
      // slider is in the popover, which is drawn only once opened.
      const { wrapper } = await mountExplore()
      const bar = wrapper.get('.explore-phone-filters')
      const panel = wrapper.get('.explore-filters')

      expect(bar.classes()).toContain('lg:hidden')
      expect(filtersButton(wrapper).text()).toContain('Filters')
      expect(filtersButton(wrapper).attributes('aria-haspopup')).toBe('dialog')
      const chipsBar = bar.findComponent({ name: 'ExploreCategoryBar' })
      expect(chipsBar.exists()).toBe(true)
      expect(filtersButton(wrapper).element.compareDocumentPosition(chipsBar.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(panel.classes()).toEqual(expect.arrayContaining(['hidden', 'lg:block']))
      expect(panel.get('[role="toolbar"]').attributes('aria-label')).toBe('Filters')
      expect(panel.findComponent({ name: 'PriceRangeSlider' }).exists()).toBe(false)
    })

    it('shows no count while no brand or price filter is set, the category included', async () => {
      const { wrapper } = await mountExplore('/explore?category=Serums')

      expect(wrapper.find('.filters-count').exists()).toBe(false)
      expect(filtersButton(wrapper).text()).toBe('Filters')
    })

    it('counts a brand other than All and a price range away from its defaults', async () => {
      const { wrapper } = await mountExplore()

      await wrapper.get('select').setValue('CeraVe')
      expect(wrapper.get('.filters-count').text()).toBe('1')
      expect(filtersButton(wrapper).text()).toContain('1 active')

      ;(await priceSlider(wrapper)).vm.$emit('apply', { min: 0, maxCap: 1000 })
      await flushPromises()
      expect(wrapper.get('.filters-count').text()).toBe('2')
      expect(wrapper.get('.filters-count').attributes('aria-hidden')).toBe('true')
    })
  })

  describe('ExploreView (active filter chips)', () => {
    it('shows the brand as a removable chip, and removing it shows every brand again', async () => {
      const { wrapper } = await mountExplore()
      await wrapper.get('select').setValue('CeraVe')

      expect(chips(wrapper).map((c) => [c.text(), c.attributes('aria-label')])).toEqual([['CeraVe', 'Remove filter: CeraVe']])
      await chips(wrapper)[0]!.trigger('click')

      expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('All')
      expect(chips(wrapper)).toHaveLength(0)
    })

    it('words a price filter "Up to ฿1,000" from zero, and "฿200 to ฿800" otherwise', async () => {
      const { wrapper } = await mountExplore()

      ;(await priceSlider(wrapper)).vm.$emit('apply', { min: 0, maxCap: 1000 })
      await flushPromises()
      expect(chips(wrapper).map((c) => [c.text(), c.attributes('aria-label')])).toEqual([['Up to ฿1,000', 'Remove filter: Up to ฿1,000']])

      ;(await priceSlider(wrapper)).vm.$emit('apply', { min: 200, maxCap: 800 })
      await flushPromises()
      expect(chips(wrapper).map((c) => c.text())).toEqual(['฿200 to ฿800'])
    })

    it('counts and shows a price filter that only raises the lower bound', async () => {
      const { wrapper } = await mountExplore()

      ;(await priceSlider(wrapper)).vm.$emit('apply', { min: 200, maxCap: null })
      await flushPromises()

      expect(chips(wrapper).map((c) => c.text())).toEqual(['From ฿200'])
      expect(wrapper.get('.filters-count').text()).toBe('1')
    })

    it('clears the price filter from its chip, asking for the full range again', async () => {
      const { wrapper } = await mountExplore()
      ;(await priceSlider(wrapper)).vm.$emit('apply', { min: 200, maxCap: 800 })
      await flushPromises()

      await chips(wrapper)[0]!.trigger('click')
      await flushPromises()

      expect(lastRequest()).toEqual(['', undefined, undefined])
      expect((await priceSlider(wrapper)).props('maxCap')).toBeNull()
      expect(chips(wrapper)).toHaveLength(0)
    })

    it('keeps a brand picked on the page when a category is chosen', async () => {
      const { wrapper, router } = await mountExplore()
      await wrapper.get('select').setValue('CeraVe')

      wrapper.findComponent({ name: 'ExploreCategoryBar' }).vm.$emit('update:selected-category', 'Serums')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({ category: 'Serums' })
      expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('CeraVe')
      expect(chips(wrapper).map((c) => c.text())).toEqual(['CeraVe'])
    })

    it('still takes the brand from ?brand= in the address, on load and when the address changes', async () => {
      const { wrapper, router } = await mountExplore('/explore?brand=CeraVe')
      expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('CeraVe')

      await router.push('/explore?brand=La%20Roche-Posay')
      await flushPromises()
      expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('La Roche-Posay')
    })
  })

  describe('ExploreView (filters sheet)', () => {
    it('opens a modal dialog labelled "Filters", moves focus into it and stops the page scrolling', async () => {
      const { wrapper } = await mountExplore()
      const dialog = await openSheet(wrapper)

      expect(dialog.exists()).toBe(true)
      expect(dialog.attributes('aria-modal')).toBe('true')
      expect(wrapper.get(`#${dialog.attributes('aria-labelledby')}`).text()).toBe('Filters')
      expect(dialog.find('button[aria-label="Close filters"]').exists()).toBe(true)
      expect(dialog.element.contains(document.activeElement)).toBe(true)
      expect(document.body.style.overflow).toBe('hidden')
      expect(filtersButton(wrapper).attributes('aria-expanded')).toBe('true')
    })

    it('closes on Escape, gives focus back to the Filters button and lets the page scroll again', async () => {
      const { wrapper } = await mountExplore()
      const dialog = await openSheet(wrapper)

      await dialog.trigger('keydown', { key: 'Escape' })
      await flushPromises()

      expect(sheet(wrapper).exists()).toBe(false)
      expect(document.activeElement).toBe(filtersButton(wrapper).element)
      expect(document.body.style.overflow).toBe('')
    })

    it('keeps Tab and Shift+Tab inside the sheet', async () => {
      const { wrapper } = await mountExplore()
      await openSheet(wrapper)
      const close = wrapper.get('[role="dialog"] button[aria-label="Close filters"]')
      const show = sheetButton(wrapper, 'Show products')

      ;(show.element as HTMLElement).focus()
      await show.trigger('keydown', { key: 'Tab' })
      expect(document.activeElement).toBe(close.element)

      await close.trigger('keydown', { key: 'Tab', shiftKey: true })
      expect(document.activeElement).toBe(show.element)
    })

    it('moves Tab from the sheet itself, where focus lands on opening, to its first or last control', async () => {
      const { wrapper } = await mountExplore()
      const dialog = await openSheet(wrapper)
      expect(document.activeElement).toBe(dialog.element)

      await dialog.trigger('keydown', { key: 'Tab' })
      expect(document.activeElement).toBe(wrapper.get('[role="dialog"] button[aria-label="Close filters"]').element)

      ;(dialog.element as HTMLElement).focus()
      await dialog.trigger('keydown', { key: 'Tab', shiftKey: true })
      expect(document.activeElement).toBe(sheetButton(wrapper, 'Show products').element)
    })

    it('closes, dropping the changes, on a tap outside the sheet', async () => {
      const { wrapper, router } = await mountExplore()
      await openSheet(wrapper)
      await sheetButton(wrapper, 'Serums').trigger('click')

      await wrapper.get('[role="dialog"]').trigger('click')
      expect(sheet(wrapper).exists()).toBe(true)
      await wrapper.get('.bottom-sheet-backdrop').trigger('click')
      await flushPromises()

      expect(sheet(wrapper).exists()).toBe(false)
      expect(router.currentRoute.value.query).toEqual({})
    })

    it('starts from the filters on screen, and marks the chosen category with aria-pressed', async () => {
      const { wrapper } = await mountExplore('/explore?category=Serums')
      await wrapper.get('select').setValue('CeraVe')
      ;(await priceSlider(wrapper)).vm.$emit('apply', { min: 200, maxCap: 800 })
      await flushPromises()

      await openSheet(wrapper)

      expect(sheetButton(wrapper, 'Serums').attributes('aria-pressed')).toBe('true')
      expect(sheetButton(wrapper, 'All').attributes('aria-pressed')).toBe('false')
      expect((wrapper.get('#sheet-brand').element as HTMLSelectElement).value).toBe('CeraVe')
      expect(sheetSlider(wrapper).props()).toMatchObject({ minPrice: 200, maxCap: 800, variant: 'sheet' })
    })

    it('applies the category, brand and price on "Show products", through the page\'s own handlers', async () => {
      const { wrapper, router } = await mountExplore()
      await openSheet(wrapper)

      await sheetButton(wrapper, 'Serums').trigger('click')
      expect(sheetButton(wrapper, 'Serums').attributes('aria-pressed')).toBe('true')
      await wrapper.get('#sheet-brand').setValue('CeraVe')
      await dragSheetPrice(wrapper, 200, 800)
      await sheetButton(wrapper, 'Show products').trigger('click')
      await flushPromises()

      expect(sheet(wrapper).exists()).toBe(false)
      expect(router.currentRoute.value.query).toEqual({ category: 'Serums' })
      expect(lastRequest()).toEqual(['', 200, 800])
      // The brand outlives the category change, which re-reads the address.
      expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('CeraVe')
      expect(chips(wrapper).map((c) => c.text())).toEqual(['CeraVe', '฿200 to ฿800'])
      expect((await priceSlider(wrapper)).props('minPrice')).toBe(200)
      expect((await priceSlider(wrapper)).props('maxCap')).toBe(800)
    })

    it('discards what was changed when the sheet is closed without "Show products"', async () => {
      const { wrapper, router } = await mountExplore()
      await openSheet(wrapper)
      await sheetButton(wrapper, 'Serums').trigger('click')
      await wrapper.get('#sheet-brand').setValue('CeraVe')
      await dragSheetPrice(wrapper, 0, 500)
      expect(sheetSlider(wrapper).props('maxCap')).toBe(500)

      await wrapper.get('[role="dialog"] button[aria-label="Close filters"]').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({})
      expect(catalogRequests()).toHaveLength(1)
      expect(chips(wrapper)).toHaveLength(0)
      await openSheet(wrapper)
      expect(sheetButton(wrapper, 'All').attributes('aria-pressed')).toBe('true')
      expect((wrapper.get('#sheet-brand').element as HTMLSelectElement).value).toBe('All')
      expect(sheetSlider(wrapper).props()).toMatchObject({ minPrice: 0, maxCap: null })
    })

    it('resets every filter with "Clear all", applied on "Show products"', async () => {
      const { wrapper, router } = await mountExplore('/explore?category=Serums')
      await wrapper.get('select').setValue('CeraVe')
      ;(await priceSlider(wrapper)).vm.$emit('apply', { min: 200, maxCap: 800 })
      await flushPromises()
      await openSheet(wrapper)

      await sheetButton(wrapper, 'Clear all').trigger('click')
      expect(sheetButton(wrapper, 'All').attributes('aria-pressed')).toBe('true')
      expect((wrapper.get('#sheet-brand').element as HTMLSelectElement).value).toBe('All')
      // The handles go back to the ends of the track: 0 and no limit.
      expect(sheetSlider(wrapper).props()).toMatchObject({ minPrice: 0, maxCap: null })
      // Nothing applied yet.
      expect(router.currentRoute.value.query).toEqual({ category: 'Serums' })
      expect(chips(wrapper)).toHaveLength(2)

      await sheetButton(wrapper, 'Show products').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({})
      expect(lastRequest()).toEqual(['', undefined, undefined])
      expect(chips(wrapper)).toHaveLength(0)
    })

    it('puts a price range given the wrong way round in order, and reads one that is not a number as no limit', async () => {
      // The slider keeps its handles in order; the page still guards the request.
      const { wrapper } = await mountExplore()
      await openSheet(wrapper)
      await dragSheetPrice(wrapper, 900, 300)
      await sheetButton(wrapper, 'Show products').trigger('click')
      await flushPromises()
      expect(lastRequest()).toEqual(['', 300, 900])

      await openSheet(wrapper)
      await dragSheetPrice(wrapper, Number.NaN, Number.NaN)
      await sheetButton(wrapper, 'Show products').trigger('click')
      await flushPromises()
      expect(lastRequest()).toEqual(['', undefined, undefined])
    })

    it('asks for nothing new when "Show products" changes nothing', async () => {
      const { wrapper, router } = await mountExplore('/explore?category=Serums')
      await openSheet(wrapper)

      await sheetButton(wrapper, 'Show products').trigger('click')
      await flushPromises()

      expect(catalogRequests()).toHaveLength(1)
      expect(router.currentRoute.value.query).toEqual({ category: 'Serums' })
    })

    it('lets the price slider shrink with the sheet, so nothing scrolls sideways on a 375px screen', async () => {
      // jsdom has no layout, so the classes that allow shrinking are read. The
      // slider's own root is checked in PriceSliderSheet.spec.
      const { wrapper } = await mountExplore()
      await openSheet(wrapper)
      const row = wrapper.get('.sheet-price-row')

      expect(row.classes()).toEqual(expect.arrayContaining(['w-full', 'min-w-0']))
      expect(row.findComponent({ name: 'PriceRangeSlider' }).props('variant')).toBe('sheet')
      expect(wrapper.findAll('[role="dialog"] input[type="number"]')).toHaveLength(0)
      expect(wrapper.findAll('[role="dialog"] fieldset').every((f) => f.classes().includes('min-w-0'))).toBe(true)
      expect(wrapper.get('.bottom-sheet-body').classes()).toEqual(expect.arrayContaining(['overflow-x-hidden', 'min-w-0']))
    })
  })

  describe('ExploreView (% Match sheet and note)', () => {
    it('folds the % Match note on lg behind a "What is % Match?" disclosure', async () => {
      const { wrapper } = await mountExplore()
      const note = wrapper.get('.match-explainer')
      const toggle = note.get('button.match-info-toggle')

      expect(note.classes()).toEqual(expect.arrayContaining(['hidden', 'lg:block']))
      expect(toggle.text()).toBe('What is % Match?')
      expect(toggle.attributes('aria-expanded')).toBe('false')
      expect(note.find('.match-disclaimer').exists()).toBe(false)

      await toggle.trigger('click')

      expect(toggle.attributes('aria-expanded')).toBe('true')
      expect(note.get(`#${toggle.attributes('aria-controls')}`).text()).toContain(MATCH_SCORE_BASIS)
      expect(note.get('.match-disclaimer').text()).toBe(MATCH_SCORE_DISCLAIMER)
    })

    it('opens the same words in a "What is % Match?" sheet from "What\'s % Match?" on a phone', async () => {
      const { wrapper } = await mountExplore()
      const button = wrapper.get('button.match-info-button')

      expect(button.text()).toBe("What's % Match?")
      expect(button.element.closest('.explore-phone-filters')).not.toBeNull()
      await button.trigger('click')
      await flushPromises()

      const dialog = sheet(wrapper)
      expect(dialog.attributes('aria-modal')).toBe('true')
      expect(wrapper.get(`#${dialog.attributes('aria-labelledby')}`).text()).toBe('What is % Match?')
      const text = dialog.get('.match-sheet').text()
      expect(text).toContain(`${MATCH_SCORE_BASIS} Sign in and take the skin quiz to see yours.`)
      expect(dialog.get('.match-disclaimer').text()).toBe(MATCH_SCORE_DISCLAIMER)
      expect(dialog.get('a.match-how-link').attributes('href')).toBe('/how-match-works')
      expect(dialog.get('a.match-how-link').text()).toBe('How % Match is calculated, and our sources')
    })

    it('closes the % Match sheet on Escape and gives focus back to its button', async () => {
      const { wrapper } = await mountExplore()
      const button = wrapper.get('button.match-info-button')
      await button.trigger('click')
      await flushPromises()
      expect(document.body.style.overflow).toBe('hidden')

      await sheet(wrapper).trigger('keydown', { key: 'Escape' })
      await flushPromises()

      expect(sheet(wrapper).exists()).toBe(false)
      expect(document.activeElement).toBe(button.element)
      expect(document.body.style.overflow).toBe('')
    })

    it('words the sheet for a signed-in user with a skin type without the sign-in step', async () => {
      vi.mocked(searchProducts).mockResolvedValue(CATALOGUE as never)
      const { wrapper } = await mountExplore()
      useAuthStore().setAuth('token-1', { id: 'u-1', skin_type: 'OSPW' })
      await flushPromises()

      await wrapper.get('button.match-info-button').trigger('click')
      await flushPromises()

      expect(sheet(wrapper).get('.match-sheet p').text()).toBe(MATCH_SCORE_BASIS)
    })
  })
})
