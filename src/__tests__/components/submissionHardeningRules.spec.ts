import { describe, it, expect } from 'vitest'

import {
  PHOTO_REFUSAL_FALLBACK,
  RATE_LIMIT_MESSAGE,
  photoRefusalMessage,
  plainDetail,
  rateLimitMessage,
  readApiProblem,
  type ApiProblem,
} from '../../api/apiProblem'
import type { AdminSubmission, ReviewIngredient } from '../../api/submissionsApi'
import { buildApproveBody, initialTicks, readReviewPayload, readReviewProblem, type ReviewState } from '../../components/Submissions/adminReview'
import { formFromProduct, photoUploadMessage, readEditProblem } from '../../components/Submissions/productEdit'
import {
  buildSubmissionBody,
  checkBenefit,
  emptyDraft,
  emptySource,
  newIngredient,
  readServerErrors,
  validateBasics,
  validateExtras,
  type SubmissionDraft,
} from '../../components/Submissions/submissionDraft'

// The submission hardening (backend fix/submission-hardening): the new 429,
// 413/415/422 and link refusals worded once, links refused field by field, no
// hidden character sent from the submit form, and only web links published.

const failed = (status: number, data: unknown) => ({ response: { status, data } })
const problem = (p: Partial<ApiProblem>): ApiProblem => ({ status: 422, detail: null, code: null, details: null, fields: [], ...p })

/** A Pydantic field error, the shape the link checks answer in. */
const fieldError = (loc: (string | number)[], msg: string) => failed(422, { detail: [{ loc: ['body', ...loc], msg, type: 'value_error' }] })

const draftWith = (extra: Partial<SubmissionDraft> = {}): SubmissionDraft => ({
  ...emptyDraft(),
  name: 'Hydrating Gel Toner',
  brand: 'Example Brand',
  category: 'Toners',
  ingredients: [newIngredient('Water')],
  sources: [],
  ...extra,
})

const newWithLink = (position: number, url: string): ReviewIngredient => ({
  position,
  ingredient_id: null,
  name: 'Phytosphingosine',
  status: 'new',
  details: { roles: [], known_for: 'Supports the skin barrier', source_url: url },
  existing_matches: [],
})

const reviewState = (sourceUrl: string, ingredientUrl: string): ReviewState => {
  const detail: AdminSubmission = {
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
      ingredients: [{ new_name: 'Phytosphingosine' }],
      benefits: [],
      good_for: [],
      sources: [{ url: sourceUrl, title: 'Sent link', claims: ['listing'] }],
    },
    duplicate_candidates: [],
    ingredients: [newWithLink(0, ingredientUrl)],
  }
  const payload = readReviewPayload(detail.submission)
  return {
    detail,
    payload,
    decisions: { 0: { decision: 'with_details', functionalGroup: 'Humectant', benefits: '', publishSource: true } },
    ticks: { ...initialTicks(payload), sourceUrls: [sourceUrl] },
    correctionsDirty: false,
  }
}

