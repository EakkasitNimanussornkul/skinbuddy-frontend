import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, RouterView, type Router } from 'vue-router'
import { defineComponent, h, nextTick, ref } from 'vue'

vi.mock('../../api/metaApi', () => ({
  getCategories: vi.fn(),
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
}))
vi.mock('../../api/ingredientsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/ingredientsApi')>()),
  searchIngredients: vi.fn(),
}))

import { getCategories, getFunctionalGroups } from '../../api/metaApi'
import { approveSubmission, getAdminQueue, getAdminSubmission, type AdminSubmission, type ReviewIngredient } from '../../api/submissionsApi'
import { searchIngredients } from '../../api/ingredientsApi'
import { useToast } from '../../composables/useToast'
import AdminSubmissionsView from '../../views/AdminSubmissionsView.vue'
import ConfirmDialog from '../../components/Submissions/ConfirmDialog.vue'

// Follow-ups to feat/22 on the review screens, from an independent verifier's
// notes: focus while the publish dialog waits, focus after a refusal.

const httpError = (status: number, data: unknown = {}) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } })

const known = (position: number, name: string): ReviewIngredient => ({ position, ingredient_id: `i-${position}`, name, status: 'known', details: null, existing_matches: [] })

const detail = (extra: Partial<AdminSubmission> = {}): AdminSubmission => ({
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
    name: 'Hydrating Facial Cleanser 473 ml',
    brand: 'CeraVe',
    category: 'Cleansers',
    image_path: null,
    ingredients: [{ ingredient_id: 'i-0' }],
    benefits: [],
    good_for: [],
    sources: [],
  },
  duplicate_candidates: [],
  ingredients: [known(0, 'Water')],
  ...extra,
})

const mounted: VueWrapper[] = []

const mountReview = async () => {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/explore', component: { template: '<div>explore</div>' } },
      { path: '/submissions', component: { template: '<div>mine</div>' } },
      { path: '/admin/submissions/:id?', component: AdminSubmissionsView },
      { path: '/product/:slug', component: { template: '<div class="product-page">product</div>' } },
      { path: '/products/:slug/edit', component: { template: '<div class="edit-page">edit</div>' } },
    ],
  })
  await router.push('/admin/submissions/sub-1')
  await router.isReady()
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(defineComponent({ render: () => h(RouterView) }), {
    global: { plugins: [pinia, router], stubs: { teleport: true } },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

const button = (w: VueWrapper, text: string) => {
  const found = w.findAll('button').find((b) => b.text().trim() === text)
  if (!found) throw new Error(`No button "${text}"`)
  return found
}
const publishButton = (w: VueWrapper) => w.get('button.publish-button')

/** A keydown the way a browser sends it; false when the dialog prevented its default. */
const press = (el: Element, key: string, shiftKey = false) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }))

