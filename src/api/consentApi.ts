import { apiClient } from './index'

/**
 * The user's consent records (backend feat/consent-and-account-deletion,
 * contract confirmed 2026-10-07): agreeing to the terms with the age check at
 * first sign-in, the separate health consent the weekly check-in needs, and
 * deleting the account.
 *
 * Protected routes, so apiClient: a 401 opens the login popup through its
 * interceptor. A refusal is thrown as it came, for the screen to read with
 * readApiProblem (api/apiProblem.ts): {"detail", "code"} on every route here,
 * with `current_version` added to a 409 policy_version_changed.
 */

/** GET /auth/me `consent`, and the 200 body of every consent route. */
export interface ConsentState {
  terms_accepted_at: string | null
  terms_version: string | null
  age_confirmed_at: string | null
  health_consent_at: string | null
  health_consent_version: string | null
  health_consent_withdrawn_at: string | null
  /** The versions the server asks for now. Posted back as they are, never typed in here. */
  current_terms_version: string | null
  current_health_version: string | null
  needs_terms: boolean
  needs_health_consent: boolean
}

export interface AccountDeleted {
  deleted: boolean
  /** False when LINE could not be told; the page then asks the user to remove SkinBuddy in LINE. */
  line_deauthorized: boolean
}

const text = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null)

/**
 * A consent object, every field read as optional. Null for anything that is
 * not an object, which is how an older GET /auth/me (no `consent`) reads: the
 * caller treats that as "no gate". The two flags count only when they are
 * exactly true, so an odd value never traps anyone behind a consent screen.
 */
export const readConsent = (data: unknown): ConsentState | null => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const body = data as Record<string, unknown>
  return {
    terms_accepted_at: text(body.terms_accepted_at),
    terms_version: text(body.terms_version),
    age_confirmed_at: text(body.age_confirmed_at),
    health_consent_at: text(body.health_consent_at),
    health_consent_version: text(body.health_consent_version),
    health_consent_withdrawn_at: text(body.health_consent_withdrawn_at),
    current_terms_version: text(body.current_terms_version),
    current_health_version: text(body.current_health_version),
    needs_terms: body.needs_terms === true,
    needs_health_consent: body.needs_health_consent === true,
  }
}

/** A 200 that is not a consent object cannot be shown as saved. */
const consentFrom = (data: unknown): ConsentState => {
  const consent = readConsent(data)
  if (!consent) throw new Error('The consent answer could not be read.')
  return consent
}

/** POST /consent/terms. `termsVersion` is the server's current_terms_version. */
export const postTermsConsent = async (termsVersion: string, ageConfirmed: boolean): Promise<ConsentState> => {
  const response = await apiClient.post('/consent/terms', { terms_version: termsVersion, age_confirmed: ageConfirmed })
  return consentFrom(response.data)
}

/** POST /consent/health. `healthVersion` is the server's current_health_version. */
export const postHealthConsent = async (healthVersion: string): Promise<ConsentState> => {
  const response = await apiClient.post('/consent/health', { health_version: healthVersion })
  return consentFrom(response.data)
}

/** DELETE /consent/health. Deletes no data; the check-ins already sent stay. */
export const withdrawHealthConsent = async (): Promise<ConsentState> => {
  const response = await apiClient.delete('/consent/health')
  return consentFrom(response.data)
}

/**
 * POST /auth/me/delete with the authorization code LINE sent back to
 * /account/delete/callback. The backend exchanges it itself; no redirect URI
 * is sent from here. A missing `line_deauthorized` reads as false, so the
 * user is asked to check LINE rather than told it was done.
 */
export const deleteAccount = async (code: string): Promise<AccountDeleted> => {
  const response = await apiClient.post('/auth/me/delete', { code })
  const body = (response.data ?? {}) as { deleted?: unknown; line_deauthorized?: unknown }
  return { deleted: body.deleted === true, line_deauthorized: body.line_deauthorized === true }
}
