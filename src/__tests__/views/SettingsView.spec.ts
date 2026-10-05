import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

// The page's one network call. Mocked so a save can succeed or be refused.
vi.mock('../../api/authApi', () => ({
  updateUserSkinType: vi.fn(),
}))

import { updateUserSkinType } from '../../api/authApi'
import SettingsView from '../../views/SettingsView.vue'
import ExpressSkinSelectorModal from '../../components/Quiz/ExpressSkinSelectorModal.vue'
import { useAuthStore } from '../../stores/auth'
import { useThemeStore } from '../../stores/themeStore'
import { useToast } from '../../composables/useToast'

// Module-level state shared by every caller, so read back and emptied per case.
const { toasts } = useToast()

const page = { template: '<div />' }

interface Harness {
  wrapper: VueWrapper
  router: Router
  auth: ReturnType<typeof useAuthStore>
  theme: ReturnType<typeof useThemeStore>
}

/**
 * Mount Settings on a memory history at /settings, signed in as Ploy. `user`
 * replaces the stored profile; pass skin_type: null for someone with no type.
 */
const mountSettings = async (user: Record<string, unknown> = { id: 'u-1', display_name: 'Ploy', skin_type: 'DRNT' }): Promise<Harness> => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/settings', component: SettingsView },
      { path: '/explore', component: page },
      { path: '/profile', component: page },
      { path: '/quiz', component: page },
      { path: '/routine', component: page },
      { path: '/submissions', component: page },
      { path: '/submissions/new', component: page },
      { path: '/how-match-works', component: page },
    ],
  })
  await router.push('/settings')
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.setAuth('token-1', user)
  const theme = useThemeStore()

  const wrapper = mount(SettingsView, {
    global: { plugins: [pinia, router], stubs: { teleport: true } },
  })
  return { wrapper, router, auth, theme }
}

const hrefOf = (wrapper: VueWrapper, selector: string) => wrapper.get(selector).attributes('href')
const modalIsOpen = (wrapper: VueWrapper) => wrapper.findComponent(ExpressSkinSelectorModal).props('isOpen')

