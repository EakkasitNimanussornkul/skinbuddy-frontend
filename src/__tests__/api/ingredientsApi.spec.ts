import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}))
vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

import axios from 'axios'
import { apiClient } from '../../api/index'
import { matchIngredients, searchIngredients, splitIngredientList } from '../../api/ingredientsApi'

const BASE = import.meta.env.VITE_API_URL

describe('src/api/ingredientsApi.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('searchIngredients()', () => {
    it('asks the public search route with the trimmed query and the limit, and reads each hit', async () => {
      localStorage.setItem('access_token', 'token-1')
      vi.mocked(axios.get).mockResolvedValue({
        data: {
          results: [
            { id: 'i-1', name: 'Niacinamide', functional_group: 'Vitamin B3', matched_alias: null },
            { id: 'i-2', name: 'Water', functional_group: null, matched_alias: 'aqua' },
          ],
        },
      })

      const hits = await searchIngredients('  nia ', 5)

      expect(axios.get).toHaveBeenCalledWith(`${BASE}/ingredients/search`, { params: { q: 'nia', limit: 5 } })
      expect(apiClient.get).not.toHaveBeenCalled()
      expect(hits).toEqual([
        { id: 'i-1', name: 'Niacinamide', functional_group: 'Vitamin B3', matched_alias: null },
        { id: 'i-2', name: 'Water', functional_group: null, matched_alias: 'aqua' },
      ])
    })

    it('sends nothing for a blank query, and finds nothing', async () => {
      await expect(searchIngredients('   ')).resolves.toEqual([])
      expect(axios.get).not.toHaveBeenCalled()
    })

    it('keeps the query and limit inside what the backend accepts rather than sending them for a 422', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: { results: [] } })

      await searchIngredients('x'.repeat(80), 50)
      await searchIngredients('gly', 0)

      const [first, second] = vi.mocked(axios.get).mock.calls.map((c) => (c[1] as { params: { q: string; limit: number } }).params)
      expect(first!.q).toHaveLength(60)
      expect(first!.limit).toBe(20)
      expect(second!.limit).toBe(1)
    })

    it('drops a hit with no id or name instead of offering a row that cannot be sent', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: { results: [{ id: 'i-1' }, { name: 'Ghost' }, { id: 'i-2', name: 'Glycerin' }] } })

      await expect(searchIngredients('gly')).resolves.toEqual([
        { id: 'i-2', name: 'Glycerin', functional_group: null, matched_alias: null },
      ])
    })
  })

  describe('matchIngredients()', () => {
    it('posts the names to the public match route and keeps the answers in input order', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: {
          matches: [
            { input: 'Aqua', id: 'i-water', name: 'Water', matched_alias: 'aqua', ambiguous: false },
            { input: 'Zz New', id: null, name: null, matched_alias: null, ambiguous: false },
            { input: 'Vitamin C', id: null, name: null, matched_alias: null, ambiguous: true },
          ],
        },
      })

      const matches = await matchIngredients(['Aqua', 'Zz New', 'Vitamin C'])

      expect(axios.post).toHaveBeenCalledWith(`${BASE}/ingredients/match`, { names: ['Aqua', 'Zz New', 'Vitamin C'] })
      expect(apiClient.post).not.toHaveBeenCalled()
      expect(matches.map((m) => [m.input, m.id, m.ambiguous])).toEqual([
        ['Aqua', 'i-water', false],
        ['Zz New', null, false],
        ['Vitamin C', null, true],
      ])
    })

    it('reads a missing answer for a name as new, without shifting the others onto the wrong name', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: { matches: [{ input: 'Glycerin', id: 'i-gly', name: 'Glycerin' }] } })

      const matches = await matchIngredients(['Glycerin', 'Panthenol'])

      expect(matches[1]).toEqual({ input: 'Panthenol', id: null, name: null, matched_alias: null, ambiguous: false })
    })

    it('treats a row that names an id as a match even if it also says ambiguous', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: { matches: [{ input: 'X', id: 'i-x', name: 'X', ambiguous: true }] } })

      await expect(matchIngredients(['X'])).resolves.toMatchObject([{ id: 'i-x', ambiguous: false }])
    })

    it('refuses more than 100 names instead of quietly dropping the end of the list', async () => {
      const names = Array.from({ length: 101 }, (_, i) => `Ingredient ${i}`)

      await expect(matchIngredients(names)).rejects.toThrow(RangeError)
      expect(axios.post).not.toHaveBeenCalled()
    })
  })

  describe('splitIngredientList()', () => {
    it('splits on commas and new lines, trimming each name and dropping empties', () => {
      expect(splitIngredientList('Water, Glycerin,\nNiacinamide\r\n\n, Panthenol')).toEqual([
        'Water',
        'Glycerin',
        'Niacinamide',
        'Panthenol',
      ])
    })

    it('keeps a comma inside brackets as part of one name', () => {
      expect(splitIngredientList('Water (Aqua), Parfum (Fragrance, Aroma), Glycerin')).toEqual([
        'Water (Aqua)',
        'Parfum (Fragrance, Aroma)',
        'Glycerin',
      ])
    })

    it('drops an "Ingredients:" label, a closing full stop and repeats', () => {
      expect(splitIngredientList('Ingredients: Water, Glycerin, water, Allantoin.')).toEqual(['Water', 'Glycerin', 'Allantoin'])
    })

    it('ends an unclosed bracket at the line end, so one typo cannot swallow the rest of the list', () => {
      expect(splitIngredientList('Extract (Leaf, Root\nGlycerin, Water')).toEqual(['Extract (Leaf, Root', 'Glycerin', 'Water'])
    })
  })
})
