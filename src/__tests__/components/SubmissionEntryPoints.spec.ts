import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))
vi.mock('../../api/products.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  searchProducts: vi.fn(),
}))

import { apiClient } from '../../api/index'
import { searchProducts } from '../../api/products.ts'
import { resetAdminState } from '../../composables/useAdmin'
import { useAuthStore } from '../../stores/auth'
import ExploreView from '../../views/ExploreView.vue'
import TopNav from '../../components/Shared/TopNav.vue'
import MobileTopBar from '../../components/Shared/MobileTopBar.vue'
import App from '../../App.vue'

const makeRouter = async (address = '/') => {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/explore', component: { template: '<div />' } },
      { path: '/settings', component: { template: '<div class="settings-page" />' } },
      { path: '/submissions', component: { template: '<div />' } },
      { path: '/submissions/new', component: { template: '<div />' } },
      { path: '/admin/submissions', component: { template: '<div />' } },
    ],
  })
  await router.push(address)
  await router.isReady()
  return router
}

const signIn = (role: string | null) => {
  useAuthStore().setAuth('token-1', { id: 'u-1', skin_type: 'OSPW' })
  vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'u-1', role } })
}

const mounted: VueWrapper[] = []
const track = (w: VueWrapper) => {
  mounted.push(w)
  return w
}

describe('product submission entry points', () => {
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

  describe('ExploreView (render)', () => {
    const mountExplore = async (catalog: unknown[]) => {
      vi.mocked(searchProducts).mockResolvedValue(catalog)
      const router = await makeRouter('/explore')
      const wrapper = track(
        mount(ExploreView, {
          global: {
            plugins: [router],
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
        }),
      )
      await flushPromises()
      return wrapper
    }

    it('offers "Submit this product" when nothing matches', async () => {
      const w = await mountExplore([])

      const link = w.get('a.submit-this-product')
      expect(link.text()).toBe('Submit this product')
      expect(link.attributes('href')).toBe('/submissions/new')
      expect(w.find('a.missing-product').exists()).toBe(false)
    })

    it('shows a "Missing a product?" card under the results', async () => {
      const w = await mountExplore([{ id: 'p-1', brand: 'CeraVe', name: 'Cleanser', category: 'Cleansers', slug: 'c', product_ingredients: [] }])

      const card = w.get('a.missing-product')
      expect(card.text()).toContain('Missing a product?')
      expect(card.attributes('href')).toBe('/submissions/new')
      expect(w.find('a.submit-this-product').exists()).toBe(false)
    })

    it('offers neither while the catalogue is failing, since nothing is known about what is missing', async () => {
      vi.mocked(searchProducts).mockRejectedValue(new Error('Network Error'))
      const router = await makeRouter('/explore')
      const w = track(
        mount(ExploreView, {
          global: { plugins: [router], stubs: { teleport: true, SearchAutocompleteInput: true, ExploreCategoryBar: true, PriceRangeSlider: true, ProductShowcaseMarquee: true, EmptyState: true } },
        }),
      )
      await flushPromises()

      expect(w.find('a.submit-this-product').exists()).toBe(false)
      expect(w.find('a.missing-product').exists()).toBe(false)
    })
  })

  describe('TopNav user menu', () => {
    const openMenu = async () => {
      const router = await makeRouter()
      const w = track(mount(TopNav, { global: { plugins: [router], stubs: { SearchAutocompleteInput: true } }, attachTo: document.body }))
      const toggle = w.find('button[aria-expanded]')
      await toggle.trigger('click')
      await flushPromises()
      return { w, toggle }
    }

    it('lists My submissions for a signed-in user, and reports the menu as open', async () => {
      signIn('user')
      const { w, toggle } = await openMenu()

      expect(toggle.attributes('aria-expanded')).toBe('true')
      expect(w.get('a.menu-my-submissions').attributes('href')).toBe('/submissions')
    })

    it('adds Review submissions for an admin only, after asking for the role', async () => {
      signIn('admin')
      const { w } = await openMenu()

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me')
      expect(w.get('a.menu-review-submissions').attributes('href')).toBe('/admin/submissions')
    })

    it('does not offer Review submissions to a normal user', async () => {
      signIn('user')
      const { w } = await openMenu()

      expect(w.find('a.menu-review-submissions').exists()).toBe(false)
    })
  })

  describe('MobileTopBar account menu', () => {
    const mountBar = async () => {
      const router = await makeRouter()
      const w = track(mount(MobileTopBar, { global: { plugins: [router], stubs: { SearchAutocompleteInput: true } }, attachTo: document.body }))
      return { w, router }
    }

    it('opens a menu with My submissions and Settings from the cog for a signed-in user', async () => {
      signIn('user')
      const { w } = await mountBar()
      const cog = w.get('button[aria-label="Account menu"]')

      expect(cog.attributes('aria-expanded')).toBe('false')
      await cog.trigger('click')
      await flushPromises()

      expect(cog.attributes('aria-expanded')).toBe('true')
      expect(w.get('a.mobile-my-submissions').attributes('href')).toBe('/submissions')
      expect(w.get('a.mobile-settings').attributes('href')).toBe('/settings')
      expect(w.find('a.mobile-review-submissions').exists()).toBe(false)
    })

    it('adds Review submissions for an admin', async () => {
      signIn('admin')
      const { w } = await mountBar()

      await w.get('button[aria-label="Account menu"]').trigger('click')
      await flushPromises()

      expect(w.get('a.mobile-review-submissions').attributes('href')).toBe('/admin/submissions')
    })

    it('closes on Escape and gives focus back to the cog', async () => {
      signIn('user')
      const { w } = await mountBar()
      const cog = w.get('button[aria-label="Account menu"]')
      await cog.trigger('click')

      await w.get('#mobile-account-menu').trigger('keydown', { key: 'Escape' })
      await flushPromises()

      expect(w.find('#mobile-account-menu').exists()).toBe(false)
      expect(document.activeElement).toBe(cog.element)
    })

    it('still takes a signed-out visitor straight to Settings, which asks them to sign in', async () => {
      const { w, router } = await mountBar()

      await w.get('button[aria-label="Account menu"]').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/settings')
      expect(w.find('#mobile-account-menu').exists()).toBe(false)
      expect(apiClient.get).not.toHaveBeenCalled()
    })
  })

  describe('App (site navigation on the submit flow)', () => {
    const mountAppAt = async (address: string) => {
      const router = await makeRouter(address)
      return track(
        mount(App, {
          global: {
            plugins: [router],
            stubs: { TopNav: true, MobileTopBar: true, BottomNav: true, LoginPopup: true, LogoutModal: true, ToastProvider: true, ScrollToTopButton: true },
          },
        }),
      )
    }

    it('hides the site navigation on /submissions/new, which draws its own way out', async () => {
      const w = await mountAppAt('/submissions/new')

      expect(w.findComponent(TopNav).exists()).toBe(false)
      expect(w.findComponent(MobileTopBar).exists()).toBe(false)
      expect(w.findComponent({ name: 'BottomNav' }).exists()).toBe(false)
    })

    it('keeps the site navigation on My submissions', async () => {
      const w = await mountAppAt('/submissions')

      expect(w.findComponent(TopNav).exists()).toBe(true)
      expect(w.findComponent(MobileTopBar).exists()).toBe(true)
      expect(w.findComponent({ name: 'BottomNav' }).exists()).toBe(true)
    })
  })
})
