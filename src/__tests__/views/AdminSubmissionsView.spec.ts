import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, RouterView, type Router } from 'vue-router'
import { defineComponent, h } from 'vue'

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
import {
  approveSubmission,
  editAdminSubmission,
  getAdminQueue,
  getAdminSubmission,
  rejectSubmission,
  type AdminQueue,
  type AdminSubmission,
  type ReviewIngredient,
} from '../../api/submissionsApi'
import { searchIngredients } from '../../api/ingredientsApi'
import { useToast } from '../../composables/useToast'
import AdminSubmissionsView from '../../views/AdminSubmissionsView.vue'

const httpError = (status: number, data: unknown = {}) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } })

const row = (id: string, name: string, flags: Partial<AdminQueue['submissions'][number]['flags']> = {}) => ({
  id,
  status: 'pending',
  created_at: '2026-10-01T08:00:00Z',
  submitter_name: 'Nok',
  summary: { name, brand: 'CeraVe', category: 'Cleansers', ingredient_count: 7 },
  flags: { possible_duplicate: false, new_ingredient_count: 0, has_source: false, has_photo: true, ...flags },
})

const queue = (rows: AdminQueue['submissions'], counts = { pending: rows.length, approved: 4, rejected: 1 }): AdminQueue => ({ counts, submissions: rows })

const known = (position: number, name: string): ReviewIngredient => ({ position, ingredient_id: `i-${position}`, name, status: 'known', details: null, existing_matches: [] })
const fresh = (position: number, name: string, matches: string[] = [], knownFor: string | null = null): ReviewIngredient => ({
  position,
  ingredient_id: null,
  name,
  status: 'new',
  details: knownFor ? { roles: ['Barrier support'], known_for: knownFor, source_url: null } : null,
  existing_matches: matches.map((m, i) => ({ id: `m-${i}`, name: m })),
})

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
    ingredients: [{ ingredient_id: 'i-0' }, { new_name: 'Phytosphingosine', details: { known_for: 'Supports the skin barrier' } }],
    benefits: ['Cleanses without stripping', 'Supports the skin barrier'],
    good_for: ['Dry skin', 'Sensitive'],
    sources: [{ url: 'https://brand.example/cleanser', title: 'Brand product page', claims: ['listing'] }],
  },
  duplicate_candidates: [],
  ingredients: [known(0, 'Water'), fresh(1, 'Phytosphingosine', [], 'Supports the skin barrier')],
  ...extra,
})

const mounted: VueWrapper[] = []

