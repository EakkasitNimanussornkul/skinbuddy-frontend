import { describe, it, expect, beforeEach, vi } from 'vitest'

// Admin routes: everything goes through apiClient (401 opens the login popup,
// 403 is the page's own state). Bare axios is mocked to show it is never used.
vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))
vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

import axios from 'axios'
import { apiClient } from '../../api/index'
import {
  approveSubmission,
  editAdminSubmission,
  getAdminQueue,
  getAdminSubmission,
  readCandidates,
  rejectSubmission,
} from '../../api/submissionsApi'
import { updateProduct, uploadProductPhoto } from '../../api/productAdminApi'

const detailBody = {
  id: 'sub-1',
  status: 'pending',
  created_at: '2026-10-01T08:00:00+00:00',
  updated_at: '2026-10-02T08:00:00.123456+00:00',
  submitter_name: 'Nok',
  reviewed_at: null,
  review_notes: null,
  product_id: null,
  has_edits: true,
  submission: { name: 'Hydrating Facial Cleanser', brand: 'CeraVe', ingredients: [{ ingredient_id: 'i-1' }] },
  duplicate_candidates: [{ id: 'p-1', slug: 'cerave-hydrating', brand: 'CeraVe', name: 'Hydrating Cleanser', exact: false }],
  ingredients: [
    { position: 0, ingredient_id: 'i-1', name: 'Water', status: 'known', details: null, existing_matches: [] },
    {
      position: 1,
      ingredient_id: null,
      name: 'Phytosphingosine',
      status: 'new',
      details: { roles: ['Barrier support'], known_for: 'Supports the skin barrier' },
      existing_matches: [{ id: 'i-9', name: 'Phytosphingosine' }],
    },
  ],
}

