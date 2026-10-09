import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
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
export const getWithGuestFallback = async <T = any>(path: string, config?: AxiosRequestConfig): Promise<T> =>
  (await getResponseWithGuestFallback<T>(path, config)).data

/**
 * The same request and the same fallback as getWithGuestFallback, returning the
 * whole response so a caller can read its headers (Explore reads X-Total-Count).
 * getWithGuestFallback is this with `.data` taken.
 */
export const getResponseWithGuestFallback = async <T = unknown>(
  path: string,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => {
  const asGuest = () => {
    const url = `${import.meta.env.VITE_API_URL}${path}`
    return config === undefined ? axios.get<T>(url) : axios.get<T>(url, config)
  }

  if (!localStorage.getItem('access_token')) return asGuest()

  try {
    return config === undefined ? await apiClient.get<T>(path) : await apiClient.get<T>(path, config)
  } catch (error: unknown) {
    if ((error as { response?: { status?: number } } | null)?.response?.status === 401) return asGuest()
    throw error
  }
}
