import { apiClient } from './index'

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
  const role = (response.data as { role?: unknown } | null)?.role
  return typeof role === 'string' && role.length > 0 ? role : null
}
