import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

import { apiClient } from '../../api/index'
import { resetAdminState } from '../../composables/useAdmin'
import { useAuthStore } from '../../stores/auth'
import AppSidebar from '../../components/Shared/AppSidebar.vue'
import TopNav from '../../components/Shared/TopNav.vue'
import MobileTopBar from '../../components/Shared/MobileTopBar.vue'
import SearchAutocompleteInput from '../../components/Shared/SearchAutocompleteInput.vue'
import App from '../../App.vue'

const page = { template: '<div />' }

const makeRouter = async (address = '/') => {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: page },
      { path: '/explore', component: page },
      { path: '/routine', component: page },
      { path: '/routine/history', component: page },
      { path: '/shelf', component: page },
      { path: '/chat', component: page },
      { path: '/profile', component: page },
      { path: '/settings', component: page },
      { path: '/quiz', component: page },
      { path: '/submissions', component: page },
      { path: '/submissions/new', component: page, meta: { fullScreen: true } },
      { path: '/admin/submissions', component: page },
    ],
  })
  await router.push(address)
  await router.isReady()
  return router
}

const signIn = (role: string | null, user: Record<string, unknown> = { id: 'u-1', display_name: 'Ploy Example', skin_type: 'DRNT' }) => {
  useAuthStore().setAuth('token-1', user)
  vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'u-1', role } })
}

const mounted: VueWrapper[] = []
const track = (w: VueWrapper) => {
  mounted.push(w)
  return w
}

const mountSidebar = async (address = '/') => {
  const router = await makeRouter(address)
  const w = track(mount(AppSidebar, { global: { plugins: [router] }, attachTo: document.body }))
  await flushPromises()
  return { w, router }
}

const linkTo = (w: VueWrapper, text: string) => {
  const found = w.findAll('a').find((a) => a.text().replace(/\s+/g, ' ').trim() === text)
  if (!found) throw new Error(`No link "${text}"`)
  return found
}

