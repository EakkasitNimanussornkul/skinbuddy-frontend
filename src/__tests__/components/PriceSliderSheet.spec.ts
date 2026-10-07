import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('../../api/products.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  searchProducts: vi.fn(),
}))

import { searchProducts } from '../../api/products.ts'
import PriceRangeSlider from '../../components/Catalog/PriceRangeSlider.vue'
import ExploreView from '../../views/ExploreView.vue'
import { declared } from '../fixtures/styleRules'

// The component's scoped styles, as text: jsdom draws no range handles.
const SLIDER_SOURCE = readFileSync(join(process.cwd(), 'src', 'components', 'Catalog', 'PriceRangeSlider.vue'), 'utf8')
const SLIDER_STYLE = SLIDER_SOURCE.slice(SLIDER_SOURCE.indexOf('<style'))

const mounted: VueWrapper[] = []
const track = (w: VueWrapper) => {
  mounted.push(w)
  return w
}

const mountSlider = (props: Record<string, unknown>) =>
  track(mount(PriceRangeSlider, { props: { minPrice: 0, maxCap: null, ...props }, attachTo: document.body }))

// The lg Price popover has the same two handles, so inside Explore these are
// read from the filters sheet.
const scope = (w: VueWrapper) => (w.find('.filters-sheet').exists() ? w.get('.filters-sheet') : w)
const lowest = (w: VueWrapper) => scope(w).get<HTMLInputElement>('input[aria-label="Lowest price"]')
const highest = (w: VueWrapper) => scope(w).get<HTMLInputElement>('input[aria-label="Highest price"]')

/** Moves a handle the way a drag or an arrow key does: a new value, then input. */
const move = async (input: ReturnType<typeof lowest>, value: number) => {
  input.element.value = String(value)
  await input.trigger('input')
}

const catalogRequests = () => vi.mocked(searchProducts).mock.calls.filter((args) => args.length === 3)
const lastRequest = () => catalogRequests()[catalogRequests().length - 1]

/** Explore with the real slider, Teleport stubbed so the sheet renders in the wrapper. */
const mountExplore = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:any(.*)*', component: { template: '<div />' } }],
  })
  await router.push('/explore')
  await router.isReady()
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = track(
    mount(ExploreView, {
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
    }),
  )
  await flushPromises()
  await wrapper.get('button.filters-button').trigger('click')
  await flushPromises()
  return wrapper
}
const sheetButton = (w: VueWrapper, text: string) => w.findAll('[role="dialog"] button').find((b) => b.text().trim() === text)!

