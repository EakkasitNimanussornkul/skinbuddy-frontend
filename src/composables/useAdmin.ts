import { computed, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { fetchMyRole } from '../api/accountApi'

/**
 * Whether the signed-in user is an admin, for what the page offers (the
 * "Review submissions" menu item, the admin routes' guard).
 *
 * Never a security check. Every admin route answers 403 to anyone else, and
 * the admin pages show that 403 as their own state; this only spares a normal
 * user links they cannot use.
 *
 * Module-level, so the role is asked for once per login rather than once per
 * component. It belongs to the login it was read with: the stored token is
 * kept beside it, and a different token (sign-out, another account, an expired
 * session cleared by the interceptor) reads as unknown until asked again. That
 * is checked on every read rather than by a watcher, which would stop with
 * whichever component happened to create it.
 */
const role = ref<string | null>(null)
const roleToken = ref<string | null>(null)
let pending: Promise<boolean | null> | null = null
let pendingToken: string | null = null

export const useAdmin = () => {
  const auth = useAuthStore()

  /** The role, when it was read for the login in use now. */
  const knownRole = computed(() => (auth.token && roleToken.value === auth.token ? role.value : null))
  const isAdmin = computed(() => knownRole.value === 'admin')

  /**
   * Make sure the role is known for the current login, asking GET /auth/me if
   * it is not. Resolves true for an admin and false for anyone else, including
   * a signed-out visitor; null when the role could not be read, which the
   * caller must not treat as "not an admin".
   */
  const ensureRole = async (): Promise<boolean | null> => {
    const token = auth.token
    if (!token) return false
    if (roleToken.value === token) return role.value === 'admin'
    if (pending && pendingToken === token) return pending

    pendingToken = token
    pending = fetchMyRole()
      .then((fetched) => {
        // Kept only if the login is still the one it was asked for.
        if (auth.token !== token) return null
        role.value = fetched
        roleToken.value = token
        return fetched === 'admin'
      })
      .catch(() => null)
      .finally(() => {
        if (pendingToken === token) {
          pending = null
          pendingToken = null
        }
      })
    return pending
  }

  return { isAdmin, ensureRole }
}

/**
 * Keep a role read elsewhere for the login it was read with: the router's
 * consent check reads GET /auth/me anyway (useConsent), so an admin page then
 * needs no second request. A stale login's answer is dropped by the caller.
 */
export const rememberRole = (token: string, fetched: string | null) => {
  role.value = fetched
  roleToken.value = token
}

/** Forget the role. For tests. */
export const resetAdminState = () => {
  role.value = null
  roleToken.value = null
  pending = null
  pendingToken = null
}
