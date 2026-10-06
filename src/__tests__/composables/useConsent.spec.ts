import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn() },
}))

import { apiClient } from '../../api/index'
import { useConsent, resetConsentState } from '../../composables/useConsent'
import { useAdmin, resetAdminState } from '../../composables/useAdmin'
import { readConsent } from '../../api/consentApi'
import { useAuthStore } from '../../stores/auth'

const CONSENT = readConsent({
  current_terms_version: '2026-10-06',
  current_health_version: '2026-10-06',
  needs_terms: true,
  needs_health_consent: true,
})!

const signIn = (token = 'token-1') => useAuthStore().setAuth(token, { id: 'u-1', skin_type: 'OSPW' })
const answers = (data: unknown) => vi.mocked(apiClient.get).mockResolvedValue({ data })
const refusal = (status: number) => Object.assign(new Error(`status ${status}`), { response: { status, data: { detail: 'x' } } })

describe('src/composables/useConsent.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
    resetConsentState()
    resetAdminState()
  })

  describe('useConsent()', () => {
    it('reads the consent state from GET /auth/me for the current login', async () => {
      signIn()
      answers({ id: 'u-1', role: 'user', consent: CONSENT })
      const { consent, ensureConsent } = useConsent()

      expect(consent.value).toBeNull()
      await expect(ensureConsent()).resolves.toEqual(CONSENT)
      expect(consent.value).toEqual(CONSENT)
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me')
    })

    it('asks once per login, sharing one request between callers', async () => {
      signIn()
      answers({ consent: CONSENT })

      await Promise.all([useConsent().ensureConsent(), useConsent().ensureConsent()])
      await useConsent().ensureConsent()

      expect(apiClient.get).toHaveBeenCalledTimes(1)
    })

    it('answers null for a signed-out visitor without asking the backend', async () => {
      await expect(useConsent().ensureConsent()).resolves.toBeNull()
      expect(apiClient.get).not.toHaveBeenCalled()
    })

    it('forgets the state when the login changes, and asks again for the new one', async () => {
      signIn('token-a')
      answers({ consent: CONSENT })
      const { consent, ensureConsent } = useConsent()
      await ensureConsent()
      expect(consent.value).not.toBeNull()

      signIn('token-b')
      expect(consent.value).toBeNull()

      answers({ consent: { ...CONSENT, needs_terms: false } })
      await expect(ensureConsent()).resolves.toMatchObject({ needs_terms: false })
      expect(apiClient.get).toHaveBeenCalledTimes(2)
    })

    it('reads an answer without consent as null, so there is no gate', async () => {
      signIn()
      answers({ id: 'u-1', role: 'user' })

      await expect(useConsent().ensureConsent()).resolves.toBeNull()
    })

    it('ends the session on a 404, treating the user as a guest whose account is gone, without the logout pop-up', async () => {
      signIn()
      vi.mocked(apiClient.get).mockRejectedValue(refusal(404))
      const auth = useAuthStore()

      await expect(useConsent().ensureConsent()).resolves.toBeNull()
      expect(auth.isAuthenticated).toBe(false)
      expect(auth.token).toBeNull()
      expect(auth.showLogoutPopup).toBe(false)
    })

    it('keeps the session and sets no gate on a 5xx or a network error, and does not ask again for that login', async () => {
      signIn()
      vi.mocked(apiClient.get).mockRejectedValueOnce(refusal(503))
      const auth = useAuthStore()

      await expect(useConsent().ensureConsent()).resolves.toBeNull()
      expect(auth.isAuthenticated).toBe(true)
      await expect(useConsent().ensureConsent()).resolves.toBeNull()
      expect(apiClient.get).toHaveBeenCalledTimes(1)

      resetConsentState()
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network Error'))
      await expect(useConsent().ensureConsent()).resolves.toBeNull()
      expect(auth.isAuthenticated).toBe(true)
    })

    it('drops an answer that arrives after the login it was asked for has changed', async () => {
      signIn('token-old')
      let finish: (value: unknown) => void = () => {}
      vi.mocked(apiClient.get).mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
      const { consent, ensureConsent } = useConsent()

      const asked = ensureConsent()
      signIn('token-new')
      finish({ data: { consent: CONSENT } })

      await expect(asked).resolves.toBeNull()
      expect(consent.value).toBeNull()
    })

    it('keeps the consent object a successful POST answered with, without asking again', async () => {
      signIn()
      answers({ consent: CONSENT })
      const { consent, ensureConsent, setConsent } = useConsent()
      await ensureConsent()

      setConsent({ ...CONSENT, needs_terms: false })

      expect(consent.value?.needs_terms).toBe(false)
      await expect(ensureConsent()).resolves.toMatchObject({ needs_terms: false })
      expect(apiClient.get).toHaveBeenCalledTimes(1)
    })

    it('reads the state again on refreshConsent', async () => {
      signIn()
      answers({ consent: CONSENT })
      const { ensureConsent, refreshConsent } = useConsent()
      await ensureConsent()

      answers({ consent: { ...CONSENT, current_terms_version: '2026-11-01' } })
      await expect(refreshConsent()).resolves.toMatchObject({ current_terms_version: '2026-11-01' })
      expect(apiClient.get).toHaveBeenCalledTimes(2)
    })

    it('tells useAdmin the role from the same answer, so an admin page needs no second request', async () => {
      signIn()
      answers({ role: 'admin', consent: CONSENT })

      await useConsent().ensureConsent()

      expect(useAdmin().isAdmin.value).toBe(true)
      await expect(useAdmin().ensureRole()).resolves.toBe(true)
      expect(apiClient.get).toHaveBeenCalledTimes(1)
    })
  })
})
