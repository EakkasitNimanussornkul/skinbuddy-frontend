import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))
vi.mock('../../api/authApi', () => ({
  updateUserSkinType: vi.fn(),
}))
// The real start of a deletion, with the page change caught: jsdom cannot
// leave the page, and the address is what is checked.
const { go } = vi.hoisted(() => ({ go: vi.fn() }))
vi.mock('../../api/accountDeletion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/accountDeletion')>()
  return { ...actual, startAccountDeletion: (now?: number) => actual.startAccountDeletion(now, go) }
})

import { apiClient } from '../../api/index'
import SettingsView from '../../views/SettingsView.vue'
import { useAuthStore } from '../../stores/auth'
import { resetConsentState } from '../../composables/useConsent'
import { resetAdminState } from '../../composables/useAdmin'
import { useToast } from '../../composables/useToast'
import { DELETE_STATE_KEY } from '../../api/accountDeletion'

const { toasts } = useToast()
const page = { template: '<div />' }
const mounted: VueWrapper[] = []

const CONSENT = {
  terms_accepted_at: '2026-10-06T12:00:00Z',
  terms_version: '2026-10-06',
  age_confirmed_at: '2026-10-06T12:00:00Z',
  health_consent_at: '2026-10-06T12:00:00Z',
  health_consent_version: '2026-10-06',
  health_consent_withdrawn_at: null,
  current_terms_version: '2026-10-06',
  current_health_version: '2026-10-06',
  needs_terms: false,
  needs_health_consent: false,
}
const WITHDRAWN = { ...CONSENT, health_consent_withdrawn_at: '2026-10-08T12:00:00Z', needs_health_consent: true }

/** Mount Settings signed in, with GET /auth/me answering `role` and `consent`. Real Teleport: the dialogs render into the body. */
const mountSettings = async (consent: unknown = CONSENT, role = 'user') => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'u-1', role, consent } })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/settings', component: SettingsView },
      { path: '/:other(.*)*', component: page },
    ],
  })
  await router.push('/settings')
  await router.isReady()
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().setAuth('token-1', { id: 'u-1', display_name: 'Ploy', skin_type: 'DRNT' })
  const wrapper = mount(SettingsView, { global: { plugins: [pinia, router] }, attachTo: document.body })
  mounted.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

const dialog = () => document.body.querySelector<HTMLElement>('[role="alertdialog"]')
const inDialog = <T extends HTMLElement = HTMLElement>(selector: string) => dialog()!.querySelector<T>(selector)!
const click = async (el: HTMLElement) => {
  el.click()
  await flushPromises()
}
const tick = async (input: HTMLInputElement, value = true) => {
  input.checked = value
  input.dispatchEvent(new Event('change'))
  await flushPromises()
}
const refusal = (status: number, data: unknown) => Object.assign(new Error(`status ${status}`), { response: { status, data } })

