import { describe, it, expect } from 'vitest'
import type { ApiProblem } from '../../api/apiProblem'
import {
  buildProductPatch,
  checkSourceLink,
  cloneForm,
  formFromProduct,
  loadedUpdatedAt,
  photoUploadMessage,
  productChanges,
  readEditProblem,
  removeClaimSource,
  setClaimSource,
  sourceForClaim,
  sourcesFromProduct,
  sourcesWithoutLink,
  validateProductForm,
} from '../../components/Submissions/productEdit'

const UPDATED_AT = '2026-10-04T07:26:19.406488+00:00'

const product = {
  id: 'p-1',
  slug: 'cerave-hydrating-facial-cleanser',
  brand: 'CeraVe',
  name: 'Hydrating Facial Cleanser',
  category: 'Cleansers',
  description: 'A daily face wash.',
  price_thb: 450,
  price_usd: 15,
  pao_months: 12,
  image_url: 'https://cdn.example/cleanser.webp',
  benefits: ['Cleanses without stripping'],
  good_for: ['Dry skin', 'Sensitive'],
  updated_at: UPDATED_AT,
  product_ingredients: [
    { ingredients: { id: 'i-water', name: 'Water', functional_group: 'Solvent' } },
    { ingredients: { id: 'i-gly', name: 'Glycerin', functional_group: 'Humectant' } },
    { ingredients: null },
  ],
  product_sources: [
    { claim: 'listing', sources: { id: 's-obf', title: 'Open Beauty Facts product page', url: 'https://world.openbeautyfacts.org/p/1', source_type: 'product_database', publisher: 'Open Beauty Facts' } },
    { claim: 'image', sources: { id: 's-obf', title: 'Open Beauty Facts product page', url: 'https://world.openbeautyfacts.org/p/1', source_type: 'product_database', publisher: 'Open Beauty Facts' } },
    { claim: 'function', sources: { id: 's-x', title: 'Not a product claim', url: 'https://x.example' } },
  ],
}

const problem = (p: Partial<ApiProblem>): ApiProblem => ({ status: 422, detail: null, code: null, details: null, fields: [], ...p })