describe('feat/23 desktop sidebar, search bar and entry points', () => {
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

  describe('AppSidebar (links)', () => {
    it('links the logo and the five main sections to their pages', async () => {
      const { w } = await mountSidebar()

      expect(w.get('a.sidebar-brand').attributes('href')).toBe('/')
      expect(w.get('a.sidebar-brand img').attributes('src')).toBe('/images/jelly.png')
      expect(w.get('a.sidebar-brand').text()).toBe('SkinBuddy')
      expect(w.findAll('a.sidebar-link').map((a) => [a.text(), a.attributes('href')])).toEqual([
        ['Home', '/'],
        ['Explore', '/explore'],
        ['Routine', '/routine'],
        ['Shelves', '/shelf'],
        ['SkinBuddy AI', '/chat'],
      ])
      expect(w.get('a.sidebar-settings').attributes('href')).toBe('/settings')
    })

    it('marks only the current section with aria-current="page", Routine included on its history page', async () => {
      const current = (w: VueWrapper) => w.findAll('a[aria-current="page"]').map((a) => a.text())

      expect(current((await mountSidebar('/')).w)).toEqual(['Home'])
      expect(current((await mountSidebar('/explore?category=Toners')).w)).toEqual(['Explore'])
      expect(current((await mountSidebar('/routine/history')).w)).toEqual(['Routine'])
      expect(current((await mountSidebar('/chat')).w)).toEqual(['SkinBuddy AI'])
    })

    it('has no Support & FAQs entry', async () => {
      const { w } = await mountSidebar()

      expect(w.text()).not.toContain('Support')
    })
  })

  describe('AppSidebar (Explore categories)', () => {
    const toggle = (w: VueWrapper) => w.get('button.explore-toggle')
    const list = (w: VueWrapper) => w.get('#sidebar-explore-categories')

    it('opens the nine categories by default under /explore, each linking to /explore?category=<name>', async () => {
      const { w } = await mountSidebar('/explore')

      expect(toggle(w).attributes('aria-expanded')).toBe('true')
      expect(toggle(w).attributes('aria-label')).toBe('Hide categories')
      expect(toggle(w).attributes('aria-controls')).toBe('sidebar-explore-categories')
      expect(list(w).isVisible()).toBe(true)
      expect(w.findAll('a.sidebar-category').map((a) => [a.text(), a.attributes('href')])).toEqual([
        ['Cleansers', '/explore?category=Cleansers'],
        ['Toners', '/explore?category=Toners'],
        ['Serums', '/explore?category=Serums'],
        ['Treatments', '/explore?category=Treatments'],
        ['Moisturizers', '/explore?category=Moisturizers'],
        ['Exfoliators', '/explore?category=Exfoliators'],
        ['Sun Care', '/explore?category=Sun+Care'],
        ['Masks', '/explore?category=Masks'],
        ['Eye Care', '/explore?category=Eye+Care'],
      ])
    })

    it('ends the category list with "Couldn\'t find your product? Submit it here", going to the submit form', async () => {
      const { w } = await mountSidebar('/explore')
      const items = list(w).findAll('li')
      const last = items[items.length - 1]!

      expect(last.text().replace(/\s+/g, ' ')).toBe("Couldn't find your product? Submit it here")
      expect(last.get('a').attributes('href')).toBe('/submissions/new')
    })

    it('marks the category on screen, and keeps the categories closed by default away from Explore', async () => {
      const onToners = (await mountSidebar('/explore?category=Toners')).w
      expect(onToners.findAll('a.sidebar-category[aria-current]').map((a) => a.text())).toEqual(['Toners'])

      const { w } = await mountSidebar('/shelf')
      expect(toggle(w).attributes('aria-expanded')).toBe('false')
      expect(toggle(w).attributes('aria-label')).toBe('Show categories')
      expect(list(w).isVisible()).toBe(false)
    })

    it('marks no category away from Explore, even with a category in the address', async () => {
      const { w } = await mountSidebar('/shelf?category=Toners')
      await toggle(w).trigger('click')

      expect(w.findAll('a.sidebar-category[aria-current]')).toHaveLength(0)
    })

    it('lets a click on the toggle override the default until the next page change', async () => {
      const { w, router } = await mountSidebar('/')

      await toggle(w).trigger('click')
      expect(toggle(w).attributes('aria-expanded')).toBe('true')
      expect(toggle(w).attributes('aria-label')).toBe('Hide categories')
      expect(list(w).isVisible()).toBe(true)

      await router.push('/shelf')
      await flushPromises()
      expect(toggle(w).attributes('aria-expanded')).toBe('false')

      await router.push('/explore')
      await flushPromises()
      await toggle(w).trigger('click')
      expect(toggle(w).attributes('aria-expanded')).toBe('false')

      // A filter change on Explore changes only the query: not a new page.
      await router.push('/explore?category=Serums')
      await flushPromises()
      expect(toggle(w).attributes('aria-expanded')).toBe('false')

      await router.push('/')
      await flushPromises()
      await router.push('/explore')
      await flushPromises()
      expect(toggle(w).attributes('aria-expanded')).toBe('true')
    })
  })

  describe('AppSidebar (products you send)', () => {
    it('links Submit a product and My submissions under "Products you send"', async () => {
      const { w } = await mountSidebar()

      expect(w.text()).toContain('Products you send')
      expect(w.get('a.sidebar-submit').text()).toBe('Submit a product')
      expect(w.get('a.sidebar-submit').attributes('href')).toBe('/submissions/new')
      expect(w.get('a.sidebar-my-submissions').attributes('href')).toBe('/submissions')
    })

    it('does not ask a guest for a role, and shows them no Review', async () => {
      const { w } = await mountSidebar()

      expect(apiClient.get).not.toHaveBeenCalled()
      expect(w.find('a.sidebar-review').exists()).toBe(false)
    })

    it('asks for the role on mount when signed in, and shows Review to an admin', async () => {
      signIn('admin')
      const { w } = await mountSidebar()

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me')
      expect(linkTo(w, 'Review ADMIN').attributes('href')).toBe('/admin/submissions')
    })

    it('asks for the role when someone signs in after the page loaded', async () => {
      const { w } = await mountSidebar()

      signIn('admin')
      await flushPromises()

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me')
      expect(w.find('a.sidebar-review').exists()).toBe(true)
    })
  })

  describe('AppSidebar (account)', () => {
    const accountButton = (w: VueWrapper) => w.get('button.account-button')

    it('asks a guest to sign in rather than opening a menu', async () => {
      const { w } = await mountSidebar()
      const auth = useAuthStore()

      expect(accountButton(w).attributes('aria-expanded')).toBeUndefined()
      expect(w.get('.account-detail').text()).toBe('Log in / Register')
      await accountButton(w).trigger('click')

      expect(auth.showLoginPopup).toBe(true)
      expect(auth.popupReason).toBe('Sign in to access your account settings and routine.')
      expect(w.find('#sidebar-account-menu').exists()).toBe(false)
    })

    it('shows the signed-in name and skin type, or "Set type" when there is none', async () => {
      signIn('user')
      const typed = (await mountSidebar()).w
      expect(typed.get('.account-name').text()).toBe('Ploy Example')
      expect(typed.get('.account-detail').text()).toBe('DRNT')

      signIn('user', { id: 'u-2', display_name: 'Nam' })
      const untyped = (await mountSidebar()).w
      expect(untyped.get('.account-detail').text()).toBe('Set type')
    })

    it('opens a menu with Your skin profile and Log out, and Log out signs the user out', async () => {
      signIn('user')
      const { w } = await mountSidebar()
      const auth = useAuthStore()

      expect(accountButton(w).attributes('aria-expanded')).toBe('false')
      await accountButton(w).trigger('click')

      expect(accountButton(w).attributes('aria-expanded')).toBe('true')
      expect(accountButton(w).attributes('aria-controls')).toBe('sidebar-account-menu')
      expect(w.get('a.sidebar-profile').text()).toBe('Your skin profile')
      expect(w.get('a.sidebar-profile').attributes('href')).toBe('/profile')

      await w.get('button.sidebar-logout').trigger('click')

      expect(auth.isAuthenticated).toBe(false)
      expect(auth.showLogoutPopup).toBe(true)
      expect(w.find('#sidebar-account-menu').exists()).toBe(false)
    })

    it('closes the account menu on Escape and gives focus back to the account button', async () => {
      signIn('user')
      const { w } = await mountSidebar()
      await accountButton(w).trigger('click')

      await w.get('#sidebar-account-menu').trigger('keydown', { key: 'Escape' })
      await flushPromises()

      expect(w.find('#sidebar-account-menu').exists()).toBe(false)
      expect(accountButton(w).attributes('aria-expanded')).toBe('false')
      expect(document.activeElement).toBe(accountButton(w).element)
    })

    it('closes the account menu on a click outside it, and not on a click inside it', async () => {
      signIn('user')
      const { w } = await mountSidebar()
      await accountButton(w).trigger('click')

      w.get('#sidebar-account-menu').element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(w.find('#sidebar-account-menu').exists()).toBe(true)

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(w.find('#sidebar-account-menu').exists()).toBe(false)
    })

    it('closes the account menu when the session ends elsewhere', async () => {
      signIn('user')
      const { w } = await mountSidebar()
      await accountButton(w).trigger('click')
      expect(w.find('#sidebar-account-menu').exists()).toBe(true)

      useAuthStore().clearSession()
      await flushPromises()

      expect(w.find('#sidebar-account-menu').exists()).toBe(false)
      expect(accountButton(w).attributes('aria-expanded')).toBeUndefined()
    })
  })

  describe('TopNav (slim search bar)', () => {
    it('holds only the search, sticky at the top and kept 80px tall (h-20)', async () => {
      const router = await makeRouter()
      const w = track(mount(TopNav, { global: { plugins: [router], stubs: { SearchAutocompleteInput: true } } }))
      const header = w.get('header')

      expect(header.classes()).toEqual(expect.arrayContaining(['hidden', 'lg:flex', 'sticky', 'top-0', 'h-20']))
      expect(w.findComponent(SearchAutocompleteInput).exists()).toBe(true)
      expect(w.findAll('a')).toHaveLength(0)
      expect(w.findAll('button')).toHaveLength(0)
    })
  })

  describe('App (sidebar layout)', () => {
    const mountAppAt = async (address: string) => {
      const router = await makeRouter(address)
      return track(
        mount(App, {
          global: {
            plugins: [router],
            stubs: { AppSidebar: true, TopNav: true, MobileTopBar: true, BottomNav: true, LoginPopup: true, LogoutModal: true, ToastProvider: true, ScrollToTopButton: true },
          },
        }),
      )
    }

    it('puts the sidebar beside a content column (min-w-0) that holds the search bar, the phone bar and the page', async () => {
      const w = await mountAppAt('/')
      const sidebar = w.findComponent(AppSidebar)
      const column = w.get('.app-content')

      expect(sidebar.exists()).toBe(true)
      expect(sidebar.element.parentElement).toBe(column.element.parentElement)
      expect(column.element.parentElement!.classList.contains('lg:flex')).toBe(true)
      expect(column.classes()).toEqual(expect.arrayContaining(['flex-1', 'min-w-0']))
      expect(column.findComponent(TopNav).exists()).toBe(true)
      expect(column.findComponent(MobileTopBar).exists()).toBe(true)
      expect(column.findComponent({ name: 'RouterView' }).exists()).toBe(true)
    })

    it('hides the sidebar and both top bars on the quiz and on a meta.fullScreen route', async () => {
      for (const address of ['/quiz', '/submissions/new']) {
        const w = await mountAppAt(address)
        expect(w.findComponent(AppSidebar).exists()).toBe(false)
        expect(w.findComponent(TopNav).exists()).toBe(false)
        expect(w.findComponent(MobileTopBar).exists()).toBe(false)
      }
    })
  })

  describe('MobileTopBar account menu (Submit a product)', () => {
    it('lists Submit a product first, above My submissions, going to the submit form', async () => {
      signIn('user')
      const router = await makeRouter()
      const w = track(mount(MobileTopBar, { global: { plugins: [router], stubs: { SearchAutocompleteInput: true } }, attachTo: document.body }))

      await w.get('button[aria-label="Account menu"]').trigger('click')
      await flushPromises()
      const items = w.findAll('#mobile-account-menu a')

      expect(items.map((a) => a.text())).toEqual(['Submit a product', 'My submissions', 'Settings'])
      expect(items[0]!.classes()).toContain('mobile-submit-product')
      expect(items[0]!.attributes('href')).toBe('/submissions/new')
      expect(items[0]!.get('svg').attributes('aria-hidden')).toBe('true')
    })

    it('closes the menu once Submit a product is chosen', async () => {
      signIn('user')
      const router = await makeRouter()
      const w = track(mount(MobileTopBar, { global: { plugins: [router], stubs: { SearchAutocompleteInput: true } }, attachTo: document.body }))
      await w.get('button[aria-label="Account menu"]').trigger('click')

      await w.get('a.mobile-submit-product').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/submissions/new')
      expect(w.find('#mobile-account-menu').exists()).toBe(false)
    })
  })
})
