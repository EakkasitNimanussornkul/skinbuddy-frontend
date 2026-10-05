import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, RouterView, type Router } from 'vue-router'
import { defineComponent, h, type Component } from 'vue'

vi.mock('../../api/metaApi', () => ({
  getCategories: vi.fn(),
  getConcernTags: vi.fn(),
  getFunctionalGroups: vi.fn(),
}))
vi.mock('../../api/submissionsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/submissionsApi')>()),
  getAdminQueue: vi.fn(),
  getAdminSubmission: vi.fn(),
  editAdminSubmission: vi.fn(),
  approveSubmission: vi.fn(),
  rejectSubmission: vi.fn(),
  uploadSubmissionImage: vi.fn(),
  createSubmission: vi.fn(),
}))
vi.mock('../../api/ingredientsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/ingredientsApi')>()),
  searchIngredients: vi.fn(),
  matchIngredients: vi.fn(),
}))
vi.mock('../../api/products', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  getProductBySlug: vi.fn(),
}))
vi.mock('../../api/productAdminApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/productAdminApi')>()),
  updateProduct: vi.fn(),
  uploadProductPhoto: vi.fn(),
}))

import { getCategories, getConcernTags, getFunctionalGroups } from '../../api/metaApi'
import {
  createSubmission,
  editAdminSubmission,
  getAdminQueue,
  getAdminSubmission,
  uploadSubmissionImage,
  type AdminSubmission,
  type ReviewIngredient,
} from '../../api/submissionsApi'
import { matchIngredients, searchIngredients } from '../../api/ingredientsApi'
import { getProductBySlug } from '../../api/products'
import { updateProduct, uploadProductPhoto } from '../../api/productAdminApi'
import { useToast } from '../../composables/useToast'
import AdminSubmissionsView from '../../views/AdminSubmissionsView.vue'
import ProductEditView from '../../views/ProductEditView.vue'
import SubmitProductView from '../../views/SubmitProductView.vue'
import { readApiProblem } from '../../api/apiProblem'
import { fieldWords, readReviewPayload, readReviewProblem, sentIngredientPositions } from '../../components/Submissions/adminReview'
import { buildSubmissionBody, emptyDraft } from '../../components/Submissions/submissionDraft'
import { hasHiddenChars, revealHiddenChars, stripHiddenChars } from '../../utils/hiddenChars'

// The submission hardening on screen (backend fix/submission-hardening): sent
// links shown host first and marked nofollow ugc, hidden characters shown as
// markers, photos only from an upload path or the picked file, and the new
// 429, 413/415/422 and link refusals put where the user can act on them.

const UUID = '0b8f3a2e-1c4d-4e5f-9a6b-7c8d9e0f1a2b'
const RATE = "You've sent a lot in a short time. Please wait a bit and try again."
const HIDDEN = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/

const httpError = (status: number, data: unknown = {}) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } })
const fieldError = (loc: (string | number)[], msg: string) => httpError(422, { detail: [{ loc: ['body', ...loc], msg, type: 'value_error' }] })

const mounted: VueWrapper[] = []