describe('feat/24 Settings page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    toasts.value.splice(0)
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  describe('Page layout', () => {
    it('has one "Settings" h1 and an h2 for each card, in page order', async () => {
      const { wrapper } = await mountSettings()

      const h1s = wrapper.findAll('h1')
      expect(h1s).toHaveLength(1)
      expect(h1s[0]!.text()).toBe('Settings')
      expect(h1s[0]!.classes()).toContain('font-serif')
      expect(wrapper.findAll('h2').map((h) => h.text())).toEqual([
        'Account',
        'Your skin type',
        'Preferences',
        'Products you send',
        'Help',
      ])
      // Each card is a section named by its heading.
      for (const section of wrapper.findAll('section')) {
        const id = section.attributes('aria-labelledby')
        expect(section.find(`h2#${id}`).exists()).toBe(true)
      }
    })

    it('sets the cards in two columns of 380px or more that wrap, so beside the sidebar at 1024 they stack', async () => {
      const { wrapper } = await mountSettings()

      const columns = wrapper.findAll('.flex-\\[1_1_380px\\]')
      expect(columns).toHaveLength(2)
      expect(columns[0]!.element.parentElement!.classList).toContain('flex-wrap')
      expect(columns[0]!.find('.settings-account').exists()).toBe(true)
      expect(columns[0]!.find('.settings-skin').exists()).toBe(true)
      expect(columns[1]!.find('.settings-prefs').exists()).toBe(true)
      expect(columns[1]!.find('.settings-help').exists()).toBe(true)
    })

    it('keeps the foot of the page clear of the phone bottom bar', async () => {
      const { wrapper } = await mountSettings()

      expect(wrapper.get('.settings-page').classes()).toContain('pb-32')
    })

    it('has no tab sidebar, no "Session Control" box and no hover-scale effect', async () => {
      const { wrapper } = await mountSettings()

      expect(wrapper.text()).not.toContain('Session Control')
      expect(wrapper.text()).not.toContain('Skin Profile & Auth')
      expect(wrapper.text()).not.toContain('Support & Docs')
      expect(wrapper.html()).not.toContain('hover:scale')
    })

    it('gives every button a visible name, so no icon-only help button is left', async () => {
      const { wrapper } = await mountSettings()

      for (const button of wrapper.findAll('button')) {
        const named = button.text().trim() !== '' || button.attributes('aria-labelledby') !== undefined
        expect(named).toBe(true)
      }
    })
  })

  describe('Account card', () => {
    it('shows the name, the profile picture and a "Signed in with LINE" badge', async () => {
      const { wrapper } = await mountSettings({ id: 'u-1', display_name: 'Ploy', picture_url: 'https://profile.line-scdn.net/ploy.jpg', skin_type: 'DRNT' })

      const card = wrapper.get('.settings-account')
      expect(card.get('.account-name').text()).toBe('Ploy')
      expect(card.get('img').attributes('src')).toBe('https://profile.line-scdn.net/ploy.jpg')
      expect(card.get('.line-badge').text()).toBe('Signed in with LINE')
    })

    it('shows a person icon in place of a missing picture', async () => {
      const { wrapper } = await mountSettings()

      const card = wrapper.get('.settings-account')
      expect(card.find('img').exists()).toBe(false)
      expect(card.find('svg[aria-hidden="true"]').exists()).toBe(true)
    })

    it('colours the LINE badge in greens that pass 4.5:1 in both themes, not LINE\'s own #06C755', async () => {
      const { wrapper } = await mountSettings()

      const badge = wrapper.get('.line-badge').classes()
      expect(badge).toEqual(expect.arrayContaining(['bg-[#E6F7EC]', 'text-[#0B7A3B]', 'dark:bg-[#1C3A27]', 'dark:text-[#7EE2A8]']))
      expect(wrapper.html()).not.toContain('#06C755')
    })

    it('Log out in the account card signs the user out and goes to /explore', async () => {
      const { wrapper, router, auth } = await mountSettings()

      await wrapper.get('.logout-desktop').trigger('click')
      await flushPromises()

      expect(auth.isAuthenticated).toBe(false)
      expect(auth.showLogoutPopup).toBe(true)
      expect(router.currentRoute.value.path).toBe('/explore')
    })

    it('puts Log out in the account card on lg, and at the foot of the page below lg', async () => {
      const { wrapper } = await mountSettings()

      const desktop = wrapper.get('.logout-desktop')
      const phone = wrapper.get('.logout-phone')
      expect(desktop.text()).toBe('Log out')
      expect(desktop.classes()).toEqual(expect.arrayContaining(['hidden', 'lg:flex']))
      expect(phone.text()).toBe('Log out')
      expect(phone.classes()).toContain('lg:hidden')
      // The phone button is the last thing on the page, after every card.
      expect(wrapper.get('main').element.lastElementChild).toBe(phone.element)
    })

    it('Log out at the foot of the page also signs the user out and goes to /explore', async () => {
      const { wrapper, router, auth } = await mountSettings()

      await wrapper.get('.logout-phone').trigger('click')
      await flushPromises()

      expect(auth.isAuthenticated).toBe(false)
      expect(router.currentRoute.value.path).toBe('/explore')
    })
  })

  describe('Your skin type card', () => {
    it('shows the saved type, says it is a guide and not a diagnosis, and offers "Retake the quiz"', async () => {
      const { wrapper } = await mountSettings()

      const card = wrapper.get('.settings-skin')
      expect(card.get('.skin-type').text()).toBe('DRNT')
      expect(card.get('.skin-type').classes()).toContain('font-serif')
      expect(card.get('.skin-note').text()).toBe("From your skin quiz. It's a guide to what may suit you, not a diagnosis.")
      expect(card.get('.take-quiz').text()).toBe('Retake the quiz')
    })

    it('with no type shows "Not set yet", asks for the quiz and makes the main button "Take the quiz"', async () => {
      const { wrapper } = await mountSettings({ id: 'u-1', display_name: 'Ploy', skin_type: null })

      const card = wrapper.get('.settings-skin')
      expect(card.get('.skin-type').text()).toBe('Not set yet')
      expect(card.get('.skin-note').text()).toBe('Take the skin quiz to find your type.')
      expect(card.get('.take-quiz').text()).toBe('Take the quiz')
      expect(card.text()).not.toContain('not a diagnosis')
    })

    it('links to the skin profile, the quiz and routine history', async () => {
      const { wrapper } = await mountSettings()

      expect(hrefOf(wrapper, '.skin-profile-link')).toBe('/profile')
      expect(wrapper.get('.skin-profile-link').text()).toBe('See your skin profile')
      expect(hrefOf(wrapper, '.take-quiz')).toBe('/quiz')
      expect(hrefOf(wrapper, '.routine-link')).toBe('/routine')
      expect(wrapper.get('.routine-link').text()).toBe('Routine history')
    })

    it('drops the "Active Diagnosis" and "Baumann Skin Profile" wording', async () => {
      const { wrapper } = await mountSettings()

      expect(wrapper.text()).not.toContain('Active Diagnosis')
      expect(wrapper.text()).not.toContain('Baumann')
    })
  })

  describe('Choose my type', () => {
    it('"Choose my type" opens the skin type selector', async () => {
      const { wrapper } = await mountSettings()

      expect(modalIsOpen(wrapper)).toBe(false)
      await wrapper.get('.choose-type').trigger('click')
      expect(wrapper.get('.choose-type').text()).toBe('Choose my type')
      expect(modalIsOpen(wrapper)).toBe(true)
    })

    it('a confirmed type is saved through updateUserSkinType, written to the store, toasted and the selector closes', async () => {
      vi.mocked(updateUserSkinType).mockResolvedValue({ skin_type: 'OSPW' })
      const { wrapper, auth } = await mountSettings()

      await wrapper.get('.choose-type').trigger('click')
      wrapper.findComponent(ExpressSkinSelectorModal).vm.$emit('confirm', 'OSPW')
      await flushPromises()

      expect(updateUserSkinType).toHaveBeenCalledWith('OSPW')
      expect(auth.user.skin_type).toBe('OSPW')
      expect(wrapper.get('.skin-type').text()).toBe('OSPW')
      expect(toasts.value.map((t) => [t.message, t.type])).toEqual([['Skin profile successfully updated to OSPW.', 'success']])
      expect(modalIsOpen(wrapper)).toBe(false)
    })

    it('a refused save shows the error toast, keeps the stored type and leaves the selector open', async () => {
      vi.mocked(updateUserSkinType).mockRejectedValue(new Error('Request failed with status code 500'))
      const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { wrapper, auth } = await mountSettings()

      await wrapper.get('.choose-type').trigger('click')
      wrapper.findComponent(ExpressSkinSelectorModal).vm.$emit('confirm', 'OSPW')
      await flushPromises()

      expect(auth.user.skin_type).toBe('DRNT')
      expect(toasts.value.map((t) => [t.message, t.type])).toEqual([['Failed to update skin profile. Please try again.', 'error']])
      expect(modalIsOpen(wrapper)).toBe(true)
      expect(wrapper.findComponent(ExpressSkinSelectorModal).props('isSaving')).toBe(false)
      quiet.mockRestore()
    })
  })

  describe('Preferences card', () => {
    it('dark mode is a labelled switch whose aria-checked follows the theme store', async () => {
      const { wrapper, theme } = await mountSettings()

      const toggle = wrapper.get('button[role="switch"]')
      const labelId = toggle.attributes('aria-labelledby')!
      expect(wrapper.get(`#${labelId}`).text()).toBe('Dark mode')
      expect(toggle.attributes('aria-checked')).toBe('false')

      theme.isDark = true
      await flushPromises()
      expect(toggle.attributes('aria-checked')).toBe('true')
    })

    it('clicking the switch toggles the theme', async () => {
      const { wrapper, theme } = await mountSettings()

      await wrapper.get('button[role="switch"]').trigger('click')
      expect(theme.isDark).toBe(true)
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(wrapper.get('button[role="switch"]').attributes('aria-checked')).toBe('true')

      await wrapper.get('button[role="switch"]').trigger('click')
      expect(theme.isDark).toBe(false)
      expect(wrapper.get('button[role="switch"]').attributes('aria-checked')).toBe('false')
    })

    it('Notifications is plain text, "Not available yet", with no control', async () => {
      const { wrapper } = await mountSettings()

      const row = wrapper.get('.notifications-row')
      expect(row.text()).toBe('NotificationsNot available yet')
      expect(row.findAll('button, input, a, [role="switch"]')).toHaveLength(0)
      // The dark mode switch is the only switch on the page.
      expect(wrapper.findAll('[role="switch"]')).toHaveLength(1)
    })

    it('has no Language row', async () => {
      const { wrapper } = await mountSettings()

      expect(wrapper.text()).not.toContain('Language')
      expect(wrapper.text()).not.toContain('English')
    })
  })

  describe('Products you send (phones)', () => {
    it('shows below lg only, linking to My submissions and Submit a product', async () => {
      const { wrapper } = await mountSettings()

      const card = wrapper.get('.settings-send')
      expect(card.classes()).toContain('lg:hidden')
      expect(card.get('.my-submissions-link').text()).toBe('My submissions')
      expect(hrefOf(wrapper, '.my-submissions-link')).toBe('/submissions')
      expect(card.get('.submit-product-link').text()).toBe('Submit a product')
      expect(hrefOf(wrapper, '.submit-product-link')).toBe('/submissions/new')
    })
  })

  describe('Help card', () => {
    it('links to How % Match works and shows the SkinBuddy version', async () => {
      const { wrapper } = await mountSettings()

      const card = wrapper.get('.settings-help')
      expect(card.get('.match-link').text()).toBe('How % Match works')
      expect(hrefOf(wrapper, '.match-link')).toBe('/how-match-works')
      expect(card.get('.app-version').text()).toBe('SkinBuddy version 0.1.2')
      expect(card.findAll('a')).toHaveLength(1)
    })

    it('has no Privacy policy, Terms of service or Help Center links', async () => {
      const { wrapper } = await mountSettings()

      const text = wrapper.text().toLowerCase()
      expect(text).not.toContain('privacy')
      expect(text).not.toContain('terms of service')
      expect(text).not.toContain('help center')
    })
  })
})
