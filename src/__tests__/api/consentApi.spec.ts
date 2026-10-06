import { describe, it, expect, beforeEach, vi } from 'vitest'

// No network: the shared client is mocked, and its calls are read back.
vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

import { apiClient } from '../../api/index'
import { readApiProblem } from '../../api/apiProblem'
import {
  deleteAccount,
  postHealthConsent,
  postTermsConsent,
  readConsent,
  withdrawHealthConsent,
} from '../../api/consentApi'
import { fetchMyAccount, fetchMyRole } from '../../api/accountApi'

/** A consent object as the confirmed contract sends it. */
const CONSENT = {
  terms_accepted_at: '2026-10-06T09:00:00+07:00',
  terms_version: '2026-10-06',
  age_confirmed_at: '2026-10-06T09:00:00+07:00',
  health_consent_at: null,
  health_consent_version: null,
  health_consent_withdrawn_at: null,
  current_terms_version: '2026-10-06',
  current_health_version: '2026-10-06',
  needs_terms: false,
  needs_health_consent: true,
}

/** An axios-style refusal. */
const refusal = (status: number, data: unknown) => Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data } })

describe('src/api/consentApi.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('readConsent()', () => {
    it('reads a consent object as sent, every field kept', () => {
      expect(readConsent(CONSENT)).toEqual(CONSENT)
    })

    it('reads a missing consent (an older GET /auth/me) as null, so there is no gate', () => {
      expect(readConsent(undefined)).toBeNull()
      expect(readConsent(null)).toBeNull()
      expect(readConsent('yes')).toBeNull()
      expect(readConsent([])).toBeNull()
    })

    it('reads missing or odd fields as null and the two flags as true only when they are exactly true', () => {
      expect(readConsent({ needs_terms: 'true', needs_health_consent: 1, current_terms_version: 5 })).toEqual({
        terms_accepted_at: null,
        terms_version: null,
        age_confirmed_at: null,
        health_consent_at: null,
        health_consent_version: null,
        health_consent_withdrawn_at: null,
        current_terms_version: null,
        current_health_version: null,
        needs_terms: false,
        needs_health_consent: false,
      })
    })
  })

  describe('postTermsConsent()', () => {
    it('posts the version it is given and the age tick to /consent/terms, and returns the consent object', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { ...CONSENT, needs_terms: false } })

      await expect(postTermsConsent('2026-10-06', true)).resolves.toEqual(CONSENT)
      expect(apiClient.post).toHaveBeenCalledWith('/consent/terms', { terms_version: '2026-10-06', age_confirmed: true })
    })

    it('throws a 409 policy_version_changed as it came, readable by readApiProblem', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(
        refusal(409, { code: 'policy_version_changed', current_version: '2026-11-01', detail: 'The terms and privacy policy have changed. Please read the current version before agreeing.' }),
      )

      const error = await postTermsConsent('2026-10-06', true).catch((e: unknown) => e)
      expect(readApiProblem(error)).toMatchObject({
        status: 409,
        code: 'policy_version_changed',
        detail: 'The terms and privacy policy have changed. Please read the current version before agreeing.',
      })
    })

    it('throws on a 200 whose body is not a consent object, so nothing unreadable is shown as saved', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: 'ok' })

      await expect(postTermsConsent('2026-10-06', true)).rejects.toThrow('could not be read')
    })
  })

  describe('postHealthConsent()', () => {
    it('posts the version it is given to /consent/health and returns the consent object', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { ...CONSENT, health_consent_at: '2026-10-07T10:00:00+07:00', needs_health_consent: false } })

      const result = await postHealthConsent('2026-10-06')

      expect(apiClient.post).toHaveBeenCalledWith('/consent/health', { health_version: '2026-10-06' })
      expect(result.needs_health_consent).toBe(false)
      expect(result.health_consent_at).toBe('2026-10-07T10:00:00+07:00')
    })
  })

  describe('withdrawHealthConsent()', () => {
    it('sends DELETE /consent/health with no body and returns the consent object', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: { ...CONSENT, health_consent_withdrawn_at: '2026-10-08T10:00:00+07:00' } })

      const result = await withdrawHealthConsent()

      expect(apiClient.delete).toHaveBeenCalledWith('/consent/health')
      expect(result.health_consent_withdrawn_at).toBe('2026-10-08T10:00:00+07:00')
    })

    it('throws a refusal as it came', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(refusal(500, { code: 'internal_error', detail: 'Your choice could not be saved. Please try again.' }))

      const error = await withdrawHealthConsent().catch((e: unknown) => e)
      expect(readApiProblem(error)).toMatchObject({ status: 500, code: 'internal_error' })
    })
  })

  describe('deleteAccount()', () => {
    it('posts the LINE code alone to /auth/me/delete and returns {deleted, line_deauthorized}', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { deleted: true, line_deauthorized: true } })

      await expect(deleteAccount('line-code-1')).resolves.toEqual({ deleted: true, line_deauthorized: true })
      expect(apiClient.post).toHaveBeenCalledWith('/auth/me/delete', { code: 'line-code-1' })
    })

    it('reads a missing line_deauthorized as false, so the user is asked to check LINE', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { deleted: true } })

      await expect(deleteAccount('line-code-1')).resolves.toEqual({ deleted: true, line_deauthorized: false })
    })

    it('throws a 403 line_account_mismatch as it came', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(refusal(403, { code: 'line_account_mismatch', detail: 'That LINE account is not the one you are signed in with.' }))

      const error = await deleteAccount('line-code-1').catch((e: unknown) => e)
      expect(readApiProblem(error)).toMatchObject({ status: 403, code: 'line_account_mismatch' })
    })
  })

  describe('fetchMyAccount() (role and consent from one GET /auth/me)', () => {
    it('reads the role and the consent from a single GET /auth/me', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'u-1', role: 'admin', consent: CONSENT } })

      await expect(fetchMyAccount()).resolves.toEqual({ role: 'admin', consent: CONSENT })
      expect(apiClient.get).toHaveBeenCalledTimes(1)
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me')
    })

    it('reads an answer without consent as consent null, and one without a role as role null', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'u-1' } })

      await expect(fetchMyAccount()).resolves.toEqual({ role: null, consent: null })
    })

    it('throws a 404 (the account is gone) as it came', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(refusal(404, { detail: 'User not found' }))

      const error = await fetchMyAccount().catch((e: unknown) => e)
      expect(readApiProblem(error).status).toBe(404)
    })

    it('leaves fetchMyRole answering the role alone, as before', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'u-1', role: 'user', consent: CONSENT } })

      await expect(fetchMyRole()).resolves.toBe('user')
    })
  })
})
