import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { readFileSync, statSync } from 'node:fs'

// No network: the one function every optional-auth GET goes through, and the
// shared client the protected ones use, are replaced. searchProducts and the
// account readers are the real ones, so what is counted is the request that
// would have left the page. A paged request (the grid's) goes through the sibling
// that returns the whole response; here it is answered by the same held-open
// request, with no headers, so both kinds are counted and answered alike.
vi.mock('../../api/optionalAuth', () => {
  const getWithGuestFallback = vi.fn()
  return {
    getWithGuestFallback,
    getResponseWithGuestFallback: (...args: unknown[]) =>
      Promise.resolve((getWithGuestFallback as (...a: unknown[]) => unknown)(...args)).then((data) => ({ data, headers: {} })),
  }
})
// The filter chips ask for /meta/facets; no network here, so it fails and the
// chips are derived from the products, as before.
vi.mock('../../api/metaApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/metaApi')>()),
  getFacets: () => Promise.reject(new Error('no facets')),
}))
vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { getWithGuestFallback } from '../../api/optionalAuth'
import { apiClient } from '../../api/index'
import { searchProducts } from '../../api/products'
import { fetchMyAccount, fetchMyRole } from '../../api/accountApi'
import { resetAdminState, useAdmin } from '../../composables/useAdmin'
import { resetConsentState, useConsent } from '../../composables/useConsent'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'
import { pinLeavingCard } from '../../components/Shared/cardFlow'
import ExploreView from '../../views/ExploreView.vue'
import ExploreProductCard from '../../components/Catalog/ExploreProductCard.vue'
import SearchAutocompleteInput from '../../components/Shared/SearchAutocompleteInput.vue'
import SkinTypeRecommendationsWidget from '../../components/Shared/SkinTypeRecommendationsWidget.vue'
import RouterSource from '../../router/index.ts?raw'
import AppSidebarSource from '../../components/Shared/AppSidebar.vue?raw'
import BottomNavSource from '../../components/Shared/BottomNav.vue?raw'
import ShelfViewSource from '../../views/ShelfView.vue?raw'
import LoadingScreenSource from '../../components/Shared/LoadingScreen.vue?raw'
import ShelfCardSource from '../../components/Shelf/ShelfCard.vue?raw'
import CompareSelectorSource from '../../components/Compare/CompareSelectorModal.vue?raw'
import SearchResultCardSource from '../../components/Catalog/SearchResultCard.vue?raw'
import SimilarProductsSource from '../../components/Catalog/SimilarProductsWidget.vue?raw'
import RecommendationsWidgetSource from '../../components/Shared/SkinTypeRecommendationsWidget.vue?raw'

const { toasts } = useToast()

/** A request left open, to be answered (or failed) in whatever order a test wants. */
interface Pending {
  params: Record<string, unknown>
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}
// Every request a test left open. searchProducts keeps a request in a module-level
// map until it settles, so each one is answered after the test, or the next test
// would be handed it.
const everOpened: Pending[] = []
const makePending = (): Pending[] => {
  const pending: Pending[] = []
  vi.mocked(getWithGuestFallback).mockImplementation(
    (_path: string, config?: { params?: Record<string, unknown> }) =>
      new Promise((resolve, reject) => {
        const entry = { params: config?.params ?? {}, resolve, reject }
        pending.push(entry)
        everOpened.push(entry)
      }) as never,
  )
  return pending
}

const product = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  brand: 'CeraVe',
  name: `Product ${id}`,
  category: 'Cleansers',
  slug: `product-${id}`,
  price_thb: 450,
  skin_match_score: 80,
  image_url: null,
  product_ingredients: [],
  ...overrides,
})

