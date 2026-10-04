import { describe, it, expect, beforeEach, vi } from 'vitest'

// Protected routes: everything goes through apiClient (which attaches the
// login and opens the login popup on 401). Bare axios is mocked to show it is
// never used for them.
vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}))
vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

import axios from 'axios'
import { apiClient } from '../../api/index'
import { createSubmission, getMySubmissions, uploadSubmissionImage, type SubmissionBody } from '../../api/submissionsApi'

const body: SubmissionBody = {
  name: 'Hydrating Gel Toner',
  brand: 'Example Brand',
  category: 'Toners',
  image_path: null,
  ingredients: [{ ingredient_id: 'i-water' }, { new_name: 'Phytosphingosine' }],
  price_thb: null,
  price_usd: null,
  pao_months: 12,
  benefits: [],
  good_for: [],
  sources: [],
  note: null,
}

describe('src/api/submissionsApi.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('uploadSubmissionImage()', () => {
    it('sends the file as multipart field "file" through apiClient and returns the stored path', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { image_path: 'submissions/abc.jpg', public_url: 'https://cdn.example/submissions/abc.jpg' },
      })
      const file = new File(['x'], 'front.jpg', { type: 'image/jpeg' })

      const uploaded = await uploadSubmissionImage(file)

      const [path, form] = vi.mocked(apiClient.post).mock.calls[0]!
      expect(path).toBe('/submissions/images')
      expect((form as FormData).get('file')).toBe(file)
      expect(uploaded).toEqual({ image_path: 'submissions/abc.jpg', public_url: 'https://cdn.example/submissions/abc.jpg' })
      expect(axios.post).not.toHaveBeenCalled()
    })

    it('fails rather than returning a photo with no path to send', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { public_url: 'https://cdn.example/x.jpg' } })

      await expect(uploadSubmissionImage(new File(['x'], 'a.png', { type: 'image/png' }))).rejects.toThrow()
    })

    it('passes a 413 or 415 refusal through for the form to word', async () => {
      const refusal = { response: { status: 413, data: { detail: 'too large' } } }
      vi.mocked(apiClient.post).mockRejectedValue(refusal)

      await expect(uploadSubmissionImage(new File(['x'], 'a.png', { type: 'image/png' }))).rejects.toBe(refusal)
    })
  })

  describe('createSubmission()', () => {
    it('posts the body exactly as given and reads the created id and status', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 's-1', status: 'pending', created_at: '2026-10-04T10:00:00+00:00' } })

      const created = await createSubmission(body)

      expect(apiClient.post).toHaveBeenCalledWith('/submissions', body)
      expect(created).toEqual({ id: 's-1', status: 'pending', created_at: '2026-10-04T10:00:00+00:00' })
    })
  })

  describe('getMySubmissions()', () => {
    it('reads each submission with its summary, in the order the backend sends (newest first)', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: [
          {
            id: 's-2',
            status: 'approved',
            created_at: '2026-09-28T09:00:00+00:00',
            reviewed_at: '2026-10-01T09:00:00+00:00',
            review_notes: null,
            product_id: 'p-9',
            product_slug: 'example-barrier-cream',
            summary: { name: 'Barrier Repair Cream', brand: 'Example Brand', category: 'Moisturizers', ingredient_count: 12 },
          },
          {
            id: 's-1',
            status: 'rejected',
            created_at: '2026-09-20T09:00:00+00:00',
            reviewed_at: '2026-09-22T09:00:00+00:00',
            review_notes: 'Already in the catalogue.',
            product_id: null,
            product_slug: null,
            summary: { name: 'Hydrating Facial Cleanser', brand: 'CeraVe', category: 'Cleansers', ingredient_count: 1 },
          },
        ],
      })

      const rows = await getMySubmissions()

      expect(apiClient.get).toHaveBeenCalledWith('/submissions/mine')
      expect(rows.map((r) => r.id)).toEqual(['s-2', 's-1'])
      expect(rows[0]!.product_slug).toBe('example-barrier-cream')
      expect(rows[1]!.review_notes).toBe('Already in the catalogue.')
      expect(rows[1]!.summary).toEqual({ name: 'Hydrating Facial Cleanser', brand: 'CeraVe', category: 'Cleansers', ingredient_count: 1 })
    })

    it('reads missing fields as empty rather than breaking, and drops a row with no id', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: 's-3' }, { status: 'pending' }] })

      const rows = await getMySubmissions()

      expect(rows).toEqual([
        {
          id: 's-3',
          status: 'pending',
          created_at: null,
          reviewed_at: null,
          review_notes: null,
          product_id: null,
          product_slug: null,
          summary: { name: '', brand: '', category: '', ingredient_count: null },
        },
      ])
    })

    it('reads an answer that is not a list as no submissions', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { detail: 'odd' } })

      await expect(getMySubmissions()).resolves.toEqual([])
    })
  })
})