const mountAt = async (routes: { path: string; component: Component }[], start: string[]) => {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/explore', component: { template: '<div>explore</div>' } },
      { path: '/submissions', component: { template: '<div>mine</div>' } },
      { path: '/product/:slug', component: { template: '<div class="product-page">product</div>' } },
      ...routes,
    ],
  })
  for (const path of start) await router.push(path)
  await router.isReady()
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(defineComponent({ render: () => h(RouterView) }), {
    global: { plugins: [pinia, router], stubs: { teleport: true } },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

const chooseFile = async (w: VueWrapper, file: File) => {
  const input = w.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await flushPromises()
}
const photo = () => new File(['x'], 'front.jpg', { type: 'image/jpeg' })

// --- The review ---------------------------------------------------------------

const newIngredient = (sourceUrl: string, name = 'Phytosphingosine', knownFor = 'Supports the skin barrier'): ReviewIngredient => ({
  position: 1,
  ingredient_id: null,
  name,
  status: 'new',
  details: { roles: [], known_for: knownFor, source_url: sourceUrl },
  existing_matches: [],
})

const review = (extra: Partial<AdminSubmission> = {}, submission: Record<string, unknown> = {}): AdminSubmission => ({
  id: 'sub-1',
  status: 'pending',
  created_at: '2026-10-01T08:00:00Z',
  updated_at: '2026-10-01T08:00:00.123456Z',
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
    ingredients: [{ ingredient_id: 'i-0' }, { new_name: 'Phytosphingosine' }],
    benefits: ['Hydrates'],
    good_for: [],
    sources: [{ url: 'https://brand.example/toner', title: 'Brand page', claims: ['listing'] }],
    ...submission,
  },
  duplicate_candidates: [],
  ingredients: [
    { position: 0, ingredient_id: 'i-0', name: 'Water', status: 'known', details: null, existing_matches: [] },
    newIngredient('https://ingredient.example/phyto'),
  ],
  ...extra,
})

const mountReview = () => mountAt([{ path: '/admin/submissions/:id?', component: AdminSubmissionsView }], ['/admin/submissions/sub-1'])

// --- The product edit ---------------------------------------------------------

const UPDATED_AT = '2026-10-04T07:26:19.406488+00:00'
const product = (extra: Record<string, unknown> = {}) => ({
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
  good_for: ['Dry skin'],
  updated_at: UPDATED_AT,
  product_ingredients: [{ ingredients: { id: 'i-water', name: 'Water', functional_group: 'Solvent' } }],
  product_sources: [],
  ...extra,
})
const mountEdit = () =>
  mountAt([{ path: '/products/:slug/edit', component: ProductEditView }], ['/product/cerave-hydrating-facial-cleanser', '/products/cerave-hydrating-facial-cleanser/edit'])
const save = async (w: VueWrapper) => {
  await w.get('button.save').trigger('click')
  await flushPromises()
}

// --- The submit form ------------------------------------------------------------

const mountSubmit = () => mountAt([{ path: '/submissions/new', component: SubmitProductView }], ['/explore', '/submissions/new'])
const button = (w: VueWrapper, text: string) => {
  const found = w.findAll('button').find((b) => b.text().trim() === text)
  if (!found) throw new Error(`No button "${text}"`)
  return found
}
const toExtras = async (w: VueWrapper, name = 'Hydrating Gel Toner') => {
  await w.get('#sub-name').setValue(name)
  await w.get('#sub-brand').setValue('Example Brand')
  await button(w, 'Toners').trigger('click')
  await w.get('button.continue').trigger('click')
  await flushPromises()
  vi.mocked(matchIngredients).mockResolvedValue([{ input: 'Water', id: 'i-water', name: 'Water', matched_alias: null, ambiguous: false }])
  await w.get('button.paste-toggle').trigger('click')
  await w.get('textarea').setValue('Water')
  await w.get('button.paste-match').trigger('click')
  await flushPromises()
  await w.get('button.continue').trigger('click')
  await flushPromises()
}
const fillLink = async (w: VueWrapper, url: string) => {
  const card = w.get('.source-card')
  await card.get('input[type="url"]').setValue(url)
  await card.get('input[placeholder="e.g. Brand product page"]').setValue('Shop page')
  await card.findAll('button[aria-pressed]').find((b) => b.text() === 'Ingredient list')!.trigger('click')
}
const send = async (w: VueWrapper) => {
  await w.get('button.send').trigger('click')
  await flushPromises()
}

describe('submission hardening (screens)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useToast().toasts.value.splice(0)
    vi.mocked(getCategories).mockResolvedValue(['Cleansers', 'Toners'])
    vi.mocked(getConcernTags).mockResolvedValue(['Dry skin'])
    vi.mocked(getFunctionalGroups).mockResolvedValue(['Humectant'])
    vi.mocked(searchIngredients).mockResolvedValue([])
    vi.mocked(getAdminQueue).mockResolvedValue({ counts: { pending: 1, approved: 0, rejected: 0 }, submissions: [] })
    vi.mocked(getAdminSubmission).mockResolvedValue(review())
    vi.mocked(getProductBySlug).mockResolvedValue(product())
    vi.mocked(updateProduct).mockResolvedValue({ product: {}, slug: 'cerave-hydrating-facial-cleanser', updated_at: null })
  })
  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    document.body.innerHTML = ''
  })

  describe('the review (links, hidden characters, photo)', () => {
    it("shows each sent link's host in bold before the full address, marked nofollow ugc", async () => {
      const { wrapper } = await mountReview()

      const source = wrapper.get('a.source-link')
      expect(source.get('.link-host').text()).toBe('brand.example')
      expect(source.get('.link-address').text()).toBe('https://brand.example/toner')
      expect(source.attributes('rel')).toBe('noopener noreferrer nofollow ugc')
      const ingredient = wrapper.get('a.ingredient-source-link')
      expect(ingredient.get('.link-host').text()).toBe('ingredient.example')
      expect(ingredient.attributes('target')).toBe('_blank')
    })

    it('offers no "I opened it" tick for a sent link that is not a web address, so it cannot be published', async () => {
      vi.mocked(getAdminSubmission).mockResolvedValue(
        review({ ingredients: [review().ingredients[0]!, newIngredient('javascript:alert(1)')] }, { sources: [{ url: 'javascript:alert(1)', title: 'Bad', claims: ['listing'] }] }),
      )
      const { wrapper } = await mountReview()

      expect(wrapper.find('input.tick-source').exists()).toBe(false)
      await wrapper.findAll('input.decision-option')[0]!.setValue(true)
      expect(wrapper.find('input.publish-ingredient-source').exists()).toBe(false)
    })

    it("shows hidden characters in the sender's name, the product, an ingredient, a benefit, a source title and known-for as markers, with the warning", async () => {
      vi.mocked(getAdminQueue).mockResolvedValue({
        counts: { pending: 1, approved: 0, rejected: 0 },
        submissions: [
          {
            id: 'sub-1',
            status: 'pending',
            created_at: '2026-10-01T08:00:00Z',
            submitter_name: 'No\u202Ek',
            summary: { name: 'Gel\u202E Toner', brand: 'Exa\u200Bmple', category: 'Toners', ingredient_count: 2 },
            flags: { possible_duplicate: false, new_ingredient_count: 1, has_source: true, has_photo: false },
          },
        ],
      })
      vi.mocked(getAdminSubmission).mockResolvedValue(
        review(
          { submitter_name: 'No\u202Ek', ingredients: [review().ingredients[0]!, newIngredient('https://ingredient.example/phyto', 'Phyto\u200Bsphingosine', 'Barrier\u202E support')] },
          { name: 'Gel\u202E Toner', benefits: ['Hydr\u200Bates'], sources: [{ url: 'https://brand.example/toner', title: 'Brand\u2066 page', claims: ['listing'] }] },
        ),
      )
      const { wrapper } = await mountReview()

      expect(wrapper.get('.review-title').text()).toContain('Example Brand Gel[U+202E] Toner')
      expect(wrapper.get('.review-title .hidden-chars-warning').text()).toBe('This text contains hidden characters')
      expect(wrapper.get('.review-meta').text()).toContain('From No[U+202E]k')
      expect(wrapper.get('.decision-name').text()).toContain('Phyto[U+200B]sphingosine')
      expect(wrapper.get('.known-for').text()).toContain('Barrier[U+202E] support')
      expect(wrapper.get('input.tick-benefit').element.parentElement!.textContent).toContain('Hydr[U+200B]ates')
      expect(wrapper.get('.source-title').text()).toContain('Brand[U+2066] page')
      expect(wrapper.get('.queue-name').text()).toContain('Gel[U+202E] Toner')
      expect(wrapper.html()).not.toMatch(HIDDEN)
    })

    it('publishes a ticked benefit with its characters exactly as sent, since only the display changed', async () => {
      vi.mocked(getAdminSubmission).mockResolvedValue(review({ ingredients: [review().ingredients[0]!] }, { benefits: ['Hydr\u200Bates'], sources: [] }))
      const { approveSubmission } = await import('../../api/submissionsApi')
      vi.mocked(approveSubmission).mockResolvedValue({ product_id: 'p-9', slug: 'example-brand-hydrating-gel-toner' })
      const { wrapper } = await mountReview()

      await wrapper.get('button.publish-button').trigger('click')
      await wrapper.get('button.confirm-ok').trigger('click')
      await flushPromises()

      expect(vi.mocked(approveSubmission).mock.lastCall![1].publish_benefits).toEqual(['Hydr\u200Bates'])
    })

    it('offers to take hidden characters out of the product name, saved only with the corrections', async () => {
      vi.mocked(getAdminSubmission).mockResolvedValue(review({}, { name: 'Gel\u202E Toner' }))
      vi.mocked(editAdminSubmission).mockResolvedValue(review({}, { name: 'Gel Toner' }))
      const { wrapper } = await mountReview()

      const notice = wrapper.get('.corrections .hidden-chars-notice')
      expect(notice.text()).toContain('Gel[U+202E] Toner')
      await notice.get('button.remove-hidden-chars').trigger('click')
      expect((wrapper.get('#r-name').element as HTMLInputElement).value).toBe('Gel Toner')
      expect(editAdminSubmission).not.toHaveBeenCalled()

      await wrapper.get('button.save-corrections').trigger('click')
      await flushPromises()
      expect(editAdminSubmission).toHaveBeenCalledWith('sub-1', { name: 'Gel Toner' })
    })

    it('shows no photo for a stored image_path that is not an upload path, and the upload address for one that is', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.example')
      vi.mocked(getAdminSubmission).mockResolvedValue(review({}, { image_path: 'https://evil.example/x.jpg' }))
      const { wrapper } = await mountReview()
      expect(wrapper.find('img.review-photo').exists()).toBe(false)

      vi.mocked(getAdminSubmission).mockResolvedValue(review({}, { image_path: `submissions/${UUID}.jpg` }))
      const { wrapper: second } = await mountReview()
      expect(second.get('img.review-photo').attributes('src')).toBe(
        `https://project.supabase.example/storage/v1/object/public/product-images/submissions/${UUID}.jpg`,
      )
    })

    it('shows a replacement photo from the picked file, never the address the answer gave, and lets it go when the review closes', async () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:review-photo')
      const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      vi.mocked(uploadSubmissionImage).mockResolvedValue({ image_path: `submissions/${UUID}.jpg`, public_url: 'https://evil.example/x.jpg' })
      const { wrapper } = await mountReview()

      await chooseFile(wrapper, photo())
      expect(wrapper.get('img.review-photo').attributes('src')).toBe('blob:review-photo')

      mounted.pop()!.unmount()
      expect(revoke).toHaveBeenCalledWith('blob:review-photo')
    })

    it("words a refused replacement photo under the photo field: the rate limit, or the backend's text", async () => {
      vi.mocked(uploadSubmissionImage).mockRejectedValueOnce(httpError(429))
      const { wrapper } = await mountReview()
      await chooseFile(wrapper, photo())
      expect(wrapper.get('#r-photo-error').text()).toBe(RATE)

      vi.mocked(uploadSubmissionImage).mockRejectedValueOnce(httpError(422, { detail: 'The image could not be read.' }))
      await chooseFile(wrapper, photo())
      expect(wrapper.get('#r-photo-error').text()).toBe('The image could not be read.')
    })
  })

  describe('the product edit (links, hidden characters, refusals)', () => {
    it('shows hidden characters in the name, ingredients and benefits as markers, and the save sends the name cleaned only once asked', async () => {
      vi.mocked(getProductBySlug).mockResolvedValue(
        product({
          name: 'Hydrating\u202E Cleanser',
          benefits: ['Cle\u200Banses'],
          product_ingredients: [{ ingredients: { id: 'i-water', name: 'Wa\u200Bter', functional_group: 'Solvent' } }],
        }),
      )
      const { wrapper } = await mountEdit()

      expect(wrapper.get('.edit-ingredient-name').text()).toContain('Wa[U+200B]ter')
      expect(wrapper.get('.edit-benefit').text()).toContain('Cle[U+200B]anses')
      expect(wrapper.find('button[aria-label="Remove Wa[U+200B]ter"]').exists()).toBe(true)
      expect(wrapper.html()).not.toMatch(HIDDEN)

      await wrapper.get('.hidden-chars-notice button.remove-hidden-chars').trigger('click')
      await save(wrapper)
      expect(vi.mocked(updateProduct).mock.lastCall).toEqual(['p-1', { updated_at: UPDATED_AT, name: 'Hydrating Cleanser' }])
    })

    it("puts a refused link on the fact it backs, with the backend's msg", async () => {
      vi.mocked(updateProduct).mockRejectedValue(fieldError(['sources', 0, 'url'], 'Value error, links to private networks are not accepted'))
      const { wrapper } = await mountEdit()

      await wrapper.findAll('button.claim-toggle')[0]!.trigger('click')
      await wrapper.get('#claim-listing-url').setValue('http://192.168.1.10/p')
      await wrapper.get('#claim-listing-title').setValue('Shop page')
      await wrapper.get('button.claim-save').trigger('click')
      await save(wrapper)

      expect(wrapper.get('#claim-listing-error').text()).toBe('Links to private networks are not accepted')
      expect(wrapper.find('#claim-price-error').exists()).toBe(false)
    })

    it("words a 429 on save in the backend's words, or as a short wait", async () => {
      vi.mocked(updateProduct).mockRejectedValueOnce(httpError(429))
      const { wrapper } = await mountEdit()
      await wrapper.get('#e-desc').setValue('A gentle daily face wash.')
      await save(wrapper)
      expect(wrapper.get('.edit-banner').text()).toBe(RATE)

      vi.mocked(updateProduct).mockRejectedValueOnce(httpError(429, { detail: 'Too many saves. Try again in a minute.' }))
      await save(wrapper)
      expect(wrapper.get('.edit-banner').text()).toBe('Too many saves. Try again in a minute.')
    })

    it("words a refused photo under the photo field: the rate limit, or the backend's text", async () => {
      vi.mocked(uploadProductPhoto).mockRejectedValueOnce(httpError(429))
      const { wrapper } = await mountEdit()
      await chooseFile(wrapper, photo())
      expect(wrapper.get('#e-photo-error').text()).toBe(RATE)

      vi.mocked(uploadProductPhoto).mockRejectedValueOnce(httpError(413, { detail: 'The image is too large to process.' }))
      await chooseFile(wrapper, photo())
      expect(wrapper.get('#e-photo-error').text()).toBe('The image is too large to process.')
    })

    it('shows no photo for an image_url that is not a web address', async () => {
      vi.mocked(getProductBySlug).mockResolvedValue(product({ image_url: 'javascript:alert(1)' }))
      const { wrapper } = await mountEdit()
      expect(wrapper.find('img.photo-preview').exists()).toBe(false)
    })

    it('shows a new photo from the picked file, never the address the answer gave, and lets it go on removal', async () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:edit-photo')
      const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      vi.mocked(uploadProductPhoto).mockResolvedValue({ image_path: `products/${UUID}.webp`, public_url: 'https://evil.example/x.webp' })
      const { wrapper } = await mountEdit()

      await chooseFile(wrapper, photo())
      expect(wrapper.get('img.photo-preview').attributes('src')).toBe('blob:edit-photo')
      await wrapper.get('button.remove-photo').trigger('click')
      expect(revoke).toHaveBeenCalledWith('blob:edit-photo')
    })

    it('lets a new photo go when the page closes', async () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:edit-photo-2')
      const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      vi.mocked(uploadProductPhoto).mockResolvedValue({ image_path: `products/${UUID}.webp`, public_url: null })
      const { wrapper } = await mountEdit()
      await chooseFile(wrapper, photo())

      mounted.pop()!.unmount()
      expect(revoke).toHaveBeenCalledWith('blob:edit-photo-2')
    })

    it("shows a source's link marked nofollow ugc, and a stored link that is not a web address as text", async () => {
      vi.mocked(getProductBySlug).mockResolvedValue(
        product({
          product_sources: [
            { claim: 'listing', sources: { id: 's-1', url: 'https://shop.example/p', title: 'Shop page' } },
            { claim: 'price', sources: { id: 's-2', url: 'javascript:alert(1)', title: 'Bad link' } },
          ],
        }),
      )
      const { wrapper } = await mountEdit()

      const links = wrapper.findAll('a.claim-source')
      expect(links).toHaveLength(1)
      expect(links[0]!.attributes('rel')).toBe('noopener noreferrer nofollow ugc')
      expect(wrapper.text()).toContain('Bad link')
    })
  })

  describe('the submit form (refusals, hidden characters, photo preview)', () => {
    it("shows a 429 on send in the backend's words, such as the cap on submissions waiting, keeping the draft", async () => {
      vi.mocked(createSubmission).mockRejectedValue(httpError(429, { detail: 'You already have 5 products waiting for review.' }))
      const { wrapper } = await mountSubmit()
      await toExtras(wrapper)

      await send(wrapper)

      expect(wrapper.get('.submit-banner').text()).toBe('You already have 5 products waiting for review.')
      expect(wrapper.get('h1.step-title').text()).toBe('Anything else you know?')
    })

    it('shows a 429 on send with no text as a short wait', async () => {
      vi.mocked(createSubmission).mockRejectedValue(httpError(429))
      const { wrapper } = await mountSubmit()
      await toExtras(wrapper)
      await send(wrapper)
      expect(wrapper.get('.submit-banner').text()).toBe(RATE)
    })

    it("puts a refused link on its link card with the backend's msg", async () => {
      vi.mocked(createSubmission).mockRejectedValue(fieldError(['sources', 0, 'url'], 'Value error, links with a password are not accepted'))
      const { wrapper } = await mountSubmit()
      await toExtras(wrapper)
      await fillLink(wrapper, 'https://user:pw@shop.example/p')

      await send(wrapper)

      const url = wrapper.get('.source-card input[type="url"]')
      expect(url.attributes('aria-invalid')).toBe('true')
      expect(wrapper.get('.source-card').text()).toContain('Links with a password are not accepted')
      expect(wrapper.get('.submit-banner').text()).toBe('Some details need a fix before we can send this.')
    })

    it('words a 422 that names no field with the text the backend gave, at the top of the form', async () => {
      vi.mocked(createSubmission).mockRejectedValue(httpError(422, { detail: 'Links to private networks are not accepted' }))
      const { wrapper } = await mountSubmit()
      await toExtras(wrapper)
      await send(wrapper)
      expect(wrapper.get('.submit-banner').text()).toBe("It wasn't sent. Links to private networks are not accepted.")
    })

    it('sends the name with its hidden characters taken out', async () => {
      vi.mocked(createSubmission).mockResolvedValue({ id: 's-1', status: 'pending', created_at: null })
      const { wrapper } = await mountSubmit()
      await toExtras(wrapper, 'Gel\u202E Toner\u200B')
      await send(wrapper)
      expect(vi.mocked(createSubmission).mock.lastCall![0].name).toBe('Gel Toner')
    })

    it("words a refused photo under the photo field: the rate limit, or the backend's text", async () => {
      vi.mocked(uploadSubmissionImage).mockRejectedValueOnce(httpError(429))
      const { wrapper } = await mountSubmit()
      await chooseFile(wrapper, photo())
      expect(wrapper.get('#photo-err').text()).toBe(RATE)

      vi.mocked(uploadSubmissionImage).mockRejectedValueOnce(httpError(415, { detail: 'The image must be a JPEG, PNG or WebP file.' }))
      await chooseFile(wrapper, photo())
      expect(wrapper.get('#photo-err').text()).toBe('The image must be a JPEG, PNG or WebP file.')
    })

    it('lets the photo preview go when the photo is removed', async () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:submit-photo')
      const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      vi.mocked(uploadSubmissionImage).mockResolvedValue({ image_path: `submissions/${UUID}.jpg`, public_url: 'https://evil.example/x.jpg' })
      const { wrapper } = await mountSubmit()

      await chooseFile(wrapper, photo())
      expect(wrapper.get('.photo-preview img').attributes('src')).toBe('blob:submit-photo')
      await button(wrapper, 'Remove').trigger('click')
      expect(revoke).toHaveBeenCalledWith('blob:submit-photo')
    })

    it('keeps the photo preview while moving between steps, and lets it go when the page closes', async () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:submit-photo-2')
      const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      vi.mocked(uploadSubmissionImage).mockResolvedValue({ image_path: `submissions/${UUID}.jpg`, public_url: null })
      const { wrapper } = await mountSubmit()
      await chooseFile(wrapper, photo())

      await toExtras(wrapper)
      expect(revoke).not.toHaveBeenCalled()

      mounted.pop()!.unmount()
      expect(revoke).toHaveBeenCalledWith('blob:submit-photo-2')
    })
  })

  // Cases the mutation checks found missing: each rule could be broken with
  // every earlier case still passing.
  describe('mutation follow-ups (link schemes, photo previews, readable source)', () => {
    it('shows a sent link with another scheme that names a host, such as ftp://, as text, never as a link', async () => {
      vi.mocked(getAdminSubmission).mockResolvedValue(review({}, { sources: [{ url: 'ftp://files.example/toner', title: 'File', claims: ['listing'] }] }))
      const { wrapper } = await mountReview()

      expect(wrapper.find('a.source-link').exists()).toBe(false)
      expect(wrapper.get('.source-text').text()).toBe('ftp://files.example/toner (not a web link)')
      expect(wrapper.find('input.tick-source').exists()).toBe(false)
    })

    it('lets the first photo preview go when another photo replaces it on the submit form', async () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second')
      const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      vi.mocked(uploadSubmissionImage).mockResolvedValue({ image_path: `submissions/${UUID}.jpg`, public_url: null })
      const { wrapper } = await mountSubmit()

      await chooseFile(wrapper, photo())
      await chooseFile(wrapper, photo())

      expect(revoke).toHaveBeenCalledWith('blob:first')
      expect(revoke).not.toHaveBeenCalledWith('blob:second')
      expect(wrapper.get('.photo-preview img').attributes('src')).toBe('blob:second')
    })

    it('lets the photo preview go once the submission is sent', async () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:sent-photo')
      const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      vi.mocked(uploadSubmissionImage).mockResolvedValue({ image_path: `submissions/${UUID}.jpg`, public_url: null })
      vi.mocked(createSubmission).mockResolvedValue({ id: 's-1', status: 'pending', created_at: null })
      const { wrapper } = await mountSubmit()
      await chooseFile(wrapper, photo())
      await toExtras(wrapper)
      expect(revoke).not.toHaveBeenCalled()

      await send(wrapper)

      expect(wrapper.find('.submit-done').exists()).toBe(true)
      expect(revoke).toHaveBeenCalledWith('blob:sent-photo')
    })

    it('keeps every hidden character in the source code written as an escape, so a reviewer can see each one', () => {
      const sources = import.meta.glob('../../**/*.{ts,vue}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
      // Built from code points, so this file holds none of them either.
      const ranges: [number, number][] = [[0x200b, 0x200f], [0x202a, 0x202e], [0x2066, 0x2069], [0xfeff, 0xfeff]]
      const raw = new RegExp(`[${ranges.map(([a, b]) => `${String.fromCodePoint(a)}-${String.fromCodePoint(b)}`).join('')}]`)

      expect(Object.keys(sources).length).toBeGreaterThan(100)
      expect(Object.keys(sources)).toContain('../../utils/hiddenChars.ts')
      expect(Object.entries(sources).filter(([, text]) => raw.test(text)).map(([name]) => name)).toEqual([])
    })
  })

  // The backend's answers as confirmed for fix/submission-hardening 7863dd1,
  // word for word, landing where the user can act on them.
  describe('confirmed backend answers (exact texts, on screen)', () => {
    const LOCAL_HOST = 'Value error, must not point at a local or internal host'
    const LOCAL_HOST_SHOWN = 'Must not point at a local or internal host'

    it('shows the pending-cap 429 on send in the backend\'s exact words', async () => {
      const text = 'You already have 10 submissions waiting for review. You can send another once an admin has reviewed one.'
      vi.mocked(createSubmission).mockRejectedValue(httpError(429, { detail: text }))
      const { wrapper } = await mountSubmit()
      await toExtras(wrapper)
      await send(wrapper)
      expect(wrapper.get('.submit-banner').text()).toBe(text)
    })

    it.each([
      [429, 'Too many image uploads: at most 20 an hour. Try again later.'],
      [413, 'The image is larger than 5 MB.'],
      [413, 'The image has too many pixels: at most 40 megapixels.'],
      [415, 'The image must be a JPEG, PNG or WebP file.'],
      [415, 'The image could not be read. It may be damaged, or not really a JPEG, PNG or WebP file.'],
      [422, 'No photo was received. Please choose a photo and try again.'],
      [422, "Send exactly one file, in a field named 'file'."],
    ])('shows the upload\'s %i "%s" under the photo field, word for word', async (status, text) => {
      vi.mocked(uploadSubmissionImage).mockRejectedValue(httpError(status, { detail: text }))
      const { wrapper } = await mountSubmit()
      await chooseFile(wrapper, photo())
      expect(wrapper.get('#photo-err').text()).toBe(text)
      expect(wrapper.find('.photo-preview').exists()).toBe(false)
    })

    it('shows the product photo\'s 415 "could not be read" under its photo field', async () => {
      const text = 'The image could not be read. It may be damaged, or not really a JPEG, PNG or WebP file.'
      vi.mocked(uploadProductPhoto).mockRejectedValue(httpError(415, { detail: text }))
      const { wrapper } = await mountEdit()
      await chooseFile(wrapper, photo())
      expect(wrapper.get('#e-photo-error').text()).toBe(text)
    })

    it('puts a link refused at sources.i.url on the submit form\'s link card, with "Value error," taken off', async () => {
      vi.mocked(createSubmission).mockRejectedValue(fieldError(['sources', 0, 'url'], LOCAL_HOST))
      const { wrapper } = await mountSubmit()
      await toExtras(wrapper)
      await fillLink(wrapper, 'http://intranet.example/p')
      await send(wrapper)
      expect(wrapper.get('.source-card .field-error').text()).toBe(LOCAL_HOST_SHOWN)
    })

    it('puts a link refused at ingredients.i.details.source_url on that new ingredient\'s link field, back on the ingredients step', async () => {
      vi.mocked(createSubmission).mockRejectedValue(fieldError(['ingredients', 1, 'details', 'source_url'], LOCAL_HOST))
      const { wrapper } = await mountSubmit()
      await wrapper.get('#sub-name').setValue('Hydrating Gel Toner')
      await wrapper.get('#sub-brand').setValue('Example Brand')
      await button(wrapper, 'Toners').trigger('click')
      await wrapper.get('button.continue').trigger('click')
      await flushPromises()
      vi.mocked(matchIngredients).mockResolvedValue([
        { input: 'Water', id: 'i-water', name: 'Water', matched_alias: null, ambiguous: false },
        { input: 'Phytosphingosine', id: null, name: null, matched_alias: null, ambiguous: false },
      ])
      await wrapper.get('button.paste-toggle').trigger('click')
      await wrapper.get('textarea').setValue('Water, Phytosphingosine')
      await wrapper.get('button.paste-match').trigger('click')
      await flushPromises()
      await wrapper.get('section.new-details button.details-toggle').trigger('click')
      await wrapper.get('section.new-details input[type="url"]').setValue('http://localhost/phyto')
      await wrapper.get('button.continue').trigger('click')
      await flushPromises()

      await send(wrapper)

      expect(wrapper.get('h1.step-title').text()).toBe("What's in it? *")
      expect(wrapper.get('section.new-details input[type="url"]').attributes('aria-invalid')).toBe('true')
      expect(wrapper.get('section.new-details').text()).toContain(LOCAL_HOST_SHOWN)
    })

    it('shows a name the server cleaned to nothing (string_too_short) on the name field', async () => {
      vi.mocked(createSubmission).mockRejectedValue(
        httpError(422, { detail: [{ loc: ['body', 'name'], msg: 'String should have at least 1 character', type: 'string_too_short' }] }),
      )
      const { wrapper } = await mountSubmit()
      await toExtras(wrapper)
      await send(wrapper)
      expect(wrapper.get('h1.step-title').text()).toBe("What's the product?")
      expect(wrapper.get('#name-err').text()).toBe('String should have at least 1 character')
    })

    it('puts a link refused at publish_source_urls.i on that source\'s row beside its tick, with a plain line at the top', async () => {
      const { approveSubmission } = await import('../../api/submissionsApi')
      vi.mocked(approveSubmission).mockRejectedValue(fieldError(['publish_source_urls', 0], LOCAL_HOST))
      const { wrapper } = await mountReview()
      await wrapper.get('input.tick-source').setValue(true)
      await wrapper.findAll('input.decision-option')[1]!.setValue(true)

      await wrapper.get('button.publish-button').trigger('click')
      await wrapper.get('button.confirm-ok').trigger('click')
      await flushPromises()

      expect(vi.mocked(approveSubmission).mock.lastCall![1].publish_source_urls).toEqual(['https://brand.example/toner'])
      const row = wrapper.get('.source-row')
      expect(row.get('.field-error').text()).toBe(LOCAL_HOST_SHOWN)
      expect(row.get('input.tick-source').attributes('aria-describedby')).toBe(row.get('.field-error').attributes('id'))
      expect(wrapper.get('.action-problem').text()).toBe("A link wasn't accepted, so nothing was published.")
      expect(wrapper.get('.action-problem').text()).not.toContain('publish_source_urls')
    })

    it('puts a link refused at publish_source_urls.i on the new ingredient whose own link it was', async () => {
      const { approveSubmission } = await import('../../api/submissionsApi')
      vi.mocked(approveSubmission).mockRejectedValue(fieldError(['publish_source_urls', 0], LOCAL_HOST))
      vi.mocked(getAdminSubmission).mockResolvedValue(review({}, { sources: [] }))
      const { wrapper } = await mountReview()
      await wrapper.findAll('input.decision-option')[0]!.setValue(true)
      await wrapper.get('select.functional-group').setValue('Humectant')
      await wrapper.get('input.publish-ingredient-source').setValue(true)

      await wrapper.get('button.publish-button').trigger('click')
      await wrapper.get('button.confirm-ok').trigger('click')
      await flushPromises()

      expect(vi.mocked(approveSubmission).mock.lastCall![1].publish_source_urls).toEqual(['https://ingredient.example/phyto'])
      expect(wrapper.get('.ingredient-decision .field-error').text()).toBe(LOCAL_HOST_SHOWN)
    })

    it('puts a link refused at ingredients.i.details.source_url, when picking a match sent the list, on that ingredient\'s card', async () => {
      const several = { ...newIngredient('http://10.0.0.5/phyto'), existing_matches: [{ id: 'i-a', name: 'Ceramide NP' }, { id: 'i-b', name: 'Ceramide AP' }] }
      vi.mocked(getAdminSubmission).mockResolvedValue(
        review({ ingredients: [review().ingredients[0]!, several] }, { ingredients: [{ ingredient_id: 'i-0' }, { new_name: 'Phytosphingosine', details: { source_url: 'http://10.0.0.5/phyto' } }] }),
      )
      vi.mocked(editAdminSubmission).mockRejectedValue(fieldError(['ingredients', 1, 'details', 'source_url'], LOCAL_HOST))
      const { wrapper } = await mountReview()

      await wrapper.findAll('button.use-match')[0]!.trigger('click')
      await flushPromises()

      expect(vi.mocked(editAdminSubmission).mock.lastCall![1].ingredients).toEqual([{ ingredient_id: 'i-0' }, { ingredient_id: 'i-a' }])
      expect(wrapper.get('.ingredient-decision .field-error').text()).toBe(LOCAL_HOST_SHOWN)
      expect(wrapper.get('.action-problem').text()).toBe("A link wasn't accepted, so your corrections weren't saved.")
    })

    it('puts a link refused at sources.i.url on the product edit\'s fact row', async () => {
      vi.mocked(updateProduct).mockRejectedValue(fieldError(['sources', 0, 'url'], LOCAL_HOST))
      const { wrapper } = await mountEdit()
      await wrapper.findAll('button.claim-toggle')[0]!.trigger('click')
      await wrapper.get('#claim-listing-url').setValue('http://localhost/p')
      await wrapper.get('#claim-listing-title').setValue('Shop page')
      await wrapper.get('button.claim-save').trigger('click')
      await save(wrapper)
      expect(wrapper.get('#claim-listing-error').text()).toBe(LOCAL_HOST_SHOWN)
    })
  })

  describe('confirmed backend rules (hidden-character set, plain field words)', () => {
    const ch = (cp: number) => String.fromCodePoint(cp)
    // The backend's extra set, each end of each range, built from code points.
    const EXTRA = [0xad, 0x61c, 0x180e, 0x2060, 0x2064, 0x206a, 0x206f, 0xfff9, 0xfffb, 0xe0000, 0xe0041, 0xe007f]

    it('finds, marks and strips every character the backend removes, including the tag characters', () => {
      for (const cp of EXTRA) {
        const text = `Cera${ch(cp)}Ve`
        expect(hasHiddenChars(text)).toBe(true)
        expect(stripHiddenChars(text)).toBe('CeraVe')
        expect(revealHiddenChars(text)).toBe(`Cera[U+${cp.toString(16).toUpperCase().padStart(4, '0')}]Ve`)
      }
    })

    it('finds a lone surrogate, and leaves a whole emoji alone', () => {
      const lone = String.fromCharCode(0xd800)
      expect(hasHiddenChars(`a${lone}b`)).toBe(true)
      expect(revealHiddenChars(`a${lone}b`)).toBe('a[U+D800]b')
      expect(hasHiddenChars(`Glow ${ch(0x1f600)}`)).toBe(false)
    })

    it('leaves characters just outside the backend\'s ranges alone', () => {
      for (const cp of [0xac, 0x61b, 0x2065, 0x2070, 0xfffc, 0xe0080]) expect(hasHiddenChars(`a${ch(cp)}b`)).toBe(false)
    })

    it('sends no tag character or soft hyphen from the submit form', () => {
      const body = buildSubmissionBody({ ...emptyDraft(), name: `Gel${ch(0xe0041)}${ch(0xad)} Toner`, brand: 'Example', category: 'Toners', ingredients: [], sources: [] })
      expect(body.name).toBe('Gel Toner')
    })

    it('names a refused field in words, never by its request path', () => {
      expect(fieldWords('publish_source_urls.0')).toBe('a link')
      expect(fieldWords('ingredients.2.details.source_url')).toBe("an ingredient's link")
      expect(fieldWords('ingredients.2.new_name')).toBe('an ingredient')
      expect(fieldWords('name')).toBe('the name')
      expect(fieldWords('updated_at')).toBeNull()
    })

    it('words a review 422 with no link and no form field in plain words, with no dotted path', () => {
      const ticked = readReviewProblem(readApiProblem(fieldError(['publish_benefits', 0], 'Value error, not in the submission')), 'approve')
      expect(ticked.message).toBe("Something wasn't accepted (a ticked benefit: Not in the submission), so nothing was published.")
      const unnamed = readReviewProblem(readApiProblem(fieldError(['updated_at'], 'Field required')), 'save')
      expect(unnamed.message).toBe("Something wasn't accepted (Field required), so your corrections weren't saved.")
      for (const read of [ticked, unnamed]) expect(read.message).not.toMatch(/[a-z_]+\.\d|_/)
    })

    it('counts which review positions a corrections PATCH sent, skipping stored items that are no ingredient', () => {
      const stored = [{ ingredient_id: 'i-0' }, null, { new_name: 'Phytosphingosine' }]
      expect(sentIngredientPositions(stored)).toEqual([0, 2])
      expect(sentIngredientPositions(stored, 1)).toEqual([0, 1, 2])
    })

    it('puts the i-th refused link of the approve body on its row, and still says a link was refused when the index is unknown', () => {
      const detail = review()
      const payload = readReviewPayload(detail.submission)
      const refused = readApiProblem(fieldError(['publish_source_urls', 1], 'Value error, must not contain a user name or password'))
      const read = readReviewProblem(refused, 'approve', null, { payload, detail, sent: { publishUrls: ['https://brand.example/toner', 'https://ingredient.example/phyto'] } })
      expect(read.links).toEqual({ sources: {}, ingredients: { 1: 'Must not contain a user name or password' } })
      const unknown = readReviewProblem(refused, 'approve', null, { payload, detail, sent: { publishUrls: [] } })
      expect(unknown.links).toEqual({ sources: {}, ingredients: {} })
      expect(unknown.message).toBe("A link wasn't accepted, so nothing was published.")
    })
  })

  // Cases the mutation checks on a99dd5a found missing: in every earlier case
  // the Nth ingredient sent was also review position N.
  describe('mutation follow-ups (ingredient positions sent)', () => {
    it('reads ingredients.i.details.source_url as the i-th ingredient sent, not review position i', () => {
      const refused = readApiProblem(fieldError(['ingredients', 1, 'details', 'source_url'], 'Value error, must not point at a local or internal host'))
      const read = readReviewProblem(refused, 'save', null, { sent: { ingredientPositions: [0, 2] } })
      expect(read.links.ingredients).toEqual({ 2: 'Must not point at a local or internal host' })
    })

    it('puts a link refused while converting an old-format row on that ingredient\'s row, past a stored item that was not sent', async () => {
      const stored = ['Niacinamide', null, { new_name: 'Phytosphingosine', details: { source_url: 'http://localhost/phyto' } }]
      vi.mocked(getAdminSubmission).mockResolvedValue(
        review(
          {
            ingredients: [
              { position: 0, ingredient_id: null, name: 'Niacinamide', status: 'new', details: null, existing_matches: [] },
              { position: 2, ingredient_id: null, name: 'Phytosphingosine', status: 'new', details: { roles: [], known_for: '', source_url: 'http://localhost/phyto' }, existing_matches: [] },
            ],
          },
          { ingredients: stored },
        ),
      )
      vi.mocked(editAdminSubmission).mockRejectedValue(fieldError(['ingredients', 1, 'details', 'source_url'], 'Value error, must not point at a local or internal host'))
      const { wrapper } = await mountReview()

      await wrapper.get('button.convert-legacy').trigger('click')
      await flushPromises()

      expect(vi.mocked(editAdminSubmission).mock.lastCall![1].ingredients).toEqual([
        { new_name: 'Niacinamide' },
        { new_name: 'Phytosphingosine', details: { source_url: 'http://localhost/phyto' } },
      ])
      const rows = wrapper.findAll('li.review-ingredient')
      expect(rows[1]!.get('.field-error').text()).toBe('Must not point at a local or internal host')
      expect(rows[0]!.find('.field-error').exists()).toBe(false)
      expect(wrapper.get('.action-problem').text()).toBe("A link wasn't accepted, so your corrections weren't saved.")
    })
  })
})