const mountExplore = async (address = '/explore', signedIn = false) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/explore', component: { template: '<div />' } },
    ],
  })
  await router.push(address)
  await router.isReady()
  const pinia = createPinia()
  setActivePinia(pinia)
  if (signedIn) useAuthStore().setAuth('token-1', { id: 'u-1', skin_type: 'OSPW' })
  const wrapper = mount(ExploreView, {
    global: {
      plugins: [pinia, router],
      stubs: {
        teleport: true,
        SearchAutocompleteInput: true,
        SkinTypeRecommendationsWidget: true,
        ExploreProductCard: true,
        ExploreCategoryBar: true,
        UniversalProductModal: true,
        CompareSelectorModal: true,
        PriceRangeSlider: true,
        ProductShowcaseMarquee: true,
        EmptyState: true,
      },
    },
  })
  await flushPromises()
  return { wrapper, router }
}

const shownIds = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAllComponents(ExploreProductCard).map((c) => c.props('product').id)

afterEach(async () => {
  for (const entry of everOpened.splice(0)) entry.resolve([])
  await flushPromises()
})

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  toasts.value.splice(0)
  resetAdminState()
  resetConsentState()
})

/**
 * A grid of one column of equal cards, with a stand-in for layout: a card's
 * offsetTop is the height of the cards before it that are still in the flow, so
 * a card pinned (position: absolute) stops pushing the ones after it up. That
 * is the one fact about layout the pinning depends on, and jsdom has none.
 */
const CARD_HEIGHT = 100
const makeGrid = (count: number) => {
  const grid = document.createElement('div')
  const cards: HTMLElement[] = []
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div')
    Object.defineProperties(card, {
      offsetLeft: { get: () => 0 },
      offsetWidth: { get: () => 300 },
      offsetHeight: { get: () => CARD_HEIGHT },
      offsetTop: {
        get: () =>
          cards.slice(0, cards.indexOf(card)).filter((c) => c.style.position !== 'absolute').length * CARD_HEIGHT,
      },
    })
    cards.push(card)
    grid.appendChild(card)
  }
  return cards
}

