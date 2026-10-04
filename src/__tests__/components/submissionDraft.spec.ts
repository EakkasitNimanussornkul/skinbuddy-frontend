import { describe, it, expect } from 'vitest'

import {
  buildSubmissionBody,
  checkBenefit,
  checkPhotoFile,
  countIngredients,
  describeIngredientCounts,
  emptyDraft,
  emptySource,
  ingredientFromMatch,
  isAlreadyListed,
  isDraftDirty,
  isHttpUrl,
  knownIngredient,
  moveItem,
  newIngredient,
  readPrice,
  readServerErrors,
  summariseExtras,
  validateBasics,
  validateExtras,
  validateIngredients,
  type SubmissionDraft,
} from '../../components/Submissions/submissionDraft'
import type { ApiProblem } from '../../api/apiProblem'

const CATEGORIES = ['Cleansers', 'Toners', 'Serums']
const TAGS = ['Dry skin', 'Sensitive']

const water = () => knownIngredient({ id: 'i-water', name: 'Water', functional_group: 'Solvent' })

const filled = (overrides: Partial<SubmissionDraft> = {}): SubmissionDraft => ({
  ...emptyDraft(),
  name: 'Hydrating Gel Toner',
  brand: 'Example Brand',
  category: 'Toners',
  ingredients: [water(), newIngredient('Phytosphingosine')],
  ...overrides,
})

const problem = (overrides: Partial<ApiProblem>): ApiProblem => ({
  status: 422,
  detail: null,
  code: null,
  details: null,
  fields: [],
  ...overrides,
})

