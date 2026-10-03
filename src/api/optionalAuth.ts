import axios, { type AxiosRequestConfig } from 'axios'
import { apiClient } from './index'

/**
 * GET from an optional-auth route, falling back to a guest request when the
 * login is missing, expired or invalid.
 *
 * The backend's optional-auth routes (those using get_optional_user_id: today
 * GET /products/search, /products/slug/{slug}, /products/compare and
 * /products/{product_id}) answer:
 *   - no Authorization header  -> 200, as a guest
 *   - expired or invalid token -> 401 ("Token expired" / "Invalid token")
 *   - valid token              -> 200, personalised
 *
 * So:
 *   - no stored token: a plain axios request, sent as a guest, never touching
 *     apiClient;
 *   - a stored token: apiClient, which attaches it;
 *   - a 401 from that: apiClient's interceptor has already cleared the session
 *     and opened the login popup, and the same request is repeated as a guest
 *     so the page still loads behind the popup;
 *   - any other failure is rethrown.
 *
 * EVERY call to an optional-auth route must go through this helper. Protected
 * routes (shelf, routine, quiz/save, auth/me, ...) must NOT: a 401 there
 * means the user has to sign in, and a guest retry would hide that.
 *
 * `config` is passed on only when given, so a call without one reaches axios
 * exactly as `get(path)`.
 */
export const getWithGuestFallback = async <T = any>(path: string, config?: AxiosRequestConfig): Promise<T> => {
  const asGuest = async (): Promise<T> => {
    const url = `${import.meta.env.VITE_API_URL}${path}`
    const response = config === undefined ? await axios.get(url) : await axios.get(url, config)
    return response.data
  }

  if (!localStorage.getItem('access_token')) return asGuest()

  try {
    const response = config === undefined ? await apiClient.get(path) : await apiClient.get(path, config)
    return response.data
  } catch (error: unknown) {
    if ((error as { response?: { status?: number } } | null)?.response?.status === 401) return asGuest()
    throw error
  }
}