describe('feat/28 performance quick wins', () => {
  describe('cardFlow pinLeavingCard()', () => {
    it('pins each of several leaving cards where it stood, not where the grid reflowed to after the earlier ones were pinned', () => {
      const cards = makeGrid(4)
      // Vue calls @before-leave once per leaving card, one after the other, in the
      // same patch: here the first three cards leave.
      pinLeavingCard(cards[0]!)
      pinLeavingCard(cards[1]!)
      pinLeavingCard(cards[2]!)

      expect(cards.slice(0, 3).map((c) => c.style.top)).toEqual(['0px', '100px', '200px'])
    })

    it('takes a lone leaving card out of the flow at its own place and size', () => {
      const cards = makeGrid(4)
      pinLeavingCard(cards[2]!)

      expect(cards[2]!.style.position).toBe('absolute')
      expect([cards[2]!.style.left, cards[2]!.style.top, cards[2]!.style.width, cards[2]!.style.height]).toEqual([
        '0px',
        '200px',
        '300px',
        '100px',
      ])
    })

    it('reads the grid afresh for the next patch rather than reusing the places of the last one', async () => {
      const cards = makeGrid(3)
      pinLeavingCard(cards[0]!)
      await Promise.resolve()
      // After the first patch, card 1 is the first card still in the flow.
      pinLeavingCard(cards[1]!)

      expect(cards[1]!.style.top).toBe('0px')
    })
  })

  describe('searchProducts() (shared in-flight request)', () => {
    it('sends one request when the same search is asked for twice before the first answers', async () => {
      const pending = makePending()

      const first = searchProducts()
      const second = searchProducts('', undefined, undefined)
      pending[0]!.resolve([product('a')])

      expect(getWithGuestFallback).toHaveBeenCalledTimes(1)
      expect(await first).toEqual(await second)
    })

    it('sends a new request once the earlier one has answered, so nothing is served from a stored answer', async () => {
      const pending = makePending()

      const first = searchProducts()
      pending[0]!.resolve([product('a')])
      await first
      const second = searchProducts()
      pending[1]!.resolve([product('b')])

      expect(getWithGuestFallback).toHaveBeenCalledTimes(2)
      expect(await second).toEqual([product('b')])
    })

    it('sends a new request after a failed one, rather than sharing the failure', async () => {
      const pending = makePending()

      const first = searchProducts()
      pending[0]!.reject(new Error('offline'))
      await expect(first).rejects.toThrow('offline')
      searchProducts()

      expect(getWithGuestFallback).toHaveBeenCalledTimes(2)
    })

    it('keeps searches with a different term or price bound apart', () => {
      makePending()

      searchProducts()
      searchProducts('retinol')
      searchProducts('', 100)
      searchProducts('', undefined, 500)

      expect(getWithGuestFallback).toHaveBeenCalledTimes(4)
    })

    it('keeps the same search from two different logins apart, since the match scores are per user', () => {
      makePending()

      localStorage.setItem('access_token', 'token-a')
      searchProducts()
      localStorage.setItem('access_token', 'token-b')
      searchProducts()
      localStorage.removeItem('access_token')
      searchProducts()

      expect(getWithGuestFallback).toHaveBeenCalledTimes(3)
    })
  })

  describe('ExploreView (catalogue requests)', () => {
    it('asks for the first page for the grid and the whole list for the shortlist, once each, when a signed-in user with a skin type opens Explore', async () => {
      const pending = makePending()
      const { wrapper } = await mountExplore('/explore', true)

      // Moved in feat/30: the grid asks for 12, so it no longer shares the
      // shortlist's request, which has to see every product to pick the best few.
      expect(pending.map((p) => p.params)).toEqual([{ view: 'card', limit: 12, offset: 0 }, { view: 'card' }])
      pending[0]!.resolve([product('a'), product('b', { skin_match_score: 95 })])
      pending[1]!.resolve([product('a'), product('b', { skin_match_score: 95 })])
      await flushPromises()

      expect(getWithGuestFallback).toHaveBeenCalledTimes(2)
      expect(shownIds(wrapper)).toEqual(['a', 'b'])
      const widget = wrapper.findComponent(SkinTypeRecommendationsWidget)
      expect(widget.props('products').map((p: { id: string }) => p.id)).toEqual(['b', 'a'])
    })

    it('still asks twice when the address carries a search term, because the shortlist must not follow the term', async () => {
      const pending = makePending()
      await mountExplore('/explore?q=retinol', true)

      expect(pending.map((p) => p.params)).toEqual([{ q: 'retinol', view: 'card', limit: 12, offset: 0 }, { view: 'card' }])
    })

    it('shows the answer to the latest request when an older one answers last', async () => {
      const pending = makePending()
      const { wrapper, router } = await mountExplore()

      await router.push('/explore?q=cerave')
      await flushPromises()
      // The second request answers first, then the first, slower one.
      pending[1]!.resolve([product('new')])
      await flushPromises()
      pending[0]!.resolve([product('old')])
      await flushPromises()

      expect(shownIds(wrapper)).toEqual(['new'])
    })

    it('goes on loading while only an older request has answered', async () => {
      const pending = makePending()
      const { wrapper, router } = await mountExplore()

      await router.push('/explore?q=cerave')
      await flushPromises()
      pending[0]!.resolve([product('old')])
      await flushPromises()

      expect(shownIds(wrapper)).toEqual([])
      expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true)
      pending[1]!.resolve([product('new')])
      await flushPromises()
      expect(wrapper.find('[aria-busy="true"]').exists()).toBe(false)
      expect(shownIds(wrapper)).toEqual(['new'])
    })

    it('does not let a failure of an older request wipe out the answer to the latest one', async () => {
      const pending = makePending()
      const { wrapper, router } = await mountExplore()

      await router.push('/explore?q=cerave')
      await flushPromises()
      pending[1]!.resolve([product('new')])
      await flushPromises()
      pending[0]!.reject(new Error('timeout'))
      await flushPromises()

      expect(shownIds(wrapper)).toEqual(['new'])
      expect(toasts.value.map((t) => t.message)).not.toContain('Failed to load product catalog.')
    })

    it('treats a reply that is not a list as a failed request, with the same message, instead of throwing', async () => {
      const pending = makePending()
      const { wrapper } = await mountExplore()

      pending[0]!.resolve('<!doctype html><html></html>')
      await flushPromises()

      expect(shownIds(wrapper)).toEqual([])
      expect(toasts.value.map((t) => t.message)).toContain('Failed to load product catalog.')
    })

    it('treats an object reply that is not a list the same way', async () => {
      const pending = makePending()
      const { wrapper } = await mountExplore()

      pending[0]!.resolve({ detail: 'moved' })
      await flushPromises()

      expect(shownIds(wrapper)).toEqual([])
      expect(toasts.value.map((t) => t.message)).toContain('Failed to load product catalog.')
    })

    it('reads no reply at all as an empty catalogue, as before, not a failure', async () => {
      const pending = makePending()
      const { wrapper } = await mountExplore()

      pending[0]!.resolve(null)
      await flushPromises()

      expect(shownIds(wrapper)).toEqual([])
      expect(toasts.value).toHaveLength(0)
    })

    it('still reads an empty list as an empty catalogue, not a failure', async () => {
      const pending = makePending()
      const { wrapper } = await mountExplore()

      pending[0]!.resolve([])
      await flushPromises()

      expect(shownIds(wrapper)).toEqual([])
      expect(toasts.value).toHaveLength(0)
    })
  })

  describe('SearchAutocompleteInput (stale answers and timers)', () => {
    const mountSearch = () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/:any(.*)*', component: { template: '<div />' } }],
      })
      return mount(SearchAutocompleteInput, { global: { plugins: [router] }, attachTo: document.body })
    }
    const type = async (wrapper: ReturnType<typeof mountSearch>, text: string) => {
      const input = wrapper.get('input')
      await input.trigger('focus')
      await input.setValue(text)
    }

    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('shows the answer for the term in the box when an older term answers last', async () => {
      const pending = makePending()
      const wrapper = mountSearch()

      await type(wrapper, 'ce')
      await vi.advanceTimersByTimeAsync(250)
      await type(wrapper, 'cerave')
      await vi.advanceTimersByTimeAsync(250)
      pending[1]!.resolve([product('cerave')])
      await flushPromises()
      pending[0]!.resolve([product('other')])
      await flushPromises()

      expect(wrapper.find('.search-results').text()).toContain('Product cerave')
      expect(wrapper.find('.search-results').text()).not.toContain('Product other')
      wrapper.unmount()
    })

    it('keeps the loading line until the latest request answers, not the first to come back', async () => {
      const pending = makePending()
      const wrapper = mountSearch()

      await type(wrapper, 'ce')
      await vi.advanceTimersByTimeAsync(250)
      await type(wrapper, 'cerave')
      await vi.advanceTimersByTimeAsync(250)
      pending[0]!.resolve([product('other')])
      await flushPromises()

      expect(wrapper.find('.search-results').text()).toContain('Matching formulation matrix')
      wrapper.unmount()
    })

    it('does not search for an earlier, longer term once the box is back under two characters', async () => {
      makePending()
      const wrapper = mountSearch()

      await type(wrapper, 'cer')
      await type(wrapper, 'c')
      await vi.advanceTimersByTimeAsync(500)

      expect(getWithGuestFallback).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('drops the answer to a request still in flight when the box is cleared', async () => {
      const pending = makePending()
      const wrapper = mountSearch()

      await type(wrapper, 'cerave')
      await vi.advanceTimersByTimeAsync(250)
      await type(wrapper, '')
      pending[0]!.resolve([product('late')])
      await flushPromises()
      await type(wrapper, 'ce')

      expect(wrapper.find('.search-results').text()).not.toContain('Product late')
      wrapper.unmount()
    })

    it('stops the loading line when the box is cleared while a request is still out', async () => {
      makePending()
      const wrapper = mountSearch()

      await type(wrapper, 'cerave')
      await vi.advanceTimersByTimeAsync(250)
      await type(wrapper, '')

      expect((wrapper.vm as unknown as { isLoading: boolean }).isLoading).toBe(false)
      wrapper.unmount()
    })

    it('does not search after it has been taken off the page', async () => {
      makePending()
      const wrapper = mountSearch()

      await type(wrapper, 'cerave')
      wrapper.unmount()
      await vi.advanceTimersByTimeAsync(500)

      expect(getWithGuestFallback).not.toHaveBeenCalled()
    })
  })

  describe('accountApi (one GET /auth/me at a time)', () => {
    const answer = (data: unknown) => {
      let resolve!: (value: unknown) => void
      let reject!: (reason: unknown) => void
      const promise = new Promise((res, rej) => { resolve = res; reject = rej })
      vi.mocked(apiClient.get).mockReturnValueOnce(promise as never)
      return { resolve: () => resolve({ data }), reject: (e: unknown) => reject(e) }
    }

    it('asks once when the role and the account are read together, and both get their part of the answer', async () => {
      const me = answer({ role: 'admin', consent: { accepted: true } })

      const role = fetchMyRole()
      const account = fetchMyAccount()
      me.resolve()

      expect(apiClient.get).toHaveBeenCalledTimes(1)
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me')
      expect(await role).toBe('admin')
      expect((await account).role).toBe('admin')
    })

    it('asks again when it is read after the first answer has landed', async () => {
      const first = answer({ role: 'user' })
      const read = fetchMyRole()
      first.resolve()
      await read
      const second = answer({ role: 'admin' })
      const again = fetchMyRole()
      second.resolve()

      expect(apiClient.get).toHaveBeenCalledTimes(2)
      expect(await again).toBe('admin')
    })

    it('gives both readers the failure, and asks afresh next time', async () => {
      const me = answer(null)
      const role = fetchMyRole()
      const account = fetchMyAccount()
      me.reject({ response: { status: 404 } })

      await expect(role).rejects.toEqual({ response: { status: 404 } })
      await expect(account).rejects.toEqual({ response: { status: 404 } })
      answer({ role: 'user' })
      fetchMyRole()
      expect(apiClient.get).toHaveBeenCalledTimes(2)
    })

    it('does not give one login the answer asked for under another', () => {
      answer({ role: 'user' })
      answer({ role: 'admin' })

      localStorage.setItem('access_token', 'token-a')
      fetchMyRole()
      localStorage.setItem('access_token', 'token-b')
      fetchMyRole()

      expect(apiClient.get).toHaveBeenCalledTimes(2)
    })

    it('sends one request when ensureRole and ensureConsent start together on a signed-in reload', async () => {
      setActivePinia(createPinia())
      useAuthStore().setAuth('token-1', { id: 'u-1' })
      const me = answer({
        role: 'admin',
        consent: { current_policy_version: 'v1', accepted_policy_version: 'v1' },
      })

      const role = useAdmin().ensureRole()
      const consent = useConsent().ensureConsent()
      me.resolve()

      expect(apiClient.get).toHaveBeenCalledTimes(1)
      expect(await role).toBe(true)
      await consent
    })

    it('still signs the user out of a deleted account (404) when the role was asked for in the same request', async () => {
      setActivePinia(createPinia())
      const auth = useAuthStore()
      auth.setAuth('token-1', { id: 'u-1' })
      const me = answer(null)

      const role = useAdmin().ensureRole()
      const consent = useConsent().ensureConsent()
      me.reject({ response: { status: 404 } })

      expect(await role).toBeNull()
      expect(await consent).toBeNull()
      expect(auth.token).toBeNull()
      expect(apiClient.get).toHaveBeenCalledTimes(1)
    })

    it('still lets a server error through without a consent screen, and keeps the role unknown', async () => {
      setActivePinia(createPinia())
      const auth = useAuthStore()
      auth.setAuth('token-1', { id: 'u-1' })
      const me = answer(null)

      const role = useAdmin().ensureRole()
      const consent = useConsent().ensureConsent()
      me.reject({ response: { status: 503 } })

      expect(await role).toBeNull()
      expect(await consent).toBeNull()
      expect(auth.token).toBe('token-1')
    })
  })

  describe('product images and the mascot (load cost)', () => {
    it('loads the Explore card image lazily and off the main thread, inside its fixed frame', () => {
      const wrapper = mount(ExploreProductCard, {
        props: { product: product('a', { image_url: 'https://img.example/a.png' }) },
      })
      const img = wrapper.get('img')

      expect(img.attributes('loading')).toBe('lazy')
      expect(img.attributes('decoding')).toBe('async')
    })

    it('loads the image of each search suggestion lazily', async () => {
      vi.useFakeTimers()
      const pending = makePending()
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/:any(.*)*', component: { template: '<div />' } }],
      })
      const wrapper = mount(SearchAutocompleteInput, { global: { plugins: [router] }, attachTo: document.body })
      await wrapper.get('input').trigger('focus')
      await wrapper.get('input').setValue('cerave')
      await vi.advanceTimersByTimeAsync(250)
      pending[0]!.resolve([product('a', { image_url: 'https://img.example/a.png' })])
      await flushPromises()

      const img = wrapper.get('.search-results img')
      expect(img.attributes('loading')).toBe('lazy')
      expect(img.attributes('decoding')).toBe('async')
      wrapper.unmount()
      vi.useRealTimers()
    })

    it.each([
      ['ShelfCard', ShelfCardSource],
      ['CompareSelectorModal', CompareSelectorSource],
      ['SearchResultCard', SearchResultCardSource],
      ['SimilarProductsWidget', SimilarProductsSource],
      ['SkinTypeRecommendationsWidget', RecommendationsWidgetSource],
    ])('marks every product image in %s as lazy and async', (_name, source) => {
      const productImages = source.match(/<img v-if="[^"]*image_url"[^>]*>/g) ?? []

      expect(productImages.length).toBeGreaterThan(0)
      for (const tag of productImages) {
        expect(tag).toContain('loading="lazy"')
        expect(tag).toContain('decoding="async"')
      }
    })

    it('uses the small mascot (about 18 KB) where it is shown at 64 px or less, and the original only where it is larger', () => {
      const small = statSync('public/images/jelly-small.png')

      expect(small.size).toBeLessThan(30_000)
      expect(statSync('public/images/jelly.png').size).toBeGreaterThan(100_000)
      for (const source of [AppSidebarSource, BottomNavSource, ShelfViewSource]) {
        expect(source).toContain('/images/jelly-small.png')
        expect(source).not.toMatch(/\/images\/jelly\.png/)
      }
      // The loading screen shows it at 128 px, so it keeps the original.
      expect(LoadingScreenSource).toContain('/images/jelly.png')
    })

    it('stores the small mascot as a PNG with transparency, 128 px wide', () => {
      const bytes = readFileSync('public/images/jelly-small.png')

      expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG')
      expect(bytes.readUInt32BE(16)).toBe(128)
      // Colour type 6 is RGBA.
      expect(bytes[25]).toBe(6)
    })
  })

  describe('backdrop blur (paint cost)', () => {
    it('leaves no blur on the loading screen, whose background is opaque', () => {
      expect(LoadingScreenSource).not.toContain('backdrop-blur')
    })

    it('blurs the match badge only in dark mode, where its background is see-through', () => {
      const wrapper = mount(ExploreProductCard, { props: { product: product('a') } })
      const badge = wrapper.get('.match-badge').classes()

      expect(badge).toContain('dark:backdrop-blur-sm')
      expect(badge).not.toContain('backdrop-blur-sm')
    })

    it('draws the match fraction, which is nearly opaque over a flat card, without a blur', () => {
      const wrapper = mount(ExploreProductCard, {
        props: { product: product('a', { skin_match_score: 86, match_breakdown: { helpful: 6, concerns: 0, concern_weight: 0, considered: 7, total_ingredients: 9, limited: false } }) },
      })

      expect(wrapper.find('.match-fraction').exists()).toBe(true)
      expect(wrapper.get('.match-fraction').classes().join(' ')).not.toContain('backdrop-blur')
    })
  })

  describe('router/index (pages load on demand)', () => {
    // The real router, imported by a path held in a variable so vue-tsc does not
    // follow it into every view (see profileRoute.spec.ts).
    const ROUTER_MODULE = '../../router/index'
    let router: Router
    beforeAll(async () => {
      router = ((await import(/* @vite-ignore */ ROUTER_MODULE)) as { default: Router }).default
    }, 60_000)

    // Home is the first page and the error page is the fallback; the others are
    // the chat, routine, sign-in callback, skin analysis and weekly check-in
    // (a teammate's) and the consent and account-deletion routes (unfinished),
    // whose route lines were left as they were.
    const EAGER = [
      'home',
      'error',
      'not-found',
      'authCallback',
      'chat',
      'routine',
      'routine-history',
      'weekly-checkin',
      'skin-analysis',
      'welcome',
      'consent-health',
      'account-delete-callback',
      'account-deleted',
    ]
    const LAZY = [
      'quiz',
      'SkinTypeLanding',
      'shelf',
      'settings',
      'skin-profile',
      'explore',
      'ProductDetail',
      'match-methodology',
      'Compare',
      'submit-product',
      'my-submissions',
      'admin-submissions',
      'product-edit',
      'privacy',
      'terms',
    ]
    const page = (name: string) => router.getRoutes().find((r) => r.name === name)!.components!.default

    it('names every route once, so none was dropped or added by the change', () => {
      const names = router.getRoutes().map((r) => r.name)

      expect(names).toHaveLength(EAGER.length + LAZY.length)
      expect(new Set(names)).toEqual(new Set([...EAGER, ...LAZY]))
    })

    it.each(LAZY)('loads the page for the %s route when it is first opened, not with the main file', (name) => {
      expect(typeof page(name)).toBe('function')
    })

    it.each(EAGER)('keeps the page for the %s route in the main file, as before', (name) => {
      expect(typeof page(name)).toBe('object')
    })

    it.each([
      ['quiz', 'SkinQuizView'],
      ['SkinTypeLanding', 'SkinTypeLanding'],
      ['shelf', 'ShelfView'],
      ['settings', 'SettingsView'],
      ['skin-profile', 'SkinProfileView'],
      ['explore', 'ExploreView'],
      ['ProductDetail', 'ProductDetailView'],
      ['match-methodology', 'MatchMethodologyView'],
      ['Compare', 'CompareView'],
      ['submit-product', 'SubmitProductView'],
      ['my-submissions', 'MySubmissionsView'],
      ['admin-submissions', 'AdminSubmissionsView'],
      ['product-edit', 'ProductEditView'],
      ['privacy', 'PrivacyPolicyView'],
      ['terms', 'TermsView'],
    ])('loads the %s route from the same page file it used before (%s)', (name, file) => {
      const lines = RouterSource.split('\n')
      const at = lines.findIndex((l) => l.includes(`name: '${name}',`))

      expect(lines[at + 1]).toContain(`component: () => import('../views/${file}.vue'),`)
    })

    it('resolves a lazy route to its page component when it is opened', async () => {
      await router.push('/terms')
      await router.isReady()

      const matched = router.currentRoute.value.matched[0]!
      expect(matched.name).toBe('terms')
      expect(typeof matched.components!.default).toBe('object')
    })
  })
})
