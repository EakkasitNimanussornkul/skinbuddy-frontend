import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, RouterView, type Router } from 'vue-router'
import { defineComponent, h } from 'vue'

vi.mock('../../api/products', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  getProductBySlug: vi.fn(),
}))
vi.mock('../../api/productAdminApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/productAdminApi')>()),
  updateProduct: vi.fn(),
  uploadProductPhoto: vi.fn(),
}))
vi.mock('../../api/metaApi', () => ({
  getCategories: vi.fn(),
  getConcernTags: vi.fn(),
}))
vi.mock('../../api/ingredientsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/ingredientsApi')>()),
  searchIngredients: vi.fn(),
}))
vi.mock('../../api/accountApi', () => ({ fetchMyRole: vi.fn() }))
vi.mock('../../api/shelfapi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/shelfapi')>()),
  analyzeProduct: vi.fn(),
}))

import { getProductBySlug } from '../../api/products'
import { updateProduct } from '../../api/productAdminApi'
import { getCategories, getConcernTags } from '../../api/metaApi'
import { searchIngredients } from '../../api/ingredientsApi'
import { fetchMyRole } from '../../api/accountApi'
import { analyzeProduct } from '../../api/shelfapi'
import { resetAdminState } from '../../composables/useAdmin'
import MobileTopBar from '../../components/Shared/MobileTopBar.vue'
import ProductHeroSection from '../../components/Catalog/ProductHeroSection.vue'
import ProductSpecContent from '../../components/Catalog/ProductSpecContent.vue'
import ProductEditView from '../../views/ProductEditView.vue'
import { useAuthStore } from '../../stores/auth'
import App from '../../App.vue'

// The real router, for its route records. Imported by a path held in a variable
// so vue-tsc does not follow it into every view (see adminGuard.spec.ts).
const ROUTER_MODULE = '../../router/index'
const loadRouter = async (): Promise<Router> =>
  ((await import(/* @vite-ignore */ ROUTER_MODULE)) as { default: Router }).default

// Follow-ups to feat/22 on the product pages and the site chrome, from an
// independent verifier's notes.

const mounted: VueWrapper[] = []

const memoryRouter = async (routes: { path: string; meta?: Record<string, unknown> }[], address: string) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: routes.map((r) => ({ ...r, component: { template: '<div />' } })),
  })
  await router.push(address)
  await router.isReady()
  return router
}

