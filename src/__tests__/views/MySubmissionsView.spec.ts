import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('../../api/submissionsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/submissionsApi')>()),
  getMySubmissions: vi.fn(),
}))

import { getMySubmissions, type MySubmission } from '../../api/submissionsApi'
import MySubmissionsView from '../../views/MySubmissionsView.vue'

const row = (overrides: Partial<Omit<MySubmission, 'summary'>> & { summary?: Partial<MySubmission['summary']> } = {}): MySubmission => ({
  id: 's-1',
  status: 'pending',
  created_at: '2026-10-04T09:00:00+00:00',
  reviewed_at: null,
  review_notes: null,
  product_id: null,
  product_slug: null,
  ...overrides,
  summary: { name: 'Hydrating Gel Toner', brand: 'Example Brand', category: 'Toners', ingredient_count: 8, ...overrides.summary },
})

const THREE = [
  row(),
  row({
    id: 's-2',
    status: 'approved',
    created_at: '2026-09-28T09:00:00+00:00',
    reviewed_at: '2026-10-01T09:00:00+00:00',
    product_id: 'p-9',
    product_slug: 'example-brand-barrier-repair-cream',
    summary: { name: 'Barrier Repair Cream' },
  }),
  row({
    id: 's-3',
    status: 'rejected',
    created_at: '2026-09-20T09:00:00+00:00',
    reviewed_at: '2026-09-22T09:00:00+00:00',
    review_notes: "This product is already in the catalogue, so we didn't add it twice.",
    summary: { name: 'Hydrating Facial Cleanser', brand: 'CeraVe' },
  }),
]

