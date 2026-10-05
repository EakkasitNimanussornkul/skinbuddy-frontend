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
import { updateProduct, uploadProductPhoto } from '../../api/productAdminApi'
import { getCategories, getConcernTags } from '../../api/metaApi'
import { searchIngredients } from '../../api/ingredientsApi'
import { fetchMyRole } from '../../api/accountApi'
import { analyzeProduct } from '../../api/shelfapi'
import { resetAdminState } from '../../composables/useAdmin'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'
import ProductEditView from '../../views/ProductEditView.vue'
import ProductHeroSection from '../../components/Catalog/ProductHeroSection.vue'
import App from '../../App.vue'

// Microseconds and an offset: a JS Date would keep neither, and the save would be stale.
const UPDATED_AT = '2026-10-04T07:26:19.406488+00:00'

const product = (extra: Record<string, unknown> = {}) => ({
  id: 'p-1',
  slug: 'cerave-hydrating-facial-cleanser',
  brand: 'CeraVe',
  name: 'Hydrating Facial Cleanser',
  category: 'Cleansers',
  description: 'A daily face wash.',
  price_thb: 450,
  price_usd: 15,
  pao_months: 12,
  image_url: 'https://cdn.example/cleanser.webp',
  benefits: ['Cleanses without stripping'],
  good_for: ['Dry skin'],
  updated_at: UPDATED_AT,
  product_ingredients: [
    { ingredients: { id: 'i-water', name: 'Water', functional_group: 'Solvent' } },
    { ingredients: { id: 'i-gly', name: 'Glycerin', functional_group: 'Humectant' } },
    { ingredients: { id: 'i-cer', name: 'Ceramide NP', functional_group: 'Skin-Identical Lipid' } },
  ],
  product_sources: [],
  ...extra,
})

const httpError = (status: number, data: unknown = {}) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } })

const mounted: VueWrapper[] = []

const mountEdit = async () => {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/explore', component: { template: '<div>explore</div>' } },
      { path: '/product/:slug', component: { template: '<div class="product-page">product</div>' } },
      { path: '/products/:slug/edit', component: ProductEditView },
    ],
  })
  await router.push('/product/cerave-hydrating-facial-cleanser')
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
  return { wrapper, router }
}

const lastPatch = () => vi.mocked(updateProduct).mock.lastCall!
const save = async (w: VueWrapper) => {
  await w.get('button.save').trigger('click')
  await flushPromises()
}

