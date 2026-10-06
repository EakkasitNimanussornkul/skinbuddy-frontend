import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

// No network: the public meta call goes through bare axios, mocked here, and
// the shared client is mocked so a case can show it is never used for it.
vi.mock('axios', () => ({
  default: { get: vi.fn() },
}))
vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn() },
}))

import axios from 'axios'
import { apiClient } from '../../api/index'
import { getPolicyVersions, POLICY_VERSION_FALLBACK } from '../../api/metaApi'
import PrivacyPolicyView from '../../views/PrivacyPolicyView.vue'
import TermsView from '../../views/TermsView.vue'
import AppSidebar from '../../components/Shared/AppSidebar.vue'
import { useAuthStore } from '../../stores/auth'
import { resetAdminState } from '../../composables/useAdmin'
import { resetConsentState } from '../../composables/useConsent'

const BASE = import.meta.env.VITE_API_URL
const page = { template: '<div />' }
const mounted: VueWrapper[] = []

// The real router, for the route cases. Imported by a path held in a variable
// so vue-tsc does not follow it into every view (see profileRoute.spec.ts).
const ROUTER_MODULE = '../../router/index'
const loadRouter = async (): Promise<Router> =>
  ((await import(/* @vite-ignore */ ROUTER_MODULE)) as { default: Router }).default
beforeAll(async () => {
  await loadRouter()
}, 60_000)

const mountPage = async (component: object, path: string) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/privacy', component: PrivacyPolicyView },
      { path: '/terms', component: TermsView },
      { path: '/:other(.*)*', component: page },
    ],
  })
  await router.push(path)
  await router.isReady()
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(component, { global: { plugins: [pinia, router] } })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

const versionsAnswer = (data: unknown) => vi.mocked(axios.get).mockResolvedValue({ data })
const notFound = () => Object.assign(new Error('Request failed with status code 404'), { response: { status: 404, data: { detail: 'Not Found' } } })
const text = (wrapper: VueWrapper) => wrapper.text().replace(/\s+/g, ' ')

