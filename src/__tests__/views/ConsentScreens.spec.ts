import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

// The shared client is mocked, so the real consent API and useConsent run:
// what is posted is read off the request the screen actually makes.
vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

import { apiClient } from '../../api/index'
import ConsentWelcomeView from '../../views/ConsentWelcomeView.vue'
import HealthConsentView from '../../views/HealthConsentView.vue'
import { useAuthStore } from '../../stores/auth'
import { useConsent, resetConsentState } from '../../composables/useConsent'
import { resetAdminState } from '../../composables/useAdmin'

const page = { template: '<div />' }

/** The consent state as GET /auth/me sends it. The server's versions are deliberately not the policy pages' own. */
const SERVER_CONSENT = {
  terms_accepted_at: null,
  terms_version: null,
  age_confirmed_at: null,
  health_consent_at: null,
  health_consent_version: null,
  health_consent_withdrawn_at: null,
  current_terms_version: '2026-11-01',
  current_health_version: '2026-11-02',
  needs_terms: true,
  needs_health_consent: true,
}

const refusal = (status: number, data: unknown) => Object.assign(new Error(`status ${status}`), { response: { status, data } })

const mounted: VueWrapper[] = []

/** Mount a consent screen at `address`, signed in, after `from` when given (so Back has somewhere to go). */
const mountAt = async (component: object, address: string, from?: string): Promise<{ wrapper: VueWrapper; router: Router }> => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: page },
      { path: '/welcome', component: ConsentWelcomeView },
      { path: '/consent/health', component: HealthConsentView },
      { path: '/shelf', component: page },
      { path: '/settings', component: page },
      { path: '/explore', component: page },
      { path: '/checkin', component: page },
      { path: '/analysis', component: page },
      { path: '/privacy', component: page },
      { path: '/terms', component: page },
    ],
  })
  if (from) await router.push(from)
  await router.push(address)
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().setAuth('token-1', { id: 'u-1', display_name: 'Ploy', skin_type: 'DRNT' })

  const wrapper = mount(component, { global: { plugins: [pinia, router] }, attachTo: document.body })
  mounted.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

const serverAnswers = (consent: Record<string, unknown> = SERVER_CONSENT) =>
  vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'u-1', role: 'user', consent } })

const labelOf = (wrapper: VueWrapper, selector: string) => wrapper.get(selector).element.closest('label')?.textContent?.replace(/\s+/g, ' ').trim()

const tickBoth = async (wrapper: VueWrapper) => {
  await wrapper.get('input.age-check').setValue(true)
  await wrapper.get('input.terms-check').setValue(true)
}

