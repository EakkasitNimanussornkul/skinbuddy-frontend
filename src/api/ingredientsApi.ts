import axios from 'axios'

/**
 * The ingredient picker's two public routes (backend as-built, 2026-10-04).
 * Both use the backend's shared name normaliser, so "aqua" finds Water here
 * exactly as approve will later link it.
 *
 * Public, so plain requests with no login - for the same reason as
 * api/metaApi.ts.
 */

export interface IngredientHit {
  id: string
  name: string
  functional_group: string | null
  /** The alias key that matched ("aqua"), when the hit came only through the alias map. */
  matched_alias: string | null
}

/**
 * One pasted name, matched. `id: null` with `ambiguous: false` is a new
 * ingredient; `ambiguous: true` (also id null) means the name keys to more than
 * one row, and approve would refuse to pick one (SBAMB) - so the user picks.
 */
export interface IngredientMatch {
  input: string
  id: string | null
  name: string | null
  matched_alias: string | null
  ambiguous: boolean
}

/** The backend's bounds: q is 1-60 characters, limit 1-20, at most 100 names of 300 each. */
export const SEARCH_MAX_LENGTH = 60
export const SEARCH_MAX_LIMIT = 20
export const MATCH_MAX_NAMES = 100
export const MATCH_MAX_NAME_LENGTH = 300

const text = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null)

const readHit = (value: unknown): IngredientHit | null => {
  const row = value as Record<string, unknown> | null
  const id = text(row?.id)
  const name = text(row?.name)
  if (!id || !name) return null
  return { id, name, functional_group: text(row?.functional_group), matched_alias: text(row?.matched_alias) }
}

const readMatch = (value: unknown, input: string): IngredientMatch => {
  const row = value as Record<string, unknown> | null
  const id = text(row?.id)
  return {
    input: text(row?.input) ?? input,
    id,
    name: id ? text(row?.name) : null,
    matched_alias: text(row?.matched_alias),
    // An id wins: a row that names one is a match, whatever else it says.
    ambiguous: !id && row?.ambiguous === true,
  }
}

/**
 * Search our ingredient list. An empty query asks nothing and finds nothing;
 * a long one is cut to what the backend accepts rather than sent for a 422.
 */
export const searchIngredients = async (q: string, limit = 8): Promise<IngredientHit[]> => {
  const query = q.trim().slice(0, SEARCH_MAX_LENGTH)
  if (!query) return []
  const safeLimit = Math.min(SEARCH_MAX_LIMIT, Math.max(1, Math.round(limit)))

  const response = await axios.get(`${import.meta.env.VITE_API_URL}/ingredients/search`, {
    params: { q: query, limit: safeLimit },
  })
  const results = (response.data as { results?: unknown } | null)?.results
  return Array.isArray(results) ? results.map(readHit).filter((hit): hit is IngredientHit => hit !== null) : []
}

/**
 * Match a pasted list, in order. The caller keeps to MATCH_MAX_NAMES; this
 * refuses more rather than quietly dropping the tail of someone's list.
 */
export const matchIngredients = async (names: string[]): Promise<IngredientMatch[]> => {
  if (names.length === 0) return []
  if (names.length > MATCH_MAX_NAMES) {
    throw new RangeError(`At most ${MATCH_MAX_NAMES} names can be matched at once`)
  }

  const response = await axios.post(`${import.meta.env.VITE_API_URL}/ingredients/match`, { names })
  const matches = (response.data as { matches?: unknown } | null)?.matches
  const list = Array.isArray(matches) ? matches : []
  // In input order, one per name. A shorter answer leaves the rest as new
  // rather than shifting every match onto the wrong name.
  return names.map((name, index) => readMatch(list[index], name))
}

/**
 * Split a pasted ingredient list into names: on commas and new lines, but not
 * on a comma inside brackets ("Parfum (Fragrance, Aroma)" stays one name).
 * Drops a leading "Ingredients:" label, a closing full stop and empty pieces,
 * and keeps the first of any repeat.
 */
export const splitIngredientList = (pasted: string): string[] => {
  const body = pasted.replace(/^\s*ingredients\s*:\s*/i, '')
  const pieces: string[] = []
  let depth = 0
  let current = ''
  for (const char of body) {
    if (char === '(' || char === '[') depth += 1
    if ((char === ')' || char === ']') && depth > 0) depth -= 1
    if (char === '\n' || char === '\r') {
      // A new line always ends a name, and an unclosed bracket ends with it,
      // so one typo cannot swallow the rest of the list.
      pieces.push(current)
      current = ''
      depth = 0
    } else if (char === ',' && depth === 0) {
      pieces.push(current)
      current = ''
    } else {
      current += char
    }
  }
  pieces.push(current)

  const seen = new Set<string>()
  const names: string[] = []
  for (const piece of pieces) {
    const name = piece.trim().replace(/\.+$/, '').trim()
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    names.push(name)
  }
  return names
}