describe('src/components/Submissions/submissionDraft.ts', () => {
  describe('isDraftDirty()', () => {
    it('is clean for a new draft, including its one blank link card', () => {
      expect(isDraftDirty(emptyDraft())).toBe(false)
    })

    it('is dirty once anything is entered, so leaving asks first', () => {
      expect(isDraftDirty({ ...emptyDraft(), name: 'X' })).toBe(true)
      expect(isDraftDirty({ ...emptyDraft(), ingredients: [water()] })).toBe(true)
      expect(isDraftDirty({ ...emptyDraft(), paoNotPrinted: true })).toBe(true)
      const draft = emptyDraft()
      draft.sources[0]!.url = 'https://brand.example'
      expect(isDraftDirty(draft)).toBe(true)
    })

    it('ignores whitespace alone', () => {
      expect(isDraftDirty({ ...emptyDraft(), name: '   ', note: '\n' })).toBe(false)
    })
  })

  describe('validateBasics()', () => {
    it('passes a draft with a name, a brand and a category from the list', () => {
      expect(validateBasics(filled(), CATEGORIES)).toEqual({})
    })

    it('asks for each missing required field in plain words', () => {
      expect(validateBasics(emptyDraft(), CATEGORIES)).toEqual({
        name: 'Add the product name',
        brand: 'Add the brand name',
        category: 'Choose a category',
      })
    })

    it('refuses a name or brand over 200 characters, as the backend would', () => {
      const errors = validateBasics(filled({ name: 'n'.repeat(201), brand: 'b'.repeat(201) }), CATEGORIES)

      expect(errors.name).toContain('200')
      expect(errors.brand).toContain('200')
    })

    it('refuses a category the backend does not list', () => {
      expect(validateBasics(filled({ category: 'Perfume' }), CATEGORIES).category).toBe('Choose one of these categories')
    })
  })

  describe('validateIngredients()', () => {
    it('needs at least one ingredient', () => {
      expect(validateIngredients(filled({ ingredients: [] })).ingredients).toBe('Add at least one ingredient')
    })

    it('holds back an ambiguous pasted name until the user picks one or adds it as new', () => {
      const vague = ingredientFromMatch({ input: 'Vitamin C', id: null, name: null, matched_alias: null, ambiguous: true })
      const errors = validateIngredients(filled({ ingredients: [water(), vague] }))

      expect(errors[`ing.${vague.key}.name`]).toContain('matches several')
      expect(errors.ingredients).toBe('Pick a match for 1 ingredient')
    })

    it('refuses a new name over 120 characters, the sign of a list that was not split', () => {
      const long = newIngredient('Water Glycerin Niacinamide '.repeat(6))

      expect(validateIngredients(filled({ ingredients: [long] }))[`ing.${long.key}.name`]).toContain('120')
    })

    it("checks a new ingredient's optional details: what it's known for up to 200, and a web link", () => {
      const item = newIngredient('Phytosphingosine')
      item.knownFor = 'k'.repeat(201)
      item.sourceUrl = 'ftp://files.example/x'

      const errors = validateIngredients(filled({ ingredients: [item] }))

      expect(errors[`ing.${item.key}.knownFor`]).toContain('200')
      expect(errors[`ing.${item.key}.sourceUrl`]).toContain('http')
    })

    it('passes a list of known and new ingredients with no details', () => {
      expect(validateIngredients(filled())).toEqual({})
    })
  })

  describe('validateExtras()', () => {
    it('passes the extras untouched, since every one is optional', () => {
      expect(validateExtras(filled(), TAGS)).toEqual({})
    })

    it('refuses a price that is not a number', () => {
      const errors = validateExtras(filled({ priceThb: 'four fifty', priceUsd: '12.5.0' }), TAGS)

      expect(Object.keys(errors).sort()).toEqual(['priceThb', 'priceUsd'])
    })

    it('needs a link, what it is and what it shows on every link card that is not blank, and ignores blank cards', () => {
      const card = { ...emptySource(), url: 'brand.example/page' }
      const errors = validateExtras(filled({ sources: [card, emptySource()] }), TAGS)

      expect(Object.keys(errors).sort()).toEqual([
        `source.${card.key}.claims`,
        `source.${card.key}.title`,
        `source.${card.key}.url`,
      ])
    })

    it('refuses a concern the backend does not list, and a note over 1000 characters', () => {
      const errors = validateExtras(filled({ goodFor: ['Glowing'], note: 'n'.repeat(1001) }), TAGS)

      expect(errors.goodFor).toBeDefined()
      expect(errors.note).toContain('1000')
    })
  })

  describe('readPrice() / isHttpUrl() / checkPhotoFile() / checkBenefit()', () => {
    it('reads prices as typed: whole, two decimals, thousands commas; blank is not given', () => {
      expect(readPrice('450')).toBe(450)
      expect(readPrice(' 12.50 ')).toBe(12.5)
      expect(readPrice('1,200')).toBe(1200)
      expect(readPrice('')).toBeNull()
      expect(readPrice('-5')).toBeUndefined()
      expect(readPrice('12.505')).toBeUndefined()
      expect(readPrice('12,50')).toBeUndefined()
    })

    it('accepts only full http and https links', () => {
      expect(isHttpUrl('https://brand.example/toner')).toBe(true)
      expect(isHttpUrl('http://shop.example')).toBe(true)
      expect(isHttpUrl('brand.example')).toBe(false)
      expect(isHttpUrl('javascript:alert(1)')).toBe(false)
      expect(isHttpUrl('https://')).toBe(false)
    })

    it('accepts a JPG, PNG or WebP photo up to exactly 5 MB, and says why it refuses anything else', () => {
      const MB = 1024 * 1024
      expect(checkPhotoFile({ type: 'image/webp', size: 5 * MB })).toBeNull()
      expect(checkPhotoFile({ type: 'image/png', size: 5 * MB + 1 })).toContain('over 5 MB')
      expect(checkPhotoFile({ type: 'image/gif', size: 10 })).toContain('JPG, PNG or WebP')
    })

    it('adds a benefit of up to 80 characters, up to 8 of them, and not the same one twice', () => {
      expect(checkBenefit([], 'Hydrates')).toBeNull()
      expect(checkBenefit([], '  ')).toBe('Type a benefit first')
      expect(checkBenefit([], 'b'.repeat(81))).toContain('80')
      expect(checkBenefit(Array.from({ length: 8 }, (_, i) => `B${i}`), 'Soothes')).toContain('8')
      expect(checkBenefit(['Hydrates'], 'hydrates')).toBe("That one's already added")
    })
  })

  describe('isAlreadyListed() / countIngredients() / moveItem()', () => {
    it('spots one of ours by id and a typed one by name, case aside', () => {
      const list = [water(), newIngredient('Phytosphingosine')]

      expect(isAlreadyListed(list, { id: 'i-water', name: 'Aqua' })).toBe(true)
      expect(isAlreadyListed(list, { id: null, name: ' phytosphingosine ' })).toBe(true)
      expect(isAlreadyListed(list, { id: null, name: 'Water' })).toBe(false)
    })

    it('counts the list by kind and says it the way the design does', () => {
      const vague = ingredientFromMatch({ input: 'Vitamin C', id: null, name: null, matched_alias: null, ambiguous: true })
      const counts = countIngredients([water(), water(), newIngredient('X'), vague])

      expect(counts).toEqual({ total: 4, known: 2, fresh: 1, ambiguous: 1 })
      expect(describeIngredientCounts(counts)).toBe('2 in our list · 1 new · 1 to pick')
      expect(describeIngredientCounts({ total: 3, known: 3, fresh: 0, ambiguous: 0 })).toBe('3 in our list')
    })

    it('moves an item up or down by one, and ignores a move off either end', () => {
      const list = ['a', 'b', 'c']
      moveItem(list, 2, 1)
      expect(list).toEqual(['a', 'c', 'b'])
      moveItem(list, 0, -1)
      moveItem(list, 2, 3)
      expect(list).toEqual(['a', 'c', 'b'])
    })
  })

  describe('buildSubmissionBody()', () => {
    it('sends known ingredients by id and new ones by name, in the order listed', () => {
      const body = buildSubmissionBody(filled())

      expect(body.ingredients).toEqual([{ ingredient_id: 'i-water' }, { new_name: 'Phytosphingosine' }])
    })

    it("adds a new ingredient's details only for what the user filled in", () => {
      const item = newIngredient('Phytosphingosine')
      item.roles = ['Barrier support']
      item.knownFor = '  Supports the skin barrier '

      const body = buildSubmissionBody(filled({ ingredients: [item] }))

      expect(body.ingredients).toEqual([
        { new_name: 'Phytosphingosine', details: { roles: ['Barrier support'], known_for: 'Supports the skin barrier' } },
      ])
    })

    it('sends blank optional fields as null or empty lists, never as empty strings', () => {
      const body = buildSubmissionBody(filled())

      expect(body).toMatchObject({
        image_path: null,
        price_thb: null,
        price_usd: null,
        pao_months: null,
        benefits: [],
        good_for: [],
        sources: [],
        note: null,
      })
    })

    it('trims the text, reads the prices and sends only the link cards that were filled in', () => {
      const source = { ...emptySource(), url: ' https://brand.example/toner ', title: ' Brand page ', claims: ['listing' as const] }
      const body = buildSubmissionBody(
        filled({
          name: '  Hydrating Gel Toner ',
          priceThb: '1,200',
          priceUsd: '12.50',
          paoMonths: 12,
          sources: [emptySource(), source],
          note: '  New 2026 formula ',
          photo: { imagePath: 'submissions/abc.webp', previewUrl: null, fileName: 'front.webp' },
        }),
      )

      expect(body.name).toBe('Hydrating Gel Toner')
      expect(body.price_thb).toBe(1200)
      expect(body.price_usd).toBe(12.5)
      expect(body.pao_months).toBe(12)
      expect(body.image_path).toBe('submissions/abc.webp')
      expect(body.sources).toEqual([{ url: 'https://brand.example/toner', title: 'Brand page', claims: ['listing'] }])
      expect(body.note).toBe('New 2026 formula')
    })

    it('sends "Not printed" as the same null as no answer', () => {
      expect(buildSubmissionBody(filled({ paoNotPrinted: true })).pao_months).toBeNull()
    })
  })

  describe('summariseExtras()', () => {
    it('lists what was added, or says nothing was', () => {
      expect(summariseExtras(filled())).toBe('Nothing added')
      const source = { ...emptySource(), url: 'https://a.example', title: 'A', claims: ['price' as const] }
      expect(summariseExtras(filled({ priceThb: '450', benefits: ['Hydrates', 'Soothes'], goodFor: ['Dry skin'], sources: [source] }))).toBe(
        'Price, 2 benefits, 1 concern, 1 link',
      )
    })
  })

  describe('readServerErrors()', () => {
    it('puts a Pydantic field problem on the matching field, and goes back to its step', () => {
      const reading = readServerErrors(problem({ fields: [{ field: 'brand', message: 'Field required' }] }), filled())

      expect(reading).toEqual({
        errors: { brand: 'Field required' },
        step: 1,
        message: 'Some details need a fix before we can send this.',
      })
    })

    it('finds the ingredient row by its position in the body as sent', () => {
      const draft = filled()
      const reading = readServerErrors(
        problem({ fields: [{ field: 'ingredients.1.details.source_url', message: 'Must be an http(s) URL' }] }),
        draft,
      )

      expect(reading!.step).toBe(2)
      expect(reading!.errors[`ing.${draft.ingredients[1]!.key}.sourceUrl`]).toBe('Must be an http(s) URL')
    })

    it('counts link positions among the cards that were sent, skipping blank ones', () => {
      const sent = { ...emptySource(), url: 'https://a.example', title: 'A', claims: ['listing' as const] }
      const draft = filled({ sources: [emptySource(), sent] })
      const reading = readServerErrors(problem({ fields: [{ field: 'sources.0.title', message: 'Too long' }] }), draft)

      expect(reading!.errors).toEqual({ [`source.${sent.key}.title`]: 'Too long' })
      expect(reading!.step).toBe(3)
    })

    it('goes back to the earliest step that has a problem', () => {
      const reading = readServerErrors(
        problem({ fields: [{ field: 'category', message: 'Input should be one of' }, { field: 'note', message: 'Too long' }] }),
        filled(),
      )

      expect(reading!.step).toBe(1)
    })

    it('marks each ingredient the backend no longer knows (SBUNK) so the user can fix it', () => {
      const draft = filled()
      const reading = readServerErrors(problem({ code: 'SBUNK', detail: 'unknown ingredient_id', details: ['i-water'] }), draft)

      expect(reading!.step).toBe(2)
      expect(reading!.errors[`ing.${draft.ingredients[0]!.key}.name`]).toContain("can't find this one")
      expect(reading!.errors[`ing.${draft.ingredients[1]!.key}.name`]).toBeUndefined()
    })

    it('leaves a refusal that is not about the form to the caller', () => {
      expect(readServerErrors(problem({ status: 500 }), filled())).toBeNull()
      expect(readServerErrors(problem({ fields: [{ field: 'unknown_key', message: 'Extra inputs are not permitted' }] }), filled())).toBeNull()
    })
  })
})