describe('feat/26 the phone Filters sheet price slider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.body.style.overflow = ''
    vi.mocked(searchProducts).mockResolvedValue([] as never)
  })
  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
    document.body.innerHTML = ''
  })

  describe('PriceRangeSlider (sheet variant)', () => {
    it('has no Apply or Clear in the sheet, has Clear and Apply in the popover, and has no ceiling box in either', () => {
      // Retitled in feat/27: the lg panel and its ceiling box became the Price
      // popover with a Lowest and a Highest box; the sheet still has no buttons.
      const popover = mountSlider({})
      expect(popover.findAll('button').map((b) => b.text())).toEqual(['Clear', 'Apply'])
      expect(popover.findAll('input[type="number"]')).toHaveLength(0)
      expect(popover.text()).not.toContain('Ceiling')

      const sheet = mountSlider({ variant: 'sheet' })
      expect(sheet.findAll('button')).toHaveLength(0)
      expect(sheet.findAll('input[type="number"]')).toHaveLength(0)
      expect(sheet.text()).not.toContain('Ceiling')
      expect(sheet.findAll('input[type="range"]')).toHaveLength(2)
      expect(sheet.findAll('input[inputmode="numeric"]')).toHaveLength(2)
    })

    it('reports every move of a handle as the live range, for the sheet to keep', async () => {
      const w = mountSlider({ variant: 'sheet' })

      await move(lowest(w), 200)
      await move(highest(w), 800)

      // The highest handle left at the end of the default bar is no limit (null).
      expect(w.emitted('update:range')).toEqual([[{ min: 200, maxCap: null }], [{ min: 200, maxCap: 800 }]])
      expect(w.emitted('apply')).toBeUndefined()
    })

    it('keeps the handles 20 baht apart, and puts a handle pushed past that back where the rule kept it', async () => {
      const w = mountSlider({ variant: 'sheet', minPrice: 200, maxCap: 300 })

      await move(lowest(w), 300)
      expect(lowest(w).element.value).toBe('280')
      // Pushed again: the kept value does not change, so nothing re-renders the handle.
      await move(lowest(w), 290)
      expect(lowest(w).element.value).toBe('280')
      await move(highest(w), 200)
      expect(highest(w).element.value).toBe('300')
      const moves = w.emitted('update:range')!
      expect(moves[moves.length - 1]).toEqual([{ min: 280, maxCap: 300 }])
    })

    it('moves both handles back to 0 and the end of the bar (no limit) when the sheet clears its draft', async () => {
      const w = mountSlider({ variant: 'sheet', minPrice: 200, maxCap: 800 })
      expect([lowest(w).element.value, highest(w).element.value]).toEqual(['200', '800'])

      await w.setProps({ minPrice: 0, maxCap: null })

      expect([lowest(w).element.value, highest(w).element.value]).toEqual(['0', '1500'])
      expect([w.get<HTMLInputElement>('.price-input-low').element.value, w.get<HTMLInputElement>('.price-input-high').element.value]).toEqual(['0', '1,500+'])
    })

    it('names the handles "Lowest price" and "Highest price" and reads their values out in baht', async () => {
      const w = mountSlider({ variant: 'sheet', minPrice: 200, maxCap: 1200 })

      expect(lowest(w).attributes()).toMatchObject({ type: 'range', min: '0', max: '1500', step: '10', 'aria-valuetext': '200 baht' })
      expect(highest(w).attributes('aria-valuetext')).toBe('1,200 baht')
      await move(lowest(w), 450)
      expect(lowest(w).attributes('aria-valuetext')).toBe('450 baht')
      // At the end of the default bar the highest handle is no limit, and says so.
      await move(highest(w), 1500)
      expect(highest(w).attributes('aria-valuetext')).toBe('no upper limit')
    })

    it('shows the two prices in the Lowest and Highest boxes above the track, with no tag on each handle to overlap where they meet', () => {
      // Retitled in feat/27: the one "฿X – ฿Y" label became two labelled boxes.
      const w = mountSlider({ variant: 'sheet', minPrice: 700, maxCap: 720 })
      const low = w.get<HTMLInputElement>('.price-input-low')
      const high = w.get<HTMLInputElement>('.price-input-high')

      expect([low.element.value, high.element.value]).toEqual(['700', '720'])
      expect(w.findAll('label').map((l) => l.text().replace('฿', '').trim())).toEqual(['Lowest', 'Highest'])
      // The drawn handles carry no text, so nothing overlaps where they meet.
      expect(w.findAll('.price-handle')).toHaveLength(2)
      expect(w.findAll('.price-handle').every((h) => h.text() === '')).toBe(true)
      // The boxes come before the track.
      expect(high.element.compareDocumentPosition(w.get('.price-track').element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('lets a drag on the track pan sideways only, so moving a handle never scrolls the sheet', () => {
      const w = mountSlider({ variant: 'sheet' })
      const area = w.get('.price-track')

      expect(area.classes()).toContain('touch-pan-x')
      expect(area.find('input[aria-label="Lowest price"]').exists()).toBe(true)
      expect(area.find('input[aria-label="Highest price"]').exists()).toBe(true)
    })

    it('gives each handle a 44px touch target under a drawn handle of at least 36px, and only the handles take a touch', () => {
      const w = mountSlider({ variant: 'sheet' })

      for (const input of [lowest(w), highest(w)]) expect(input.classes()).toEqual(expect.arrayContaining(['price-range-input', 'h-11', 'pointer-events-none']))
      for (const handle of w.findAll('.price-handle')) expect(handle.classes()).toEqual(expect.arrayContaining(['w-9', 'h-9']))
      for (const thumb of ['.price-range-input::-webkit-slider-thumb', '.price-range-input::-moz-range-thumb']) {
        expect(declared(thumb, 'width', SLIDER_STYLE)).toEqual(['44px'])
        expect(declared(thumb, 'height', SLIDER_STYLE)).toEqual(['44px'])
        expect(declared(thumb, 'pointer-events', SLIDER_STYLE)).toEqual(['auto'])
      }
    })

    it('puts the lower handle on top once it is past the middle, so either can still move where they meet', async () => {
      const w = mountSlider({ variant: 'sheet', minPrice: 100, maxCap: 120 })
      expect(lowest(w).classes()).toContain('z-20')

      await w.setProps({ minPrice: 1460, maxCap: 1480 })
      expect(lowest(w).classes()).toContain('z-30')
      expect(highest(w).classes()).toContain('z-20')
    })

    it('glides the drawn bar and handles when a number is typed, but not while a handle is held, and not under reduced motion', async () => {
      // Retitled in feat/27: the feat/26 slider had no motion at all; the bar
      // now glides to a typed number and follows the finger with no delay.
      const w = mountSlider({ variant: 'sheet' })
      const fill = () => w.get('.price-track-fill').classes()

      expect(fill()).toEqual(expect.arrayContaining(['transition-[left,width]', 'motion-reduce:transition-none']))
      expect(w.get('.price-handle-max').classes()).toEqual(expect.arrayContaining(['transition-[left]', 'motion-reduce:transition-none']))
      // The native handles themselves have no transition rule.
      expect(SLIDER_STYLE).not.toMatch(/transition|animation/)

      await highest(w).trigger('pointerdown')
      expect(fill()).not.toContain('transition-[left,width]')
      expect(w.get('.price-handle-max').classes()).not.toContain('transition-[left]')

      window.dispatchEvent(new Event('pointerup'))
      await flushPromises()
      expect(fill()).toContain('transition-[left,width]')
    })

    it('stacks the Lowest and Highest boxes above the track on screen as well as in reading order', () => {
      const w = mountSlider({ variant: 'sheet' })
      const root = w.get('.price-slider-sheet')

      // A plain top-to-bottom column, the boxes first: nothing reorders them visually.
      expect(root.classes()).toContain('flex-col')
      expect(root.classes().some((c) => /(^|:)(flex-col-reverse|order-)/.test(c))).toBe(false)
      expect(root.element.firstElementChild!.contains(w.get('.price-input-low').element)).toBe(true)
      expect(root.element.firstElementChild!.contains(w.get('.price-input-high').element)).toBe(true)
      expect(w.findAll('.price-slider-sheet *').some((el) => el.classes().some((c) => /(^|:)order-/.test(c)))).toBe(false)
    })
  })

  describe('ExploreView (filters sheet with the real slider)', () => {
    it('applies the range the handles were moved to on "Show products"', async () => {
      const w = await mountExplore()
      await move(lowest(w), 200)
      await move(highest(w), 800)

      await sheetButton(w, 'Show products').trigger('click')
      await flushPromises()

      expect(lastRequest()).toEqual(['', 200, 800])
      expect(w.findAll('button.active-filter-chip').map((c) => c.text())).toContain('฿200 to ฿800')
    })

    it('moves the handles back to the ends with "Clear all", and applies that on "Show products"', async () => {
      const w = await mountExplore()
      await move(lowest(w), 200)
      await move(highest(w), 800)
      await sheetButton(w, 'Show products').trigger('click')
      await flushPromises()
      await w.get('button.filters-button').trigger('click')
      await flushPromises()
      expect([lowest(w).element.value, highest(w).element.value]).toEqual(['200', '800'])

      await sheetButton(w, 'Clear all').trigger('click')
      await flushPromises()
      expect([lowest(w).element.value, highest(w).element.value]).toEqual(['0', '1500'])

      await sheetButton(w, 'Show products').trigger('click')
      await flushPromises()
      expect(lastRequest()).toEqual(['', undefined, undefined])
    })

    it('drops a moved handle when the sheet is closed without "Show products"', async () => {
      const w = await mountExplore()
      await move(highest(w), 500)

      await w.get('[role="dialog"] button[aria-label="Close filters"]').trigger('click')
      await flushPromises()
      expect(catalogRequests()).toHaveLength(1)

      await w.get('button.filters-button').trigger('click')
      await flushPromises()
      expect(highest(w).element.value).toBe('1500')
    })
  })
})