describe('feat/22 follow-ups (review screens)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useToast().toasts.value.splice(0)
    vi.mocked(getCategories).mockResolvedValue(['Cleansers'])
    vi.mocked(getFunctionalGroups).mockResolvedValue(['Humectant'])
    vi.mocked(searchIngredients).mockResolvedValue([])
    vi.mocked(getAdminQueue).mockResolvedValue({ counts: { pending: 1, approved: 0, rejected: 0 }, submissions: [] })
    vi.mocked(getAdminSubmission).mockResolvedValue(detail())
  })
  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
    document.body.innerHTML = ''
  })

  describe('ConfirmDialog while busy', () => {
    // Busy is driven by a host, the way the review panel drives it, and the
    // real Teleport is used: the Teleport stub re-creates its content on every
    // patch, which would move focus off a node the real dialog keeps.
    const busy = ref(false)
    const cancelled = vi.fn()
    const setBusy = async (value: boolean) => {
      busy.value = value
      await nextTick()
      await flushPromises()
    }
    const mountDialog = async () => {
      busy.value = false
      const Host = defineComponent({
        render: () =>
          h(ConfirmDialog, {
            title: 'Publish this product?',
            text: 'It appears in Explore straight away.',
            confirmLabel: 'Publish now',
            busy: busy.value,
            onCancel: cancelled,
          }),
      })
      const wrapper = mount(Host, { attachTo: document.body })
      mounted.push(wrapper)
      await flushPromises()
      return wrapper
    }
    const dialogEl = () => document.querySelector<HTMLElement>('[role="dialog"]')!
    const cancelEl = () => document.querySelector<HTMLElement>('button.confirm-cancel')!
    const confirmEl = () => document.querySelector<HTMLElement>('button.confirm-ok')!

    it('moves focus onto the dialog itself while busy, marked aria-busy, so it does not fall to the page', async () => {
      await mountDialog()
      expect(document.activeElement).toBe(cancelEl())
      expect(dialogEl().getAttribute('aria-busy')).toBeNull()

      await setBusy(true)

      expect(document.activeElement).toBe(dialogEl())
      expect(dialogEl().getAttribute('aria-busy')).toBe('true')
      expect(dialogEl().getAttribute('tabindex')).toBe('-1')
    })

    it('keeps Tab on the dialog while busy, and still hears Escape there without cancelling', async () => {
      await mountDialog()
      await setBusy(true)

      expect(press(dialogEl(), 'Tab')).toBe(false)
      expect(press(dialogEl(), 'Tab', true)).toBe(false)
      expect(document.activeElement).toBe(dialogEl())

      expect(press(dialogEl(), 'Escape')).toBe(false)
      expect(cancelled).not.toHaveBeenCalled()
    })

    it('hands focus to the safe choice when the wait ends with the dialog still open', async () => {
      await mountDialog()
      await setBusy(true)

      await setBusy(false)

      expect(document.activeElement).toBe(cancelEl())
    })

    it('moves Tab from the dialog itself to its first button, and Shift+Tab to its last', async () => {
      await mountDialog()

      dialogEl().focus()
      expect(press(dialogEl(), 'Tab')).toBe(false)
      expect(document.activeElement).toBe(cancelEl())

      dialogEl().focus()
      expect(press(dialogEl(), 'Tab', true)).toBe(false)
      expect(document.activeElement).toBe(confirmEl())
    })
  })

  describe('AdminReviewPanel focus after a refused publish', () => {
    const openPublishDialog = async (w: VueWrapper) => {
      ;(publishButton(w).element as HTMLButtonElement).focus()
      await publishButton(w).trigger('click')
      await flushPromises()
    }

    it('keeps focus inside the publish dialog while the publish is under way', async () => {
      let settle: (value: { product_id: string; slug: string }) => void = () => {}
      vi.mocked(approveSubmission).mockReturnValue(new Promise((resolve) => (settle = resolve)))
      const wrapper = await mountReview()
      await openPublishDialog(wrapper)

      await button(wrapper, 'Publish now').trigger('click')
      await flushPromises()

      const dialog = wrapper.get('[role="dialog"]')
      expect(dialog.attributes('aria-busy')).toBe('true')
      expect(document.activeElement).toBe(dialog.element)
      settle({ product_id: 'p-9', slug: 'cerave-x' })
      await flushPromises()
    })

    it('puts focus on the review heading when a duplicate refusal turns Publish off', async () => {
      vi.mocked(approveSubmission).mockRejectedValue(
        httpError(409, { detail: 'duplicate', candidates: [{ id: 'p-7', slug: 'cerave-x', brand: 'CeraVe', name: 'Hydrating Facial Cleanser 473 ml' }] }),
      )
      const wrapper = await mountReview()
      await openPublishDialog(wrapper)

      await button(wrapper, 'Publish now').trigger('click')
      await flushPromises()

      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
      expect(publishButton(wrapper).attributes('disabled')).toBeDefined()
      expect(document.activeElement).toBe(wrapper.get('h2.review-title').element)
      expect(wrapper.get('h2.review-title').attributes('tabindex')).toBe('-1')
    })

    it('gives focus back to Publish after a refusal that leaves it on', async () => {
      vi.mocked(approveSubmission).mockRejectedValue(httpError(500))
      const wrapper = await mountReview()
      await openPublishDialog(wrapper)

      await button(wrapper, 'Publish now').trigger('click')
      await flushPromises()

      expect(publishButton(wrapper).attributes('disabled')).toBeUndefined()
      expect(document.activeElement).toBe(publishButton(wrapper).element)
    })
  })

  describe('source links on the review (only web addresses become links)', () => {
    const unsafe = 'javascript:alert(1)'
    const withLinks = (sourceUrl: string, ingredientUrl: string) =>
      detail({
        submission: { ...detail().submission, sources: [{ url: sourceUrl, title: 'Sent link', claims: ['listing'] }] },
        ingredients: [
          known(0, 'Water'),
          {
            position: 1,
            ingredient_id: null,
            name: 'Phytosphingosine',
            status: 'new',
            details: { roles: [], known_for: 'Supports the skin barrier', source_url: ingredientUrl },
            existing_matches: [],
          },
        ],
      })
    const javascriptLinks = (w: VueWrapper) => w.findAll('a').filter((a) => (a.attributes('href') ?? '').toLowerCase().startsWith('javascript:'))

    it('shows a javascript: source link and ingredient link as text, never as a link', async () => {
      vi.mocked(getAdminSubmission).mockResolvedValue(withLinks(unsafe, unsafe))
      const wrapper = await mountReview()

      expect(javascriptLinks(wrapper)).toHaveLength(0)
      expect(wrapper.find('a.source-link').exists()).toBe(false)
      expect(wrapper.get('.source-text').text()).toBe('javascript:alert(1) (not a web link)')
      expect(wrapper.find('a.ingredient-source-link').exists()).toBe(false)
      expect(wrapper.get('.ingredient-source-text').text()).toBe('javascript:alert(1) (not a web link)')
    })

    it('keeps a web address as a link that opens in a new tab', async () => {
      vi.mocked(getAdminSubmission).mockResolvedValue(withLinks('https://brand.example/cleanser', 'https://ingredient.example/phyto'))
      const wrapper = await mountReview()

      expect(wrapper.get('a.source-link').attributes('href')).toBe('https://brand.example/cleanser')
      expect(wrapper.get('a.ingredient-source-link').attributes('href')).toBe('https://ingredient.example/phyto')
      expect(wrapper.get('a.ingredient-source-link').attributes('rel')).toBe('noopener noreferrer')
      expect(wrapper.find('.source-text').exists()).toBe(false)
    })
  })
})
