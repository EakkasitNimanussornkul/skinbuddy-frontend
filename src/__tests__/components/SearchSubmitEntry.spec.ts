import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, RouterView, type Router } from 'vue-router'
import { defineComponent, h } from 'vue'

vi.mock('../../api/products', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  searchProducts: vi.fn(),
}))
vi.mock('../../api/metaApi', () => ({
  getCategories: vi.fn(),
  getConcernTags: vi.fn(),
}))
vi.mock('../../api/submissionsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/submissionsApi')>()),
  createSubmission: vi.fn(),
}))
vi.mock('../../api/ingredientsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/ingredientsApi')>()),
  searchIngredients: vi.fn(),
  matchIngredients: vi.fn(),
}))

import { searchProducts } from '../../api/products'
import { getCategories, getConcernTags } from '../../api/metaApi'
import { SUBMISSION_LIMITS, createSubmission } from '../../api/submissionsApi'
import { matchIngredients, searchIngredients } from '../../api/ingredientsApi'
import { emptyDraft, hasUserInput, nameFromQuery, prefillName } from '../../components/Submissions/submissionDraft'
import SearchAutocompleteInput from '../../components/Shared/SearchAutocompleteInput.vue'
import SubmitProductView from '../../views/SubmitProductView.vue'

const page = { template: '<div />' }

const makeRouter = async (address = '/') => {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: page },
      { path: '/explore', component: page },
      { path: '/product/:slug', component: page },
      { path: '/submissions/new', component: SubmitProductView },
    ],
  })
  await router.push(address)
  await router.isReady()
  return router
}

const mounted: VueWrapper[] = []
const track = (w: VueWrapper) => {
  mounted.push(w)
  return w
}

const PRODUCT = { id: 'p-1', brand: 'CeraVe', name: 'Foaming Gel Cleanser', category: 'Cleansers', slug: 'cerave-foaming-gel-cleanser' }

/** The search with `typed` entered, its suggestions open and the search settled. */
const typeIntoSearch = async (typed: string, found: unknown[]) => {
  vi.mocked(searchProducts).mockResolvedValue(found as never)
  const router = await makeRouter()
  const w = track(mount(SearchAutocompleteInput, { global: { plugins: [router] }, attachTo: document.body }))
  const input = w.get('input')
  await input.trigger('focus')
  await input.setValue(typed)
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
  return { w, router }
}

// U+200B (zero-width space) and U+202E (right-to-left override), built from
// code points so the source holds neither.
const ZWSP = String.fromCodePoint(0x200b)
const RLO = String.fromCodePoint(0x202e)