const mountView = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/submissions', component: MySubmissionsView },
      { path: '/submissions/new', component: { template: '<div />' } },
      { path: '/product/:slug', component: { template: '<div />' } },
    ],
  })
  await router.push('/submissions')
  await router.isReady()
  const wrapper = mount(MySubmissionsView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

const cards = (w: VueWrapper) => w.findAll('.submission-card')
const tabs = (w: VueWrapper) => w.findAll('[role="tab"]')

describe('src/views/MySubmissionsView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('list and tabs (render)', () => {
    it('shows every submission under All, with a tab per status and its count', async () => {
      vi.mocked(getMySubmissions).mockResolvedValue(THREE)
      const w = await mountView()

      expect(tabs(w).map((t) => t.text())).toEqual(['All 3', 'Waiting 1', 'Published 1', 'Not added 1'])
      expect(tabs(w)[0]!.attributes('aria-selected')).toBe('true')
      expect(cards(w)).toHaveLength(3)
    })

    it('words each status for the sender: waiting, published, not added', async () => {
      vi.mocked(getMySubmissions).mockResolvedValue(THREE)
      const w = await mountView()

      expect(cards(w).map((c) => c.get('.status-chip').text())).toEqual(['Waiting for review', 'Published', 'Not added'])
    })

    it('says when a waiting one was sent, with its category and size', async () => {
      vi.mocked(getMySubmissions).mockResolvedValue(THREE)
      const w = await mountView()

      expect(cards(w)[0]!.text()).toContain('Sent 4 Oct 2026 · Toners · 8 ingredients')
    })

    it('links a published one to its product page by the slug the backend gave', async () => {
      vi.mocked(getMySubmissions).mockResolvedValue(THREE)
      const w = await mountView()

      const published = cards(w)[1]!
      expect(published.text()).toContain('Sent 28 Sep 2026 · Published 1 Oct 2026')
      expect(published.get('a.view-product').attributes('href')).toBe('/product/example-brand-barrier-repair-cream')
      expect(cards(w)[0]!.find('a.view-product').exists()).toBe(false)
    })

    it("shows the team's note on one that was not added", async () => {
      vi.mocked(getMySubmissions).mockResolvedValue(THREE)
      const w = await mountView()

      const note = cards(w)[2]!.get('.review-note')
      expect(note.text()).toContain('Note from our team')
      expect(note.text()).toContain('already in the catalogue')
    })

    it('filters to one status when its tab is chosen', async () => {
      vi.mocked(getMySubmissions).mockResolvedValue(THREE)
      const w = await mountView()

      await tabs(w)[3]!.trigger('click')

      expect(tabs(w)[3]!.attributes('aria-selected')).toBe('true')
      expect(cards(w).map((c) => c.text())).toEqual([expect.stringContaining('Hydrating Facial Cleanser')])
    })

    it('moves between tabs with the arrow keys, wrapping at the ends', async () => {
      vi.mocked(getMySubmissions).mockResolvedValue(THREE)
      const w = await mountView()

      await tabs(w)[0]!.trigger('keydown', { key: 'ArrowLeft' })
      await flushPromises()

      expect(tabs(w)[3]!.attributes('aria-selected')).toBe('true')
      expect(tabs(w)[3]!.attributes('tabindex')).toBe('0')
      expect(document.activeElement).toBe(tabs(w)[3]!.element)
    })

    it('says a status tab is empty rather than showing a blank panel', async () => {
      vi.mocked(getMySubmissions).mockResolvedValue([row()])
      const w = await mountView()

      await tabs(w)[2]!.trigger('click')

      expect(cards(w)).toHaveLength(0)
      expect(w.get('.empty-tab').text()).toBe('None of your products has been published yet.')
    })

    it('wraps ArrowRight from the last tab to the first, and jumps with Home and End', async () => {
      vi.mocked(getMySubmissions).mockResolvedValue(THREE)
      const w = await mountView()

      await tabs(w)[0]!.trigger('keydown', { key: 'End' })
      await flushPromises()
      expect(tabs(w)[3]!.attributes('aria-selected')).toBe('true')

      await tabs(w)[3]!.trigger('keydown', { key: 'ArrowRight' })
      await flushPromises()
      expect(tabs(w)[0]!.attributes('aria-selected')).toBe('true')

      await tabs(w)[0]!.trigger('keydown', { key: 'ArrowRight' })
      await tabs(w)[1]!.trigger('keydown', { key: 'Home' })
      await flushPromises()
      expect(tabs(w)[0]!.attributes('aria-selected')).toBe('true')
      expect(document.activeElement).toBe(tabs(w)[0]!.element)
    })
  })

  describe('loading, failure and empty states', () => {
    it('shows a loading state while the list is on its way', async () => {
      vi.mocked(getMySubmissions).mockReturnValue(new Promise(() => {}))
      const w = await mountView()

      expect(w.get('[role="status"]').attributes('aria-busy')).toBe('true')
    })

    it('explains a failure and loads again on "Try again"', async () => {
      let answer: (rows: MySubmission[]) => void = () => {}
      vi.mocked(getMySubmissions)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockReturnValueOnce(new Promise((resolve) => (answer = resolve)))
      const w = await mountView()

      expect(w.get('.load-failed').text()).toContain("couldn't reach SkinBuddy")
      await w.get('button.retry').trigger('click')

      // The failure gives way to the loading state while the retry is out.
      expect(w.find('.load-failed').exists()).toBe(false)
      expect(w.get('[role="status"]').attributes('aria-busy')).toBe('true')

      answer(THREE)
      await flushPromises()

      expect(getMySubmissions).toHaveBeenCalledTimes(2)
      expect(cards(w)).toHaveLength(3)
    })

    it('shows the designed empty state, with a way to submit a product, when nothing has been sent', async () => {
      vi.mocked(getMySubmissions).mockResolvedValue([])
      const w = await mountView()

      const empty = w.get('.submissions-empty')
      expect(empty.get('h1').text()).toBe("You haven't sent any products yet")
      expect(empty.get('a').attributes('href')).toBe('/submissions/new')
      expect(w.text()).toContain('How it works')
      expect(w.find('[role="tablist"]').exists()).toBe(false)
    })
  })

  describe('status-only actions (render)', () => {
    it('offers View product only on a published one, and the team note only on one not added', async () => {
      // A waiting row carrying a slug or a note (an odd answer) must not offer
      // a product that is not published, or a verdict that was not given.
      vi.mocked(getMySubmissions).mockResolvedValue([
        row({ product_slug: 'not-yet', review_notes: 'Draft note' }),
        row({ id: 's-9', status: 'approved', product_slug: null, review_notes: 'Looks good' }),
      ])
      const w = await mountView()

      expect(w.find('a.view-product').exists()).toBe(false)
      expect(w.find('.review-note').exists()).toBe(false)
    })

    it('shows a status it does not know in plain words under All, and counts it in no status tab', async () => {
      vi.mocked(getMySubmissions).mockResolvedValue([row({ status: 'archived' })])
      const w = await mountView()

      expect(cards(w)[0]!.get('.status-chip').text()).toBe('archived')
      expect(tabs(w).map((t) => t.text())).toEqual(['All 1', 'Waiting 0', 'Published 0', 'Not added 0'])
    })
  })
})
