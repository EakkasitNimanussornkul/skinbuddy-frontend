import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { Transition, TransitionGroup } from 'vue'

vi.mock('../../api/products.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  searchProducts: vi.fn(),
}))

import { searchProducts } from '../../api/products.ts'
import ExploreView from '../../views/ExploreView.vue'
import CollapseTransition from '../../components/Shared/CollapseTransition.vue'
import { declared, reducedMotionBlocks } from '../fixtures/styleRules'

const CATALOGUE = [
  { id: 'c1', brand: 'CeraVe', name: 'A', category: 'Cleanser', slug: 'a', product_ingredients: [] },
  { id: 't1', brand: 'COSRX', name: 'B', category: 'Toner', slug: 'b', product_ingredients: [] },
]

// Test Utils types the props of a stubbed Transition as none; this reads them by name.
type PropsWrapper = VueWrapper & { props(name: string): unknown }

const mounted: VueWrapper[] = []
const mountExplore = async (address = '/explore') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:any(.*)*', component: { template: '<div />' } }],
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

const transitionNamed = (w: VueWrapper, name: string) => (w.findAllComponents(Transition) as unknown as PropsWrapper[]).filter((t) => t.props('name') === name)
const groupNamed = (w: VueWrapper, name: string) => (w.findAllComponents(TransitionGroup) as unknown as PropsWrapper[]).find((t) => t.props('name') === name)
const priceButton = (w: VueWrapper) => w.get('button.toolbar-price')

const SLIDER_SOURCE = readFileSync(join(process.cwd(), 'src', 'components', 'Catalog', 'PriceRangeSlider.vue'), 'utf8')
const MARQUEE_SOURCE = readFileSync(join(process.cwd(), 'src', 'components', 'Catalog', 'ProductShowcaseMarquee.vue'), 'utf8')