describe('src/components/Submissions/productEdit.ts', () => {
  describe('formFromProduct() and loadedUpdatedAt()', () => {
    it('keeps updated_at as the exact string read, microseconds and offset included', () => {
      expect(loadedUpdatedAt(product)).toBe(UPDATED_AT)
      expect(loadedUpdatedAt({ updated_at: 1700000000 })).toBeNull()
    })

    it('reads the product into the form, ingredients in pack order and skipping an empty join', () => {
      const form = formFromProduct(product)
      expect(form).toMatchObject({
        name: 'Hydrating Facial Cleanser',
        brand: 'CeraVe',
        priceThb: '450',
        priceUsd: '15',
        paoMonths: 12,
        photo: { kind: 'current', url: 'https://cdn.example/cleanser.webp' },
        goodFor: ['Dry skin', 'Sensitive'],
        benefits: ['Cleanses without stripping'],
      })
      expect(form.ingredients.map((i) => i.id)).toEqual(['i-water', 'i-gly'])
    })

    it('groups the source rows into one source per link, with every fact it backs', () => {
      const sources = sourcesFromProduct(product)
      expect(sources).toHaveLength(1)
      expect(sources[0]).toMatchObject({ url: 'https://world.openbeautyfacts.org/p/1', claims: ['listing', 'image'], sourceType: 'product_database' })
    })
  })

  describe('productChanges() and buildProductPatch()', () => {
    it('finds no changes in an untouched form', () => {
      const before = formFromProduct(product)
      expect(productChanges(before, cloneForm(before))).toEqual({})
    })

    it('sends only the changed fields, with the loaded updated_at first and untouched', () => {
      const before = formFromProduct(product)
      const now = { ...cloneForm(before), description: ' A gentle daily face wash. ' }
      const patch = buildProductPatch(UPDATED_AT, productChanges(before, now))
      expect(patch).toEqual({ updated_at: UPDATED_AT, description: 'A gentle daily face wash.' })
      expect(Object.keys(patch)[0]).toBe('updated_at')
    })

    it('sends a cleared description and price as null', () => {
      const before = formFromProduct(product)
      expect(productChanges(before, { ...cloneForm(before), description: '  ', priceUsd: '' })).toEqual({ description: null, price_usd: null })
    })

    it('sends a new photo by its upload path, and a removed one as null', () => {
      const before = formFromProduct(product)
      expect(productChanges(before, { ...cloneForm(before), photo: { kind: 'new', imagePath: 'products/a.webp', previewUrl: null } })).toEqual({ image_path: 'products/a.webp' })
      expect(productChanges(before, { ...cloneForm(before), photo: { kind: 'none' } })).toEqual({ image_path: null })
    })

    it('replaces the ingredients in the order listed, a typed name as {new_name}', () => {
      const before = formFromProduct(product)
      const now = cloneForm(before)
      now.ingredients = [now.ingredients[1]!, { key: 'k', id: null, name: ' Phytosphingosine ', functionalGroup: null }, now.ingredients[0]!]
      expect(productChanges(before, now).ingredients).toEqual([{ ingredient_id: 'i-gly' }, { new_name: 'Phytosphingosine' }, { ingredient_id: 'i-water' }])
    })

    it('counts a reorder alone as a change to the ingredients', () => {
      const before = formFromProduct(product)
      const now = cloneForm(before)
      now.ingredients.reverse()
      expect(Object.keys(productChanges(before, now))).toEqual(['ingredients'])
    })

    it('compares concerns as a set, so ticking them in another order is no change', () => {
      const before = formFromProduct(product)
      expect(productChanges(before, { ...cloneForm(before), goodFor: ['Sensitive', 'Dry skin'] })).toEqual({})
      expect(productChanges(before, { ...cloneForm(before), goodFor: ['Sensitive'] })).toEqual({ good_for: ['Sensitive'] })
    })

    it('sends the whole source list when one changes, keeping publisher and a valid type', () => {
      const before = formFromProduct(product)
      const now = cloneForm(before)
      now.sources = setClaimSource(now.sources, 'price', { url: 'https://shop.example/p', title: 'Shop page' })
      expect(productChanges(before, now).sources).toEqual([
        { url: 'https://world.openbeautyfacts.org/p/1', title: 'Open Beauty Facts product page', publisher: 'Open Beauty Facts', source_type: 'product_database', claims: ['listing', 'image'] },
        { url: 'https://shop.example/p', title: 'Shop page', claims: ['price'] },
      ])
    })
  })

  describe('sources, one per fact', () => {
    it('leaves out a source type the backend would refuse, rather than sending it', () => {
      const before = formFromProduct(product)
      const now = cloneForm(before)
      now.sources = [{ key: 'k', url: 'https://blog.example/p', title: 'A blog', publisher: null, sourceType: 'website', claims: ['description'] }]
      expect(productChanges(before, now).sources).toEqual([{ url: 'https://blog.example/p', title: 'A blog', claims: ['description'] }])
    })

    it('adds a fact to a link already listed rather than listing it twice', () => {
      const sources = setClaimSource(sourcesFromProduct(product), 'description', { url: 'https://world.openbeautyfacts.org/p/1', title: 'ignored' })
      expect(sources).toHaveLength(1)
      expect(sources[0]!.claims).toEqual(['listing', 'image', 'description'])
    })

    it('moves a fact to a new link, and drops a source left backing nothing', () => {
      let sources = setClaimSource(sourcesFromProduct(product), 'listing', { url: 'https://brand.example', title: 'Brand page' })
      expect(sourceForClaim(sources, 'listing')?.url).toBe('https://brand.example')
      sources = removeClaimSource(sources, 'image')
      expect(sources.map((s) => s.url)).toEqual(['https://brand.example'])
    })

    it('needs a web link and a title for a source, and spots sources with no web link', () => {
      expect(checkSourceLink({ url: 'ftp://x', title: ' ' })).toEqual({
        url: 'Use a full web link, starting with http:// or https://',
        title: 'Say what the link is, like "Brand product page"',
      })
      expect(sourcesWithoutLink([{ key: 'a', url: '', title: 'A book', publisher: null, sourceType: null, claims: ['listing'] }])).toHaveLength(1)
    })
  })

  describe('validateProductForm()', () => {
    it('asks for a name, a brand, at least one ingredient and a description within 2000 characters', () => {
      const form = { ...formFromProduct(product), name: '', brand: ' ', ingredients: [], description: 'x'.repeat(2001) }
      expect(validateProductForm(form, ['Cleansers'])).toEqual({
        name: 'Add the product name',
        brand: 'Add the brand name',
        description: 'Keep the description to 2000 characters',
        ingredients: 'Keep at least one ingredient',
      })
    })

    it('allows a description of exactly 2000 characters', () => {
      expect(validateProductForm({ ...formFromProduct(product), description: 'x'.repeat(2000) }, ['Cleansers'])).toEqual({})
    })

    it('allows at most 8 benefits', () => {
      const form = { ...formFromProduct(product), benefits: Array.from({ length: 9 }, (_, i) => `b${i}`) }
      expect(validateProductForm(form, []).benefits).toBe('Up to 8 benefits')
    })
  })

  describe('readEditProblem()', () => {
    it('reads 409 "stale" as the stale banner', () => {
      expect(readEditProblem(problem({ status: 409, detail: 'stale' }))).toEqual({ kind: 'stale' })
    })

    it('reads 409 "duplicate" with the products that already have this brand and name', () => {
      expect(readEditProblem(problem({ status: 409, detail: 'duplicate' }), [{ id: 'p-2', slug: 'b-n', brand: 'B', name: 'N' }])).toEqual({
        kind: 'duplicate',
        candidates: [{ id: 'p-2', slug: 'b-n', brand: 'B', name: 'N', exact: true }],
      })
    })

    it('reads 403 as the forbidden state', () => {
      expect(readEditProblem(problem({ status: 403 }))).toEqual({ kind: 'forbidden' })
    })

    it('maps a validation 422 onto the form fields', () => {
      const read = readEditProblem(problem({ fields: [{ field: 'benefits.2', message: 'Too long' }, { field: 'name', message: 'Required' }] }))
      expect(read).toMatchObject({ kind: 'message', fields: { benefits: 'Too long', name: 'Required' } })
    })

    it('marks the ingredients SBUNK names, so the admin can replace them', () => {
      expect(readEditProblem(problem({ code: 'SBUNK', details: ['i-gone'] }))).toMatchObject({ kind: 'message', unknownIds: ['i-gone'] })
    })

    it('words a 500 as nothing saved', () => {
      expect(readEditProblem(problem({ status: 500 }))).toMatchObject({ message: 'The catalogue refused the change, so nothing was saved. Try again in a moment.' })
    })

    it('words a refused photo by size and by type', () => {
      expect(photoUploadMessage(413)).toBe('That photo is over 5 MB. Choose a smaller one.')
      expect(photoUploadMessage(415)).toBe("That file isn't a JPG, PNG or WebP image. Choose a photo in one of those.")
    })
  })
})
