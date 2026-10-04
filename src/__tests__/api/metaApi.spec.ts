import { describe, it, expect, beforeEach, vi } from 'vitest'

// No network. apiClient is mocked too, so a case can show it is never used:
// these are public routes, and a stale login must not open the login popup.
vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn() },
}))
vi.mock('axios', () => ({
  default: { get: vi.fn() },
}))

import axios from 'axios'
import { apiClient } from '../../api/index'
import { clearMetaCache, getCategories, getConcernTags, getFunctionalGroups } from '../../api/metaApi'

const BASE = import.meta.env.VITE_API_URL

describe('src/api/metaApi.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearMetaCache()
    localStorage.clear()
  })

  describe('getCategories() / getConcernTags() / getFunctionalGroups()', () => {
    it('reads each list from its own public route, with no login attached even when one is stored', async () => {
      localStorage.setItem('access_token', 'token-1')
      vi.mocked(axios.get).mockImplementation(async (url: string) => {
        if (url.endsWith('/meta/categories')) return { data: { categories: ['Cleansers', 'Toners'] } }
        if (url.endsWith('/meta/concern-tags')) return { data: { concern_tags: ['Dry skin'] } }
        return { data: { functional_groups: ['Humectant'] } }
      })

      await expect(getCategories()).resolves.toEqual(['Cleansers', 'Toners'])
      await expect(getConcernTags()).resolves.toEqual(['Dry skin'])
      await expect(getFunctionalGroups()).resolves.toEqual(['Humectant'])
      expect(vi.mocked(axios.get).mock.calls.map((c) => c[0])).toEqual([
        `${BASE}/meta/categories`,
        `${BASE}/meta/concern-tags`,
        `${BASE}/meta/functional-groups`,
      ])
      expect(apiClient.get).not.toHaveBeenCalled()
    })

    it('asks once and serves the cached list after that, even to two callers at once', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: { categories: ['Serums'] } })

      const [a, b] = await Promise.all([getCategories(), getCategories()])
      const c = await getCategories()

      expect([a, b, c]).toEqual([['Serums'], ['Serums'], ['Serums']])
      expect(axios.get).toHaveBeenCalledTimes(1)
    })

    it('does not cache a failure, so trying again asks again', async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network Error'))
      vi.mocked(axios.get).mockResolvedValueOnce({ data: { categories: ['Masks'] } })

      await expect(getCategories()).rejects.toThrow('Network Error')
      await expect(getCategories()).resolves.toEqual(['Masks'])
      expect(axios.get).toHaveBeenCalledTimes(2)
    })

    it('reads an older or odd answer as an empty list, keeping only text entries', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({ data: {} })
      await expect(getCategories()).resolves.toEqual([])

      vi.mocked(axios.get).mockResolvedValueOnce({ data: { concern_tags: ['Oily', 3, null, '', 'Redness'] } })
      await expect(getConcernTags()).resolves.toEqual(['Oily', 'Redness'])
    })
  })
})