describe('src/api/submissionsApi.ts and src/api/productAdminApi.ts (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAdminQueue()', () => {
    it('asks GET /submissions/admin for one status through apiClient and reads the counts and rows', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          counts: { pending: 2, approved: 1, rejected: 0 },
          submissions: [
            {
              id: 's-1',
              status: 'pending',
              created_at: '2026-10-01T08:00:00Z',
              submitter_name: 'Nok',
              summary: { name: 'Toner', brand: 'Brand', category: 'Toners', ingredient_count: 7 },
              flags: { possible_duplicate: true, new_ingredient_count: 1, has_source: false, has_photo: true },
            },
          ],
        },
      })

      const queue = await getAdminQueue('approved')

      expect(apiClient.get).toHaveBeenCalledWith('/submissions/admin', { params: { status: 'approved' } })
      expect(queue.counts).toEqual({ pending: 2, approved: 1, rejected: 0 })
      expect(queue.submissions[0]).toMatchObject({
        id: 's-1',
        submitter_name: 'Nok',
        flags: { possible_duplicate: true, new_ingredient_count: 1, has_source: false, has_photo: true },
      })
      expect(axios.get).not.toHaveBeenCalled()
    })

    it('reads a missing or odd answer as zero counts and no rows, never as an error', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { counts: { pending: 'x' }, submissions: [{ nope: 1 }] } })

      const queue = await getAdminQueue()

      expect(apiClient.get).toHaveBeenCalledWith('/submissions/admin', { params: { status: 'pending' } })
      expect(queue).toEqual({ counts: { pending: 0, approved: 0, rejected: 0 }, submissions: [] })
    })
  })

  describe('getAdminSubmission()', () => {
    it('reads the detail with exact on candidates and existing_matches on ingredients, keeping updated_at as sent', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: detailBody })

      const detail = await getAdminSubmission('sub-1')

      expect(apiClient.get).toHaveBeenCalledWith('/submissions/admin/sub-1')
      expect(detail.updated_at).toBe('2026-10-02T08:00:00.123456+00:00')
      expect(detail.duplicate_candidates).toEqual([{ id: 'p-1', slug: 'cerave-hydrating', brand: 'CeraVe', name: 'Hydrating Cleanser', exact: false }])
      expect(detail.ingredients[1]).toEqual({
        position: 1,
        ingredient_id: null,
        name: 'Phytosphingosine',
        status: 'new',
        details: { roles: ['Barrier support'], known_for: 'Supports the skin barrier', source_url: null },
        existing_matches: [{ id: 'i-9', name: 'Phytosphingosine' }],
      })
      expect(detail.has_edits).toBe(true)
    })

    it('treats an ingredient marked known but with no id as new, so it still gets a decision', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { ...detailBody, ingredients: [{ position: 0, ingredient_id: null, name: 'Niacimide', status: 'known' }] },
      })

      const detail = await getAdminSubmission('sub-1')

      expect(detail.ingredients[0]!.status).toBe('new')
      expect(detail.ingredients[0]!.existing_matches).toEqual([])
    })
  })

  describe('editAdminSubmission(), approveSubmission() and rejectSubmission()', () => {
    it('sends the corrections to PATCH /submissions/admin/{id} as given and reads the detail it answers', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: detailBody })

      const detail = await editAdminSubmission('sub-1', { name: 'Hydrating Facial Cleanser 473 ml' })

      expect(apiClient.patch).toHaveBeenCalledWith('/submissions/admin/sub-1', { name: 'Hydrating Facial Cleanser 473 ml' })
      expect(detail.id).toBe('sub-1')
    })

    it('posts the approve body unchanged and returns the new product slug', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { product_id: 'p-9', slug: 'cerave-new' } })
      const body = { publish_benefits: ['Hydrates'], publish_good_for: [], publish_source_urls: [], new_ingredients: [] }

      const done = await approveSubmission('sub-1', body)

      expect(apiClient.post).toHaveBeenCalledWith('/submissions/admin/sub-1/approve', body)
      expect(done).toEqual({ product_id: 'p-9', slug: 'cerave-new' })
    })

    it('refuses an approve answer with no slug, since the page has nowhere to go', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { product_id: 'p-9' } })

      await expect(
        approveSubmission('sub-1', { publish_benefits: [], publish_good_for: [], publish_source_urls: [], new_ingredients: [] }),
      ).rejects.toThrow('slug')
    })

    it('posts the review note to reject, or null for none', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: {} })

      await rejectSubmission('sub-1', 'Already in the catalogue')
      await rejectSubmission('sub-1', null)

      expect(vi.mocked(apiClient.post).mock.calls).toEqual([
        ['/submissions/admin/sub-1/reject', { review_notes: 'Already in the catalogue' }],
        ['/submissions/admin/sub-1/reject', { review_notes: null }],
      ])
    })
  })

  describe('readCandidates()', () => {
    it('marks a 409 answer\'s candidates exact when asked, since approve refused because of them', () => {
      expect(readCandidates([{ id: 'p-1', slug: 's', brand: 'B', name: 'N' }, { slug: 'no-id' }], true)).toEqual([
        { id: 'p-1', slug: 's', brand: 'B', name: 'N', exact: true },
      ])
    })
  })

  describe('updateProduct() and uploadProductPhoto()', () => {
    it('sends the PATCH body to /products/{id} as given, with updated_at untouched, and returns the new slug', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: { id: 'p-1', slug: 'cerave-renamed', updated_at: '2026-10-05T01:02:03.654321+00:00' },
      })
      const body = { updated_at: '2026-10-04T07:26:19.406488+00:00', name: 'Renamed' }

      const result = await updateProduct('p-1', body)

      expect(apiClient.patch).toHaveBeenCalledWith('/products/p-1', body)
      expect(vi.mocked(apiClient.patch).mock.calls[0]![1]).toMatchObject({ updated_at: '2026-10-04T07:26:19.406488+00:00' })
      expect(result.slug).toBe('cerave-renamed')
      expect(result.updated_at).toBe('2026-10-05T01:02:03.654321+00:00')
      expect(axios.patch).not.toHaveBeenCalled()
    })

    it('uploads the photo as multipart field "file" to /products/{id}/image and returns its image_path', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { image_path: 'products/abc.webp', public_url: 'https://cdn/p.webp' } })
      const file = new File(['x'], 'front.webp', { type: 'image/webp' })

      const uploaded = await uploadProductPhoto('p-1', file)

      const [path, form] = vi.mocked(apiClient.post).mock.calls[0]!
      expect(path).toBe('/products/p-1/image')
      expect((form as FormData).get('file')).toBe(file)
      expect(uploaded).toEqual({ image_path: 'products/abc.webp', public_url: 'https://cdn/p.webp' })
    })
  })
})
