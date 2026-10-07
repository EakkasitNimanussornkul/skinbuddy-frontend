import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('axios', () => ({
  default: { get: vi.fn().mockRejectedValue(new Error('offline')) },
}))
vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))
vi.mock('../../api/authApi', () => ({
  updateUserSkinType: vi.fn(),
}))

import { apiClient } from '../../api/index'
import AlertDialog from '../../components/Shared/AlertDialog.vue'
import LegalPage from '../../components/Legal/LegalPage.vue'
import SettingsView from '../../views/SettingsView.vue'
import ConsentWelcomeView from '../../views/ConsentWelcomeView.vue'
import HealthConsentView from '../../views/HealthConsentView.vue'
import AccountDeletedView from '../../views/AccountDeletedView.vue'
import { useAuthStore } from '../../stores/auth'
import { resetConsentState } from '../../composables/useConsent'
import { resetAdminState } from '../../composables/useAdmin'
import { declared } from '../fixtures/styleRules'

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

const mounted: VueWrapper[] = []
const track = (w: VueWrapper) => {
  mounted.push(w)
  return w
}

/** Mount `component` at `address`, signed in, with GET /auth/me answering CONSENT. */
const mountAt = async (component: object, address: string, options: { props?: Record<string, unknown> } = {}) => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'u-1', role: 'user', consent: CONSENT } })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:any(.*)*', component: { template: '<div />' } }],
  })
  await router.push(address)
  await router.isReady()
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().setAuth('token-1', { id: 'u-1', display_name: 'Ploy', skin_type: 'DRNT' })
  const wrapper = track(mount(component, { props: options.props, global: { plugins: [pinia, router] }, attachTo: document.body }))
  await flushPromises()
  return wrapper
}

/** A CSS custom property set inline, from a bound style or a static attribute. */
const riseDelay = (el: { element: Element }) => {
  const node = el.element as HTMLElement
  const value = node.style.getPropertyValue('--rise-delay').trim() || node.getAttribute('style')?.match(/--rise-delay\s*:\s*([^;]+)/)?.[1] || '0'
  return Number.parseFloat(value)
}

const dialog = () => document.body.querySelector<HTMLElement>('[role="alertdialog"]')

