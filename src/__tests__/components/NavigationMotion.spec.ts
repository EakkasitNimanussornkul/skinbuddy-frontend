import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))
vi.mock('../../api/products', () => ({
  searchProducts: vi.fn().mockResolvedValue([]),
}))
vi.mock('../../api/submissionsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/submissionsApi')>()),
  getMySubmissions: vi.fn(),
}))

import { apiClient } from '../../api/index'
import { getMySubmissions } from '../../api/submissionsApi'
import { resetAdminState } from '../../composables/useAdmin'
import { useAuthStore } from '../../stores/auth'
import AppSidebar from '../../components/Shared/AppSidebar.vue'
import MobileTopBar from '../../components/Shared/MobileTopBar.vue'
import MatchInfoDisclosure from '../../components/Shared/MatchInfoDisclosure.vue'
import CollapseTransition from '../../components/Shared/CollapseTransition.vue'
import SearchAutocompleteInput from '../../components/Shared/SearchAutocompleteInput.vue'
import MySubmissionsView from '../../views/MySubmissionsView.vue'
import SubmitDone from '../../components/Submissions/SubmitDone.vue'
import { declared, movingRules, offUnderReducedMotion, selectorsOf } from '../fixtures/styleRules'

const mounted: VueWrapper[] = []
const track = (w: VueWrapper) => {
  mounted.push(w)
  return w
}

const makeRouter = async (address = '/') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:any(.*)*', component: { template: '<div />' } }],
  })
  await router.push(address)
  await router.isReady()
  return router
}

const signIn = () => {
  useAuthStore().setAuth('token-1', { id: 'u-1', display_name: 'Ploy Example', skin_type: 'DRNT' })
  vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'u-1', role: 'user' } })
}

/** A CSS custom property set inline, from a bound style or a static attribute. */
const inlineVar = (el: { element: Element }, name: string) => {
  const node = el.element as HTMLElement
  const bound = node.style.getPropertyValue(name).trim()
  if (bound) return bound
  return node.getAttribute('style')?.match(new RegExp(`${name}\\s*:\\s*([^;]+)`))?.[1]?.trim() ?? ''
}
const ms = (value: string) => Number.parseFloat(value || '0')

/** The test setup reports reduced motion; this lifts it for one case. */
const allowMotion = () => {
  const original = window.matchMedia
  window.matchMedia = ((query: string) => ({ ...original(query), matches: false })) as typeof window.matchMedia
  return () => {
    window.matchMedia = original
  }
}