describe('submission hardening rules', () => {
  describe('plainDetail()', () => {
    it("gives the backend's detail text, trimmed, for a refusal whose wording the backend owns", () => {
      expect(plainDetail({ detail: '  You have 5 submissions waiting for review.  ' })).toBe('You have 5 submissions waiting for review.')
    })

    it('takes control and hidden characters out of the text', () => {
      expect(plainDetail({ detail: 'Too\nmany\u202E uploads\u0007' })).toBe('Too many uploads')
    })

    it('gives nothing for a missing, empty or overlong detail, or a Pydantic list, so the caller uses its own words', () => {
      expect(plainDetail({ detail: null })).toBeNull()
      expect(plainDetail({ detail: '   ' })).toBeNull()
      expect(plainDetail({ detail: 'x'.repeat(301) })).toBeNull()
      expect(plainDetail(readApiProblem(fieldError(['name'], 'Field required')))).toBeNull()
    })
  })

  describe('rateLimitMessage()', () => {
    it("words a 429 in the backend's words when it sent some, such as the cap on submissions waiting", () => {
      expect(rateLimitMessage({ status: 429, detail: 'You already have 5 submissions waiting for review.' })).toBe(
        'You already have 5 submissions waiting for review.',
      )
    })

    it('words a 429 with no text as a short wait', () => {
      expect(rateLimitMessage({ status: 429, detail: null })).toBe(RATE_LIMIT_MESSAGE)
      expect(RATE_LIMIT_MESSAGE).toBe("You've sent a lot in a short time. Please wait a bit and try again.")
    })

    it('says nothing for any other status', () => {
      expect(rateLimitMessage({ status: 422, detail: 'slow down' })).toBeNull()
      expect(rateLimitMessage({ status: null, detail: null })).toBeNull()
    })
  })

  describe('photoRefusalMessage()', () => {
    it("words a refused photo (413, 415, 422) in the backend's words when it sent some", () => {
      expect(photoRefusalMessage({ status: 413, detail: 'The image is larger than 4000 pixels on a side.' })).toBe('The image is larger than 4000 pixels on a side.')
      expect(photoRefusalMessage({ status: 415, detail: 'The image must be a JPEG, PNG or WebP file.' })).toBe('The image must be a JPEG, PNG or WebP file.')
      expect(photoRefusalMessage({ status: 422, detail: 'The image could not be read.' })).toBe('The image could not be read.')
    })

    it('words each refused photo status in its own words when no text came', () => {
      expect(photoRefusalMessage({ status: 413, detail: null })).toBe(PHOTO_REFUSAL_FALLBACK[413])
      expect(photoRefusalMessage({ status: 415, detail: null })).toBe(PHOTO_REFUSAL_FALLBACK[415])
      expect(photoRefusalMessage({ status: 422, detail: null })).toBe("That photo couldn't be read as an image. Choose a different photo.")
    })

    it('words the upload rate limit too, and leaves any other answer to the caller', () => {
      expect(photoRefusalMessage({ status: 429, detail: null })).toBe(RATE_LIMIT_MESSAGE)
      expect(photoRefusalMessage({ status: 500, detail: 'boom' })).toBeNull()
      expect(photoRefusalMessage({ status: null, detail: null })).toBeNull()
    })

    it('is what the product photo field says, with the 403 and offline words kept', () => {
      expect(photoUploadMessage(429, null)).toBe(RATE_LIMIT_MESSAGE)
      expect(photoUploadMessage(422, 'The image could not be read.')).toBe('The image could not be read.')
      expect(photoUploadMessage(403)).toBe('Only the SkinBuddy team can change product photos.')
      expect(photoUploadMessage(null)).toBe("We couldn't reach SkinBuddy, so the photo wasn't uploaded. Try again.")
    })
  })

  describe('readApiProblem() (a text refusal naming its field)', () => {
    it('reads a 422 that names its field in loc beside the text as a field problem', () => {
      const read = readApiProblem(failed(422, { detail: 'links to private networks are not accepted', loc: ['body', 'sources', 1, 'url'] }))
      expect(read.fields).toEqual([{ field: 'sources.1.url', message: 'Links to private networks are not accepted' }])
      expect(read.detail).toBe('links to private networks are not accepted')
    })

    it('reads a field path written at the start of the text, dotted or bracketed, and keeps the rest as the message', () => {
      expect(readApiProblem(failed(422, { detail: 'sources[0].url: Links with a password are not accepted' })).fields).toEqual([
        { field: 'sources.0.url', message: 'Links with a password are not accepted' },
      ])
      expect(readApiProblem(failed(422, { detail: 'ingredients.2.details.source_url - raw IP addresses are not accepted' })).fields).toEqual([
        { field: 'ingredients.2.details.source_url', message: 'Raw IP addresses are not accepted' },
      ])
    })

    it('adds no field for a text refusal that names none, or for an answer that is not a 422', () => {
      expect(readApiProblem(failed(422, { detail: 'unknown ingredient_id', code: 'SBUNK' })).fields).toEqual([])
      expect(readApiProblem(failed(409, { detail: 'sources.1.url clash' })).fields).toEqual([])
    })
  })

  describe('readServerErrors() (link refusals on the submit form)', () => {
    it("puts a refused link on its link card with the backend's msg, counting only the cards that were sent", () => {
      const blank = emptySource()
      const sent = { ...emptySource(), url: 'http://10.0.0.1/p', title: 'Shop page', claims: ['listing' as const] }
      const draft = draftWith({ sources: [blank, sent] })

      const reading = readServerErrors(readApiProblem(fieldError(['sources', 0, 'url'], 'Value error, links to private networks are not accepted')), draft)

      expect(reading?.step).toBe(3)
      expect(reading?.errors).toEqual({ [`source.${sent.key}.url`]: 'Links to private networks are not accepted' })
    })

    it("puts a refused ingredient link on that ingredient's link field, on the ingredients step", () => {
      const water = newIngredient('Water')
      const phyto = { ...newIngredient('Phytosphingosine'), sourceUrl: 'https://user:pw@ingredient.example/' }
      const draft = draftWith({ ingredients: [water, phyto] })

      const reading = readServerErrors(readApiProblem(fieldError(['ingredients', 1, 'details', 'source_url'], 'links with a password are not accepted')), draft)

      expect(reading?.step).toBe(2)
      expect(reading?.errors[`ing.${phyto.key}.sourceUrl`]).toBe('Links with a password are not accepted')
    })

    it('leaves a 422 that names no field to the form-level message', () => {
      expect(readServerErrors(readApiProblem(failed(422, { detail: 'Links like this are not accepted.' })), draftWith())).toBeNull()
    })
  })

  describe('readEditProblem() (the new refusals on the product edit save)', () => {
    it("puts a refused link on every fact that link backs, with the backend's msg", () => {
      const read = readEditProblem(readApiProblem(fieldError(['sources', 1, 'url'], 'raw IP addresses are not accepted')), null, [
        { claims: ['listing'] },
        { claims: ['price', 'image'] },
      ])

      expect(read).toMatchObject({ kind: 'message', fields: { 'source.price': 'Raw IP addresses are not accepted', 'source.image': 'Raw IP addresses are not accepted' } })
      expect(read.kind === 'message' && read.fields['source.listing']).toBeFalsy()
    })

    it('falls back to the sources field when the refused link is not one it sent', () => {
      expect(readEditProblem(readApiProblem(fieldError(['sources', 4, 'url'], 'not accepted')), null, [{ claims: ['listing'] }])).toMatchObject({
        fields: { sources: 'Not accepted' },
      })
    })

    it("words a 429 in the backend's words, or as a short wait", () => {
      expect(readEditProblem(problem({ status: 429, detail: 'Too many saves. Try again in a minute.' }))).toMatchObject({ message: 'Too many saves. Try again in a minute.' })
      expect(readEditProblem(problem({ status: 429 }))).toMatchObject({ message: RATE_LIMIT_MESSAGE })
    })

    it('words a 422 that names no field with the text the backend gave', () => {
      expect(readEditProblem(problem({ detail: 'Links like this are not accepted.' }))).toMatchObject({
        message: "Something wasn't accepted: Links like this are not accepted. Nothing was saved.",
        fields: {},
      })
    })
  })

  describe('readReviewProblem() (the new refusals on the review screen)', () => {
    it("words a 429 in the backend's words, or as a short wait", () => {
      expect(readReviewProblem(problem({ status: 429, detail: 'Slow down a little.' }), 'save').message).toBe('Slow down a little.')
      expect(readReviewProblem(problem({ status: 429 }), 'approve').message).toBe(RATE_LIMIT_MESSAGE)
    })

    it('words a 422 that names no field with the text the backend gave, and what was not done', () => {
      expect(readReviewProblem(problem({ detail: 'Links like this are not accepted.' }), 'save').message).toBe(
        "Something wasn't accepted: Links like this are not accepted, so your corrections weren't saved.",
      )
    })
  })

  describe('buildSubmissionBody() and the checks (hidden characters)', () => {
    it('takes every zero-width and bidi control character out of what is sent, field by field', () => {
      const phyto = { ...newIngredient('Phyto\u200Bsphingosine'), knownFor: 'Barrier\u202E support', sourceUrl: 'https://ingredient.example/\u200Dphyto' }
      const draft = draftWith({
        name: 'Gel\u202E Toner',
        brand: '\u2066Example\u2069 Brand',
        ingredients: [phyto],
        benefits: ['Hydr\uFEFFates'],
        sources: [{ ...emptySource(), url: 'https://brand.example/\u200Btoner', title: 'Brand\u200F page', claims: ['listing'] }],
        note: 'New\u200C formula',
      })

      const body = buildSubmissionBody(draft)

      expect(body.name).toBe('Gel Toner')
      expect(body.brand).toBe('Example Brand')
      expect(body.ingredients).toEqual([{ new_name: 'Phytosphingosine', details: { known_for: 'Barrier support', source_url: 'https://ingredient.example/phyto' } }])
      expect(body.benefits).toEqual(['Hydrates'])
      expect(body.sources).toEqual([{ url: 'https://brand.example/toner', title: 'Brand page', claims: ['listing'] }])
      expect(body.note).toBe('New formula')
      expect(JSON.stringify(body)).not.toMatch(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/)
    })

    it('leaves what the user typed in the draft as typed', () => {
      const draft = draftWith({ name: 'Gel\u202E Toner' })
      buildSubmissionBody(draft)
      expect(draft.name).toBe('Gel\u202E Toner')
    })

    it('treats a name, brand or benefit made only of hidden characters as empty', () => {
      const errors = validateBasics(draftWith({ name: '\u200B\u200B', brand: '\u202E' }), ['Toners'])
      expect(errors).toMatchObject({ name: 'Add the product name', brand: 'Add the brand name' })
      expect(checkBenefit([], '\uFEFF')).toBe('Type a benefit first')
      expect(checkBenefit(['Hydrates'], 'Hydr\u200Bates')).toBe("That one's already added")
    })

    it('checks a link with its hidden characters taken out, as it will be sent', () => {
      const source = { ...emptySource(), url: '\u200Bhttps://brand.example/toner', title: 'Brand page', claims: ['listing' as const] }
      expect(validateExtras(draftWith({ sources: [source] }), [])).toEqual({})
    })
  })

  describe('buildApproveBody() (only web links published)', () => {
    it('publishes a ticked web link, and never a ticked link that is not a web address', () => {
      expect(buildApproveBody(reviewState('https://brand.example/toner', 'https://ingredient.example/phyto')).publish_source_urls).toEqual([
        'https://brand.example/toner',
        'https://ingredient.example/phyto',
      ])
      expect(buildApproveBody(reviewState('javascript:alert(1)', 'data:text/html,x')).publish_source_urls).toEqual([])
    })
  })

  describe('formFromProduct() (the photo shown)', () => {
    it("shows a product's http(s) image_url as its photo, and none for any other value", () => {
      expect(formFromProduct({ image_url: 'https://cdn.example/a.webp' }).photo).toEqual({ kind: 'current', url: 'https://cdn.example/a.webp' })
      expect(formFromProduct({ image_url: 'javascript:alert(1)' }).photo).toEqual({ kind: 'none' })
    })
  })
})
