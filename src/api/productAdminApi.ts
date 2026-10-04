import { apiClient } from './index'
import type { ProductSourceClaim } from './sources'
import type { PaoMonths, UploadedImage } from './submissionsApi'

/**
 * An admin's edit of a product (backend as-built, 2026-10-04): PATCH
 * /products/{id} and POST /products/{id}/image.
 *
 * Admin routes, so apiClient: 401 means sign in again, 403 means not an admin.
 * Kept out of api/products.ts on purpose - the product reads there are
 * optional-auth and go through the guest fallback, which an admin write must
 * never do.
 */

/** The backend's limits on PATCH /products/{id}. */
export const PRODUCT_EDIT_LIMITS = {
  name: 200,
  brand: 200,
  description: 2000,
  benefits: 8,
  benefit: 80,
  ingredients: 100,
  newName: 120,
  sources: 10,
  sourceTitle: 120,
  publisher: 200,
} as const

/** The source types the sources table accepts (backend SOURCE_TYPES). */
export const SOURCE_TYPES = [
  'regulatory_register',
  'safety_review',
  'chemical_database',
  'peer_reviewed',
  'reference_book',
  'product_database',
] as const

export type ProductIngredientRef = { ingredient_id: string } | { new_name: string }

export interface ProductSourceInput {
  url: string
  title: string
  publisher?: string
  source_type?: string
  claims: ProductSourceClaim[]
}

/**
 * The PATCH body: `updated_at` is required and must be the string the product
 * was loaded with, exactly - it carries microseconds, and anything rebuilt from
 * a JS Date answers 409 "stale". Every other field is sent only when changed.
 * `ingredients` and `sources` replace the whole list, in the order given.
 */
export interface ProductPatch {
  updated_at: string
  name?: string
  brand?: string
  category?: string
  description?: string | null
  price_thb?: number | null
  price_usd?: number | null
  pao_months?: PaoMonths | null
  image_path?: string | null
  benefits?: string[]
  good_for?: string[]
  ingredients?: ProductIngredientRef[]
  sources?: ProductSourceInput[]
}

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim().length > 0 ? value : null)

/**
 * Save an edit. Answers the product as GET /products/{id} reads it, plus the
 * new `slug` (it changes with the brand or name, and the old one no longer
 * resolves) and the new `updated_at` for the next save.
 */
export const updateProduct = async (
  productId: string,
  body: ProductPatch,
): Promise<{ product: Record<string, unknown>; slug: string; updated_at: string | null }> => {
  const response = await apiClient.patch(`/products/${encodeURIComponent(productId)}`, body)
  const data = (response.data && typeof response.data === 'object' ? response.data : {}) as Record<string, unknown>
  const slug = text(data.slug)
  if (!slug) throw new Error('The save answered without a slug')
  return { product: data, slug, updated_at: text(data.updated_at) }
}

/**
 * Store a new photo for a product. It does not change the product: the
 * returned image_path goes into the next PATCH. 413 over 5 MB, 415 for
 * anything but JPG, PNG or WebP.
 */
export const uploadProductPhoto = async (productId: string, file: File): Promise<UploadedImage> => {
  const form = new FormData()
  form.append('file', file)
  const response = await apiClient.post(`/products/${encodeURIComponent(productId)}/image`, form)
  const data = response.data as Record<string, unknown> | null
  const imagePath = text(data?.image_path)
  if (!imagePath) throw new Error('The upload answered without an image_path')
  return { image_path: imagePath, public_url: text(data?.public_url) }
}