describe('feat/22 follow-ups (product pages and site chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    resetAdminState()
  })
  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
  })

  describe('ProductSpecContent ingredient list (functional group label)', () => {
    const mountSpec = async (productIngredients: unknown[]) => {
      const router = await memoryRouter([{ path: '/' }], '/')
      const pinia = createPinia()
      setActivePinia(pinia)
      useAuthStore().setAuth('token-1', { id: 'u-1', skin_type: 'OSPW' })
      const wrapper = mount(ProductSpecContent, {
        props: {
          product: { id: 'p-1', slug: 'p', brand: 'B', name: 'N', category: 'Cleansers', match_reasons: [], product_ingredients: productIngredients },
          mode: 'detail',
        },
        global: { plugins: [pinia, router], stubs: { teleport: true, ProductHeroSection: true, IngredientsExplained: true } },
      })
      mounted.push(wrapper)
      await flushPromises()
      return wrapper
    }
    const rows = (w: VueWrapper) => w.findAll('.divide-y > div')

    it('shows no group label for a name-only ingredient, rather than calling it "Skin Conditioning"', async () => {
      const wrapper = await mountSpec([
        { ingredients: { id: 'i-new', name: 'Phytosphingosine', awareness_tier: 'low', functional_group: null } },
      ])

      expect(rows(wrapper)).toHaveLength(1)
      expect(rows(wrapper)[0]!.text()).toContain('Phytosphingosine')
      expect(rows(wrapper)[0]!.find('.ingredient-group').exists()).toBe(false)
      expect(wrapper.text()).not.toMatch(/skin conditioning/i)
    })

    it('still shows the group an ingredient has on record', async () => {
      const wrapper = await mountSpec([{ ingredients: { id: 'i-gly', name: 'Glycerin', awareness_tier: 'low', functional_group: 'Humectant' } }])

      expect(rows(wrapper)[0]!.get('.ingredient-group').text()).toBe('Humectant')
    })
  })

  describe('ProductEditView sources (no web link, unsafe link)', () => {
    const UPDATED_AT = '2026-10-04T07:26:19.406488+00:00'
    const sourceRow = (claim: string, id: string, url: string, title: string) => ({ claim, sources: { id, url, title } })

    const mountEdit = async (productSources: unknown[]) => {
      vi.mocked(getProductBySlug).mockResolvedValue({
        id: 'p-1',
        slug: 'cerave-hydrating-facial-cleanser',
        brand: 'CeraVe',
        name: 'Hydrating Facial Cleanser',
        category: 'Cleansers',
        updated_at: UPDATED_AT,
        product_ingredients: [{ ingredients: { id: 'i-water', name: 'Water', functional_group: 'Solvent' } }],
        product_sources: productSources,
      })
      vi.mocked(getCategories).mockResolvedValue(['Cleansers'])
      vi.mocked(getConcernTags).mockResolvedValue([])
      vi.mocked(searchIngredients).mockResolvedValue([])
      vi.mocked(updateProduct).mockResolvedValue({ product: {}, slug: 'cerave-hydrating-facial-cleanser', updated_at: null })
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/product/:slug', component: { template: '<div />' } },
          { path: '/products/:slug/edit', component: ProductEditView },
        ],
      })
      await router.push('/products/cerave-hydrating-facial-cleanser/edit')
      await router.isReady()
      const pinia = createPinia()
      setActivePinia(pinia)
      const wrapper = mount(defineComponent({ render: () => h(RouterView) }), {
        global: { plugins: [pinia, router], stubs: { teleport: true } },
        attachTo: document.body,
      })
      mounted.push(wrapper)
      await flushPromises()
      return wrapper
    }

    it('leaves a source with no web link out of the save, and still warns that it has none', async () => {
      const wrapper = await mountEdit([
        sourceRow('listing', 's-leaflet', '', 'A printed leaflet'),
        sourceRow('image', 's-file', 'ftp://files.example/p', 'An old file'),
      ])
      expect(wrapper.get('.unlinked-note').text()).toContain('A printed leaflet, An old file have no web link')

      const price = wrapper.findAll('.claim-row')[2]!
      await price.get('button.claim-toggle').trigger('click')
      await wrapper.get('#claim-price-url').setValue('https://shop.example/p')
      await wrapper.get('#claim-price-title').setValue('Shop page')
      await wrapper.get('button.claim-save').trigger('click')
      expect(wrapper.get('.unlinked-note').text()).toContain("A printed leaflet, An old file have no web link, so they can't be kept if you change this section.")
      await wrapper.get('button.save').trigger('click')
      await flushPromises()

      expect(vi.mocked(updateProduct).mock.lastCall![1]).toEqual({
        updated_at: UPDATED_AT,
        sources: [{ url: 'https://shop.example/p', title: 'Shop page', claims: ['price'] }],
      })
    })

    it('shows a stored javascript: source as plain text, not as a link, and keeps a web link as a link', async () => {
      const wrapper = await mountEdit([
        sourceRow('listing', 's-bad', 'javascript:alert(1)', ''),
        sourceRow('price', 's-shop', 'https://shop.example/p', 'Shop page'),
      ])
      const [listing, , price] = wrapper.findAll('.claim-row')

      expect(wrapper.findAll('a').some((a) => (a.attributes('href') ?? '').startsWith('javascript:'))).toBe(false)
      expect(listing!.find('a.claim-source').exists()).toBe(false)
      expect(listing!.get('.claim-source').text()).toBe('javascript:alert(1)')
      expect(price!.get('a.claim-source').attributes('href')).toBe('https://shop.example/p')
    })
  })

  describe('App site navigation (the submit route by meta.fullScreen)', () => {
    // The real route records on a memory history, with the pages themselves
    // stubbed: what decides the navigation is the matched route, not the page.
    const mountAppAt = async (address: string) => {
      const real = await loadRouter()
      const router = createRouter({ history: createMemoryHistory(), routes: real.options.routes })
      await router.push(address)
      await router.isReady()
      const pinia = createPinia()
      setActivePinia(pinia)
      const wrapper = mount(App, {
        global: {
          plugins: [pinia, router],
          stubs: { RouterView: true, AppSidebar: true, TopNav: true, MobileTopBar: true, BottomNav: true, LoginPopup: true, LogoutModal: true, ToastProvider: true, ScrollToTopButton: true },
        },
      })
      mounted.push(wrapper)
      return wrapper
    }
    const chromeShown = (w: VueWrapper) => ({
      side: w.findComponent({ name: 'AppSidebar' }).exists(),
      top: w.findComponent({ name: 'TopNav' }).exists(),
      mobile: w.findComponent({ name: 'MobileTopBar' }).exists(),
      bottom: w.findComponent({ name: 'BottomNav' }).exists(),
    })
    const hidden = { side: false, top: false, mobile: false, bottom: false }
    const shown = { side: true, top: true, mobile: true, bottom: true }

    it('marks the submit route full screen in the router itself, so a trailing slash matches it too', async () => {
      const real = await loadRouter()

      expect(real.resolve('/submissions/new').meta.fullScreen).toBe(true)
      expect(real.resolve('/submissions/new/').meta.fullScreen).toBe(true)
      expect(real.resolve('/submissions').meta.fullScreen).toBeUndefined()
    }, 60_000)

    it('hides the site navigation on /submissions/new with or without a trailing slash', async () => {
      expect(chromeShown(await mountAppAt('/submissions/new'))).toEqual(hidden)
      expect(chromeShown(await mountAppAt('/submissions/new/'))).toEqual(hidden)
    }, 60_000)

    it('still hides it on the quiz and the profile setup, and keeps it on My submissions', async () => {
      expect(chromeShown(await mountAppAt('/quiz'))).toEqual(hidden)
      expect(chromeShown(await mountAppAt('/setup-profile'))).toEqual(hidden)
      expect(chromeShown(await mountAppAt('/submissions'))).toEqual(shown)
    }, 60_000)
  })

  describe('MobileTopBar account menu (aria-controls)', () => {
    it('points aria-controls at the account menu only while the menu is there to point at', async () => {
      vi.mocked(fetchMyRole).mockResolvedValue('user')
      const router = await memoryRouter([{ path: '/' }, { path: '/settings' }, { path: '/submissions' }], '/')
      const pinia = createPinia()
      setActivePinia(pinia)
      useAuthStore().setAuth('token-1', { id: 'u-1', skin_type: 'OSPW' })
      const wrapper = mount(MobileTopBar, { global: { plugins: [pinia, router], stubs: { SearchAutocompleteInput: true } }, attachTo: document.body })
      mounted.push(wrapper)
      const cog = wrapper.get('button[aria-label="Account menu"]')

      expect(cog.attributes('aria-controls')).toBeUndefined()
      await cog.trigger('click')
      await flushPromises()
      expect(cog.attributes('aria-controls')).toBe('mobile-account-menu')
      expect(document.getElementById('mobile-account-menu')).not.toBeNull()

      await cog.trigger('click')
      await flushPromises()
      expect(cog.attributes('aria-controls')).toBeUndefined()
      expect(document.getElementById('mobile-account-menu')).toBeNull()
    })
  })

  describe('ProductHeroSection Edit product link (signing in on the page)', () => {
    const mountHero = async (mode: 'detail' | 'explore' = 'detail') => {
      vi.mocked(analyzeProduct).mockResolvedValue({ is_safe: true, warnings: [] } as never)
      const router = await memoryRouter([{ path: '/' }, { path: '/products/:slug/edit' }], '/')
      const pinia = createPinia()
      setActivePinia(pinia)
      const wrapper = mount(ProductHeroSection, {
        props: { product: { id: 'p-1', slug: 'cerave-hydrating-facial-cleanser', brand: 'CeraVe', name: 'Hydrating Facial Cleanser', category: 'Cleansers' }, mode },
        global: { plugins: [pinia, router], stubs: { teleport: true, SafetyCheckModal: true } },
      })
      mounted.push(wrapper)
      await flushPromises()
      return wrapper
    }

    it('shows Edit product once an admin signs in on the product page, without navigating, and hides it on sign-out', async () => {
      vi.mocked(fetchMyRole).mockResolvedValue('admin')
      const wrapper = await mountHero()
      expect(wrapper.find('a.edit-product').exists()).toBe(false)
      expect(fetchMyRole).not.toHaveBeenCalled()

      useAuthStore().setAuth('token-admin', { id: 'u-1', skin_type: 'OSPW' })
      await flushPromises()
      expect(fetchMyRole).toHaveBeenCalledTimes(1)
      expect(wrapper.get('a.edit-product').attributes('href')).toBe('/products/cerave-hydrating-facial-cleanser/edit')

      useAuthStore().clearSession()
      await flushPromises()
      expect(wrapper.find('a.edit-product').exists()).toBe(false)
    })

    it('asks again when the page switches from a normal account to an admin one', async () => {
      vi.mocked(fetchMyRole).mockResolvedValueOnce('user').mockResolvedValueOnce('admin')
      const wrapper = await mountHero()
      useAuthStore().setAuth('token-user', { id: 'u-1', skin_type: 'OSPW' })
      await flushPromises()
      expect(wrapper.find('a.edit-product').exists()).toBe(false)

      useAuthStore().setAuth('token-admin', { id: 'u-2', skin_type: 'OSPW' })
      await flushPromises()
      expect(fetchMyRole).toHaveBeenCalledTimes(2)
      expect(wrapper.find('a.edit-product').exists()).toBe(true)
    })

    it('does not ask for the role from the explore preview, where the link is never shown', async () => {
      vi.mocked(fetchMyRole).mockResolvedValue('admin')
      const wrapper = await mountHero('explore')

      useAuthStore().setAuth('token-admin', { id: 'u-1', skin_type: 'OSPW' })
      await flushPromises()
      expect(fetchMyRole).not.toHaveBeenCalled()
      expect(wrapper.find('a.edit-product').exists()).toBe(false)
    })
  })
})
