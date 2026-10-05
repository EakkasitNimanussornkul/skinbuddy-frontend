import { describe, it, expect, afterEach, vi } from 'vitest'

import {
  isUploadedImagePath,
  previewFromFile,
  productImageUrl,
  releasePreview,
  safeImageSrc,
  uploadedImageUrl,
} from '../../utils/safeImages'

const UUID = '0b8f3a2e-1c4d-4e5f-9a6b-7c8d9e0f1a2b'

describe('src/utils/safeImages.ts', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  describe('uploadedImageUrl()', () => {
    it('builds the public address on the product-images bucket for a path the upload routes make', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.example/')

      expect(uploadedImageUrl(`submissions/${UUID}.jpg`)).toBe(
        `https://project.supabase.example/storage/v1/object/public/product-images/submissions/${UUID}.jpg`,
      )
      expect(uploadedImageUrl(`products/${UUID}.webp`)).toMatch(/\/product-images\/products\/0b8f3a2e-1c4d-4e5f-9a6b-7c8d9e0f1a2b\.webp$/)
      expect(uploadedImageUrl(`products/${UUID}.png`)).not.toBeNull()
    })

    it('refuses a path with "../", a javascript: value, an http address and a wrong extension', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.example')

      for (const path of [
        `submissions/../${UUID}.jpg`,
        `../secret/${UUID}.jpg`,
        'javascript:alert(1)',
        `https://evil.example/submissions/${UUID}.jpg`,
        `submissions/${UUID}.gif`,
        `submissions/${UUID}.svg`,
        `submissions/${UUID}.jpg?x=1`,
        `other/${UUID}.jpg`,
        'submissions/------------------------------------.jpg',
        null,
      ]) {
        expect(uploadedImageUrl(path)).toBeNull()
      }
      expect(isUploadedImagePath(`submissions/${UUID}.JPG`)).toBe(false)
    })

    it('builds nothing when the project address is missing or not a web address', () => {
      vi.stubEnv('VITE_SUPABASE_URL', '')
      expect(uploadedImageUrl(`submissions/${UUID}.jpg`)).toBeNull()
      vi.stubEnv('VITE_SUPABASE_URL', 'javascript:alert(1)//')
      expect(uploadedImageUrl(`submissions/${UUID}.jpg`)).toBeNull()
    })
  })

  describe('productImageUrl()', () => {
    it("passes a product's http(s) image_url and refuses anything else", () => {
      expect(productImageUrl('https://cdn.example/cleanser.webp')).toBe('https://cdn.example/cleanser.webp')
      expect(productImageUrl('javascript:alert(1)')).toBeNull()
      expect(productImageUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBeNull()
      expect(productImageUrl(null)).toBeNull()
    })
  })

  describe('previewFromFile(), releasePreview() and safeImageSrc()', () => {
    it('makes a local preview for a picked file, which the image check lets through until it is released', () => {
      const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview-1')
      const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      const file = new File(['x'], 'front.jpg', { type: 'image/jpeg' })

      const url = previewFromFile(file)

      expect(create).toHaveBeenCalledWith(file)
      expect(url).toBe('blob:preview-1')
      expect(safeImageSrc(url)).toBe('blob:preview-1')
      releasePreview(url)
      expect(revoke).toHaveBeenCalledWith('blob:preview-1')
      expect(safeImageSrc(url)).toBeNull()
    })

    it('releases each preview once, and leaves alone a blob: address it did not make', () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview-2')
      const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      const url = previewFromFile(new File(['x'], 'a.png', { type: 'image/png' }))

      releasePreview(url)
      releasePreview(url)
      releasePreview('blob:someone-else')
      releasePreview(null)

      expect(revoke).toHaveBeenCalledTimes(1)
    })

    it('lets an http(s) address through and refuses javascript:, data: and a blob: it did not make', () => {
      expect(safeImageSrc('https://cdn.example/a.webp')).toBe('https://cdn.example/a.webp')
      expect(safeImageSrc('javascript:alert(1)')).toBeNull()
      expect(safeImageSrc('data:image/png;base64,AAAA')).toBeNull()
      expect(safeImageSrc('blob:someone-else')).toBeNull()
      expect(safeImageSrc(`submissions/${UUID}.jpg`)).toBeNull()
      expect(safeImageSrc(null)).toBeNull()
    })
  })
})
