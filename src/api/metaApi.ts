import axios from 'axios'

/**
 * The fixed lists the backend serves for the submission and review forms
 * (backend as-built, 2026-10-04): GET /meta/categories, /meta/concern-tags and
 * /meta/functional-groups. The backend validates against the same lists, so the
 * forms offer exactly what the API accepts; nothing here hardcodes a copy.
 *
 * Public routes, so a plain request with no login: a stale stored login has
 * nothing to do with them and must not open the login popup (apiClient's
 * interceptor would). Not the guest-fallback helper either: that one is for
 * the optional-auth product routes only.
 *
 * Each list is cached in memory for the session, as a promise so two screens
 * asking at once share one request. A failure is not cached, so a retry asks
 * again.
 */

type MetaKey = 'categories' | 'concern_tags' | 'functional_groups'

const PATHS: Record<MetaKey, string> = {
  categories: '/meta/categories',
  concern_tags: '/meta/concern-tags',
  functional_groups: '/meta/functional-groups',
}

const cache = new Map<MetaKey, Promise<string[]>>()

/** The list under `key`, keeping only strings; an older or odd answer reads as empty. */
const readList = (data: unknown, key: string): string[] => {
  const list = (data as Record<string, unknown> | null | undefined)?.[key]
  return Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string' && item.length > 0) : []
}

const load = (key: MetaKey): Promise<string[]> => {
  const cached = cache.get(key)
  if (cached) return cached

  const request = axios
    .get(`${import.meta.env.VITE_API_URL}${PATHS[key]}`)
    .then((response) => readList(response.data, key))
  cache.set(key, request)
  request.catch(() => cache.delete(key))
  return request
}

export const getCategories = (): Promise<string[]> => load('categories')
export const getConcernTags = (): Promise<string[]> => load('concern_tags')
export const getFunctionalGroups = (): Promise<string[]> => load('functional_groups')

/**
 * GET /meta/facets: the categories and brands that have at least one product,
 * and the product total. Explore's filter chips come from it, so they do not
 * change as pages of products load. Public and cached like the lists above; a
 * failure (an older backend answers 404) is thrown for the page to fall back
 * on, and is not cached. A reply that is not an object reads as null.
 */
export interface Facets {
  categories: string[]
  brands: string[]
  total: number | null
}

let facetsRequest: Promise<Facets | null> | null = null

export const getFacets = (): Promise<Facets | null> => {
  if (facetsRequest) return facetsRequest

  const request = axios.get(`${import.meta.env.VITE_API_URL}/meta/facets`).then((response) => {
    const data = response.data as Record<string, unknown> | null | undefined
    if (!data || typeof data !== 'object') return null
    return {
      categories: readList(data, 'categories'),
      brands: readList(data, 'brands'),
      total: typeof data.total === 'number' ? data.total : null,
    }
  })
  facetsRequest = request
  request.catch(() => { if (facetsRequest === request) facetsRequest = null })
  return request
}

/** Forget every cached list. For tests, and for a screen that must re-read. */
export const clearMetaCache = () => {
  cache.clear()
  facetsRequest = null
}

export interface PolicyVersions {
  terms_version: string | null
  health_version: string | null
}

/**
 * The version the Privacy Policy and Terms pages show when the backend cannot
 * say. It must match TERMS_VERSION in the backend's app/core/consent.py; bump
 * both together.
 */
export const POLICY_VERSION_FALLBACK = '2026-10-06'

const versionText = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null)

/**
 * GET /meta/policy-versions: the current terms and health consent versions,
 * for the policy pages to show. Public, so a plain request like the lists
 * above; not cached, and a failure is thrown for the page to fall back on.
 * Only for showing: the consent screens post the versions from GET /auth/me.
 */
export const getPolicyVersions = async (): Promise<PolicyVersions> => {
  const response = await axios.get(`${import.meta.env.VITE_API_URL}/meta/policy-versions`)
  const data = response.data as Record<string, unknown> | null | undefined
  return { terms_version: versionText(data?.terms_version), health_version: versionText(data?.health_version) }
}
