import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))
vi.mock('../../api/products', () => ({
  searchProducts: vi.fn().mockResolvedValue([]),
}))

import { resetAdminState } from '../../composables/useAdmin'
import { useThemeStore } from '../../stores/themeStore'
import AppSidebar from '../../components/Shared/AppSidebar.vue'
import AlertDialog from '../../components/Shared/AlertDialog.vue'
import BottomSheet from '../../components/Shared/BottomSheet.vue'
import SearchAutocompleteInput from '../../components/Shared/SearchAutocompleteInput.vue'

// jsdom draws no scrollbars and applies no stylesheet, so the rules are read
// from style.css as text and the classes from the rendered markup. Read from
// disk (Vitest runs from the project root): it empties a CSS import, ?raw included.
const STYLE = readFileSync(join(process.cwd(), 'src', 'assets', 'style.css'), 'utf8')

type Rule = { selector: string; body: string }

// Every innermost `selector { declarations }` block, comments removed. A rule
// inside an @media block comes out with its own selector.
const rules = (css: string): Rule[] =>
  Array.from(css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g), (m) => ({
    selector: m[1]!.trim().replace(/\s+/g, ' '),
    body: m[2]!.replace(/\s+/g, ' ').trim(),
  }))

const declared = (selector: string, property: string) =>
  rules(STYLE)
    .filter((r) => r.selector.split(',').map((s) => s.trim()).includes(selector))
    .map((r) => r.body.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`))?.[1]?.trim())
    .filter((v): v is string => !!v)

const mounted: VueWrapper[] = []
const track = (w: VueWrapper) => {
  mounted.push(w)
  return w
}

const makeRouter = async () => {
  const page = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:any(.*)*', component: page }],
  })
  await router.push('/')
  await router.isReady()
  return router
}

describe('feat/26 scrollbars and colour scheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
    resetAdminState()
    document.documentElement.classList.remove('dark')
  })
  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
    document.body.innerHTML = ''
    document.documentElement.classList.remove('dark')
  })

  describe('style.css (colour scheme)', () => {
    it('sets color-scheme light on the root, so native scrollbars and form controls are light in light mode', () => {
      expect(declared(':root', 'color-scheme')).toEqual(['light'])
    })

    it('sets color-scheme dark on the element themeStore marks dark, and only while it is marked', () => {
      const darkSelectors = rules(STYLE)
        .filter((r) => /color-scheme\s*:\s*dark/.test(r.body))
        .map((r) => r.selector)
      expect(darkSelectors).toHaveLength(1)
      const selector = darkSelectors[0]!

      const theme = useThemeStore()
      theme.isDark = true
      theme.toggleTheme()
      expect(document.documentElement.classList.contains('dark')).toBe(false)
      expect(document.documentElement.matches(selector)).toBe(false)

      theme.toggleTheme()
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(document.documentElement.matches(selector)).toBe(true)
    })
  })

  describe('style.css (.scroll-thin)', () => {
    it('gives .scroll-thin a thin bar with a muted brand thumb on a transparent track', () => {
      expect(declared('.scroll-thin', 'scrollbar-width')).toEqual(['thin'])
      const [color] = declared('.scroll-thin', 'scrollbar-color')
      expect(color).toMatch(/var\(--color-brand-text-muted\).*\stransparent$/)
    })

    it('has its own dark-mode thumb colour, still on a transparent track', () => {
      const [color] = declared('.dark .scroll-thin', 'scrollbar-color')
      expect(color).toMatch(/var\(--color-brand-text-muted\).*\stransparent$/)
      expect(color).not.toBe(declared('.scroll-thin', 'scrollbar-color')[0])
    })

    it('carries webkit fallbacks for the bar, a clear track and a rounded thumb, light and dark', () => {
      expect(declared('.scroll-thin::-webkit-scrollbar', 'width')).toEqual(['8px'])
      expect(declared('.scroll-thin::-webkit-scrollbar-track', 'background')).toEqual(['transparent'])
      expect(declared('.scroll-thin::-webkit-scrollbar-thumb', 'border-radius')).toEqual(['9999px'])
      expect(declared('.scroll-thin::-webkit-scrollbar-thumb', 'background-color')[0]).toContain('--color-brand-text-muted')
      expect(declared('.dark .scroll-thin::-webkit-scrollbar-thumb', 'background-color')[0]).toContain('--color-brand-text-muted')
    })
  })

  describe('Scroll panels (thin scrollbar classes)', () => {
    it('gives the sidebar scroll area the thin themed scrollbar and a stable gutter, so opening the categories does not shift the links', async () => {
      const router = await makeRouter()
      const w = track(mount(AppSidebar, { global: { plugins: [router] }, attachTo: document.body }))
      await flushPromises()

      const scroller = w.get('.app-sidebar nav[aria-label="Main"]')
      expect(scroller.classes()).toEqual(expect.arrayContaining(['overflow-y-auto', 'scroll-thin', '[scrollbar-gutter:stable]']))
      // The categories live inside the scroll area, so they are what overflows it.
      expect(scroller.find('#sidebar-explore-categories').exists()).toBe(true)
    })

    it('uses the same thin scrollbar on the search suggestions list', async () => {
      vi.useFakeTimers()
      try {
        const router = await makeRouter()
        const w = track(mount(SearchAutocompleteInput, { global: { plugins: [router] }, attachTo: document.body }))
        const input = w.get('input')
        await input.trigger('focus')
        await input.setValue('serum')
        await vi.advanceTimersByTimeAsync(300)

        const list = w.get('.search-results')
        expect(list.classes()).toEqual(expect.arrayContaining(['overflow-y-auto', 'scroll-thin']))
      } finally {
        vi.useRealTimers()
      }
    })

    it('uses the same thin scrollbar on a bottom sheet body and on the alert dialog', async () => {
      track(mount(BottomSheet, { props: { title: 'Filters' }, slots: { default: '<p>Body</p>' }, attachTo: document.body }))
      track(mount(AlertDialog, { props: { title: 'Sure?', confirmLabel: 'Yes', cancelLabel: 'No' }, slots: { default: '<p>Body</p>' }, attachTo: document.body }))
      await flushPromises()

      expect(document.querySelector('.bottom-sheet-body')!.classList.contains('scroll-thin')).toBe(true)
      expect(document.querySelector('.alert-dialog')!.classList.contains('scroll-thin')).toBe(true)
    })
  })
})
