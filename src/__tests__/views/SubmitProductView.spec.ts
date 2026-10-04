import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, RouterView, type Router } from 'vue-router'
import { defineComponent, h } from 'vue'

vi.mock('../../api/metaApi', () => ({
  getCategories: vi.fn(),
  getConcernTags: vi.fn(),
}))
vi.mock('../../api/submissionsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/submissionsApi')>()),
  createSubmission: vi.fn(),
  uploadSubmissionImage: vi.fn(),
}))
vi.mock('../../api/ingredientsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/ingredientsApi')>()),
  searchIngredients: vi.fn(),
  matchIngredients: vi.fn(),
}))

import { getCategories, getConcernTags } from '../../api/metaApi'
import { createSubmission, uploadSubmissionImage } from '../../api/submissionsApi'
import { matchIngredients, searchIngredients } from '../../api/ingredientsApi'
import SubmitProductView from '../../views/SubmitProductView.vue'

const CATEGORIES = ['Cleansers', 'Toners', 'Serums']
const TAGS = ['Dry skin', 'Sensitive']

const match = (input: string, id: string | null, ambiguous = false) => ({
  input,
  id,
  name: id ? input : null,
  matched_alias: null,
  ambiguous,
})

/**
 * Mount through a real RouterView on a memory history, because the leave
 * warning is a route guard (onBeforeRouteLeave) and only runs for a component
 * the router rendered. Teleport is stubbed so the leave dialog stays in the
 * wrapper.
 */
// Unmounted after each case, so no earlier view's beforeunload listener is
// still on window when a later case dispatches the event.
const mounted: VueWrapper[] = []