describe('feat/23 search suggestions and the submit-form name pre-fill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
  })
  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
    document.body.innerHTML = ''
  })

  describe('SearchAutocompleteInput (no match)', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('says "No products match that yet" with a plain next step, instead of the old wording', async () => {
      const { w } = await typeIntoSearch('heartleaf calming toner', [])
      const empty = w.get('.search-no-match')

      expect(empty.text()).toContain('No products match that yet')
      expect(empty.text()).toContain('Check the spelling, or send it to us.')
      expect(w.text()).not.toContain('No immediate product formulas match')
    })

    it('offers to submit the product, saying the form starts with the typed name', async () => {
      const { w } = await typeIntoSearch('  heartleaf calming toner ', [])
      const link = w.get('a.search-submit-named')

      expect(link.text().replace(/\s+/g, ' ').trim()).toBe(
        'Couldn\'t find your product? Submit it We\'ll start the form with "heartleaf calming toner" as the name.',
      )
      expect(link.attributes('href')).toBe('/submissions/new?name=heartleaf+calming+toner')
      expect(w.find('a.search-submit-other').exists()).toBe(false)
    })

    it('builds the link from a location object, so a name with & # = or ? arrives whole', async () => {
      const typed = 'Gel & Cream #2 = 50ml?'
      const { w, router } = await typeIntoSearch(typed, [])

      await w.get('a.search-submit-named').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/submissions/new')
      expect(router.currentRoute.value.query).toEqual({ name: typed })
    })

    it('closes the suggestions once the submit row is followed', async () => {
      const { w } = await typeIntoSearch('heartleaf', [])

      await w.get('a.search-submit-named').trigger('click')
      await flushPromises()

      expect(w.find('.search-no-match').exists()).toBe(false)
    })
  })

  describe('SearchAutocompleteInput (some matches)', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('adds a quiet last row, after the matches, to submit a product that is not among them', async () => {
      const { w } = await typeIntoSearch('gel cleanser', [PRODUCT])
      const row = w.get('a.search-submit-other')

      expect(row.text()).toBe("Not the one you're looking for? Submit your product")
      expect(row.attributes('href')).toBe('/submissions/new')
      expect(w.text()).toContain('Foaming Gel Cleanser')
      // Last in the suggestions, below the matches.
      expect(row.element.parentElement!.lastElementChild).toBe(row.element)
      expect(w.find('.search-no-match').exists()).toBe(false)
    })

    it('shows neither submit row while the search is still running', async () => {
      vi.mocked(searchProducts).mockReturnValue(new Promise(() => {}))
      const router = await makeRouter()
      const w = track(mount(SearchAutocompleteInput, { global: { plugins: [router] }, attachTo: document.body }))
      await w.get('input').trigger('focus')
      await w.get('input').setValue('gel cleanser')
      await vi.advanceTimersByTimeAsync(300)

      expect(w.text()).toContain('Matching formulation matrix...')
      expect(w.find('a.search-submit-other').exists()).toBe(false)
      expect(w.find('a.search-submit-named').exists()).toBe(false)
    })

    it('hides the "Not the one" row while a new search runs over the last one\'s matches', async () => {
      const { w } = await typeIntoSearch('gel cleanser', [PRODUCT])
      expect(w.find('a.search-submit-other').exists()).toBe(true)

      vi.mocked(searchProducts).mockReturnValue(new Promise(() => {}))
      await w.get('input').setValue('gel cleanser foam')
      await vi.advanceTimersByTimeAsync(300)

      expect(w.text()).toContain('Matching formulation matrix...')
      expect(w.find('a.search-submit-other').exists()).toBe(false)
    })
  })

  describe('nameFromQuery() and prefillName()', () => {
    it('trims the name and takes hidden characters out', () => {
      expect(nameFromQuery(`  Cica${ZWSP} Cream${RLO}  `)).toBe('Cica Cream')
    })

    it('gives nothing for a repeated parameter (an array), an empty or blank value, or no value', () => {
      expect(nameFromQuery(['Cica Cream', 'Other'])).toBe('')
      expect(nameFromQuery('')).toBe('')
      expect(nameFromQuery(`  ${ZWSP} `)).toBe('')
      expect(nameFromQuery(undefined)).toBe('')
      expect(nameFromQuery(null)).toBe('')
    })

    it('cuts an over-long name to the name limit, without splitting a two-part character', () => {
      expect(nameFromQuery('a'.repeat(SUBMISSION_LIMITS.name + 50))).toBe('a'.repeat(SUBMISSION_LIMITS.name))

      // 199 letters, then a character written with two UTF-16 units: it does
      // not fit whole, so it is left out rather than cut in half.
      const cut = nameFromQuery(`${'b'.repeat(SUBMISSION_LIMITS.name - 1)}\u{1F33F}tail`)
      expect(cut).toBe('b'.repeat(SUBMISSION_LIMITS.name - 1))
    })

    it('trims again after the cut, so the name never ends in a space', () => {
      expect(nameFromQuery(`${'c'.repeat(SUBMISSION_LIMITS.name - 1)} more`)).toBe('c'.repeat(SUBMISSION_LIMITS.name - 1))
    })

    it('fills an empty name and keeps a name already typed', () => {
      const empty = emptyDraft()
      prefillName(empty, 'Cica Cream')
      expect(empty.name).toBe('Cica Cream')

      const typed = { ...emptyDraft(), name: 'My own name' }
      prefillName(typed, 'Cica Cream')
      expect(typed.name).toBe('My own name')

      const kept = emptyDraft()
      prefillName(kept, ['Cica Cream'])
      expect(kept.name).toBe('')
    })

    it('counts a draft holding only the name the link put in as untouched, and anything more as input', () => {
      const prefilled = emptyDraft()
      const name = prefillName(prefilled, 'Cica Cream')
      expect(name).toBe('Cica Cream')
      expect(hasUserInput(prefilled, name)).toBe(false)

      expect(hasUserInput({ ...prefilled, name: 'Cica Cream Light' }, name)).toBe(true)
      expect(hasUserInput({ ...prefilled, brand: 'Example Brand' }, name)).toBe(true)
      // With no name from a link, a typed name is input as before.
      expect(hasUserInput(prefilled)).toBe(true)
      expect(prefillName({ ...emptyDraft(), name: 'Typed' }, 'Cica Cream')).toBe('')
    })
  })

  describe('SubmitProductView (name pre-fill)', () => {
    const openForm = async (address: string) => {
      vi.mocked(getCategories).mockResolvedValue(['Cleansers', 'Toners'])
      vi.mocked(getConcernTags).mockResolvedValue([])
      const router = await makeRouter('/explore')
      await router.push(address)
      const Root = defineComponent({ render: () => h(RouterView) })
      const w = track(mount(Root, { global: { plugins: [router], stubs: { teleport: true } }, attachTo: document.body }))
      await flushPromises()
      return { w, router, name: () => (w.get('#sub-name').element as HTMLInputElement).value }
    }

    it('starts the name from ?name=, with hidden characters taken out', async () => {
      const { name } = await openForm(`/submissions/new?name=${encodeURIComponent(`Heartleaf${ZWSP} Toner `)}`)

      expect(name()).toBe('Heartleaf Toner')
    })

    it('leaves the name empty for a repeated ?name= or an empty one', async () => {
      expect((await openForm('/submissions/new?name=A&name=B')).name()).toBe('')
      expect((await openForm('/submissions/new?name=')).name()).toBe('')
    })

    it('cuts an over-long ?name= to the name limit', async () => {
      const { name } = await openForm(`/submissions/new?name=${'d'.repeat(SUBMISSION_LIMITS.name + 20)}`)

      expect(name()).toBe('d'.repeat(SUBMISSION_LIMITS.name))
    })

    it('reads ?name= once: a later one in the address does not replace what the user typed', async () => {
      const { w, router, name } = await openForm('/submissions/new?name=First')
      expect(name()).toBe('First')
      await w.get('#sub-name').setValue('Typed by me')

      await router.replace('/submissions/new?name=Second')
      await flushPromises()
      expect(name()).toBe('Typed by me')

      // Not even into a name the user has since cleared.
      await w.get('#sub-name').setValue('')
      await router.replace('/submissions/new?name=Third')
      await flushPromises()
      expect(name()).toBe('')
    })

    it('leaves straight away without asking when the only thing in the form is the name the link put in', async () => {
      const { w, router } = await openForm('/submissions/new?name=Cica%20Cream')
      const unload = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(unload)
      expect(unload.defaultPrevented).toBe(false)

      await router.push('/explore')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/explore')
      expect(w.find('[role="dialog"]').exists()).toBe(false)
    })

    it('asks before leaving once the user changes the pre-filled name, or fills in anything else', async () => {
      const renamed = await openForm('/submissions/new?name=Cica%20Cream')
      await renamed.w.get('#sub-name').setValue('Cica Cream Light')
      renamed.router.push('/explore')
      await flushPromises()
      expect(renamed.router.currentRoute.value.path).toBe('/submissions/new')
      expect(renamed.w.find('[role="dialog"]').exists()).toBe(true)

      const branded = await openForm('/submissions/new?name=Cica%20Cream')
      await branded.w.get('#sub-brand').setValue('Example Brand')
      const unload = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(unload)
      expect(unload.defaultPrevented).toBe(true)
      branded.router.push('/explore')
      await flushPromises()
      expect(branded.router.currentRoute.value.path).toBe('/submissions/new')
    })

    it('forgets the name from the link once the product is sent, so the same name typed into the next one counts as input', async () => {
      vi.mocked(searchIngredients).mockResolvedValue([])
      vi.mocked(matchIngredients).mockResolvedValue([{ input: 'Water', id: 'i-water', name: 'Water', matched_alias: null, ambiguous: false }])
      vi.mocked(createSubmission).mockResolvedValue({ id: 's-1', status: 'pending', created_at: null } as never)
      const { w, router } = await openForm('/submissions/new?name=Cica%20Cream')
      const press = (text: string) => w.findAll('button').find((b) => b.text().trim() === text)!.trigger('click')
      await w.get('#sub-brand').setValue('Example Brand')
      await press('Toners')
      await w.get('button.continue').trigger('click')
      await flushPromises()
      await w.get('button.paste-toggle').trigger('click')
      await w.get('textarea').setValue('Water')
      await w.get('button.paste-match').trigger('click')
      await flushPromises()
      await w.get('button.continue').trigger('click')
      await flushPromises()
      await w.get('button.send').trigger('click')
      await flushPromises()
      expect(createSubmission).toHaveBeenCalledTimes(1)

      await w.get('button.submit-another').trigger('click')
      await flushPromises()
      await w.get('#sub-name').setValue('Cica Cream')
      router.push('/explore')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/submissions/new')
      expect(w.find('[role="dialog"]').exists()).toBe(true)
    })
  })
})
