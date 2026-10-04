import { describe, it, expect } from 'vitest'
import type { ApiProblem } from '../../api/apiProblem'
import type { AdminSubmission, ReviewIngredient } from '../../api/submissionsApi'
import { buildApproveBody, initialTicks, readReviewPayload, type DecisionDraft, type ReviewState } from '../../components/Submissions/adminReview'
import {
  cloneForm,
  formFromProduct,
  productChanges,
  readEditProblem,
  setClaimSource,
  sourcesWithoutLink,
  type EditSource,
} from '../../components/Submissions/productEdit'

// Cases the independent verifier found missing on feat/22: rules that could be
// removed with every earlier test still passing.

const known = (position: number, name: string): ReviewIngredient => ({
  position,
  ingredient_id: `i-${position}`,
  name,
  status: 'known',
  details: null,
  existing_matches: [],
})
const withLink = (position: number, name: string, url: string): ReviewIngredient => ({
  position,
  ingredient_id: null,
  name,
  status: 'new',
  details: { roles: [], known_for: 'Supports the skin barrier', source_url: url },
  existing_matches: [],
})

const reviewDetail = (ingredients: ReviewIngredient[]): AdminSubmission => ({
  id: 'sub-1',
  status: 'pending',
  created_at: '2026-10-01T08:00:00Z',
  updated_at: null,
  submitter_name: 'Nok',
  reviewed_at: null,
  review_notes: null,
  product_id: null,
  has_edits: false,
  submission: {
    name: 'Hydrating Gel Toner',
    brand: 'Example Brand',
    category: 'Toners',
    image_path: null,
    ingredients: [{ ingredient_id: 'i-0' }, { new_name: 'Phytosphingosine', details: { known_for: 'Supports the skin barrier', source_url: 'https://ingredient.example/phyto' } }],
    benefits: ['Hydrates'],
    good_for: ['Dry skin'],
    sources: [],
  },
  duplicate_candidates: [],
  ingredients,
})

const stateWith = (draft: DecisionDraft): ReviewState => {
  const detail = reviewDetail([known(0, 'Water'), withLink(1, 'Phytosphingosine', 'https://ingredient.example/phyto')])
  const payload = readReviewPayload(detail.submission)
  return { detail, payload, decisions: { 1: draft }, ticks: initialTicks(payload), correctionsDirty: false }
}

const problem = (p: Partial<ApiProblem>): ApiProblem => ({ status: 422, detail: null, code: null, details: null, fields: [], ...p })

const product = {
  id: 'p-1',
  slug: 'cerave-hydrating-facial-cleanser',
  brand: 'CeraVe',
  name: 'Hydrating Facial Cleanser',
  category: 'Cleansers',
  updated_at: '2026-10-04T07:26:19.406488+00:00',
  product_ingredients: [{ ingredients: { id: 'i-water', name: 'Water', functional_group: 'Solvent' } }],
  product_sources: [],
}

const source = (key: string, url: string, title: string, claims: EditSource['claims']): EditSource => ({
  key,
  url,
  title,
  publisher: null,
  sourceType: null,
  claims,
})

describe('feat/22 rule gaps (adminReview, productEdit)', () => {
  describe("buildApproveBody() (an ingredient's own link)", () => {
    it('leaves an ingredient\'s own link out of publish_source_urls while "I opened the link and it backs this" is unticked', () => {
      const body = buildApproveBody(stateWith({ decision: 'with_details', functionalGroup: 'Humectant', benefits: '', publishSource: false }))

      expect(body.publish_source_urls).toEqual([])
      expect(body.new_ingredients).toEqual([{ position: 1, decision: 'with_details', functional_group: 'Humectant', benefits: null }])
    })

    it('publishes that link once the admin ticks the box, for an ingredient added with its details', () => {
      const body = buildApproveBody(stateWith({ decision: 'with_details', functionalGroup: 'Humectant', benefits: '', publishSource: true }))

      expect(body.publish_source_urls).toEqual(['https://ingredient.example/phyto'])
    })
  })

  describe('readEditProblem() (the remaining refusal codes)', () => {
    it('words SBNON as keep at least one ingredient, on the ingredients field', () => {
      expect(readEditProblem(problem({ code: 'SBNON', detail: 'a product needs at least one ingredient' }))).toEqual({
        kind: 'message',
        message: 'Keep at least one ingredient, then save.',
        fields: { ingredients: 'Keep at least one ingredient' },
        unknownIds: [],
      })
    })

    it('words SBAMB as a typed-in name matching several of ours, even when the backend lists the matches', () => {
      const read = readEditProblem(problem({ code: 'SBAMB', detail: '"Aqua" matches more than one ingredient', details: [{ id: 'a', name: 'Water' }] }))

      expect(read).toEqual({
        kind: 'message',
        message: 'A typed-in ingredient matches more than one in our list. Remove it and pick the right one from the search, then save.',
        fields: { ingredients: 'Pick typed-in ingredients from the search instead' },
        unknownIds: [],
      })
    })

    it("words SBVAL with the backend's own reason, and plainly when it gives none", () => {
      expect(readEditProblem(problem({ code: 'SBVAL', detail: 'brand cannot be blank' }))).toMatchObject({
        kind: 'message',
        message: "Something wasn't accepted: brand cannot be blank. Nothing was saved.",
        fields: {},
      })
      expect(readEditProblem(problem({ code: 'SBVAL' }))).toMatchObject({ message: "Something wasn't accepted, so nothing was saved." })
    })

    it('words a 23514 check failure as a value the catalogue does not allow, and points at the links', () => {
      expect(readEditProblem(problem({ code: '23514', detail: 'new row violates check constraint' }))).toEqual({
        kind: 'message',
        message: "One of the values isn't one the catalogue allows, such as a link's type. Nothing was saved.",
        fields: { sources: 'Check these links' },
        unknownIds: [],
      })
    })

    it('words a 401 as an expired sign-in, with nothing saved', () => {
      expect(readEditProblem(problem({ status: 401 }))).toMatchObject({
        kind: 'message',
        message: 'Your sign-in has expired, so nothing was saved. Sign in again, then save once more.',
      })
    })

    it('words a 404 as a product that no longer exists', () => {
      expect(readEditProblem(problem({ status: 404, code: 'SBNFD', detail: 'product not found' }))).toMatchObject({
        kind: 'message',
        message: 'This product no longer exists, so nothing was saved.',
      })
    })

    it('words a save that got no answer at all as a lost connection', () => {
      expect(readEditProblem(problem({ status: null }))).toMatchObject({
        kind: 'message',
        message: "We couldn't reach SkinBuddy, so nothing was saved. Check your connection and try again.",
      })
    })
  })

  describe('productChanges() (sources with no web link)', () => {
    it('leaves a source with an empty or non-web link out of the PATCH, and still lists it as having no web link', () => {
      const before = formFromProduct(product)
      before.sources = [
        source('a', '', 'A printed leaflet', ['listing']),
        source('b', 'ftp://files.example/p', 'An old file', ['image']),
      ]
      const now = cloneForm(before)
      now.sources = setClaimSource(now.sources, 'price', { url: 'https://shop.example/p', title: 'Shop page' })

      expect(productChanges(before, now).sources).toEqual([{ url: 'https://shop.example/p', title: 'Shop page', claims: ['price'] }])
      expect(sourcesWithoutLink(now.sources).map((s) => s.title)).toEqual(['A printed leaflet', 'An old file'])
    })
  })
})
