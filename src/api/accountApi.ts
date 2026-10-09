import { apiClient } from './index'
import { readConsent, type ConsentState } from './consentApi'

// One GET /auth/me at a time per login. A signed-in hard reload of a protected
// page asks for the role (the sidebar) and for the consent state (the router)
// together; both read the same answer. Kept only until it settles, so a later
// read is a fresh request.
let pendingMe: Promise<unknown> | null = null
let pendingMeToken: string | null = null

const getMe = (): Promise<unknown> => {
  const token = localStorage.getItem('access_token')
  if (pendingMe && pendingMeToken === token) return pendingMe

  const request: Promise<unknown> = apiClient.get('/auth/me').then((response) => response.data)
  pendingMe = request
  pendingMeToken = token
  const settled = () => {
    if (pendingMe === request) {
      pendingMe = null
      pendingMeToken = null
    }
  }
  request.then(settled, settled)
  return request
}

const readRole = (data: unknown): string | null => {
  const role = (data as { role?: unknown } | null)?.role
  return typeof role === 'string' && role.length > 0 ? role : null
}

/**
 * The signed-in user's role ('user' or 'admin'), from GET /auth/me.
 *
 * Granting admin is a manual users.role edit in Supabase (migration 0006);
 * there is no endpoint for it, so nothing here can change it. The role only
 * decides what the page offers - every admin route is enforced by the backend
 * with 403, whatever this says.
 *
 * Null when the answer carries no role.
 */
export const fetchMyRole = async (): Promise<string | null> => {
  return readRole(await getMe())
}

export interface MyAccount {
  role: string | null
  /** Null for an answer without `consent` (a backend from before it): no consent screen then. */
  consent: ConsentState | null
}

/**
 * The role and the consent state from one GET /auth/me, so the router's
 * consent check also tells useAdmin the role without a second request.
 * Failures are thrown as they came: a 404 here means the account is gone.
 */
export const fetchMyAccount = async (): Promise<MyAccount> => {
  const data = (await getMe()) as { consent?: unknown } | null
  return { role: readRole(data), consent: readConsent(data?.consent) }
}