describe('feat/25 consent screens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    resetConsentState()
    resetAdminState()
    serverAnswers()
  })

  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
  })

  describe('ConsentWelcomeView (/welcome)', () => {
    it('shows "Before you start", the four points and links to /privacy and /terms', async () => {
      const { wrapper } = await mountAt(ConsentWelcomeView, '/welcome?next=/shelf')

      expect(wrapper.get('h1').text()).toBe('Before you start')
      expect(wrapper.findAll('.welcome-points li').map((li) => li.find('span.font-extrabold').text())).toEqual([
        'Your LINE name and picture',
        'Your skin type, shelf and routine',
        'Questions to SkinBuddy AI',
        'Weekly skin check-ins',
      ])
      expect(wrapper.text()).toContain('Google may use them to improve its products, and people at Google may read them.')
      expect(wrapper.get('a.privacy-link').attributes('href')).toBe('/privacy')
      expect(wrapper.get('a.terms-link').attributes('href')).toBe('/terms')
    })

    it('has two separate labelled checkboxes, unticked at first', async () => {
      const { wrapper } = await mountAt(ConsentWelcomeView, '/welcome')

      expect(labelOf(wrapper, 'input.age-check')).toBe("I'm 18 or older")
      expect(labelOf(wrapper, 'input.terms-check')).toBe('I agree to the Terms of Service and Privacy Policy')
      expect((wrapper.get('input.age-check').element as HTMLInputElement).checked).toBe(false)
      expect((wrapper.get('input.terms-check').element as HTMLInputElement).checked).toBe(false)
    })

    it('keeps Continue disabled until both boxes are ticked', async () => {
      const { wrapper } = await mountAt(ConsentWelcomeView, '/welcome')
      const continueButton = () => wrapper.get('button.welcome-continue')

      expect(continueButton().attributes('disabled')).toBeDefined()
      await wrapper.get('input.age-check').setValue(true)
      expect(continueButton().attributes('disabled')).toBeDefined()
      await wrapper.get('input.age-check').setValue(false)
      await wrapper.get('input.terms-check').setValue(true)
      expect(continueButton().attributes('disabled')).toBeDefined()
      await wrapper.get('input.age-check').setValue(true)
      expect(continueButton().attributes('disabled')).toBeUndefined()
    })

    it('posts the server\'s current_terms_version with age_confirmed true, keeps the answer and goes to next', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { ...SERVER_CONSENT, terms_version: '2026-11-01', needs_terms: false } })
      const { wrapper, router } = await mountAt(ConsentWelcomeView, '/welcome?next=/shelf')

      await tickBoth(wrapper)
      await wrapper.get('button.welcome-continue').trigger('click')
      await flushPromises()

      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(apiClient.post).toHaveBeenCalledWith('/consent/terms', { terms_version: '2026-11-01', age_confirmed: true })
      expect(useConsent().consent.value?.needs_terms).toBe(false)
      expect(router.currentRoute.value.fullPath).toBe('/shelf')
    })

    it('goes to / instead of a next address on another site', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { ...SERVER_CONSENT, needs_terms: false } })
      const { wrapper, router } = await mountAt(ConsentWelcomeView, '/welcome?next=//evil.example/')

      await tickBoth(wrapper)
      await wrapper.get('button.welcome-continue').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.fullPath).toBe('/')
    })

    it('on 409 policy_version_changed reads the state again, clears both ticks, shows the detail, then posts the new version', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(
        refusal(409, { code: 'policy_version_changed', current_version: '2026-12-01', detail: 'The terms and privacy policy have changed. Please read the current version before agreeing.' }),
      )
      const { wrapper, router } = await mountAt(ConsentWelcomeView, '/welcome?next=/shelf')
      serverAnswers({ ...SERVER_CONSENT, current_terms_version: '2026-12-01' })

      await tickBoth(wrapper)
      await wrapper.get('button.welcome-continue').trigger('click')
      await flushPromises()

      expect(apiClient.get).toHaveBeenCalledTimes(2)
      expect((wrapper.get('input.age-check').element as HTMLInputElement).checked).toBe(false)
      expect((wrapper.get('input.terms-check').element as HTMLInputElement).checked).toBe(false)
      expect(wrapper.get('[role="alert"]').text()).toBe('The terms and privacy policy have changed. Please read the current version before agreeing.')
      expect(router.currentRoute.value.path).toBe('/welcome')

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ...SERVER_CONSENT, needs_terms: false } })
      await tickBoth(wrapper)
      await wrapper.get('button.welcome-continue').trigger('click')
      await flushPromises()
      expect(vi.mocked(apiClient.post).mock.calls[1]).toEqual(['/consent/terms', { terms_version: '2026-12-01', age_confirmed: true }])
    })

    it('on 422 age_not_confirmed shows the backend\'s detail and stays', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(refusal(422, { code: 'age_not_confirmed', detail: 'You must confirm that you are 18 or older to use SkinBuddy.' }))
      const { wrapper, router } = await mountAt(ConsentWelcomeView, '/welcome?next=/shelf')

      await tickBoth(wrapper)
      await wrapper.get('button.welcome-continue').trigger('click')
      await flushPromises()

      expect(wrapper.get('[role="alert"]').text()).toBe('You must confirm that you are 18 or older to use SkinBuddy.')
      expect(router.currentRoute.value.path).toBe('/welcome')
    })

    it('shows the detail of any other refusal, or plain words when there is none or no answer came', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(refusal(500, { code: 'internal_error', detail: 'Your choice could not be saved. Please try again.' }))
      const { wrapper } = await mountAt(ConsentWelcomeView, '/welcome')
      await tickBoth(wrapper)
      await wrapper.get('button.welcome-continue').trigger('click')
      await flushPromises()
      expect(wrapper.get('[role="alert"]').text()).toBe('Your choice could not be saved. Please try again.')

      vi.mocked(apiClient.post).mockRejectedValueOnce(refusal(502, '<html>Bad gateway</html>'))
      await wrapper.get('button.welcome-continue').trigger('click')
      await flushPromises()
      expect(wrapper.get('[role="alert"]').text()).toBe('Your choice could not be saved. Please try again.')

      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network Error'))
      await wrapper.get('button.welcome-continue').trigger('click')
      await flushPromises()
      expect(wrapper.get('[role="alert"]').text()).toBe("Couldn't reach SkinBuddy. Check your connection and try again.")
    })

    it('posts nothing and says why when the server gave no version to agree to', async () => {
      serverAnswers({ needs_terms: true })
      const { wrapper } = await mountAt(ConsentWelcomeView, '/welcome')

      await tickBoth(wrapper)
      await wrapper.get('button.welcome-continue').trigger('click')
      await flushPromises()

      expect(apiClient.post).not.toHaveBeenCalled()
      expect(wrapper.get('[role="alert"]').text()).toBe("We couldn't load the current version to agree to. Reload the page and try again.")
    })

    it('"Not now, sign me out" signs the user out and goes to /explore', async () => {
      const { wrapper, router } = await mountAt(ConsentWelcomeView, '/welcome?next=/shelf')

      await wrapper.get('button.welcome-sign-out').trigger('click')
      await flushPromises()

      expect(useAuthStore().isAuthenticated).toBe(false)
      expect(router.currentRoute.value.path).toBe('/explore')
      expect(apiClient.post).not.toHaveBeenCalled()
    })
  })

  describe('HealthConsentView (/consent/health)', () => {
    it('shows the five facts word for word and a link to the Privacy Policy', async () => {
      const { wrapper } = await mountAt(HealthConsentView, '/consent/health?next=/checkin')

      expect(wrapper.get('h1').text()).toBe('Your check-ins are health information')
      const facts = wrapper.findAll('.health-fact').map((f) => f.findAll('span').map((s) => s.text()))
      expect(facts).toEqual([
        ['What we keep', 'The symptoms you pick, how bad they are, where on your skin, your notes, and the weekly report made from them.'],
        ['Who sees it', 'You, and Google. To make your report, we send Google Gemini this week and up to four earlier weeks, with your skin type and routine products, but never your name or LINE ID.'],
        ['What Google does with it', 'We use the free version of Google Gemini. Google may use what we send to improve its products, and people at Google may read it. Google keeps it for 55 days to check for misuse, and may store it in any country.'],
        ['How long we keep it', 'Until you delete your account in Settings.'],
        ['If you say no', 'Everything else in SkinBuddy still works. Only the weekly check-in needs this.'],
      ])
      expect(wrapper.get('a.privacy-link').attributes('href')).toBe('/privacy')
      expect(wrapper.text()).toContain('The weekly report is a guide, not a diagnosis.')
    })

    it('has one labelled checkbox, and the agree button stays disabled until it is ticked', async () => {
      const { wrapper } = await mountAt(HealthConsentView, '/consent/health')

      expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(1)
      expect(labelOf(wrapper, 'input.health-check')).toBe('I agree that SkinBuddy may keep and analyse my check-ins as described above')
      expect(wrapper.get('button.health-agree').attributes('disabled')).toBeDefined()
      await wrapper.get('input.health-check').setValue(true)
      expect(wrapper.get('button.health-agree').attributes('disabled')).toBeUndefined()
    })

    it('posts the server\'s current_health_version, keeps the answer and goes to /checkin by default', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { ...SERVER_CONSENT, needs_terms: false, needs_health_consent: false } })
      const { wrapper, router } = await mountAt(HealthConsentView, '/consent/health')

      await wrapper.get('input.health-check').setValue(true)
      await wrapper.get('button.health-agree').trigger('click')
      await flushPromises()

      expect(apiClient.post).toHaveBeenCalledWith('/consent/health', { health_version: '2026-11-02' })
      expect(useConsent().consent.value?.needs_health_consent).toBe(false)
      expect(router.currentRoute.value.path).toBe('/checkin')
    })

    it('goes to the next address it was given, and to /checkin for one on another site', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { ...SERVER_CONSENT, needs_health_consent: false } })
      const first = await mountAt(HealthConsentView, '/consent/health?next=/settings')
      await first.wrapper.get('input.health-check').setValue(true)
      await first.wrapper.get('button.health-agree').trigger('click')
      await flushPromises()
      expect(first.router.currentRoute.value.path).toBe('/settings')

      const second = await mountAt(HealthConsentView, '/consent/health?next=https://evil.example/')
      await second.wrapper.get('input.health-check').setValue(true)
      await second.wrapper.get('button.health-agree').trigger('click')
      await flushPromises()
      expect(second.router.currentRoute.value.path).toBe('/checkin')
    })

    it('on 409 reads the state again, clears the tick and shows the detail', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(refusal(409, { code: 'policy_version_changed', current_version: '2026-12-02', detail: 'The terms and privacy policy have changed. Please read the current version before agreeing.' }))
      const { wrapper, router } = await mountAt(HealthConsentView, '/consent/health')

      await wrapper.get('input.health-check').setValue(true)
      await wrapper.get('button.health-agree').trigger('click')
      await flushPromises()

      expect(apiClient.get).toHaveBeenCalledTimes(2)
      expect((wrapper.get('input.health-check').element as HTMLInputElement).checked).toBe(false)
      expect(wrapper.get('[role="alert"]').text()).toContain('have changed')
      expect(router.currentRoute.value.path).toBe('/consent/health')
    })

    it('"Not now" goes back where the user came from', async () => {
      const { wrapper, router } = await mountAt(HealthConsentView, '/consent/health?next=/checkin', '/settings')
      // Memory history keeps no state; the browser's history records the
      // previous page as `back`, as set here.
      Object.assign(router.options.history.state, { back: '/settings' })

      await wrapper.get('button.health-not-now').trigger('click')
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(router.currentRoute.value.path).toBe('/settings')
      expect(apiClient.post).not.toHaveBeenCalled()
    })

    it('"Not now" goes to /analysis when there is nowhere to go back to', async () => {
      const { wrapper, router } = await mountAt(HealthConsentView, '/consent/health')

      await wrapper.get('button.health-not-now').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/analysis')
    })
  })
})