describe('feat/26 motion on the dialogs, Settings and the consent and legal screens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    resetConsentState()
    resetAdminState()
  })
  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
    document.body.innerHTML = ''
  })

  describe('AlertDialog (motion)', () => {
    const props = { title: 'Withdraw your consent?', confirmLabel: 'Withdraw', cancelLabel: 'Keep it' }

    it('fades the backdrop and scales the panel up from 0.96 with dialog-pop, and plays it on first show', async () => {
      track(mount(AlertDialog, { props, attachTo: document.body }))
      await flushPromises()

      const transition = document.querySelector('transition-stub[name="dialog-pop"]')!
      expect(transition.getAttribute('appear')).toBe('true')
      expect(transition.querySelector('.dialog-pop-panel[role="alertdialog"]')).not.toBeNull()
      expect(declared('.dialog-pop-enter-from', 'opacity')).toEqual(['0'])
      expect(declared('.dialog-pop-enter-from .dialog-pop-panel', 'transform')).toEqual(['scale(0.96)'])
      expect(declared('.dialog-pop-leave-to .dialog-pop-panel', 'transform')).toEqual(['scale(0.96)'])
    })

    it('stays mounted while closed, then shows on open and moves focus to the safe choice at once', async () => {
      const opener = document.body.appendChild(document.createElement('button'))
      opener.focus()
      const w = track(mount(AlertDialog, { props: { ...props, open: false }, attachTo: document.body }))
      await flushPromises()
      expect(dialog()).toBeNull()
      expect(document.activeElement).toBe(opener)

      await w.setProps({ open: true })
      await flushPromises()
      expect(document.activeElement).toBe(dialog()!.querySelector('button.alert-cancel'))
    })

    it('gives focus back to the opener as soon as open turns off, without waiting for the motion', async () => {
      const opener = document.body.appendChild(document.createElement('button'))
      opener.focus()
      const w = track(mount(AlertDialog, { props: { ...props, open: false }, attachTo: document.body }))
      await w.setProps({ open: true })
      await flushPromises()

      await w.setProps({ open: false })
      expect(document.activeElement).toBe(opener)
      expect(dialog()).toBeNull()
    })

    it('plays the closing half with motion allowed: the dialog stays in the page, leaving, after open turns off', async () => {
      const original = window.matchMedia
      window.matchMedia = ((query: string) => ({ ...original(query), matches: false })) as typeof window.matchMedia
      try {
        const w = track(mount(AlertDialog, { props, attachTo: document.body, global: { stubs: { transition: false } } }))
        await flushPromises()

        await w.setProps({ open: false })
        const backdrop = dialog()?.parentElement
        expect(backdrop?.classList.contains('dialog-pop-leave-active')).toBe(true)
      } finally {
        window.matchMedia = original
      }
    })
  })

  describe('SettingsView (motion)', () => {
    it('keeps the Withdraw and Delete dialogs mounted, opening them through open so they can animate out', async () => {
      const w = await mountAt(SettingsView, '/settings')
      const dialogs = w.findAllComponents(AlertDialog)

      expect(dialogs).toHaveLength(2)
      expect(dialogs.map((d) => d.props('open'))).toEqual([false, false])
      expect(dialog()).toBeNull()

      await w.get('button.withdraw-consent').trigger('click')
      expect(w.findAllComponents(AlertDialog).map((d) => d.props('open'))).toEqual([true, false])
    })

    it('cross-fades Given and Not given: the status and the button each swap with swap-fade inside one grid cell', async () => {
      const w = await mountAt(SettingsView, '/settings')
      const statusCell = w.get('.consent-status-cell')
      const actionCell = w.get('.consent-action-cell')

      expect(statusCell.classes()).toContain('grid')
      expect(statusCell.get('transition-stub[name="swap-fade"] .consent-status').classes()).toContain('[grid-area:1/1]')
      expect(actionCell.classes()).toContain('grid')
      expect(actionCell.get('transition-stub[name="swap-fade"] button.withdraw-consent').classes()).toContain('[grid-area:1/1]')
    })

    it('fades the title and the cards up in reading order, 40ms apart', async () => {
      const w = await mountAt(SettingsView, '/settings')
      const blocks = [w.get('h1'), ...w.findAll('main section'), w.get('button.logout-phone')]

      expect(blocks).toHaveLength(9)
      expect(blocks.every((b) => b.classes().includes('rise-in'))).toBe(true)
      expect(blocks.map(riseDelay)).toEqual([0, 40, 80, 120, 160, 200, 240, 280, 320])
    })
  })

  describe('Consent, deleted and legal screens (entrance)', () => {
    it('fades the blocks of "Before you start" up in order, 50ms apart', async () => {
      const w = await mountAt(ConsentWelcomeView, '/welcome')
      const blocks = w.findAll('main > .rise-in')

      expect(blocks.map(riseDelay)).toEqual([0, 50, 100, 150, 200, 250])
      expect(blocks[2]!.classes()).toContain('welcome-points')
      expect(blocks[5]!.find('button.welcome-continue').exists()).toBe(true)
    })

    it('fades the blocks of the health consent screen up in order, 50ms apart', async () => {
      const w = await mountAt(HealthConsentView, '/consent/health')
      const blocks = w.findAll('main > .rise-in')

      expect(blocks.map(riseDelay)).toEqual([0, 50, 100, 150, 200, 250])
      expect(blocks[2]!.classes()).toContain('health-facts')
      expect(blocks[5]!.find('button.health-agree').exists()).toBe(true)
    })

    it('eases the Continue and Agree buttons from off to on with a colour transition, and not under reduced motion', async () => {
      const welcome = await mountAt(ConsentWelcomeView, '/welcome')
      const health = await mountAt(HealthConsentView, '/consent/health')

      for (const button of [welcome.get('button.welcome-continue'), health.get('button.health-agree')]) {
        expect(button.attributes('disabled')).toBeDefined()
        expect(button.classes()).toEqual(expect.arrayContaining(['transition-colors', 'motion-reduce:transition-none']))
      }
    })

    it('fades the account deleted screen up in order, the LINE hint included when shown', async () => {
      const w = await mountAt(AccountDeletedView, '/account/deleted?line=0')
      const blocks = w.findAll('main > .rise-in')

      expect(blocks.map(riseDelay)).toEqual([0, 50, 100, 150])
      expect(blocks[2]!.classes()).toContain('line-hint')
    })

    it('fades the policy title and then its text up on the legal pages', async () => {
      const w = await mountAt(LegalPage, '/privacy', { props: { title: 'Privacy Policy' } })
      const header = w.get('header')
      const body = w.get('article.legal-body')

      expect(header.classes()).toContain('rise-in')
      expect(body.classes()).toContain('rise-in')
      expect([riseDelay(header), riseDelay(body)]).toEqual([0, 50])
    })
  })
})