describe('feat/25 Settings: privacy and account deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    resetConsentState()
    resetAdminState()
    toasts.value.splice(0)
    vi.stubEnv('VITE_LINE_CLIENT_ID', 'client-1')
    vi.stubEnv('VITE_LINE_DELETE_REDIRECT_URI', 'http://localhost:5173/account/delete/callback')
  })

  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
    vi.unstubAllEnvs()
  })

  describe('Privacy card', () => {
    it('shows "Given on 6 Oct 2026" and a Withdraw button when the consent was given and not withdrawn', async () => {
      const { wrapper } = await mountSettings()

      const card = wrapper.get('.settings-privacy')
      expect(card.get('h2').text()).toBe('Privacy')
      expect(card.get('.health-consent-row').text()).toContain('Weekly check-in consent')
      expect(card.get('.consent-status').text()).toBe('Given on 6 Oct 2026')
      expect(card.get('button.withdraw-consent').text()).toBe('Withdraw')
      expect(card.find('.give-consent').exists()).toBe(false)
    })

    it('shows "Not given" and a "Give consent" link to /consent/health?next=/settings when there is no consent', async () => {
      const { wrapper } = await mountSettings({ ...CONSENT, health_consent_at: null, needs_health_consent: true })

      const card = wrapper.get('.settings-privacy')
      expect(card.get('.consent-status').text()).toBe('Not given')
      expect(card.find('button.withdraw-consent').exists()).toBe(false)
      expect(card.get('a.give-consent').text()).toBe('Give consent')
      expect(card.get('a.give-consent').attributes('href')).toBe('/consent/health?next=/settings')
    })

    it('shows "Not given" once the consent was withdrawn', async () => {
      const { wrapper } = await mountSettings(WITHDRAWN)

      expect(wrapper.get('.consent-status').text()).toBe('Not given')
      expect(wrapper.find('a.give-consent').exists()).toBe(true)
    })

    it('shows "Not given" when GET /auth/me carries no consent (an older backend)', async () => {
      const { wrapper } = await mountSettings(null)

      expect(wrapper.get('.consent-status').text()).toBe('Not given')
    })

    it('links to the Privacy Policy and the Terms of Service', async () => {
      const { wrapper } = await mountSettings()

      expect(wrapper.get('.settings-privacy a.privacy-link').text()).toBe('Privacy Policy')
      expect(wrapper.get('.settings-privacy a.privacy-link').attributes('href')).toBe('/privacy')
      expect(wrapper.get('.settings-privacy a.terms-link').text()).toBe('Terms of Service')
      expect(wrapper.get('.settings-privacy a.terms-link').attributes('href')).toBe('/terms')
    })

    it('Withdraw opens a dialog in the design\'s words, and "Keep it" closes it without a request', async () => {
      const { wrapper } = await mountSettings()

      await click(wrapper.get('button.withdraw-consent').element as HTMLElement)

      expect(dialog()!.querySelector('h2')!.textContent).toBe('Withdraw your consent?')
      expect(inDialog('.withdraw-body').textContent).toBe(
        "You won't be able to add new weekly check-ins until you agree again. The check-ins you already sent stay saved until you delete your account.",
      )
      await click(inDialog('button.alert-cancel'))
      expect(dialog()).toBeNull()
      expect(apiClient.delete).not.toHaveBeenCalled()
    })

    it('confirming sends DELETE /consent/health, keeps the answer and the card then shows "Not given"', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: WITHDRAWN })
      const { wrapper } = await mountSettings()

      await click(wrapper.get('button.withdraw-consent').element as HTMLElement)
      await click(inDialog('button.alert-confirm'))

      expect(apiClient.delete).toHaveBeenCalledWith('/consent/health')
      expect(dialog()).toBeNull()
      expect(wrapper.get('.consent-status').text()).toBe('Not given')
      expect(toasts.value.map((t) => t.message)).toEqual(['Weekly check-in consent withdrawn.'])
      expect(document.activeElement).toBe(wrapper.get('a.give-consent').element)
    })

    it('a refused withdrawal shows the backend\'s detail in the dialog and keeps it open', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(refusal(500, { code: 'internal_error', detail: 'Your choice could not be saved. Please try again.' }))
      const { wrapper } = await mountSettings()

      await click(wrapper.get('button.withdraw-consent').element as HTMLElement)
      await click(inDialog('button.alert-confirm'))

      expect(inDialog('[role="alert"]').textContent).toBe('Your choice could not be saved. Please try again.')
      expect(wrapper.get('.consent-status').text()).toBe('Given on 6 Oct 2026')
    })
  })

  describe('Delete account', () => {
    it('shows a danger card whose "Delete my account" opens the dialog with what is deleted and what stays', async () => {
      const { wrapper } = await mountSettings()

      const card = wrapper.get('.settings-delete')
      expect(card.get('h2').text()).toBe('Delete account')
      expect(card.text()).toContain('Removes your SkinBuddy account and everything in it, and ends the link with your LINE account.')
      await click(card.get('button.delete-account').element as HTMLElement)

      expect(dialog()!.querySelector('h2')!.textContent).toBe('Delete your account?')
      expect(Array.from(dialog()!.querySelectorAll('.delete-list li')).map((li) => li.textContent)).toEqual([
        'Your LINE name, picture and LINE ID',
        'Your skin type and quiz results',
        'Your shelf, routines and routine history',
        'Your weekly check-ins and reports',
        'Every product you sent, and its photo unless a product in the catalogue shows it',
      ])
      expect(dialog()!.textContent).toContain('Products that were added to the catalogue stay, with no name or note from you.')
      expect(inDialog('button.alert-cancel').textContent!.trim()).toBe('Keep my account')
    })

    it('keeps the red button disabled until "I understand this can\'t be undone" is ticked', async () => {
      const { wrapper } = await mountSettings()
      await click(wrapper.get('button.delete-account').element as HTMLElement)

      const confirm = inDialog<HTMLButtonElement>('button.alert-confirm')
      expect(confirm.textContent!.trim()).toBe('Delete my account')
      expect(confirm.disabled).toBe(true)
      expect(inDialog('input.delete-understood').closest('label')!.textContent!.trim()).toBe("I understand this can't be undone")

      await tick(inDialog<HTMLInputElement>('input.delete-understood'))
      expect(inDialog<HTMLButtonElement>('button.alert-confirm').disabled).toBe(false)

      await tick(inDialog<HTMLInputElement>('input.delete-understood'), false)
      expect(inDialog<HTMLButtonElement>('button.alert-confirm').disabled).toBe(true)
    })

    it('confirming stores the state with a 10-minute expiry and goes to LINE\'s authorize page', async () => {
      const { wrapper } = await mountSettings()
      await click(wrapper.get('button.delete-account').element as HTMLElement)
      await tick(inDialog<HTMLInputElement>('input.delete-understood'))
      const before = Date.now()

      await click(inDialog('button.alert-confirm'))

      const stored = JSON.parse(sessionStorage.getItem(DELETE_STATE_KEY)!) as { value: string; expires: number }
      expect(stored.expires - before).toBeGreaterThanOrEqual(600_000)
      expect(stored.expires - Date.now()).toBeLessThanOrEqual(600_000)
      expect(go).toHaveBeenCalledTimes(1)
      const url = new URL(go.mock.calls[0]![0] as string)
      expect(url.searchParams.get('state')).toBe(stored.value)
      expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5173/account/delete/callback')
    })

    it('says "Account deletion isn\'t available yet." and goes nowhere when the redirect address is not set', async () => {
      vi.stubEnv('VITE_LINE_DELETE_REDIRECT_URI', '')
      const { wrapper } = await mountSettings()
      await click(wrapper.get('button.delete-account').element as HTMLElement)
      await tick(inDialog<HTMLInputElement>('input.delete-understood'))

      await click(inDialog('button.alert-confirm'))

      expect(inDialog('[role="alert"]').textContent).toBe("Account deletion isn't available yet.")
      expect(go).not.toHaveBeenCalled()
      expect(sessionStorage.getItem(DELETE_STATE_KEY)).toBeNull()
    })

    it('turns the button off for an admin, with the note "Admin accounts can\'t be deleted here."', async () => {
      const { wrapper } = await mountSettings(CONSENT, 'admin')

      const button = wrapper.get('button.delete-account')
      expect(button.attributes('disabled')).toBeDefined()
      expect(wrapper.get('.admin-delete-note').text()).toBe("Admin accounts can't be deleted here.")
      expect(button.attributes('aria-describedby')).toBe(wrapper.get('.admin-delete-note').attributes('id'))
      await click(button.element as HTMLElement)
      expect(dialog()).toBeNull()
    })

    it('leaves the button on for a normal user, with no admin note', async () => {
      const { wrapper } = await mountSettings(CONSENT, 'user')

      expect(wrapper.get('button.delete-account').attributes('disabled')).toBeUndefined()
      expect(wrapper.find('.admin-delete-note').exists()).toBe(false)
    })
  })

  describe('AlertDialog (focus and keys)', () => {
    it('moves focus to the safe choice, closes on Escape and gives focus back to the button that opened it', async () => {
      const { wrapper } = await mountSettings()
      const opener = wrapper.get('button.delete-account').element as HTMLElement
      opener.focus()

      await click(opener)
      expect(document.activeElement).toBe(inDialog('button.alert-cancel'))
      expect(dialog()!.getAttribute('aria-modal')).toBe('true')

      dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await flushPromises()

      expect(dialog()).toBeNull()
      expect(document.activeElement).toBe(opener)
    })

    it('keeps Tab inside the dialog, reaching the tick box', async () => {
      const { wrapper } = await mountSettings()
      await click(wrapper.get('button.delete-account').element as HTMLElement)
      const checkbox = inDialog('input.delete-understood')
      const cancel = inDialog('button.alert-cancel')

      // From the last enabled control (Cancel, while Delete is off) Tab wraps to the first, the tick box.
      cancel.focus()
      dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
      expect(document.activeElement).toBe(checkbox)

      checkbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
      expect(document.activeElement).toBe(cancel)
    })
  })
})
