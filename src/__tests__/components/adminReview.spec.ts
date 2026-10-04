import { describe, it, expect, vi, afterEach } from 'vitest'
import type { ApiProblem } from '../../api/apiProblem'
import type { AdminSubmission, ReviewIngredient } from '../../api/submissionsApi'
import {
  buildApproveBody,
  convertIngredients,
  correctionChanges,
  correctionsFrom,
  decisionOptions,
  describeQueueRow,
  describeReviewMeta,
  initialDecision,
  initialTicks,
  isLegacyPayload,
  matchState,
  publishBlockers,
  queueFlagChips,
  readReviewPayload,
  readReviewProblem,
  replaceIngredientAt,
  uploadedImageUrl,
  validateCorrections,
  type DecisionDraft,
  type ReviewState,
} from '../../components/Submissions/adminReview'

const known = (position: number, name: string): ReviewIngredient => ({
  position,
  ingredient_id: `i-${position}`,
  name,
  status: 'known',
  details: null,
  existing_matches: [],
})
const fresh = (position: number, name: string, matches: string[] = [], knownFor: string | null = null, sourceUrl: string | null = null): ReviewIngredient => ({
  position,
  ingredient_id: null,
  name,
  status: 'new',
  details: knownFor || sourceUrl ? { roles: [], known_for: knownFor, source_url: sourceUrl } : null,
  existing_matches: matches.map((m, i) => ({ id: `m-${i}`, name: m })),
})

const submissionPayload = {
  name: 'Hydrating Gel Toner',
  brand: 'Example Brand',
  category: 'Toners',
  image_path: null,
  ingredients: [{ ingredient_id: 'i-0' }, { new_name: 'Phytosphingosine', details: { known_for: 'Barrier' } }, { new_name: 'Zz New' }],
  benefits: ['Hydrates', 'Soothes'],
  good_for: ['Dry skin', 'Sensitive'],
  sources: [
    { url: 'https://brand.example/toner', title: 'Brand page', claims: ['listing'] },
    { url: 'https://shop.example/toner', title: 'Shop', claims: ['price'] },
  ],
}

const detailWith = (ingredients: ReviewIngredient[], extra: Partial<AdminSubmission> = {}): AdminSubmission => ({
  id: 'sub-1',
  status: 'pending',
  created_at: '2026-10-01T08:00:00Z',
  updated_at: null,
  submitter_name: 'Nok',
  reviewed_at: null,
  review_notes: null,
  product_id: null,
  has_edits: false,
  submission: submissionPayload,
  duplicate_candidates: [],
  ingredients,
  ...extra,
})

const decision = (d: Partial<DecisionDraft>): DecisionDraft => ({ decision: null, functionalGroup: '', benefits: '', publishSource: false, ...d })

const stateOf = (detail: AdminSubmission, decisions: Record<number, DecisionDraft> = {}, extra: Partial<ReviewState> = {}): ReviewState => {
  const payload = readReviewPayload(detail.submission)
  return { detail, payload, decisions, ticks: initialTicks(payload), correctionsDirty: false, ...extra }
}

const problem = (p: Partial<ApiProblem>): ApiProblem => ({ status: 422, detail: null, code: null, details: null, fields: [], ...p })