describe('feat/27 the motion of the filter bar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(searchProducts).mockResolvedValue(CATALOGUE as never)
  })
  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
    document.body.innerHTML = ''
  })

  describe('ExploreView (the popover and the chips)', () => {
    it('opens and closes the price popover with the menu-drop motion, from its top right corner', async () => {
      const { wrapper } = await mountExplore()
      expect(wrapper.find('[aria-label="Price range"]').exists()).toBe(false)

      await priceButton(wrapper).trigger('click')
      await flushPromises()

      const [drop] = transitionNamed(wrapper, 'menu-drop')
      expect(drop).toBeDefined()
      const box = drop!.get('[aria-label="Price range"]')
      expect(box.classes()).toContain('origin-top-right')
      // v-if, so a closed popover is not in the page and a leaving one is removed when it ends.
      await priceButton(wrapper).trigger('click')
      await flushPromises()
      expect(wrapper.find('[aria-label="Price range"]').exists()).toBe(false)
    })

    it('rotates the Price chevron when the popover is open, and eases it unless motion is reduced', async () => {
      const { wrapper } = await mountExplore()
      const chevron = () => wrapper.get('.toolbar-price-chevron')

      expect(chevron().classes()).not.toContain('rotate-180')
      expect(chevron().classes()).toEqual(expect.arrayContaining(['transition-transform', 'duration-150', 'motion-reduce:transition-none']))
      await priceButton(wrapper).trigger('click')
      expect(chevron().classes()).toContain('rotate-180')
    })

    it('eases the colour, border and background of the toolbar buttons between idle and active, unless motion is reduced', async () => {
      const { wrapper } = await mountExplore()

      for (const el of [wrapper.get('.toolbar-brand'), priceButton(wrapper)]) {
        expect(el.classes()).toEqual(expect.arrayContaining(['transition-colors', 'duration-150', 'motion-reduce:transition-none']))
      }
    })

    it('fades and scales the active filter chips in and out as a group, and folds their row with the first and last chip', async () => {
      const { wrapper } = await mountExplore()
      expect(groupNamed(wrapper, 'chip-pop')).toBeUndefined()
      expect(wrapper.findAllComponents(CollapseTransition).length).toBeGreaterThan(0)

      await wrapper.get('select.toolbar-brand-select').setValue('CeraVe')

      const group = groupNamed(wrapper, 'chip-pop')!
      expect(group.props('tag')).toBe('div')
      expect(group.findAll('button.desktop-filter-chip')).toHaveLength(1)
      expect(group.find('button.clear-all-filters').exists()).toBe(true)
      // The row is the one folded by CollapseTransition.
      const fold = wrapper.findAllComponents(CollapseTransition).find((c) => c.find('.active-filters-bar').exists())
      expect(fold).toBeDefined()
    })

    it('defines the chip motion in style.css, with the reduced-motion guard', () => {
      expect(declared('.chip-pop-enter-from', 'transform')).toEqual(['scale(0.9)'])
      expect(declared('.chip-pop-enter-from', 'opacity')).toEqual(['0'])
      expect(declared('.chip-pop-enter-active', 'transition').join(' ')).toContain('opacity')
      expect(declared('.chip-pop-move', 'transition').length).toBeGreaterThan(0)
      const guard = reducedMotionBlocks().join('\n')
      for (const name of ['.chip-pop-enter-active', '.chip-pop-leave-active', '.chip-pop-move']) expect(guard).toContain(name)
    })
  })

  describe('ExploreView (the heading, the count and the intro)', () => {
    it('cross-fades the heading when the category changes, and the count when the number changes', async () => {
      const { wrapper } = await mountExplore()
      const fades = transitionNamed(wrapper, 'swap-fade')

      const heading = fades.find((t) => t.find('.catalog-title').exists())!
      expect(heading.props('mode')).toBe('out-in')
      expect(heading.get('.catalog-title').text()).toBe('All formulations')
      const count = fades.find((t) => t.text() === '2 products')!
      expect(count.props('mode')).toBe('out-in')
    })

    it('lifts the intro band in on load: the title, then the line, then the carousel, one step apart', async () => {
      const { wrapper } = await mountExplore()
      const delay = (sel: string) => wrapper.get(sel).attributes('style')

      for (const sel of ['.explore-hero-title', '.explore-hero-line', '.explore-hero-thumbs']) {
        expect(wrapper.get(sel).classes()).toContain('rise-in')
      }
      expect(delay('.explore-hero-title')).toContain('--rise-delay: 0ms')
      expect(delay('.explore-hero-line')).toContain('--rise-delay: 70ms')
      expect(delay('.explore-hero-thumbs')).toContain('--rise-delay: 140ms')
    })

    it('holds the carousel still, and every rise-in and menu-drop, under reduced motion', () => {
      expect(MARQUEE_SOURCE).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.animate-marquee\s*\{\s*animation: none/)
      const guard = reducedMotionBlocks().join('\n')
      expect(guard).toContain('.rise-in')
      expect(guard).toContain('.menu-drop-enter-active')
      expect(guard).toContain('.swap-fade-enter-active')
    })
  })

  describe('ExploreView (the results)', () => {
    it('keeps the card flow in the results region: a list that glides, with each leaving card pinned in place', async () => {
      const { wrapper } = await mountExplore()
      const flow = groupNamed(wrapper, 'card-flow')!

      expect(flow.props('tag')).toBe('ul')
      expect(flow.props('appear')).toBe(true)
      expect(flow.classes()).toContain('relative')
      expect(wrapper.get('.catalog-results').element.contains(flow.element)).toBe(true)
    })

    it('has no motion of its own on the results region, which only holds its height while a reload runs', async () => {
      const { wrapper } = await mountExplore()
      const region = wrapper.get('.catalog-results')

      expect(region.classes().some((c) => /transition|animate|duration/.test(c))).toBe(false)
    })
  })

  describe('PriceRangeSlider (the glide)', () => {
    it('glides the filled bar and the handles on a typed number, and holds that back during a drag and under reduced motion', () => {
      expect(SLIDER_SOURCE).toContain("transition-[left,width] duration-200 ease-out motion-reduce:transition-none")
      expect(SLIDER_SOURCE).toContain("transition-[left] duration-200 ease-out motion-reduce:transition-none")
      // Both are switched off while a handle is held.
      expect(SLIDER_SOURCE).toMatch(/dragging\.value \? '' : 'transition-\[left,width\]/)
      expect(SLIDER_SOURCE).toMatch(/dragging\.value \? '' : 'transition-\[left\]/)
    })
  })
})