const mountView = async () => {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/explore', component: { template: '<div class="explore-page">explore</div>' } },
      { path: '/submissions', component: { template: '<div class="mine-page">mine</div>' } },
      { path: '/submissions/new', component: SubmitProductView },
    ],
  })
  await router.push('/explore')
  await router.push('/submissions/new')
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  const Root = defineComponent({ render: () => h(RouterView) })
  const wrapper = mount(Root, {
    global: { plugins: [pinia, router], stubs: { teleport: true } },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

const title = (w: VueWrapper) => w.get('h1.step-title').text()
const button = (w: VueWrapper, text: string) => {
  const found = w.findAll('button').find((b) => b.text().trim() === text)
  if (!found) throw new Error(`No button "${text}"`)
  return found
}

const fillBasics = async (w: VueWrapper) => {
  await w.get('#sub-name').setValue('Hydrating Gel Toner')
  await w.get('#sub-brand').setValue('Example Brand')
  await button(w, 'Toners').trigger('click')
}

const toIngredients = async (w: VueWrapper) => {
  await fillBasics(w)
  await w.get('button.continue').trigger('click')
  await flushPromises()
}

const paste = async (w: VueWrapper, text: string) => {
  const toggle = w.get('button.paste-toggle')
  if (toggle.attributes('aria-expanded') === 'false') await toggle.trigger('click')
  await w.get('textarea').setValue(text)
  await w.get('button.paste-match').trigger('click')
  await flushPromises()
}

const toExtras = async (w: VueWrapper) => {
  await toIngredients(w)
  vi.mocked(matchIngredients).mockResolvedValue([match('Water', 'i-water'), match('Phytosphingosine', null)])
  await paste(w, 'Water, Phytosphingosine')
  await w.get('button.continue').trigger('click')
  await flushPromises()
}

const rows = (w: VueWrapper) =>
  w.findAll('.ingredient-row').map((r) => [r.get('.ingredient-name').text(), r.get('.ingredient-badge').text()])

describe('src/views/SubmitProductView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(getCategories).mockResolvedValue(CATEGORIES)
    vi.mocked(getConcernTags).mockResolvedValue(TAGS)
    vi.mocked(searchIngredients).mockResolvedValue([])
  })
  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  describe('steps (navigation and validation)', () => {
    it('opens on Basics, marked as the current step, with the categories from the backend as chips', async () => {
      const { wrapper } = await mountView()

      expect(title(wrapper)).toBe("What's the product?")
      expect(wrapper.find('ol[aria-label="Steps"] [aria-current="step"]').text()).toContain('1 · Basics')
      expect(wrapper.findAll('button[aria-pressed]').map((b) => b.text())).toEqual(CATEGORIES)
    })

    it('holds Basics with an inline error on each missing field, wired to it, and focuses the first', async () => {
      const { wrapper } = await mountView()

      await wrapper.get('button.continue').trigger('click')
      await flushPromises()

      expect(title(wrapper)).toBe("What's the product?")
      const name = wrapper.get('#sub-name')
      expect(name.attributes('aria-invalid')).toBe('true')
      expect(name.attributes('aria-describedby')).toBe('name-err')
      expect(wrapper.get('#name-err').text()).toBe('Add the product name')
      expect(wrapper.get('#brand-err').text()).toBe('Add the brand name')
      expect(wrapper.get('#category-err').text()).toBe('Choose a category')
      expect(document.activeElement).toBe(name.element)
    })

    it('clears a field error as soon as the field is typed in', async () => {
      const { wrapper } = await mountView()
      await wrapper.get('button.continue').trigger('click')

      await wrapper.get('#sub-name').setValue('Gel Toner')

      expect(wrapper.find('#name-err').exists()).toBe(false)
      expect(wrapper.get('#sub-name').attributes('aria-invalid')).toBeUndefined()
    })

    it('moves on to Ingredients once Basics is complete', async () => {
      const { wrapper } = await mountView()

      await toIngredients(wrapper)

      expect(title(wrapper)).toBe("What's in it? *")
      expect(wrapper.find('ol[aria-label="Steps"] [aria-current="step"]').text()).toContain('2 · Ingredients')
    })

    it('needs at least one ingredient before Extras', async () => {
      const { wrapper } = await mountView()
      await toIngredients(wrapper)

      await wrapper.get('button.continue').trigger('click')
      await flushPromises()

      expect(title(wrapper)).toBe("What's in it? *")
      expect(wrapper.get('#ingredients-err').text()).toBe('Add at least one ingredient')
      expect(document.activeElement?.id).toBe('sub-ingredient-search')
    })

    it('goes back a step without losing what was entered', async () => {
      const { wrapper } = await mountView()
      await toIngredients(wrapper)

      await wrapper.get('button.back').trigger('click')
      await flushPromises()

      expect(title(wrapper)).toBe("What's the product?")
      expect((wrapper.get('#sub-name').element as HTMLInputElement).value).toBe('Hydrating Gel Toner')
      expect(button(wrapper, 'Toners').attributes('aria-pressed')).toBe('true')
    })

    it('offers to try again when the categories could not be loaded', async () => {
      vi.mocked(getCategories).mockRejectedValueOnce(new Error('Network Error'))
      const { wrapper } = await mountView()

      expect(wrapper.text()).toContain("We couldn't load the categories.")
      await button(wrapper, 'Try again').trigger('click')
      await flushPromises()

      expect(getCategories).toHaveBeenCalledTimes(2)
      expect(button(wrapper, 'Serums').exists()).toBe(true)
    })
  })

  describe('photo (upload)', () => {
    const choose = async (w: VueWrapper, file: File) => {
      const input = w.get('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
      await input.trigger('change')
      await flushPromises()
    }

    it('refuses a file that is not a JPG, PNG or WebP before uploading anything', async () => {
      const { wrapper } = await mountView()

      await choose(wrapper, new File(['x'], 'front.gif', { type: 'image/gif' }))

      expect(uploadSubmissionImage).not.toHaveBeenCalled()
      expect(wrapper.get('#photo-err').text()).toContain('JPG, PNG or WebP')
    })

    it('refuses a photo over 5 MB before uploading it', async () => {
      const { wrapper } = await mountView()
      const big = new File(['x'], 'front.jpg', { type: 'image/jpeg' })
      Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 })

      await choose(wrapper, big)

      expect(uploadSubmissionImage).not.toHaveBeenCalled()
      expect(wrapper.get('#photo-err').text()).toContain('over 5 MB')
    })

    it('uploads an accepted photo and shows it with its name', async () => {
      vi.mocked(uploadSubmissionImage).mockResolvedValue({ image_path: 'submissions/abc.jpg', public_url: 'https://cdn.example/abc.jpg' })
      const { wrapper } = await mountView()

      await choose(wrapper, new File(['x'], 'front.jpg', { type: 'image/jpeg' }))

      expect(uploadSubmissionImage).toHaveBeenCalledTimes(1)
      expect(wrapper.get('.photo-preview img').attributes('src')).toBe('https://cdn.example/abc.jpg')
      expect(wrapper.get('.photo-preview').text()).toContain('front.jpg')
    })

    it.each([
      [413, 'over 5 MB'],
      [415, 'JPG, PNG or WebP'],
    ])('words the server refusing the photo with %i', async (status, words) => {
      vi.mocked(uploadSubmissionImage).mockRejectedValue({ response: { status, data: { detail: 'refused' } } })
      const { wrapper } = await mountView()

      await choose(wrapper, new File(['x'], 'front.png', { type: 'image/png' }))

      expect(wrapper.get('#photo-err').text()).toContain(words)
      expect(wrapper.find('.photo-preview').exists()).toBe(false)
    })
  })

  describe('ingredients (search, paste, reorder)', () => {
    it('adds a picked ingredient from our list and a typed one as new, with badges and counts', async () => {
      vi.useFakeTimers()
      vi.mocked(searchIngredients).mockResolvedValue([{ id: 'i-nia', name: 'Niacinamide', functional_group: 'Vitamin B3', matched_alias: null }])
      const { wrapper } = await mountView()
      await toIngredients(wrapper)
      const search = wrapper.get('#sub-ingredient-search')

      await search.setValue('nia')
      await vi.advanceTimersByTimeAsync(250)
      await flushPromises()
      await search.trigger('keydown', { key: 'Enter' })
      await search.setValue('Phytosphingosine')
      await vi.advanceTimersByTimeAsync(250)
      await flushPromises()
      await search.trigger('keydown', { key: 'ArrowUp' })
      await search.trigger('keydown', { key: 'Enter' })

      expect(rows(wrapper)).toEqual([
        ['Niacinamide', 'In our list'],
        ['Phytosphingosine', 'New'],
      ])
      expect(wrapper.get('.ingredient-count').text()).toBe('2 ingredients')
      expect(wrapper.get('.ingredient-breakdown').text()).toBe('1 in our list · 1 new')
    })

    it('matches a pasted list in order and adds it, skipping ones already listed', async () => {
      const { wrapper } = await mountView()
      await toIngredients(wrapper)
      vi.mocked(matchIngredients).mockResolvedValueOnce([match('Water', 'i-water')])
      await paste(wrapper, 'Water')

      vi.mocked(matchIngredients).mockResolvedValueOnce([match('Water', 'i-water'), match('Glycerin', 'i-gly'), match('Zz New', null)])
      await paste(wrapper, 'Water,\nGlycerin, Zz New')

      expect(matchIngredients).toHaveBeenLastCalledWith(['Water', 'Glycerin', 'Zz New'])
      expect(rows(wrapper)).toEqual([
        ['Water', 'In our list'],
        ['Glycerin', 'In our list'],
        ['Zz New', 'New'],
      ])
      expect(wrapper.get('.paste-message').text()).toBe('Added 2, 1 already in your list.')
    })

    it('shows a name that matches several as "Pick one", and holds the step until it is settled', async () => {
      const { wrapper } = await mountView()
      await toIngredients(wrapper)
      vi.mocked(matchIngredients).mockResolvedValue([match('Water', 'i-water'), match('Vitamin C', null, true)])

      await paste(wrapper, 'Water, Vitamin C')
      await wrapper.get('button.continue').trigger('click')
      await flushPromises()

      expect(rows(wrapper)[1]).toEqual(['Vitamin C', 'Pick one'])
      expect(wrapper.get('#ingredients-err').text()).toBe('Pick a match for 1 ingredient')
      expect(wrapper.get('.row-problem').text()).toContain('matches several in our list')
      expect(title(wrapper)).toBe("What's in it? *")

      await wrapper.get('button.add-as-new').trigger('click')
      expect(rows(wrapper)[1]).toEqual(['Vitamin C', 'New'])

      await wrapper.get('button.continue').trigger('click')
      await flushPromises()
      expect(title(wrapper)).toBe('Anything else you know?')
    })

    it('says so when the pasted list could not be checked, keeping the text', async () => {
      const { wrapper } = await mountView()
      await toIngredients(wrapper)
      vi.mocked(matchIngredients).mockRejectedValue(new Error('Network Error'))

      await paste(wrapper, 'Water, Glycerin')

      expect(wrapper.get('.paste-message').text()).toContain("couldn't check the list")
      expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Water, Glycerin')
      expect(rows(wrapper)).toEqual([])
    })

    it('reorders with the up and down buttons and removes a row', async () => {
      const { wrapper } = await mountView()
      await toIngredients(wrapper)
      vi.mocked(matchIngredients).mockResolvedValue([match('Water', 'i-water'), match('Glycerin', 'i-gly'), match('Allantoin', 'i-all')])
      await paste(wrapper, 'Water, Glycerin, Allantoin')

      await wrapper.get('button[aria-label="Move Allantoin up"]').trigger('click')
      expect(rows(wrapper).map((r) => r[0])).toEqual(['Water', 'Allantoin', 'Glycerin'])

      await wrapper.get('button[aria-label="Move Water down"]').trigger('click')
      expect(rows(wrapper).map((r) => r[0])).toEqual(['Allantoin', 'Water', 'Glycerin'])

      await wrapper.get('button[aria-label="Remove Water"]').trigger('click')
      expect(rows(wrapper).map((r) => r[0])).toEqual(['Allantoin', 'Glycerin'])
      expect(wrapper.get('button[aria-label="Move Allantoin up"]').attributes('disabled')).toBeDefined()
    })

    it('offers optional details for each new ingredient behind a toggle that reports its state', async () => {
      const { wrapper } = await mountView()
      await toIngredients(wrapper)
      vi.mocked(matchIngredients).mockResolvedValue([match('Water', 'i-water'), match('Phytosphingosine', null)])
      await paste(wrapper, 'Water, Phytosphingosine')

      const cards = wrapper.findAll('section.new-details')
      expect(cards).toHaveLength(1)
      expect(cards[0]!.text()).toContain('Phytosphingosine')
      const toggle = cards[0]!.get('button.details-toggle')
      expect(toggle.attributes('aria-expanded')).toBe('false')

      await toggle.trigger('click')

      expect(toggle.attributes('aria-expanded')).toBe('true')
      expect(cards[0]!.findAll('button[aria-pressed]').map((b) => b.text())).toContain('Barrier support')
    })
  })

  describe('sending', () => {
    it('sends the draft as the submission body and shows the done state, with a way to My submissions', async () => {
      vi.mocked(createSubmission).mockResolvedValue({ id: 's-1', status: 'pending', created_at: null })
      const { wrapper } = await mountView()
      await toExtras(wrapper)
      await wrapper.get('input[placeholder="e.g. 450"]').setValue('450')
      await button(wrapper, '12 months').trigger('click')
      await button(wrapper, 'Dry skin').trigger('click')

      await wrapper.get('button.send').trigger('click')
      await flushPromises()

      expect(createSubmission).toHaveBeenCalledWith({
        name: 'Hydrating Gel Toner',
        brand: 'Example Brand',
        category: 'Toners',
        image_path: null,
        ingredients: [{ ingredient_id: 'i-water' }, { new_name: 'Phytosphingosine' }],
        price_thb: 450,
        price_usd: null,
        pao_months: 12,
        benefits: [],
        good_for: ['Dry skin'],
        sources: [],
        note: null,
      })
      expect(wrapper.get('.submit-done h1').text()).toBe('Sent for review')
      expect(wrapper.get('.submit-done').text()).toContain('Waiting for review')
      expect(wrapper.get('.submit-done a').attributes('href')).toBe('/submissions')
    })

    it('summarises the draft before sending, with Edit buttons back to each step', async () => {
      const { wrapper } = await mountView()
      await toExtras(wrapper)

      const summary = wrapper.get('.check-summary')
      expect(summary.text()).toContain('Example Brand Hydrating Gel Toner')
      expect(summary.text()).toContain('Toners')
      expect(summary.get('.extras-summary').text()).toBe('Nothing added')

      await summary.get('button.edit-ingredients').trigger('click')
      await flushPromises()
      expect(title(wrapper)).toBe("What's in it? *")
    })

    it('puts a field the server refused back on its step, with a message at the top', async () => {
      vi.mocked(createSubmission).mockRejectedValue({
        response: { status: 422, data: { detail: [{ loc: ['body', 'brand'], msg: 'String should have at most 200 characters' }] } },
      })
      const { wrapper } = await mountView()
      await toExtras(wrapper)

      await wrapper.get('button.send').trigger('click')
      await flushPromises()

      expect(title(wrapper)).toBe("What's the product?")
      expect(wrapper.get('[role="alert"].submit-banner').text()).toBe('Some details need a fix before we can send this.')
      expect(wrapper.get('#brand-err').text()).toBe('String should have at most 200 characters')
    })

    it('marks an ingredient the backend no longer knows and lets the user add it as new instead', async () => {
      vi.mocked(createSubmission).mockRejectedValueOnce({
        response: { status: 422, data: { detail: 'unknown ingredient_id', code: 'SBUNK', details: ['i-water'] } },
      })
      const { wrapper } = await mountView()
      await toExtras(wrapper)

      await wrapper.get('button.send').trigger('click')
      await flushPromises()

      expect(title(wrapper)).toBe("What's in it? *")
      expect(wrapper.get('.row-problem').text()).toContain("can't find this one in our list")

      await wrapper.get('button.add-as-new').trigger('click')
      expect(rows(wrapper)[0]).toEqual(['Water', 'New'])
    })

    it('keeps everything and says so when SkinBuddy could not be reached', async () => {
      vi.mocked(createSubmission).mockRejectedValue(new Error('Network Error'))
      const { wrapper } = await mountView()
      await toExtras(wrapper)

      await wrapper.get('button.send').trigger('click')
      await flushPromises()

      expect(wrapper.get('.submit-banner').text()).toContain("couldn't reach SkinBuddy")
      expect(title(wrapper)).toBe('Anything else you know?')
      expect(wrapper.find('.submit-done').exists()).toBe(false)
    })

    it('starts a fresh, empty draft from "Submit another product"', async () => {
      vi.mocked(createSubmission).mockResolvedValue({ id: 's-1', status: 'pending', created_at: null })
      const { wrapper } = await mountView()
      await toExtras(wrapper)
      await wrapper.get('button.send').trigger('click')
      await flushPromises()

      await wrapper.get('button.submit-another').trigger('click')
      await flushPromises()

      expect(title(wrapper)).toBe("What's the product?")
      expect((wrapper.get('#sub-name').element as HTMLInputElement).value).toBe('')
    })
  })

  describe('leaving (unsaved-changes guard)', () => {
    it('leaves an untouched form without asking', async () => {
      const { wrapper, router } = await mountView()

      await wrapper.get('button[aria-label="Leave without submitting"]').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/explore')
    })

    it('asks before leaving a started form, with focus on "Keep editing", and stays when asked to', async () => {
      const { wrapper, router } = await mountView()
      await wrapper.get('#sub-name').setValue('Gel Toner')

      router.push('/submissions')
      await flushPromises()

      const dialog = wrapper.get('[role="dialog"]')
      expect(dialog.attributes('aria-modal')).toBe('true')
      expect(document.activeElement).toBe(dialog.get('button.keep-editing').element)

      await dialog.get('button.keep-editing').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/submissions/new')
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
      expect((wrapper.get('#sub-name').element as HTMLInputElement).value).toBe('Gel Toner')
    })

    it('keeps editing on Escape', async () => {
      const { wrapper, router } = await mountView()
      await wrapper.get('#sub-brand').setValue('Example Brand')

      router.push('/submissions')
      await flushPromises()
      await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/submissions/new')
    })

    it('leaves, losing the draft, when the user chooses to', async () => {
      const { wrapper, router } = await mountView()
      await wrapper.get('#sub-name').setValue('Gel Toner')

      router.push('/submissions')
      await flushPromises()
      await wrapper.get('button.leave-anyway').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/submissions')
    })

    it('does not ask once the submission has been sent', async () => {
      vi.mocked(createSubmission).mockResolvedValue({ id: 's-1', status: 'pending', created_at: null })
      const { wrapper, router } = await mountView()
      await toExtras(wrapper)
      await wrapper.get('button.send').trigger('click')
      await flushPromises()

      await router.push('/submissions')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/submissions')
    })

    it("asks the browser to warn before closing the tab on a started form, and not on an empty one", async () => {
      const { wrapper } = await mountView()
      const unload = () => {
        const event = new Event('beforeunload', { cancelable: true })
        window.dispatchEvent(event)
        return event.defaultPrevented
      }

      expect(unload()).toBe(false)
      await wrapper.get('#sub-name').setValue('Gel Toner')
      expect(unload()).toBe(true)
    })
  })

  describe('extras (benefits, period after opening, links)', () => {
    const lastBody = () => vi.mocked(createSubmission).mock.calls.at(-1)![0]

    it('adds a benefit as a removable chip, and refuses the same one twice', async () => {
      const { wrapper } = await mountView()
      await toExtras(wrapper)
      const input = wrapper.get('input[placeholder="Add a benefit"]')

      await input.setValue('Hydrates')
      await wrapper.get('button.add-benefit').trigger('click')
      await input.setValue('hydrates')
      await wrapper.get('button.add-benefit').trigger('click')

      expect(wrapper.findAll('.benefit-list li').map((li) => li.text())).toEqual(['Hydrates'])
      expect(wrapper.text()).toContain("That one's already added")
      expect(wrapper.find('button[aria-label="Remove Hydrates"]').exists()).toBe(true)
    })

    it('sends "Not printed" as no period after opening, and turns off a month chosen before it', async () => {
      vi.mocked(createSubmission).mockResolvedValue({ id: 's-1', status: 'pending', created_at: null })
      const { wrapper } = await mountView()
      await toExtras(wrapper)

      await button(wrapper, '24 months').trigger('click')
      await button(wrapper, 'Not printed').trigger('click')

      expect(button(wrapper, 'Not printed').attributes('aria-pressed')).toBe('true')
      expect(button(wrapper, '24 months').attributes('aria-pressed')).toBe('false')
      await wrapper.get('button.send').trigger('click')
      await flushPromises()
      expect(lastBody().pao_months).toBeNull()
    })

    it('offers up to five link cards, and sends a filled one with what it shows', async () => {
      vi.mocked(createSubmission).mockResolvedValue({ id: 's-1', status: 'pending', created_at: null })
      const { wrapper } = await mountView()
      await toExtras(wrapper)

      const card = wrapper.get('.source-card')
      await card.get('input[type="url"]').setValue('https://brand.example/toner')
      await card.get('input[placeholder="e.g. Brand product page"]').setValue('Brand product page')
      await card.findAll('button[aria-pressed]').find((b) => b.text() === 'Ingredient list')!.trigger('click')
      for (let i = 0; i < 4; i++) await wrapper.get('button.add-source').trigger('click')

      expect(wrapper.findAll('.source-card')).toHaveLength(5)
      expect(wrapper.find('button.add-source').exists()).toBe(false)

      await wrapper.get('button.send').trigger('click')
      await flushPromises()
      expect(lastBody().sources).toEqual([{ url: 'https://brand.example/toner', title: 'Brand product page', claims: ['listing'] }])
    })

    it('holds Send with an inline error on a link card that is only half filled', async () => {
      const { wrapper } = await mountView()
      await toExtras(wrapper)

      await wrapper.get('.source-card input[type="url"]').setValue('brand.example')
      await wrapper.get('button.send').trigger('click')
      await flushPromises()

      expect(createSubmission).not.toHaveBeenCalled()
      expect(wrapper.get('.source-card input[type="url"]').attributes('aria-invalid')).toBe('true')
      expect(wrapper.get('.source-card').text()).toContain('Choose what the link shows')
    })
  })
})
