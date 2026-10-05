import { isHttpUrl } from './safeLinks'

/**
 * Where a submission or product photo shown on the submit, review and edit
 * screens may come from. No other string is ever bound into an <img :src>:
 *
 *   1. the public address built from an image_path the upload routes create
 *      ("submissions/<uuid>.jpg", "products/<uuid>.webp"), on our own bucket;
 *   2. a product's image_url as the API sends it, when it is http(s);
 *   3. a local object URL for a file the user has just picked, made here and
 *      released here when it is replaced or the screen closes.
 *
 * A submitted image_path is the sender's text as far as the review screen
 * knows, so it is checked against the upload shape before any address is made
 * from it: a path with "../", a full http address, a javascript: value or
 * another file type shows no photo rather than a guessed one.
 */

export const UPLOADED_IMAGE_PATH = /^(submissions|products)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/

export const isUploadedImagePath = (path: unknown): path is string =>
  typeof path === 'string' && UPLOADED_IMAGE_PATH.test(path)

const BUCKET = 'product-images'

/**
 * The public address of an uploaded photo, built the way Supabase builds it
 * (backend image_upload.public_url; the bucket is public). Null for any path
 * the upload routes would not have made, or when the project URL is not set.
 */
export const uploadedImageUrl = (path: string | null | undefined): string | null => {
  const base = import.meta.env.VITE_SUPABASE_URL
  if (!isUploadedImagePath(path) || typeof base !== 'string' || !isHttpUrl(base)) return null
  return `${base.replace(/\/+$/, '')}/storage/v1/object/public/${BUCKET}/${path}`
}

/** A product's image_url from the API, when it is an http(s) address. */
export const productImageUrl = (value: unknown): string | null =>
  typeof value === 'string' && isHttpUrl(value) ? value.trim() : null

// Object URLs made here, so the <img> check can tell ours from any other
// blob: string, and each is released exactly once.
const localPreviews = new Set<string>()

/** A local preview of a picked file; null where the browser cannot make one. */
export const previewFromFile = (file: Blob): string | null => {
  if (typeof URL.createObjectURL !== 'function') return null
  const url = URL.createObjectURL(file)
  localPreviews.add(url)
  return url
}

/** Let go of a preview made by previewFromFile; anything else is left alone. */
export const releasePreview = (url: string | null | undefined) => {
  if (!url || !localPreviews.has(url)) return
  localPreviews.delete(url)
  if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url)
}

/**
 * The last check before a value reaches :src: a live preview made here, or an
 * http(s) address (which is all the two builders above return). Null otherwise.
 */
export const safeImageSrc = (value: string | null | undefined): string | null => {
  if (!value) return null
  if (localPreviews.has(value)) return value
  return isHttpUrl(value) ? value.trim() : null
}