describe('feat/26 motion on navigation, disclosures and the submission pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
    resetAdminState()
  })
  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
    document.body.innerHTML = ''
  })

  describe('style.css (motion classes and reduced motion)', () => {
    it('switches off every animation and transition in style.css under prefers-reduced-motion', () => {
      const moving = movingRules().flatMap(selectorsOf)
      // The new motion is among them, so the guard is checked where it matters.
      expect(moving).toEqual(expect.arrayContaining(['.rise-in', '.menu-drop-enter-active', '.menu-rise-leave-active', '.dialog-pop-enter-active', '.dialog-pop-leave-active .dialog-pop-panel']))

      const unguarded = movingRules().flatMap((rule) =>
        selectorsOf(rule).filter((selector) => {
          const property = /(?:^|;)\s*animation\s*:/.test(rule.body) ? 'animation' : 'transition'
          return !offUnderReducedMotion(selector, property)
        }),
      )
      expect(unguarded).toEqual([])
    })

    it('fades a page block up on the quiz entrance curve, with its delay, length and distance settable per use', () => {
      const [animation] = declared('.rise-in', 'animation')
      expect(animation).toContain('rise-in var(--rise-duration, 300ms)')
      expect(animation).toContain('cubic-bezier(0.16, 1, 0.3, 1)')
      expect(animation).toContain('var(--rise-delay, 0ms)')
      expect(animation).toMatch(/backwards$/)
      expect(declared('from', 'transform')).toContain('translateY(var(--rise-distance, 10px))')
    })

    it('drops a menu from 8px above at 0.97 scale, rises one from 8px below, and both take no clicks while leaving', () => {
      expect(declared('.menu-drop-enter-from', 'transform')).toEqual(['translateY(-8px) scale(0.97)'])
      expect(declared('.menu-rise-enter-from', 'transform')).toEqual(['translateY(8px) scale(0.97)'])
      // First as declared; the second is its reduced-motion `none`.
      expect(declared('.menu-drop-enter-active', 'transition')).toEqual(['opacity 200ms ease, transform 200ms ease', 'none'])
      expect(declared('.menu-rise-leave-active', 'pointer-events')).toEqual(['none'])
      expect(declared('.menu-drop-leave-active', 'pointer-events')).toEqual(['none'])
    })
  })

  describe('AppSidebar (motion)', () => {
    const toggle = (w: VueWrapper) => w.get('button.explore-toggle')

    it('folds the Explore categories open and shut with CollapseTransition, the list inside the folding wrapper', async () => {
      const w = track(mount(AppSidebar, { global: { plugins: [await makeRouter()] }, attachTo: document.body }))
      await flushPromises()

      const collapse = w.findComponent(CollapseTransition)
      expect(collapse.exists()).toBe(true)
      expect(collapse.find('.sidebar-categories-fold #sidebar-explore-categories').exists()).toBe(true)

      await toggle(w).trigger('click')
      expect(w.get('#sidebar-explore-categories').isVisible()).toBe(true)
      await toggle(w).trigger('click')
      expect(w.get('#sidebar-explore-categories').isVisible()).toBe(false)
    })

    it('animates the fold height when motion is allowed, and not under reduced motion', async () => {
      const opened = async () => {
        const w = track(mount(AppSidebar, { global: { plugins: [await makeRouter()], stubs: { transition: false } }, attachTo: document.body }))
        await flushPromises()
        await toggle(w).trigger('click')
        return (w.get('.sidebar-categories-fold').element as HTMLElement).style.transition
      }

      expect(await opened()).toBe('')
      const restore = allowMotion()
      try {
        expect(await opened()).toContain('height 280ms')
      } finally {
        restore()
      }
    })

    it('turns the chevron with a transform transition, still under reduced motion', async () => {
      const w = track(mount(AppSidebar, { global: { plugins: [await makeRouter()] }, attachTo: document.body }))
      await flushPromises()
      const chevron = () => toggle(w).get('svg')

      expect(chevron().classes()).toEqual(expect.arrayContaining(['transition-transform', 'motion-reduce:transition-none', 'rotate-180']))
      await toggle(w).trigger('click')
      expect(chevron().classes()).not.toContain('rotate-180')
    })

    it('fades the categories in one after another, all done within 200ms', async () => {
      const w = track(mount(AppSidebar, { global: { plugins: [await makeRouter()] }, attachTo: document.body }))
      await flushPromises()
      const list = w.get('#sidebar-explore-categories')
      const items = list.findAll(':scope > li')
      const delays = items.map((li) => ms(inlineVar(li, '--rise-delay')))

      expect(items).toHaveLength(10)
      expect(items.every((li) => li.classes().includes('rise-in'))).toBe(true)
      expect(delays[0]).toBe(0)
      expect(delays.every((d, i) => i === 0 || d > delays[i - 1]!)).toBe(true)
      expect(Math.max(...delays) + ms(inlineVar(list, '--rise-duration'))).toBeLessThanOrEqual(200)
    })

    it('opens the account menu with the upward menu-rise transition, from its bottom edge', async () => {
      signIn()
      const w = track(mount(AppSidebar, { global: { plugins: [await makeRouter()] }, attachTo: document.body }))
      await flushPromises()
      await w.get('button.account-button').trigger('click')

      const menu = w.get('transition-stub[name="menu-rise"] #sidebar-account-menu')
      expect(menu.classes()).toContain('origin-bottom')
    })
  })

  describe('MobileTopBar (motion)', () => {
    it('drops the account menu in and out with menu-drop, from the top right corner by the cog', async () => {
      signIn()
      const w = track(mount(MobileTopBar, { global: { plugins: [await makeRouter()], stubs: { SearchAutocompleteInput: true } }, attachTo: document.body }))
      await w.get('button[aria-label="Account menu"]').trigger('click')
      await flushPromises()

      const menu = w.get('transition-stub[name="menu-drop"] #mobile-account-menu')
      expect(menu.classes()).toContain('origin-top-right')
    })
  })

  describe('MatchInfoDisclosure (motion)', () => {
    it('folds the explanation open and shut with CollapseTransition, with no margin on the folded element', async () => {
      const w = track(mount(MatchInfoDisclosure, { slots: { default: '<p class="why">Based on your skin type.</p>' }, attachTo: document.body }))
      expect(w.findComponent(CollapseTransition).exists()).toBe(true)

      await w.get('button.match-info-toggle').trigger('click')
      const body = w.findComponent(CollapseTransition).get('.match-info-body')
      expect(body.find('.why').exists()).toBe(true)
      expect(body.classes().some((c) => /^-?m[tby]?-/.test(c) || /^p[tby]?-/.test(c))).toBe(false)

      await w.get('button.match-info-toggle').trigger('click')
      expect(w.find('.match-info-body').exists()).toBe(false)
    })

    it('turns the chevron with a transform transition as it opens', async () => {
      const w = track(mount(MatchInfoDisclosure, { attachTo: document.body }))
      const chevron = () => w.findAll('button.match-info-toggle svg')[1]!

      expect(chevron().classes()).toEqual(expect.arrayContaining(['transition-transform', 'motion-reduce:transition-none']))
      expect(chevron().classes()).not.toContain('rotate-180')
      await w.get('button.match-info-toggle').trigger('click')
      expect(chevron().classes()).toContain('rotate-180')
    })
  })

  describe('SearchAutocompleteInput (motion)', () => {
    it('drops the suggestions in and out with menu-drop, with no animation of its own left on them', async () => {
      vi.useFakeTimers()
      try {
        const w = track(mount(SearchAutocompleteInput, { global: { plugins: [await makeRouter()] }, attachTo: document.body }))
        const input = w.get('input')
        await input.trigger('focus')
        await input.setValue('serum')
        await vi.advanceTimersByTimeAsync(300)

        const dropdown = w.get('transition-stub[name="menu-drop"] .search-dropdown')
        expect(dropdown.classes()).toContain('origin-top')
        expect(dropdown.classes()).not.toContain('animate-fade-in')
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('MySubmissionsView and SubmitDone (entrance)', () => {
    const mountList = async () => {
      vi.mocked(getMySubmissions).mockResolvedValue([
        {
          id: 's-1',
          status: 'pending',
          created_at: '2026-10-04T09:00:00+00:00',
          reviewed_at: null,
          review_notes: null,
          product_id: null,
          product_slug: null,
          summary: { name: 'Hydrating Gel Toner', brand: 'Example Brand', category: 'Toners', ingredient_count: 8 },
        },
      ])
      const w = track(mount(MySubmissionsView, { global: { plugins: [await makeRouter('/submissions')] }, attachTo: document.body }))
      await flushPromises()
      return w
    }

    it('fades the list page up in order: the title, Submit a product, the status tabs, then the list', async () => {
      const w = await mountList()
      const blocks = [w.get('h1'), w.get('a[href="/submissions/new"]'), w.get('[role="tablist"]'), w.get('#subs-panel')]

      expect(blocks.every((b) => b.classes().includes('rise-in'))).toBe(true)
      expect(blocks.map((b) => ms(inlineVar(b, '--rise-delay')))).toEqual([0, 50, 100, 150])
    })

    it('fades the empty page and the failure message up too', async () => {
      vi.mocked(getMySubmissions).mockResolvedValue([])
      const empty = track(mount(MySubmissionsView, { global: { plugins: [await makeRouter('/submissions')] }, attachTo: document.body }))
      await flushPromises()
      expect(empty.get('.submissions-empty').classes()).toContain('rise-in')
      expect(empty.get('.subs-how').classes()).toContain('rise-in')
      expect(ms(inlineVar(empty.get('.subs-how'), '--rise-delay'))).toBe(50)

      vi.mocked(getMySubmissions).mockRejectedValue(new Error('down'))
      const failed = track(mount(MySubmissionsView, { global: { plugins: [await makeRouter('/submissions')] }, attachTo: document.body }))
      await flushPromises()
      expect(failed.get('.load-failed').classes()).toContain('rise-in')
    })

    it('fades the sent screen up in order: the thanks, the product, then the buttons', async () => {
      const w = track(mount(SubmitDone, { props: { brand: 'Example Brand', name: 'Gel Toner' }, global: { plugins: [await makeRouter()] }, attachTo: document.body }))
      const blocks = w.findAll('.submit-done > .rise-in')

      expect(blocks).toHaveLength(3)
      expect(blocks[1]!.classes()).toContain('sent-summary')
      expect(blocks.map((b) => ms(inlineVar(b, '--rise-delay')))).toEqual([0, 50, 100])
    })
  })
})