const mountAt = async (path: string) => {
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
  await router.push(path)
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

const button = (w: VueWrapper, text: string) => {
  const found = w.findAll('button').find((b) => b.text().trim() === text)
  if (!found) throw new Error(`No button "${text}"`)
  return found
}
const publishButton = (w: VueWrapper) => w.get('button.publish-button')
const decide = async (w: VueWrapper, index: number, label: string) => {
  const card = w.findAll('.ingredient-decision')[index]!
  const option = card.findAll('label').find((l) => l.text().trim() === label)!
  await option.get('input').setValue(true)
}

describe('src/views/AdminSubmissionsView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useToast().toasts.value.splice(0)
    vi.mocked(getCategories).mockResolvedValue(['Cleansers', 'Toners'])
    vi.mocked(getFunctionalGroups).mockResolvedValue(['Humectant', 'Skin-Identical Lipid'])
    vi.mocked(searchIngredients).mockResolvedValue([])
    vi.mocked(getAdminQueue).mockResolvedValue(queue([row('sub-1', 'Hydrating Facial Cleanser 473 ml'), row('sub-2', 'Gel Toner')]))
    vi.mocked(getAdminSubmission).mockResolvedValue(detail())
  })
  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
  })

  describe('the queue', () => {
    it('opens on Waiting, asks for pending submissions, and shows every tab with its count', async () => {
      const { wrapper } = await mountAt('/admin/submissions')

      expect(getAdminQueue).toHaveBeenCalledWith('pending')
      const tabs = wrapper.findAll('[role="tab"]')
      expect(tabs.map((t) => t.text())).toEqual(['Waiting 2', 'Published 4', 'Not added 1'])
      expect(tabs[0]!.attributes('aria-selected')).toBe('true')
    })

    it('lists the cards in the order the backend sent (oldest first), each linking to its review with its flags', async () => {
      vi.mocked(getAdminQueue).mockResolvedValue(queue([row('sub-1', 'Older', { possible_duplicate: true, new_ingredient_count: 1 }), row('sub-2', 'Newer')]))
      const { wrapper } = await mountAt('/admin/submissions')

      const cards = wrapper.findAll('a.queue-card')
      expect(cards.map((c) => c.get('.queue-name').text())).toEqual(['Older', 'Newer'])
      expect(cards[0]!.attributes('href')).toBe('/admin/submissions/sub-1')
      expect(cards[0]!.findAll('.queue-flag').map((f) => f.text())).toEqual(['Possible duplicate', '1 new ingredient'])
      expect(cards[0]!.get('.queue-meta').text()).toBe('From Nok · 1 Oct 2026 · Cleansers · 7 ingredients')
    })

    it('asks for the chosen status when another tab is picked', async () => {
      const { wrapper } = await mountAt('/admin/submissions')

      await wrapper.findAll('[role="tab"]')[2]!.trigger('click')
      await flushPromises()

      expect(getAdminQueue).toHaveBeenLastCalledWith('rejected')
      expect(wrapper.findAll('[role="tab"]')[2]!.attributes('aria-selected')).toBe('true')
    })

    it('shows the designed "Nothing waiting" state, whose button opens what was published', async () => {
      vi.mocked(getAdminQueue).mockResolvedValue(queue([], { pending: 0, approved: 2, rejected: 1 }))
      const { wrapper } = await mountAt('/admin/submissions')

      expect(wrapper.get('.queue-empty h2').text()).toBe('Nothing waiting')
      expect(wrapper.findAll('[role="tab"]')[0]!.text()).toBe('Waiting 0')
      await wrapper.get('button.see-published').trigger('click')
      await flushPromises()
      expect(getAdminQueue).toHaveBeenLastCalledWith('approved')
    })

    it('says a quiet line, not the all-clear, for an empty Published or Not added tab', async () => {
      vi.mocked(getAdminQueue).mockResolvedValueOnce(queue([row('sub-1', 'A')])).mockResolvedValueOnce(queue([]))
      const { wrapper } = await mountAt('/admin/submissions')

      await wrapper.findAll('[role="tab"]')[1]!.trigger('click')
      await flushPromises()

      expect(wrapper.find('.queue-empty').exists()).toBe(false)
      expect(wrapper.get('.empty-tab').text()).toBe('Nothing has been published from a submission yet.')
    })

    it('shows a load failure with a retry that asks again', async () => {
      vi.mocked(getAdminQueue).mockRejectedValueOnce(httpError(500))
      const { wrapper } = await mountAt('/admin/submissions')

      expect(wrapper.get('.queue-failed').text()).toContain("We couldn't load the queue")
      await wrapper.get('.queue-failed button.retry').trigger('click')
      await flushPromises()
      expect(getAdminQueue).toHaveBeenCalledTimes(2)
      expect(wrapper.findAll('a.queue-card')).toHaveLength(2)
    })

    it('shows the 403 state when the queue answers 403', async () => {
      vi.mocked(getAdminQueue).mockRejectedValue(httpError(403, { detail: 'Admin access required' }))
      const { wrapper } = await mountAt('/admin/submissions')

      expect(wrapper.get('.admin-forbidden h1').text()).toBe('For the SkinBuddy team')
      expect(wrapper.find('.admin-queue').exists()).toBe(false)
    })
  })

  describe('the review', () => {
    it('loads the submission in the id and marks its card as the one open', async () => {
      const { wrapper } = await mountAt('/admin/submissions/sub-1')

      expect(getAdminSubmission).toHaveBeenCalledWith('sub-1')
      expect(wrapper.get('.review-title').text()).toBe('CeraVe Hydrating Facial Cleanser 473 ml')
      expect(wrapper.findAll('a.queue-card')[0]!.attributes('aria-current')).toBe('page')
    })

    it('turns Publish off for an exact duplicate, explains why, and offers the existing product and its edit page', async () => {
      vi.mocked(getAdminSubmission).mockResolvedValue(
        detail({ duplicate_candidates: [{ id: 'p-1', slug: 'cerave-hydrating', brand: 'CeraVe', name: 'Hydrating Facial Cleanser 473 ml', exact: true }] }),
      )
      const { wrapper } = await mountAt('/admin/submissions/sub-1')
      await decide(wrapper, 0, "Name only, I'll describe it later")

      expect(publishButton(wrapper).attributes('disabled')).toBeDefined()
      expect(wrapper.get('.publish-blockers').text()).toContain('this product is already in the catalogue')
      expect(wrapper.get('.duplicate-exact a.open-existing').attributes('href')).toBe('/product/cerave-hydrating')
      expect(wrapper.get('.duplicate-exact a.edit-existing').attributes('href')).toBe('/products/cerave-hydrating/edit')
    })

    it('warns about a close duplicate but still lets the admin publish', async () => {
      vi.mocked(getAdminSubmission).mockResolvedValue(
        detail({ duplicate_candidates: [{ id: 'p-1', slug: 'cerave-h', brand: 'CeraVe', name: 'Hydrating Facial Cleanser', exact: false }] }),
      )
      const { wrapper } = await mountAt('/admin/submissions/sub-1')
      await decide(wrapper, 0, "Name only, I'll describe it later")

      expect(wrapper.get('.duplicate-close').text()).toContain('Possibly already in the catalogue')
      expect(wrapper.find('.duplicate-exact').exists()).toBe(false)
      expect(publishButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('notes each ingredient by its existing matches: none, one ("will link to") and several ("pick one")', async () => {
      vi.mocked(getAdminSubmission).mockResolvedValue(
        detail({ ingredients: [known(0, 'Water'), fresh(1, 'Zz New'), fresh(2, 'Aqua', ['Water']), fresh(3, 'Ceramide', ['Ceramide NP', 'Ceramide AP'])] }),
      )
      const { wrapper } = await mountAt('/admin/submissions/sub-1')

      expect(wrapper.findAll('.ingredient-note').map((n) => n.text())).toEqual([
        'In our list',
        'Not in our list yet',
        'Will link to Water',
        'Matches several, pick one',
      ])
      expect(wrapper.get('.ingredient-counts').text()).toBe('1 known · 3 new')
      const several = wrapper.findAll('.ingredient-decision')[2]!
      expect(several.find('fieldset').exists()).toBe(false)
      expect(several.findAll('button.use-match').map((b) => b.text())).toEqual(['Use Ceramide NP', 'Use Ceramide AP'])
    })

    it('saves the picked match by replacing that one ingredient, at its position, before publishing', async () => {
      vi.mocked(getAdminSubmission).mockResolvedValue(
        detail({
          submission: { ...detail().submission, ingredients: [{ ingredient_id: 'i-0' }, { new_name: 'Ceramide' }] },
          ingredients: [known(0, 'Water'), fresh(1, 'Ceramide', ['Ceramide NP', 'Ceramide AP'])],
        }),
      )
      vi.mocked(editAdminSubmission).mockResolvedValue(detail({ ingredients: [known(0, 'Water'), known(1, 'Ceramide NP')] }))
      const { wrapper } = await mountAt('/admin/submissions/sub-1')

      expect(publishButton(wrapper).attributes('disabled')).toBeDefined()
      await wrapper.findAll('button.use-match')[0]!.trigger('click')
      await flushPromises()

      expect(editAdminSubmission).toHaveBeenCalledWith('sub-1', { ingredients: [{ ingredient_id: 'i-0' }, { ingredient_id: 'm-0' }] })
      expect(wrapper.find('.ingredient-decision').exists()).toBe(false)
      expect(publishButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('offers only linking or dropping for a name that matches one of ours', async () => {
      vi.mocked(getAdminSubmission).mockResolvedValue(detail({ ingredients: [fresh(0, 'Aqua', ['Water'])] }))
      const { wrapper } = await mountAt('/admin/submissions/sub-1')

      const card = wrapper.get('.ingredient-decision')
      expect(card.get('.match-one').text()).toContain('Already in our list as Water')
      expect(card.findAll('label').map((l) => l.text().trim())).toEqual(['Link it to Water', 'Not a real ingredient, drop it'])
    })

    it('pre-fills the benefits with the sender\'s known_for and needs a functional group for "with details"', async () => {
      const { wrapper } = await mountAt('/admin/submissions/sub-1')

      expect(publishButton(wrapper).attributes('disabled')).toBeDefined()
      await decide(wrapper, 0, "With Nok's details")

      expect((wrapper.get('textarea.benefits-text').element as HTMLTextAreaElement).value).toBe('Supports the skin barrier')
      const select = wrapper.get('select.functional-group')
      expect(select.findAll('option').map((o) => o.text())).toEqual(['Choose one', 'Humectant', 'Skin-Identical Lipid'])
      expect(select.attributes('aria-invalid')).toBe('true')
      expect(publishButton(wrapper).attributes('disabled')).toBeDefined()

      await select.setValue('Skin-Identical Lipid')
      expect(publishButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('starts the benefits and concerns ticked and the source link unticked', async () => {
      const { wrapper } = await mountAt('/admin/submissions/sub-1')

      expect(wrapper.findAll('input.tick-benefit').map((i) => (i.element as HTMLInputElement).checked)).toEqual([true, true])
      expect(wrapper.findAll('input.tick-good-for').map((i) => (i.element as HTMLInputElement).checked)).toEqual([true, true])
      expect((wrapper.get('input.tick-source').element as HTMLInputElement).checked).toBe(false)
    })

    it('confirms, then approves with 0-based positions and only the ticked extras, and opens the new product with a toast', async () => {
      vi.mocked(approveSubmission).mockResolvedValue({ product_id: 'p-9', slug: 'cerave-hydrating-facial-cleanser-473-ml' })
      const { wrapper, router } = await mountAt('/admin/submissions/sub-1')
      await decide(wrapper, 0, "With Nok's details")
      await wrapper.get('select.functional-group').setValue('Skin-Identical Lipid')
      await wrapper.findAll('input.tick-benefit')[0]!.setValue(false)
      await wrapper.get('input.tick-source').setValue(true)

      await publishButton(wrapper).trigger('click')
      expect(wrapper.get('[role="dialog"] h2').text()).toBe('Publish this product?')
      expect(approveSubmission).not.toHaveBeenCalled()
      await button(wrapper, 'Publish now').trigger('click')
      await flushPromises()

      expect(approveSubmission).toHaveBeenCalledWith('sub-1', {
        publish_benefits: ['Supports the skin barrier'],
        publish_good_for: ['Dry skin', 'Sensitive'],
        publish_source_urls: ['https://brand.example/cleanser'],
        new_ingredients: [{ position: 1, decision: 'with_details', functional_group: 'Skin-Identical Lipid', benefits: 'Supports the skin barrier' }],
      })
      expect(router.currentRoute.value.fullPath).toBe('/product/cerave-hydrating-facial-cleanser-473-ml')
      expect(useToast().toasts.value.map((t) => t.message)).toContain('Published. CeraVe Hydrating Facial Cleanser 473 ml is now in Explore.')
    })

    it('moves focus into the publish dialog, closes it on Escape and gives focus back to Publish', async () => {
      const { wrapper } = await mountAt('/admin/submissions/sub-1')
      await decide(wrapper, 0, "Name only, I'll describe it later")

      ;(publishButton(wrapper).element as HTMLButtonElement).focus()
      await publishButton(wrapper).trigger('click')
      await flushPromises()
      expect(document.activeElement?.textContent?.trim()).toBe('Not yet')
      expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true')

      await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
      await flushPromises()
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
      expect(document.activeElement).toBe(publishButton(wrapper).element)
      expect(approveSubmission).not.toHaveBeenCalled()
    })

    it('rejects with the review note after confirming, then goes back to the queue and reloads it', async () => {
      vi.mocked(rejectSubmission).mockResolvedValue()
      const { wrapper, router } = await mountAt('/admin/submissions/sub-1')
      await wrapper.get('#r-note').setValue('  This product is already in the catalogue.  ')

      await wrapper.get('button.reject-button').trigger('click')
      expect(wrapper.get('[role="dialog"] h2').text()).toBe("Don't add this product?")
      await button(wrapper, "Don't add it").trigger('click')
      await flushPromises()

      expect(rejectSubmission).toHaveBeenCalledWith('sub-1', 'This product is already in the catalogue.')
      expect(router.currentRoute.value.fullPath).toBe('/admin/submissions')
      expect(getAdminQueue).toHaveBeenCalledTimes(2)
    })

    it('sends no note as null, and refuses a note over 1000 characters', async () => {
      vi.mocked(rejectSubmission).mockResolvedValue()
      const { wrapper } = await mountAt('/admin/submissions/sub-1')

      await wrapper.get('#r-note').setValue('x'.repeat(1001))
      expect(wrapper.get('button.reject-button').attributes('disabled')).toBeDefined()
      expect(wrapper.get('#r-note').attributes('aria-invalid')).toBe('true')

      await wrapper.get('#r-note').setValue('   ')
      await wrapper.get('button.reject-button').trigger('click')
      await button(wrapper, "Don't add it").trigger('click')
      await flushPromises()
      expect(rejectSubmission).toHaveBeenCalledWith('sub-1', null)
    })

    it('says an already-reviewed submission (SBNPD) plainly and offers to reload', async () => {
      vi.mocked(approveSubmission).mockRejectedValue(httpError(409, { detail: 'the submission is approved, not pending', code: 'SBNPD' }))
      const { wrapper } = await mountAt('/admin/submissions/sub-1')
      await decide(wrapper, 0, "Name only, I'll describe it later")
      await publishButton(wrapper).trigger('click')
      await button(wrapper, 'Publish now').trigger('click')
      await flushPromises()

      expect(wrapper.get('.action-problem').text()).toContain('Someone has already reviewed this submission.')
      await wrapper.get('button.reload-queue').trigger('click')
      await flushPromises()
      expect(getAdminSubmission).toHaveBeenCalledTimes(2)
      expect(getAdminQueue).toHaveBeenCalledTimes(2)
    })

    it('turns a 409 duplicate on approve into the exact-duplicate warning, naming the product', async () => {
      vi.mocked(approveSubmission).mockRejectedValue(
        httpError(409, { detail: 'duplicate', candidates: [{ id: 'p-7', slug: 'cerave-x', brand: 'CeraVe', name: 'Hydrating Facial Cleanser 473 ml' }] }),
      )
      const { wrapper } = await mountAt('/admin/submissions/sub-1')
      await decide(wrapper, 0, "Name only, I'll describe it later")
      await publishButton(wrapper).trigger('click')
      await button(wrapper, 'Publish now').trigger('click')
      await flushPromises()

      expect(wrapper.get('.action-problem').text()).toContain('already in the catalogue as CeraVe Hydrating Facial Cleanser 473 ml')
      expect(wrapper.get('.duplicate-exact a.edit-existing').attributes('href')).toBe('/products/cerave-x/edit')
      expect(publishButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('saves only the corrected fields, and holds Publish until they are saved', async () => {
      vi.mocked(editAdminSubmission).mockResolvedValue(detail({ submission: { ...detail().submission, name: 'Hydrating Facial Cleanser' } }))
      const { wrapper } = await mountAt('/admin/submissions/sub-1')
      await decide(wrapper, 0, "Name only, I'll describe it later")

      await wrapper.get('#r-name').setValue('Hydrating Facial Cleanser')
      expect(publishButton(wrapper).attributes('disabled')).toBeDefined()
      await wrapper.get('button.save-corrections').trigger('click')
      await flushPromises()

      expect(editAdminSubmission).toHaveBeenCalledWith('sub-1', { name: 'Hydrating Facial Cleanser' })
      expect(publishButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('keeps the admin\'s decisions when a saved correction answers with the same ingredients', async () => {
      vi.mocked(editAdminSubmission).mockResolvedValue(detail({ submission: { ...detail().submission, name: 'Renamed' } }))
      const { wrapper } = await mountAt('/admin/submissions/sub-1')
      await decide(wrapper, 0, 'Not a real ingredient, drop it')
      await wrapper.get('#r-name').setValue('Renamed')
      await wrapper.get('button.save-corrections').trigger('click')
      await flushPromises()

      const checked = wrapper.findAll('input.decision-option').map((i) => (i.element as HTMLInputElement).checked)
      expect(checked).toEqual([false, false, true])
    })

    it('converts a legacy submission\'s plain names to the current format before it can be published', async () => {
      vi.mocked(getAdminSubmission).mockResolvedValue(detail({ submission: { ...detail().submission, ingredients: ['Niacimide'] }, ingredients: [fresh(0, 'Niacimide')] }))
      vi.mocked(editAdminSubmission).mockResolvedValue(detail({ submission: { ...detail().submission, ingredients: [{ new_name: 'Niacimide' }] }, ingredients: [fresh(0, 'Niacimide')] }))
      const { wrapper } = await mountAt('/admin/submissions/sub-1')

      expect(wrapper.get('.publish-blockers').text()).toContain('old format')
      await wrapper.get('button.convert-legacy').trigger('click')
      await flushPromises()

      expect(editAdminSubmission).toHaveBeenCalledWith('sub-1', { ingredients: [{ new_name: 'Niacimide' }] })
      expect(wrapper.find('.legacy-note').exists()).toBe(false)
    })

    it('shows a reviewed submission as it ended, with no publishing controls', async () => {
      vi.mocked(getAdminSubmission).mockResolvedValue(detail({ status: 'rejected', reviewed_at: '2026-10-03T08:00:00Z', review_notes: 'Already listed.' }))
      const { wrapper } = await mountAt('/admin/submissions/sub-1')

      expect(wrapper.get('.reviewed-summary').text()).toContain('Already listed.')
      expect(wrapper.find('button.publish-button').exists()).toBe(false)
      expect(wrapper.find('.ingredient-decision').exists()).toBe(false)
    })

    it('shows the 403 state when the review answers 403', async () => {
      vi.mocked(getAdminSubmission).mockRejectedValue(httpError(403, { detail: 'Admin access required' }))
      const { wrapper } = await mountAt('/admin/submissions/sub-1')

      expect(wrapper.find('.admin-forbidden').exists()).toBe(true)
    })
  })
})