describe('src/views/ProductEditView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useToast().toasts.value.splice(0)
    vi.mocked(getProductBySlug).mockResolvedValue(product())
    vi.mocked(getCategories).mockResolvedValue(['Cleansers', 'Toners'])
    vi.mocked(getConcernTags).mockResolvedValue(['Dry skin', 'Sensitive'])
    vi.mocked(searchIngredients).mockResolvedValue([])
    vi.mocked(updateProduct).mockResolvedValue({ product: {}, slug: 'cerave-hydrating-facial-cleanser', updated_at: '2026-10-05T00:00:00.000001+00:00' })
  })
  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
  })

  describe('loading and saving', () => {
    it('loads the product by its slug through the existing product read and fills the form', async () => {
      const { wrapper } = await mountEdit()

      expect(getProductBySlug).toHaveBeenCalledWith('cerave-hydrating-facial-cleanser')
      expect((wrapper.get('#e-name').element as HTMLInputElement).value).toBe('Hydrating Facial Cleanser')
      expect(wrapper.findAll('.edit-ingredient-name').map((n) => n.text())).toEqual(['Water', 'Glycerin', 'Ceramide NP'])
      expect(wrapper.get('.change-count').text()).toBe('No changes yet')
      expect(wrapper.get('button.save').attributes('disabled')).toBeDefined()
    })

    it('echoes updated_at exactly as read and sends only the changed field', async () => {
      const { wrapper } = await mountEdit()

      await wrapper.get('#e-desc').setValue('A gentle daily face wash.')
      expect(wrapper.get('.change-count').text()).toBe('1 unsaved change')
      await save(wrapper)

      expect(lastPatch()).toEqual(['p-1', { updated_at: UPDATED_AT, description: 'A gentle daily face wash.' }])
    })

    it('goes to the product at the slug the save returns, since the old one no longer resolves, with a toast', async () => {
      vi.mocked(updateProduct).mockResolvedValue({ product: {}, slug: 'cerave-gentle-cleanser', updated_at: null })
      const { wrapper, router } = await mountEdit()

      await wrapper.get('#e-name').setValue('Gentle Cleanser')
      await save(wrapper)

      expect(lastPatch()[1]).toEqual({ updated_at: UPDATED_AT, name: 'Gentle Cleanser' })
      expect(router.currentRoute.value.fullPath).toBe('/product/cerave-gentle-cleanser')
      expect(useToast().toasts.value.map((t) => t.message)).toContain('Saved. The changes are live.')
    })

    it('uploads a new photo first, then sends its image_path in the save', async () => {
      vi.mocked(uploadProductPhoto).mockResolvedValue({ image_path: 'products/0b8f3a2e-1c4d-4e5f-9a6b-7c8d9e0f1a2b.webp', public_url: 'https://cdn/new.webp' })
      const { wrapper } = await mountEdit()
      const file = new File(['x'], 'front.webp', { type: 'image/webp' })
      const input = wrapper.get('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: [file], configurable: true })

      await input.trigger('change')
      await flushPromises()
      expect(uploadProductPhoto).toHaveBeenCalledWith('p-1', file)
      expect(updateProduct).not.toHaveBeenCalled()
      await save(wrapper)

      expect(lastPatch()[1]).toEqual({ updated_at: UPDATED_AT, image_path: 'products/0b8f3a2e-1c4d-4e5f-9a6b-7c8d9e0f1a2b.webp' })
    })

    it('checks the photo before uploading, and words a refused upload', async () => {
      vi.mocked(uploadProductPhoto).mockRejectedValue(httpError(415))
      const { wrapper } = await mountEdit()
      const input = wrapper.get('input[type="file"]')

      Object.defineProperty(input.element, 'files', { value: [new File(['x'], 'a.gif', { type: 'image/gif' })], configurable: true })
      await input.trigger('change')
      await flushPromises()
      expect(uploadProductPhoto).not.toHaveBeenCalled()

      Object.defineProperty(input.element, 'files', { value: [new File(['x'], 'a.png', { type: 'image/png' })], configurable: true })
      await input.trigger('change')
      await flushPromises()
      expect(wrapper.text()).toContain("That file isn't a JPG, PNG or WebP image.")
    })

    it('sends a removed photo as image_path null', async () => {
      const { wrapper } = await mountEdit()

      await wrapper.get('button.remove-photo').trigger('click')
      await save(wrapper)

      expect(lastPatch()[1]).toEqual({ updated_at: UPDATED_AT, image_path: null })
    })

    it('replaces the whole ingredient list in the order shown, a typed name as {new_name}', async () => {
      vi.useFakeTimers()
      try {
        const { wrapper } = await mountEdit()

        await wrapper.findAll('button.move-down')[0]!.trigger('click')
        await wrapper.findAll('button.remove-ingredient')[2]!.trigger('click')
        await wrapper.get('#e-add').setValue('Phytosphingosine')
        await vi.advanceTimersByTimeAsync(300)
        await flushPromises()
        await wrapper.get('#e-add').trigger('keydown', { key: 'Enter' })
        vi.useRealTimers()
        await save(wrapper)

        expect(lastPatch()[1]).toEqual({
          updated_at: UPDATED_AT,
          ingredients: [{ ingredient_id: 'i-gly' }, { ingredient_id: 'i-water' }, { new_name: 'Phytosphingosine' }],
        })
      } finally {
        vi.useRealTimers()
      }
    })

    it('sends the concerns and benefits as edited', async () => {
      const { wrapper } = await mountEdit()

      await wrapper.findAll('button[aria-pressed]').find((b) => b.text() === 'Sensitive')!.trigger('click')
      await wrapper.get('#e-benefit').setValue('Supports the skin barrier')
      await wrapper.get('button.add-benefit').trigger('click')
      expect(wrapper.get('.change-count').text()).toBe('2 unsaved changes')
      await save(wrapper)

      expect(lastPatch()[1]).toEqual({
        updated_at: UPDATED_AT,
        benefits: ['Cleanses without stripping', 'Supports the skin barrier'],
        good_for: ['Dry skin', 'Sensitive'],
      })
    })

    it('links a source to one fact and sends the whole source list', async () => {
      const { wrapper } = await mountEdit()
      const listing = wrapper.findAll('.claim-row')[0]!
      expect(listing.get('.claim-empty').text()).toBe('No published source linked yet')

      const toggle = listing.get('button.claim-toggle')
      await toggle.trigger('click')
      expect(toggle.attributes('aria-expanded')).toBe('true')
      await wrapper.get('#claim-listing-url').setValue('https://brand.example/cleanser')
      await wrapper.get('#claim-listing-title').setValue('Brand product page')
      await wrapper.get('button.claim-save').trigger('click')
      await save(wrapper)

      expect(lastPatch()[1]).toEqual({
        updated_at: UPDATED_AT,
        sources: [{ url: 'https://brand.example/cleanser', title: 'Brand product page', claims: ['listing'] }],
      })
    })

    it('puts every field back as loaded on Discard', async () => {
      const { wrapper } = await mountEdit()

      await wrapper.get('#e-name').setValue('Something else')
      await wrapper.get('button.discard').trigger('click')

      expect((wrapper.get('#e-name').element as HTMLInputElement).value).toBe('Hydrating Facial Cleanser')
      expect(wrapper.get('.change-count').text()).toBe('No changes yet')
    })

    it('stops a save with an empty name and marks the field', async () => {
      const { wrapper } = await mountEdit()

      await wrapper.get('#e-name').setValue('  ')
      await save(wrapper)

      expect(updateProduct).not.toHaveBeenCalled()
      expect(wrapper.get('#e-name').attributes('aria-invalid')).toBe('true')
      expect(wrapper.get('#e-name-error').text()).toBe('Add the product name')
    })
  })

  describe('refused saves', () => {
    it('shows the stale banner on 409 "stale", keeps the edits, and reloads their version by id', async () => {
      vi.mocked(updateProduct).mockRejectedValue(httpError(409, { detail: 'stale' }))
      const { wrapper } = await mountEdit()
      await wrapper.get('#e-desc').setValue('Mine')
      await save(wrapper)

      expect(wrapper.get('.stale-banner').text()).toContain('Someone else saved this product while you were editing.')
      expect((wrapper.get('#e-desc').element as HTMLTextAreaElement).value).toBe('Mine')

      vi.mocked(getProductBySlug).mockResolvedValue(product({ description: 'Theirs', updated_at: '2026-10-05T09:00:00.999999+00:00' }))
      await wrapper.get('button.reload-theirs').trigger('click')
      await flushPromises()
      expect(getProductBySlug).toHaveBeenLastCalledWith('p-1')
      expect((wrapper.get('#e-desc').element as HTMLTextAreaElement).value).toBe('Theirs')

      vi.mocked(updateProduct).mockResolvedValue({ product: {}, slug: 's', updated_at: null })
      await wrapper.get('#e-desc').setValue('Mine again')
      await save(wrapper)
      expect(lastPatch()[1]).toEqual({ updated_at: '2026-10-05T09:00:00.999999+00:00', description: 'Mine again' })
    })

    it('names the product that already has this brand and name on 409 "duplicate"', async () => {
      vi.mocked(updateProduct).mockRejectedValue(
        httpError(409, { detail: 'duplicate', candidates: [{ id: 'p-2', slug: 'cerave-foaming', brand: 'CeraVe', name: 'Foaming Cleanser' }] }),
      )
      const { wrapper } = await mountEdit()
      await wrapper.get('#e-name').setValue('Foaming Cleanser')
      await save(wrapper)

      const clash = wrapper.get('.clash-banner')
      expect(clash.text()).toContain('Another product already has this brand and name: CeraVe Foaming Cleanser')
      expect(clash.get('a').attributes('href')).toBe('/product/cerave-foaming')
    })

    it('puts a validation 422 back on its field', async () => {
      vi.mocked(updateProduct).mockRejectedValue(httpError(422, { detail: [{ loc: ['body', 'description'], msg: 'String should have at most 2000 characters' }] }))
      const { wrapper } = await mountEdit()
      await wrapper.get('#e-desc').setValue('Changed')
      await save(wrapper)

      expect(wrapper.get('#e-desc-error').text()).toBe('String should have at most 2000 characters')
      expect(wrapper.get('.edit-banner').text()).toBe('Some fields need a fix before this can be saved.')
    })

    it('shows the 403 state when the save answers 403', async () => {
      vi.mocked(updateProduct).mockRejectedValue(httpError(403, { detail: 'Admin access required' }))
      const { wrapper } = await mountEdit()
      await wrapper.get('#e-desc').setValue('Changed')
      await save(wrapper)

      expect(wrapper.get('.admin-forbidden h1').text()).toBe('For the SkinBuddy team')
    })

    it('says a product that is not found is not in the catalogue', async () => {
      vi.mocked(getProductBySlug).mockRejectedValue(httpError(404))
      const { wrapper } = await mountEdit()

      expect(wrapper.get('.edit-failed h1').text()).toBe("This product isn't in the catalogue")
    })
  })

  describe('leaving with unsaved changes', () => {
    it('asks before leaving with unsaved changes, and stays on "Keep editing"', async () => {
      const { wrapper, router } = await mountEdit()
      await wrapper.get('#e-desc').setValue('Unsaved')

      router.push('/explore')
      await flushPromises()
      expect(wrapper.get('[role="dialog"] h2').text()).toBe('Leave without saving?')

      await wrapper.get('button.confirm-cancel').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.fullPath).toBe('/products/cerave-hydrating-facial-cleanser/edit')
    })

    it('leaves when the admin chooses to lose the changes', async () => {
      const { wrapper, router } = await mountEdit()
      await wrapper.get('#e-desc').setValue('Unsaved')

      router.push('/explore')
      await flushPromises()
      await wrapper.get('button.confirm-ok').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.fullPath).toBe('/explore')
    })

    it('leaves without asking when nothing changed, and after a save', async () => {
      const { wrapper, router } = await mountEdit()
      await router.push('/explore')
      expect(router.currentRoute.value.fullPath).toBe('/explore')
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

      const second = await mountEdit()
      await second.wrapper.get('#e-desc').setValue('Saved')
      await save(second.wrapper)
      expect(second.router.currentRoute.value.fullPath).toBe('/product/cerave-hydrating-facial-cleanser')
      expect(second.wrapper.find('[role="dialog"]').exists()).toBe(false)
    })
  })

  describe('the Edit product link on the product page', () => {
    const mountHero = async (role: string | null, mode: 'detail' | 'explore' = 'detail') => {
      resetAdminState()
      vi.mocked(analyzeProduct).mockResolvedValue({ is_safe: true, warnings: [] } as never)
      vi.mocked(fetchMyRole).mockResolvedValue(role)
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/', component: { template: '<div />' } },
          { path: '/products/:slug/edit', component: { template: '<div />' } },
        ],
      })
      await router.push('/')
      await router.isReady()
      const pinia = createPinia()
      setActivePinia(pinia)
      if (role) useAuthStore().setAuth(`token-${role}`, { id: 'u-1', skin_type: 'OSPW' })
      const wrapper = mount(ProductHeroSection, {
        props: { product: product(), mode },
        global: { plugins: [pinia, router], stubs: { teleport: true, SafetyCheckModal: true } },
      })
      mounted.push(wrapper)
      await flushPromises()
      return wrapper
    }

    it('shows Edit product to an admin, linking to the edit page by slug', async () => {
      const wrapper = await mountHero('admin')

      expect(wrapper.get('a.edit-product').attributes('href')).toBe('/products/cerave-hydrating-facial-cleanser/edit')
    })

    it('hides it from a signed-in user who is not an admin, and from a guest', async () => {
      expect((await mountHero('user')).find('a.edit-product').exists()).toBe(false)
      expect((await mountHero(null)).find('a.edit-product').exists()).toBe(false)
    })

    it('shows it on the product page only, not on the explore preview, even to a known admin', async () => {
      // The role is read first (by the product page), so only the mode can hide it.
      const onPage = await mountHero('admin')
      expect(onPage.find('a.edit-product').exists()).toBe(true)
      const wrapper = mount(ProductHeroSection, {
        props: { product: product(), mode: 'explore' },
        global: { plugins: [onPage.vm.$pinia, onPage.vm.$router], stubs: { teleport: true, SafetyCheckModal: true } },
      })
      mounted.push(wrapper)
      await flushPromises()
      expect(wrapper.find('a.edit-product').exists()).toBe(false)
    })
  })

  describe('App (site navigation on the product edit page)', () => {
    const mountAppAt = async (address: string) => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/product/:slug', component: { template: '<div />' } },
          { path: '/products/:slug/edit', component: { template: '<div />' }, meta: { fullScreen: true } },
        ],
      })
      await router.push(address)
      await router.isReady()
      const pinia = createPinia()
      setActivePinia(pinia)
      const wrapper = mount(App, {
        global: {
          plugins: [pinia, router],
          stubs: { AppSidebar: true, TopNav: true, MobileTopBar: true, BottomNav: true, LoginPopup: true, LogoutModal: true, ToastProvider: true, ScrollToTopButton: true },
        },
      })
      mounted.push(wrapper)
      return wrapper
    }

    it('hides the site navigation on a full-screen route such as the product edit page, which has its own Cancel and save bar', async () => {
      const w = await mountAppAt('/products/cerave/edit')

      expect(w.findComponent({ name: 'AppSidebar' }).exists()).toBe(false)
      expect(w.findComponent({ name: 'TopNav' }).exists()).toBe(false)
      expect(w.findComponent({ name: 'BottomNav' }).exists()).toBe(false)
    })

    it('keeps the site navigation on the product page itself', async () => {
      const w = await mountAppAt('/product/cerave')

      expect(w.findComponent({ name: 'AppSidebar' }).exists()).toBe(true)
      expect(w.findComponent({ name: 'TopNav' }).exists()).toBe(true)
      expect(w.findComponent({ name: 'BottomNav' }).exists()).toBe(true)
    })
  })
})
