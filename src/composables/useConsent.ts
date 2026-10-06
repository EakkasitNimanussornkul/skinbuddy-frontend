import { computed, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { fetchMyAccount } from '../api/accountApi'
import { readApiProblem } from '../api/apiProblem'
import type { ConsentState } from '../api/consentApi'
import { rememberRole } from './useAdmin'

/**
 * The signed-in user's consent state, for the router's consent screens and the
 * Privacy card in Settings.
 *
 * Module-level and keyed to the login, like useAdmin: read once per token from
 * GET /auth/me, and unknown again as soon as the token changes (sign-out,
 * another account, a session the interceptor cleared). Checked on every read
 * rather than by a watcher.
 *
 * What a failed read means:
 *   - 404: the account is gone (deleted, possibly from another tab, while this
 *     login is still within its 7 days). The session is cleared quietly and
 *     the user is a guest from then on.
 *   - anything else (offline, 5xx): no consent screen. A backend that is down
 *     must not trap people on a page they cannot leave; the server refuses a
 *     check-in without consent (403 health_consent_required) whatever this says.
 * Either way the result is kept for that token, so a backend that is down is
 * not asked again on every navigation.
 */
const state = ref<ConsentState | null>(null)
const stateToken = ref<string | null>(null)
let pending: Promise<ConsentState | null> | null = null
let pendingToken: string | null = null

export const useConsent = () => {
  const auth = useAuthStore()

  /** The consent state read for the login in use now; null when unknown or not given by the backend. */
  const consent = computed(() => (auth.token && stateToken.value === auth.token ? state.value : null))

  /** Read the consent state for the current login, once per token. Null means no consent screen. */
  const ensureConsent = async (): Promise<ConsentState | null> => {
    const token = auth.token
    if (!token) return null
    if (stateToken.value === token) return state.value
    if (pending && pendingToken === token) return pending

    pendingToken = token
    pending = fetchMyAccount()
      .then(({ role, consent: read }) => {
        // Kept only if the login is still the one it was asked for.
        if (auth.token !== token) return null
        state.value = read
        stateToken.value = token
        rememberRole(token, role)
        return read
      })
      .catch((error: unknown) => {
        if (auth.token !== token) return null
        if (readApiProblem(error).status === 404) {
          // clearSession, not logout: logout's "You've logged out" pop-up
          // would speak of a sign-out the user did not ask for.
          auth.clearSession()
          return null
        }
        state.value = null
        stateToken.value = token
        return null
      })
      .finally(() => {
        if (pendingToken === token) {
          pending = null
          pendingToken = null
        }
      })
    return pending
  }

  /** Read the state again, after the server said it changed (409 policy_version_changed). */
  const refreshConsent = (): Promise<ConsentState | null> => {
    stateToken.value = null
    pending = null
    pendingToken = null
    return ensureConsent()
  }

  /** Keep the consent object a successful POST or DELETE answered with. */
  const setConsent = (next: ConsentState) => {
    if (!auth.token) return
    state.value = next
    stateToken.value = auth.token
  }

  return { consent, ensureConsent, refreshConsent, setConsent }
}

/** Forget the consent state. For tests. */
export const resetConsentState = () => {
  state.value = null
  stateToken.value = null
  pending = null
  pendingToken = null
}