describe('feat/25 Privacy Policy and Terms of Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    resetAdminState()
    resetConsentState()
    versionsAnswer({ terms_version: '2026-10-06', health_version: '2026-10-06' })
  })

  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
  })

  describe('getPolicyVersions()', () => {
    it('reads both versions from the public GET /meta/policy-versions, with no login attached even when one is stored', async () => {
      localStorage.setItem('access_token', 'token-1')
      versionsAnswer({ terms_version: '2026-11-01', health_version: '2026-11-02' })

      await expect(getPolicyVersions()).resolves.toEqual({ terms_version: '2026-11-01', health_version: '2026-11-02' })
      expect(vi.mocked(axios.get).mock.calls).toEqual([[`${BASE}/meta/policy-versions`]])
      expect(apiClient.get).not.toHaveBeenCalled()
    })

    it('reads a missing or odd field as null', async () => {
      versionsAnswer({ terms_version: 7 })

      await expect(getPolicyVersions()).resolves.toEqual({ terms_version: null, health_version: null })
    })

    it('throws a failure for the page to fall back on', async () => {
      vi.mocked(axios.get).mockRejectedValue(notFound())

      await expect(getPolicyVersions()).rejects.toThrow('404')
    })
  })

  describe('LegalPage version line', () => {
    it('shows the terms version from the response on both pages', async () => {
      versionsAnswer({ terms_version: '2026-11-01', health_version: '2026-12-25' })

      const privacy = await mountPage(PrivacyPolicyView, '/privacy')
      const terms = await mountPage(TermsView, '/terms')

      for (const wrapper of [privacy, terms]) {
        expect(wrapper.get('.legal-version-number').text()).toBe('2026-11-01')
        expect(wrapper.text()).not.toContain('2026-12-25')
      }
    })

    it('shows 2026-10-06 when the route answers 404, with no error and nothing in the console', async () => {
      vi.mocked(axios.get).mockRejectedValue(notFound())
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const wrapper = await mountPage(PrivacyPolicyView, '/privacy')

      expect(POLICY_VERSION_FALLBACK).toBe('2026-10-06')
      expect(wrapper.get('.legal-version-number').text()).toBe('2026-10-06')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(error).not.toHaveBeenCalled()
      expect(warn).not.toHaveBeenCalled()
      error.mockRestore()
      warn.mockRestore()
    })

    it('shows 2026-10-06 when no answer came at all (a network error)', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Network Error'))

      const wrapper = await mountPage(TermsView, '/terms')

      expect(wrapper.get('.legal-version-number').text()).toBe('2026-10-06')
    })

    it('keeps 2026-10-06 when the answer carries no terms version', async () => {
      versionsAnswer({ health_version: '2026-11-02' })

      const wrapper = await mountPage(TermsView, '/terms')

      expect(wrapper.get('.legal-version-number').text()).toBe('2026-10-06')
    })

    it('shows the date as a visible "[to be added]" placeholder', async () => {
      const wrapper = await mountPage(TermsView, '/terms')

      expect(wrapper.get('.legal-version').text().replace(/\s+/g, ' ')).toBe('Last updated: [to be added] · Version 2026-10-06')
      expect(wrapper.get('.legal-version .legal-placeholder').classes()).toContain('italic')
    })
  })

  describe('PrivacyPolicyView (/privacy)', () => {
    it('has one "Privacy Policy" h1, with h2 sections and h3 sub-headings', async () => {
      const wrapper = await mountPage(PrivacyPolicyView, '/privacy')

      expect(wrapper.findAll('h1').map((h) => h.text())).toEqual(['Privacy Policy'])
      expect(wrapper.findAll('h2').map((h) => h.text())).toEqual([
        'What we keep, and why',
        'Is any of it required?',
        'Legal bases',
        'Who else receives it',
        'Information sent outside Thailand',
        'How long we keep it',
        'Deleting your account',
        'Your rights',
        'Security',
        'Changes',
      ])
      expect(wrapper.findAll('h3').map((h) => h.text())).toContain('Your weekly skin check-in')
    })

    it('states the minimum age of 18 and that Supabase is in South Korea', async () => {
      const wrapper = await mountPage(PrivacyPolicyView, '/privacy')

      expect(wrapper.get('.privacy-age').text()).toBe('You must be 18 or older to use SkinBuddy.')
      expect(wrapper.get('.privacy-supabase').text()).toBe('Supabase: hosts our database and photo storage, in South Korea.')
    })

    it('discloses what goes to Google Gemini and what Google may do with it on the free service', async () => {
      const wrapper = await mountPage(PrivacyPolicyView, '/privacy')

      const body = text(wrapper)
      expect(body).toContain("We use Google's free Gemini service.")
      expect(wrapper.findAll('.privacy-gemini li').map((li) => li.text())).toEqual([
        'Google may use what we send, and its answers, to improve its products;',
        'people at Google may read them, after Google separates them from our account;',
        'Google keeps them for 55 days to check for misuse;',
        'Google may store them in any country where it has facilities.',
      ])
      expect(body).toContain('We never send your name, LINE ID or account ID.')
    })

    it('links Google\'s two Gemini documents through ExternalLink, in a new tab', async () => {
      const wrapper = await mountPage(PrivacyPolicyView, '/privacy')

      const links = wrapper.findAll('.privacy-gemini-sources a')
      expect(links.map((a) => [a.text(), a.attributes('href'), a.attributes('target')])).toEqual([
        ['Gemini API Additional Terms', 'https://ai.google.dev/gemini-api/terms', '_blank'],
        ['Gemini API usage policies', 'https://ai.google.dev/gemini-api/docs/usage-policies', '_blank'],
      ])
      expect(links[0]!.attributes('rel')).toContain('noopener')
    })

    it('says only the weekly check-in needs the separate consent, and that withdrawing it deletes nothing', async () => {
      const wrapper = await mountPage(PrivacyPolicyView, '/privacy')

      expect(wrapper.get('.privacy-consent-scope').text()).toBe('Only the weekly check-in asks for your separate consent first. Chat and routine suggestions send what is listed above whenever you use them.')
      expect(wrapper.get('.privacy-withdraw').text()).toContain('Withdrawing deletes nothing')
    })

    it('says deleting the account removes every product sent, whatever its review state, while added products stay', async () => {
      const wrapper = await mountPage(PrivacyPolicyView, '/privacy')

      const deletion = wrapper.get('.privacy-deletion').text()
      expect(deletion).toContain('every product you sent, whether it was waiting for review, not added or added, and its photo unless a product in the catalogue shows it.')
      expect(deletion).toContain('Products already added to the catalogue stay, with no name or note from you.')
      expect(deletion).toContain('Settings › Account › Authorized apps')
    })

    it('shows none of the draft\'s notes to the owner', async () => {
      const wrapper = await mountPage(PrivacyPolicyView, '/privacy')

      const body = wrapper.text()
      for (const note of ['[CHECK', '[CONFIRM', 'Sources:', 'Part A', 'Decision', 'research', 'DRAFT']) {
        expect(body).not.toContain(note)
      }
    })

    it('shows the team names, the contact email and the date as visible "[to be added]" placeholders', async () => {
      const wrapper = await mountPage(PrivacyPolicyView, '/privacy')

      const placeholders = wrapper.findAll('.legal-placeholder')
      expect(placeholders.length).toBe(4)
      expect(placeholders.every((p) => p.text() === '[to be added]')).toBe(true)
      expect(wrapper.text()).not.toMatch(/\[(CONTACT EMAIL|TEAM NAMES|DATE|POLICY VERSION)\]/)
    })

    it('cites s.19 and s.73 alone, and the other six rights only as the group "PDPA sections 30–34 and 36"', async () => {
      const wrapper = await mountPage(PrivacyPolicyView, '/privacy')

      expect(wrapper.get('.privacy-rights-withdraw').text()).toBe('withdraw consent (s.19);')
      expect(wrapper.findAll('.privacy-rights-group li').map((li) => li.text())).toEqual([
        'get a copy of your information, and have it sent to another service;',
        'object to its use;',
        'have it deleted;',
        'restrict its use;',
        'have it corrected;',
      ])
      expect(wrapper.get('.privacy-rights-sections').text()).toBe('(PDPA sections 30–34 and 36)')
      expect(wrapper.get('.privacy-rights-complaint').text()).toBe('complain to the Personal Data Protection Committee (s.73).')
      // No right carries a section of its own other than s.19 and s.73.
      expect(wrapper.text().match(/\bss?\.\s?\d+/g)).toEqual(['s.19', 's.73'])
    })
  })

  describe('TermsView (/terms)', () => {
    it('has one "Terms of Service" h1 and the ten numbered sections', async () => {
      const wrapper = await mountPage(TermsView, '/terms')

      expect(wrapper.findAll('h1').map((h) => h.text())).toEqual(['Terms of Service'])
      expect(wrapper.findAll('h2').map((h) => h.text())).toEqual([
        '1. About SkinBuddy',
        '2. Who can use it',
        '3. Not medical advice',
        '4. Your account',
        '5. Product information',
        '6. Products you send us',
        '7. Fair use',
        '8. Our responsibility',
        '9. Law',
        '10. Contact',
      ])
    })

    it('states the minimum age, that it is not medical advice, and that added products stay after deletion', async () => {
      const wrapper = await mountPage(TermsView, '/terms')

      expect(wrapper.get('.terms-age').text()).toBe('You must be 18 or older.')
      expect(wrapper.text()).toContain('It does not diagnose, treat or prescribe')
      expect(wrapper.get('.terms-catalogue').text()).toContain('they stay there if you later delete your account, without your name')
      expect(wrapper.get('.terms-account').text()).toContain('You can delete your account in Settings at any time.')
    })

    it('shows none of the draft\'s notes, and the contact as a visible placeholder', async () => {
      const wrapper = await mountPage(TermsView, '/terms')

      expect(wrapper.text()).not.toContain('[CHECK')
      expect(wrapper.text()).not.toContain('[CONFIRM')
      expect(wrapper.text()).not.toMatch(/\[(CONTACT EMAIL|DATE|TERMS VERSION)\]/)
      expect(wrapper.findAll('.legal-placeholder').map((p) => p.text())).toEqual(['[to be added]', '[to be added]'])
    })
  })

  describe('Routes and links to the policies', () => {
    it('lets a signed-out visitor open /privacy and /terms with no login prompt and no request', async () => {
      setActivePinia(createPinia())
      const router = await loadRouter()
      await router.push('/')

      await router.push('/privacy')
      expect(router.currentRoute.value.name).toBe('privacy')
      await router.push('/terms')
      expect(router.currentRoute.value.name).toBe('terms')

      expect(useAuthStore().showLoginPopup).toBe(false)
      expect(apiClient.get).not.toHaveBeenCalled()
      expect(router.resolve('/privacy').meta.requiresAuth).toBeUndefined()
      expect(router.resolve('/terms').meta.requiresAuth).toBeUndefined()
    })

    it('puts small Privacy Policy and Terms links at the foot of the desktop sidebar', async () => {
      setActivePinia(createPinia())
      const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:any(.*)*', component: page }] })
      await router.push('/')
      const wrapper = mount(AppSidebar, { global: { plugins: [router] } })
      mounted.push(wrapper)

      const legal = wrapper.get('.sidebar-legal')
      expect(legal.findAll('a').map((a) => [a.text(), a.attributes('href')])).toEqual([
        ['Privacy Policy', '/privacy'],
        ['Terms', '/terms'],
      ])
      expect(legal.classes()).toContain('text-xs')
      expect(legal.findAll('a').every((a) => a.classes().includes('min-h-11'))).toBe(true)
    })
  })
})
