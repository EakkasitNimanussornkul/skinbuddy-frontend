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
  track(mount(PriceRangeSlider, { props: { minPrice: 0, maxPrice: 1500, defaultMaxLimit: 1500, ...props }, attachTo: document.body }))

const lowest = (w: VueWrapper) => w.get<HTMLInputElement>('input[aria-label="Lowest price"]')
const highest = (w: VueWrapper) => w.get<HTMLInputElement>('input[aria-label="Highest price"]')

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
    it('has no Apply, Clear or ceiling box in the sheet, and keeps all three on the lg panel', () => {
      const panel = mountSlider({})
      expect(panel.findAll('button').map((b) => b.text())).toEqual(['CLEAR', 'APPLY'])
      expect(panel.findAll('input[type="number"]')).toHaveLength(1)

      const sheet = mountSlider({ variant: 'sheet' })
      expect(sheet.findAll('button')).toHaveLength(0)
      expect(sheet.findAll('input[type="number"]')).toHaveLength(0)
      expect(sheet.findAll('input[type="range"]')).toHaveLength(2)
    })

    it('reports every move of a handle as the live range, for the sheet to keep', async () => {
      const w = mountSlider({ variant: 'sheet' })

      await move(lowest(w), 200)
      await move(highest(w), 800)

      expect(w.emitted('update:range')).toEqual([[{ min: 200, max: 1500 }], [{ min: 200, max: 800 }]])
      expect(w.emitted('apply')).toBeUndefined()
    })

    it('keeps the handles 20 baht apart, and puts a handle pushed past that back where the rule kept it', async () => {
      const w = mountSlider({ variant: 'sheet', minPrice: 200, maxPrice: 300 })

      await move(lowest(w), 300)
      expect(lowest(w).element.value).toBe('280')
      // Pushed again: the kept value does not change, so nothing re-renders the handle.
      await move(lowest(w), 290)
      expect(lowest(w).element.value).toBe('280')
      await move(highest(w), 200)
      expect(highest(w).element.value).toBe('300')
      const moves = w.emitted('update:range')!
      expect(moves[moves.length - 1]).toEqual([{ min: 280, max: 300 }])
    })

    it('moves both handles back to 0 and 1,500 when the sheet clears its draft', async () => {
      const w = mountSlider({ variant: 'sheet', minPrice: 200, maxPrice: 800 })
      expect([lowest(w).element.value, highest(w).element.value]).toEqual(['200', '800'])

      await w.setProps({ minPrice: 0, maxPrice: 1500 })

      expect([lowest(w).element.value, highest(w).element.value]).toEqual(['0', '1500'])
      expect(w.get('.price-range-label').text()).toBe('฿0 – ฿1,500')
    })

    it('names the handles "Lowest price" and "Highest price" and reads their values out in baht', async () => {
      const w = mountSlider({ variant: 'sheet', minPrice: 200, maxPrice: 1200 })

      expect(lowest(w).attributes()).toMatchObject({ type: 'range', min: '0', max: '1500', step: '10', 'aria-valuetext': '200 baht' })
      expect(highest(w).attributes('aria-valuetext')).toBe('1,200 baht')
      await move(lowest(w), 450)
      expect(lowest(w).attributes('aria-valuetext')).toBe('450 baht')
    })

    it('shows the range as one "฿X – ฿Y" label above the track, with no tag on each handle to overlap where they meet', () => {
      const w = mountSlider({ variant: 'sheet', minPrice: 700, maxPrice: 720 })
      const label = w.get('.price-range-label')

      expect(label.text()).toBe('฿700 – ฿720')
      expect(w.findAll('*').filter((el) => el.element.children.length === 0 && el.text().includes('฿'))).toHaveLength(1)
      // The label comes before the track.
      expect(label.element.compareDocumentPosition(w.get('.price-track').element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('lets a drag on the track pan sideways only, so moving a handle never scrolls the sheet', () => {
      const w = mountSlider({ variant: 'sheet' })
      const area = w.get('.price-track')

      expect(area.classes()).toContain('touch-pan-x')
      expect(area.find('input[aria-label="Lowest price"]').exists()).toBe(true)
      expect(area.find('input[aria-label="Highest price"]').exists()).toBe(true)
    })

    it('gives each handle a 44px touch target, and only the handles take a touch', () => {
      const w = mountSlider({ variant: 'sheet' })

      for (const input of [lowest(w), highest(w)]) expect(input.classes()).toEqual(expect.arrayContaining(['sheet-range', 'h-11', 'pointer-events-none']))
      for (const thumb of ['.sheet-range::-webkit-slider-thumb', '.sheet-range::-moz-range-thumb']) {
        expect(declared(thumb, 'width', SLIDER_STYLE)).toEqual(['44px'])
        expect(declared(thumb, 'height', SLIDER_STYLE)).toEqual(['44px'])
        expect(declared(thumb, 'pointer-events', SLIDER_STYLE)).toEqual(['auto'])
      }
    })

    it('puts the lower handle on top once it is past the middle, so either can still move where they meet', async () => {
      const w = mountSlider({ variant: 'sheet', minPrice: 100, maxPrice: 120 })
      expect(lowest(w).classes()).toContain('z-20')

      await w.setProps({ minPrice: 1460, maxPrice: 1480 })
      expect(lowest(w).classes()).toContain('z-30')
      expect(highest(w).classes()).toContain('z-20')
    })

    it('adds no motion to the label, the track or the handles, so there is nothing to reduce', () => {
      const w = mountSlider({ variant: 'sheet' })
      const sheetRules = SLIDER_STYLE.slice(SLIDER_STYLE.indexOf('.sheet-range'))

      expect(sheetRules).not.toMatch(/transition|animation/)
      expect(w.findAll('*').some((el) => el.classes().some((c) => /^(transition|animate|duration)/.test(c)))).toBe(false)
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
      expect(lastRequest()).toEqual(['', 0, 1500])
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
