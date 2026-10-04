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
const readList = (data: unknown, key: MetaKey): string[] => {
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

/** Forget every cached list. For tests, and for a screen that must re-read. */
export const clearMetaCache = () => cache.clear()