describe('src/components/Submissions/adminReview.ts', () => {
  describe('queueFlagChips() and describeQueueRow()', () => {
    it('lists a possible duplicate first, then new ingredients, a source link and a missing photo', () => {
      expect(queueFlagChips({ possible_duplicate: true, new_ingredient_count: 1, has_source: true, has_photo: false })).toEqual([
        { text: 'Possible duplicate', tone: 'warn' },
        { text: '1 new ingredient', tone: 'plain' },
        { text: 'Has a source link', tone: 'plain' },
        { text: 'No photo', tone: 'plain' },
      ])
    })

    it('says "All ingredients known" when nothing is new, and counts several new ones in the plural', () => {
      expect(queueFlagChips({ possible_duplicate: false, new_ingredient_count: 0, has_source: false, has_photo: true })).toEqual([
        { text: 'All ingredients known', tone: 'good' },
      ])
      expect(queueFlagChips({ possible_duplicate: false, new_ingredient_count: 3, has_source: false, has_photo: true })[0]!.text).toBe('3 new ingredients')
    })

    it('describes a card as sender, day, category and ingredient count, leaving out what is unknown', () => {
      const row = {
        id: 's',
        status: 'pending',
        created_at: '2026-10-01T08:00:00Z',
        submitter_name: 'Nok',
        summary: { name: 'X', brand: 'Y', category: 'Cleansers', ingredient_count: 7 },
        flags: { possible_duplicate: false, new_ingredient_count: 0, has_source: false, has_photo: true },
      }
      expect(describeQueueRow(row)).toBe('From Nok · 1 Oct 2026 · Cleansers · 7 ingredients')
      expect(describeQueueRow({ ...row, submitter_name: null, summary: { ...row.summary, ingredient_count: null } })).toBe('1 Oct 2026 · Cleansers')
    })

    it('says how long a pending submission has waited, and nothing about waiting once reviewed', () => {
      const now = new Date('2026-10-04T09:00:00Z')
      expect(describeReviewMeta(detailWith([]), now)).toBe('From Nok · sent 1 Oct 2026 · waiting 3 days')
      expect(describeReviewMeta(detailWith([], { status: 'rejected' }), now)).toBe('From Nok · sent 1 Oct 2026')
      expect(describeReviewMeta(detailWith([], { created_at: '2026-10-04T08:00:00Z' }), now)).toContain('waiting less than a day')
    })
  })

  describe('readReviewPayload() and the legacy format', () => {
    it('keeps benefits and concerns exactly as stored, since approve publishes only exact matches', () => {
      const payload = readReviewPayload({ ...submissionPayload, benefits: [' Hydrates ', 7, ''] })
      expect(payload.benefits).toEqual([' Hydrates '])
      expect(payload.sources.map((s) => s.url)).toEqual(['https://brand.example/toner', 'https://shop.example/toner'])
    })

    it('spots a legacy row by its plain-name ingredients', () => {
      expect(isLegacyPayload(readReviewPayload({ ingredients: ['Niacimide'] }))).toBe(true)
      expect(isLegacyPayload(readReviewPayload(submissionPayload))).toBe(false)
    })

    afterEach(() => vi.unstubAllEnvs())

    it('builds a photo address only for a path the upload routes create', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.example/')
      const path = 'submissions/0b8f3a2e-1c4d-4e5f-9a6b-7c8d9e0f1a2b.jpg'
      expect(uploadedImageUrl(path)).toMatch(/\/storage\/v1\/object\/public\/product-images\/submissions\/0b8f3a2e-1c4d-4e5f-9a6b-7c8d9e0f1a2b\.jpg$/)
      expect(uploadedImageUrl('../secret.jpg')).toBeNull()
      expect(uploadedImageUrl(null)).toBeNull()
    })
  })

  describe('correctionChanges() and validateCorrections()', () => {
    it('sends only the fields the admin changed, trimmed', () => {
      const before = correctionsFrom(readReviewPayload(submissionPayload))
      const now = { ...before, name: '  Hydrating Gel Toner 200 ml ', priceThb: '450' }
      expect(correctionChanges(before, now)).toEqual({ name: 'Hydrating Gel Toner 200 ml', price_thb: 450 })
    })

    it('sends nothing when the only difference is spacing around the name', () => {
      const before = correctionsFrom(readReviewPayload(submissionPayload))
      expect(correctionChanges(before, { ...before, name: ' Hydrating Gel Toner ' })).toEqual({})
    })

    it('sends a removed photo as null and a cleared price as null', () => {
      const before = { ...correctionsFrom(readReviewPayload(submissionPayload)), imagePath: 'submissions/a.jpg', priceUsd: '12' }
      expect(correctionChanges(before, { ...before, imagePath: null, priceUsd: '' })).toEqual({ image_path: null, price_usd: null })
    })

    it('asks for a name, a brand, a listed category and readable prices', () => {
      const c = { ...correctionsFrom(readReviewPayload(submissionPayload)), name: ' ', brand: '', category: 'Gadgets', priceThb: 'abc' }
      expect(validateCorrections(c, ['Toners'])).toEqual({
        name: 'Add the product name',
        brand: 'Add the brand name',
        category: 'Choose one of these categories',
        priceThb: 'Enter the price in numbers, like 450',
      })
    })
  })

  describe('replaceIngredientAt() and convertIngredients()', () => {
    it('replaces only the ingredient at the given 0-based position, keeping every other in place', () => {
      expect(replaceIngredientAt(submissionPayload.ingredients, 1, { ingredient_id: 'i-picked' })).toEqual([
        { ingredient_id: 'i-0' },
        { ingredient_id: 'i-picked' },
        { new_name: 'Zz New' },
      ])
    })

    it('converts a legacy row\'s plain names to {new_name} in order, dropping blanks and unknown keys', () => {
      expect(convertIngredients(['Niacimide', ' ', { new_name: 'Aqua', extra: 1, details: { known_for: 'Solvent', junk: 2 } }])).toEqual([
        { new_name: 'Niacimide' },
        { new_name: 'Aqua', details: { known_for: 'Solvent' } },
      ])
    })
  })

  describe('decisions on new ingredients (existing_matches 0, 1 and 2+)', () => {
    it('reads no match, one match and several matches apart', () => {
      expect(matchState(fresh(1, 'A'))).toBe('none')
      expect(matchState(fresh(1, 'A', ['Alpha']))).toBe('one')
      expect(matchState(fresh(1, 'A', ['Alpha', 'Alpha 2']))).toBe('several')
    })

    it('pre-fills the benefits with what the sender said it is known for, and makes no decision for the admin', () => {
      expect(initialDecision(fresh(1, 'Phyto', [], 'Supports the skin barrier'))).toEqual({
        decision: null,
        functionalGroup: '',
        benefits: 'Supports the skin barrier',
        publishSource: false,
      })
    })

    it('offers details, name only or drop for an unmatched name, naming the sender', () => {
      expect(decisionOptions(fresh(1, 'Phyto'), 'Nok')).toEqual([
        { value: 'with_details', label: "With Nok's details" },
        { value: 'name_only', label: "Name only, I'll describe it later" },
        { value: 'drop', label: 'Not a real ingredient, drop it' },
      ])
    })

    it('offers only linking or dropping for a name that matches one of ours, sent as name_only', () => {
      expect(decisionOptions(fresh(1, 'Aqua', ['Water']), 'Nok')).toEqual([
        { value: 'name_only', label: 'Link it to Water' },
        { value: 'drop', label: 'Not a real ingredient, drop it' },
      ])
    })
  })

  describe('publishBlockers()', () => {
    const ings = [known(0, 'Water'), fresh(1, 'Phyto'), fresh(2, 'Zz New')]

    it('lets Publish through when every new ingredient has a decision', () => {
      const s = stateOf(detailWith(ings), { 1: decision({ decision: 'name_only' }), 2: decision({ decision: 'drop' }) })
      expect(publishBlockers(s)).toEqual([])
    })

    it('turns Publish off for an exact duplicate, but not for a close one', () => {
      const exact = { id: 'p', slug: 's', brand: 'B', name: 'N', exact: true }
      const decided = { 1: decision({ decision: 'name_only' }), 2: decision({ decision: 'name_only' }) }
      expect(publishBlockers(stateOf(detailWith(ings, { duplicate_candidates: [exact] }), decided))[0]).toContain('already in the catalogue')
      expect(publishBlockers(stateOf(detailWith(ings, { duplicate_candidates: [{ ...exact, exact: false }] }), decided))).toEqual([])
    })

    it('counts the new ingredients still waiting for a decision', () => {
      expect(publishBlockers(stateOf(detailWith(ings)))).toEqual(['Choose what to do with 2 new ingredients.'])
    })

    it('needs a functional group for an ingredient added with details', () => {
      const s = stateOf(detailWith(ings), { 1: decision({ decision: 'with_details' }), 2: decision({ decision: 'drop' }) })
      expect(publishBlockers(s)).toEqual(['Choose a functional group for 1 ingredient added with details.'])
    })

    it('asks the admin to pick for a name that matches several of ours', () => {
      const s = stateOf(detailWith([known(0, 'Water'), fresh(1, 'Ceramide', ['Ceramide NP', 'Ceramide AP'])]))
      expect(publishBlockers(s)).toEqual(['Pick the right match for 1 ingredient.'])
    })

    it('refuses to drop every ingredient', () => {
      const s = stateOf(detailWith([fresh(0, 'A'), fresh(1, 'B')]), { 0: decision({ decision: 'drop' }), 1: decision({ decision: 'drop' }) })
      expect(publishBlockers(s)).toEqual(["Keep at least one ingredient. You can't drop them all."])
    })

    it('holds Publish while corrections are unsaved, and for a legacy row until it is converted', () => {
      const decided = { 1: decision({ decision: 'name_only' }), 2: decision({ decision: 'name_only' }) }
      expect(publishBlockers(stateOf(detailWith(ings), decided, { correctionsDirty: true }))).toEqual([
        'Save or undo your corrections first, so you publish what you see.',
      ])
      const legacy = detailWith([fresh(0, 'Niacimide')], { submission: { ...submissionPayload, ingredients: ['Niacimide'] } })
      expect(publishBlockers(stateOf(legacy, { 0: decision({ decision: 'name_only' }) }))).toEqual([
        'This submission uses the old format. Convert its ingredients first.',
      ])
    })

    it('blocks everything once the submission has been reviewed', () => {
      expect(publishBlockers(stateOf(detailWith(ings, { status: 'approved' })))).toEqual(['This submission has already been reviewed.'])
    })
  })

  describe('buildApproveBody()', () => {
    it('sends 0-based positions with each decision, a group and benefits only for with_details', () => {
      const s = stateOf(detailWith([known(0, 'Water'), fresh(2, 'Zz New'), fresh(1, 'Phyto', [], 'Barrier')]), {
        1: decision({ decision: 'with_details', functionalGroup: 'Skin-Identical Lipid', benefits: '  Supports the barrier ' }),
        2: decision({ decision: 'name_only', functionalGroup: 'Humectant', benefits: 'ignored' }),
      })
      expect(buildApproveBody(s).new_ingredients).toEqual([
        { position: 1, decision: 'with_details', functional_group: 'Skin-Identical Lipid', benefits: 'Supports the barrier' },
        { position: 2, decision: 'name_only', functional_group: null, benefits: null },
      ])
    })

    it('sends an emptied benefits line as null, so nothing is shown for it', () => {
      const s = stateOf(detailWith([fresh(0, 'Phyto')]), { 0: decision({ decision: 'with_details', functionalGroup: 'Humectant', benefits: '  ' }) })
      expect(buildApproveBody(s).new_ingredients[0]!.benefits).toBeNull()
    })

    it('publishes only the ticked benefits and concerns, in the submission\'s order', () => {
      const s = stateOf(detailWith([known(0, 'Water')]))
      s.ticks = { benefits: ['Soothes'], goodFor: ['Sensitive', 'Dry skin'], sourceUrls: [] }
      const body = buildApproveBody(s)
      expect(body.publish_benefits).toEqual(['Soothes'])
      expect(body.publish_good_for).toEqual(['Dry skin', 'Sensitive'])
    })

    it('starts with benefits and concerns ticked and links unticked, as designed', () => {
      const body = buildApproveBody(stateOf(detailWith([known(0, 'Water')])))
      expect(body.publish_benefits).toEqual(['Hydrates', 'Soothes'])
      expect(body.publish_good_for).toEqual(['Dry skin', 'Sensitive'])
      expect(body.publish_source_urls).toEqual([])
    })

    it('sends a ticked link, and an ingredient\'s own link only when it is added with its details', () => {
      const s = stateOf(detailWith([fresh(0, 'A', [], null, 'https://a.example'), fresh(1, 'B', [], null, 'https://b.example')]), {
        0: decision({ decision: 'with_details', functionalGroup: 'Humectant', publishSource: true }),
        1: decision({ decision: 'name_only', publishSource: true }),
      })
      s.ticks.sourceUrls = ['https://shop.example/toner']
      expect(buildApproveBody(s).publish_source_urls).toEqual(['https://shop.example/toner', 'https://a.example'])
    })
  })

  describe('readReviewProblem() (every refusal code)', () => {
    it('words a 409 duplicate with the products it clashes with, marked exact', () => {
      const read = readReviewProblem(problem({ status: 409, detail: 'duplicate' }), 'approve', [{ id: 'p-1', slug: 's', brand: 'CeraVe', name: 'Cleanser' }])
      expect(read.message).toBe(
        "This product is already in the catalogue as CeraVe Cleanser, so nothing was published. Edit that product instead, or don't add this one.",
      )
      expect(read.candidates).toEqual([{ id: 'p-1', slug: 's', brand: 'CeraVe', name: 'Cleanser', exact: true }])
    })

    it('words a 409 duplicate that lost a race, with no candidates', () => {
      expect(readReviewProblem(problem({ status: 409, detail: 'duplicate' }), 'approve', []).message).toContain('added a moment ago')
    })

    it('words SBNPD as already reviewed and offers to reload the queue', () => {
      const read = readReviewProblem(problem({ status: 409, code: 'SBNPD', detail: 'the submission is approved, not pending' }), 'approve')
      expect(read.message).toBe('Someone has already reviewed this submission. Reload the queue to see where it stands.')
      expect(read.reloadQueue).toBe(true)
    })

    it.each([
      ['SBDEC', 'Every new ingredient needs a decision before publishing. Check the ingredient cards and try again.'],
      ['SBNON', "You can't drop every ingredient. Keep at least one, with its details or by name only."],
      ['SBLEG', 'This submission uses the old format. Convert its ingredients first, then publish.'],
      ['SBFGR', "One of the functional groups isn't one we use. Choose it again from the list, then publish."],
      ['SBUNK', 'One of the ingredients is no longer in our list. Pick it again, or add it as new, then try again.'],
      ['23514', "One of the values isn't one the catalogue allows, such as a link's type or what it shows. Check the extras and try again."],
    ])('words %s in plain language', (code, message) => {
      expect(readReviewProblem(problem({ code }), 'approve').message).toBe(message)
    })

    it('words SBAMB with the rows the name matches', () => {
      const read = readReviewProblem(problem({ code: 'SBAMB', details: [{ id: 'a', name: 'Ceramide NP' }, { id: 'b', name: 'Ceramide AP' }] }), 'approve')
      expect(read.message).toBe('A new ingredient matches more than one in our list (Ceramide NP, Ceramide AP). Pick the right one, then publish.')
      expect(read.ambiguous).toEqual([{ id: 'a', name: 'Ceramide NP' }, { id: 'b', name: 'Ceramide AP' }])
    })

    it('words SBVAL with the backend\'s own reason when it gives one', () => {
      expect(readReviewProblem(problem({ code: 'SBVAL', detail: 'a price cannot be negative' }), 'approve').message).toBe(
        "Something in this submission wasn't accepted: a price cannot be negative. Check it and try again.",
      )
    })

    it('words a 500 as a refusal that published nothing', () => {
      expect(readReviewProblem(problem({ status: 500, detail: 'The database refused the change.' }), 'approve').message).toBe(
        'The catalogue refused the change, so nothing was published. Try again in a moment.',
      )
    })

    it('flags a 403 as forbidden and a 404 as a stale queue', () => {
      expect(readReviewProblem(problem({ status: 403 }), 'load').forbidden).toBe(true)
      expect(readReviewProblem(problem({ status: 404 }), 'load').reloadQueue).toBe(true)
    })

    it('maps a validation 422 onto the corrections fields', () => {
      const read = readReviewProblem(problem({ fields: [{ field: 'brand', message: 'String should have at least 1 character' }] }), 'save')
      expect(read.fields).toEqual({ brand: 'String should have at least 1 character' })
      expect(read.message).toContain("so your corrections weren't saved")
    })

    it('words a lost connection and an expired sign-in by what was not done', () => {
      expect(readReviewProblem(problem({ status: null }), 'reject').message).toBe(
        "We couldn't reach SkinBuddy, so it wasn't marked as not added. Check your connection and try again.",
      )
      expect(readReviewProblem(problem({ status: 401 }), 'approve').message).toContain('Your sign-in has expired, so nothing was published')
    })
  })
})
