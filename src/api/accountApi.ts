import { apiClient } from './index'
import { readConsent, type ConsentState } from './consentApi'

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
  const response = await apiClient.get('/auth/me')
  return readRole(response.data)
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
  const response = await apiClient.get('/auth/me')
  const data = response.data as { consent?: unknown } | null
  return { role: readRole(data), consent: readConsent(data?.consent) }
}
