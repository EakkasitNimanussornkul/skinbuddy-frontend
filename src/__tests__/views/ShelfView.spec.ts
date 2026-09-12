import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

// Partial mock: only the two requests are replaced. resolveShelfItemStatus stays
// real, because the status filtering below is exactly the rule FE-DEF-16 was
// about - a filter deriving status its own way is the bug, so a test that
// stubbed the derivation would be testing the wrong thing.
vi.mock('../../api/shelfapi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/shelfapi')>()),
  getMyShelf: vi.fn(),
  removeFromShelf: vi.fn(),
}))

import { getMyShelf, removeFromShelf } from '../../api/shelfapi'
import { toLocalDateString, addMonthsAsDateString } from '../../api/dates'
import ShelfView from '../../views/ShelfView.vue'
import ItemDetailsModal from '../../components/Shelf/ItemDetailsModal.vue'
import ConfirmDeleteModal from '../../components/Shared/ConfirmDeleteModal.vue'
import AddProductModal from '../../components/Shelf/AddProductModal.vue'
import ShelfQuickAddBanner from '../../components/Shelf/ShelfQuickAddBanner.vue'
import { useToast } from '../../composables/useToast'
import type { ShelfItem } from '../../stores/shelfStore'

const { toasts } = useToast()

const shelfItem = (overrides: Partial<ShelfItem> = {}): ShelfItem => ({
  id: 'item-1',
  user_id: 'user-1',
  product_id: 'p-1',
  usage_state: 'active',
  opened_date: null,
  expiration_date: null,
  pao: null,
  archive_outcome: null,
  archive_notes: null,
  archived_at: null,
  products: {
    id: 'p-1',
    brand: 'CeraVe',
    name: 'Hydrating Facial Cleanser',
    category: 'Cleanser',
    slug: 'cerave',
    ingredients: null,
    image_url: null,
    description: null,
    pao: null,
    price_thb: null,
    price_usd: null,
  },
  ...overrides,
})

const withProduct = (item: Partial<ShelfItem>, product: Record<string, unknown>): ShelfItem => {
  const base = shelfItem(item)
  return { ...base, products: { ...base.products!, ...product } as ShelfItem['products'] }
}

/**
 * Stands in for ShelfCard so the rendered grid can be read as a list of ids -
 * which is what makes filteredProducts observable - and so the two events the
 * view listens for can be raised without depending on the real card's markup.
 */
const ShelfCardStub = {
  name: 'ShelfCard',
  props: ['item'],
  emits: ['open-details', 'delete'],
  template: `<div class="shelf-card">
    <span class="card-id">{{ item.id }}</span>
    <button class="card-open" @click="$emit('open-details', item)">open</button>
    <button class="card-delete" @click="$emit('delete', item)">delete</button>
  </div>`,
}

const mountShelf = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/shelf', component: ShelfView },
      { path: '/explore', component: { template: '<div />' } },
    ],
  })
  await router.push('/shelf')
  await router.isReady()

  const wrapper = mount(ShelfView, {
    global: {
      plugins: [router],
      stubs: {
        teleport: true,
        ShelfCard: ShelfCardStub,
        AddProductModal: true,
        ItemDetailsModal: true,
        ConfirmDeleteModal: true,
        ShelfQuickAddBanner: true,
      },
    },
  })
  await flushPromises()
  return wrapper
}

/** The ids currently rendered in the grid, which is filteredProducts. */
const shownIds = (wrapper: VueWrapper) =>
  wrapper.findAll('.card-id').map((n) => n.text())

const buttonWith = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().trim() === text)!

const lastToast = () => toasts.value[toasts.value.length - 1]

describe('src/views/ShelfView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toasts.value.splice(0)
    vi.mocked(getMyShelf).mockResolvedValue([])
    vi.mocked(removeFromShelf).mockResolvedValue({})
  })

  describe('fetchShelf()', () => {
    it('renders the shelf returned by the API', async () => {
      vi.mocked(getMyShelf).mockResolvedValue([shelfItem(), shelfItem({ id: 'item-2' })])

      const wrapper = await mountShelf()

      expect(shownIds(wrapper)).toEqual(['item-1', 'item-2'])
    })

    it('clears the shelf and reports the failure rather than leaving stale rows on screen', async () => {
      vi.mocked(getMyShelf).mockResolvedValue([shelfItem()])
      const wrapper = await mountShelf()
      expect(shownIds(wrapper)).toEqual(['item-1'])
      expect(wrapper.findComponent(ShelfQuickAddBanner).props('itemCount')).toBe(1)

      // Reload through the path a user actually takes to trigger one from a
      // populated shelf: adding a product asks the view to re-fetch.
      vi.mocked(getMyShelf).mockRejectedValue(new Error('network down'))
      wrapper.findComponent(ShelfQuickAddBanner).vm.$emit('open-add-modal')
      await flushPromises()
      wrapper.findComponent(AddProductModal).vm.$emit('refresh')
      await flushPromises()

      // Cleared, not kept. A failed reload leaving the previous shelf on screen
      // would present stale rows as current - the same trade FE-DEF-09 settled
      // for the catalogue.
      //
      // Read off the quick-add banner rather than the grid. The grid is not
      // rendered at all in the failed state, so asserting it is empty says
      // nothing about whether myShelf was cleared - it would pass either way.
      // The banner takes :item-count="myShelf.length" and renders in every
      // state, so it is the one place the underlying list is observable here.
      expect(wrapper.findComponent(ShelfQuickAddBanner).props('itemCount')).toBe(0)
      expect(wrapper.text()).toContain('Shelf Unavailable')
      expect(lastToast()!.message).toBe('Failed to load checked inventory')
    })

    it('recovers when a retry succeeds', async () => {
      vi.mocked(getMyShelf).mockRejectedValueOnce(new Error('network down'))
      const wrapper = await mountShelf()
      expect(wrapper.text()).toContain('Shelf Unavailable')

      vi.mocked(getMyShelf).mockResolvedValue([shelfItem({ id: 'item-back' })])
      await buttonWith(wrapper, 'Retry Retrieval').trigger('click')
      await flushPromises()

      expect(shownIds(wrapper)).toEqual(['item-back'])
      expect(wrapper.text()).not.toContain('Shelf Unavailable')
    })
  })

  describe('handleModalRefresh()', () => {
    const openDetails = async (wrapper: VueWrapper) => {
      await wrapper.findAll('.card-open')[0]!.trigger('click')
      await flushPromises()
    }

    it('re-fetches the shelf and re-points the open modal at the fresh row', async () => {
      vi.mocked(getMyShelf).mockResolvedValue([shelfItem({ usage_state: 'unopened' })])
      const wrapper = await mountShelf()
      await openDetails(wrapper)
      expect(wrapper.findComponent(ItemDetailsModal).props('item').usage_state).toBe('unopened')

      vi.mocked(getMyShelf).mockResolvedValue([shelfItem({ usage_state: 'active' })])
      wrapper.findComponent(ItemDetailsModal).vm.$emit('refresh')
      await flushPromises()

      // The modal must be handed the new object, not the one it was opened
      // with. Leaving it pointing at the stale row is what the re-sync exists
      // to prevent.
      expect(wrapper.findComponent(ItemDetailsModal).props('item').usage_state).toBe('active')
    })

    it('leaves the modal on its current row when the item is gone from the fresh shelf', async () => {
      vi.mocked(getMyShelf).mockResolvedValue([shelfItem()])
      const wrapper = await mountShelf()
      await openDetails(wrapper)

      vi.mocked(getMyShelf).mockResolvedValue([shelfItem({ id: 'someone-else' })])
      wrapper.findComponent(ItemDetailsModal).vm.$emit('refresh')
      await flushPromises()

      // No match, so viewingItem is left alone rather than set to undefined -
      // which would unmount the modal out from under the user mid-edit.
      expect(wrapper.findComponent(ItemDetailsModal).props('item').id).toBe('item-1')
      expect(shownIds(wrapper)).toEqual(['someone-else'])
    })

    it('says the edit was saved but the reload was not, when the re-fetch fails', async () => {
      vi.mocked(getMyShelf).mockResolvedValue([shelfItem()])
      const wrapper = await mountShelf()
      await openDetails(wrapper)

      vi.mocked(getMyShelf).mockRejectedValue(new Error('network down'))
      wrapper.findComponent(ItemDetailsModal).vm.$emit('refresh')
      await flushPromises()

      // FE-DEF-14. Two separate facts: the edit landed, the reload did not.
      // Collapsing them into "something went wrong" would be worse than silence,
      // because it would suggest the change had not been saved.
      expect(lastToast()!.message).toBe(
        'Change saved, but the shelf could not be reloaded. Refresh to see it.',
      )
      expect(shownIds(wrapper)).toEqual(['item-1'])
    })
  })

  describe('filteredProducts (computed)', () => {
    const catalogue = () => [
      withProduct({ id: 'cleanser' }, { name: 'Hydrating Cleanser', brand: 'CeraVe', category: 'Cleanser' }),
      withProduct({ id: 'serum' }, { name: 'Niacinamide Serum', brand: 'The Ordinary', category: 'Serum' }),
      withProduct({ id: 'archived-one', usage_state: 'archived' }, { name: 'Old Toner', brand: 'Klairs', category: 'Toner' }),
      withProduct({ id: 'unopened-one', usage_state: 'unopened' }, { name: 'Spare Cleanser', brand: 'CeraVe', category: 'Cleanser' }),
    ]

    const search = async (wrapper: VueWrapper, query: string) => {
      await wrapper.find('input[type="text"]').setValue(query)
    }

    const pickPill = async (wrapper: VueWrapper, label: string) => {
      await buttonWith(wrapper, label).trigger('click')
      await flushPromises()
    }

    it('excludes archived items from the All status, which is the default view', async () => {
      vi.mocked(getMyShelf).mockResolvedValue(catalogue())

      const wrapper = await mountShelf()

      // "All" means everything still in the routine. An archived product is a
      // record of something finished, and listing it beside active products
      // under a filter named All is what the Archived pill exists to separate.
      expect(shownIds(wrapper)).toEqual(['cleanser', 'serum', 'unopened-one'])
    })

    it('lists only archived items under the Archived status', async () => {
      vi.mocked(getMyShelf).mockResolvedValue(catalogue())
      const wrapper = await mountShelf()

      await pickPill(wrapper, 'Archived')

      expect(shownIds(wrapper)).toEqual(['archived-one'])
    })

    it('narrows by a status derived from the item rather than stored on it', async () => {
      vi.mocked(getMyShelf).mockResolvedValue(catalogue())
      const wrapper = await mountShelf()

      await pickPill(wrapper, 'Unopened')

      expect(shownIds(wrapper)).toEqual(['unopened-one'])
    })

    it('matches the search against the product name', async () => {
      vi.mocked(getMyShelf).mockResolvedValue(catalogue())
      const wrapper = await mountShelf()

      await search(wrapper, 'niacinamide')

      expect(shownIds(wrapper)).toEqual(['serum'])
    })

    it('matches the search against the brand, case-insensitively', async () => {
      vi.mocked(getMyShelf).mockResolvedValue(catalogue())
      const wrapper = await mountShelf()

      await search(wrapper, 'CeRaVe')

      expect(shownIds(wrapper)).toEqual(['cleanser', 'unopened-one'])
    })

    it('matches the search against the category', async () => {
      vi.mocked(getMyShelf).mockResolvedValue(catalogue())
      const wrapper = await mountShelf()

      await search(wrapper, 'serum')

      expect(shownIds(wrapper)).toEqual(['serum'])
    })

    it('applies the search and the category filter together, not either alone', async () => {
      vi.mocked(getMyShelf).mockResolvedValue(catalogue())
      const wrapper = await mountShelf()

      await pickPill(wrapper, 'Cleanser')
      await search(wrapper, 'spare')

      expect(shownIds(wrapper)).toEqual(['unopened-one'])
    })

    it('treats an expired item as Expired even when only an opened date and a period are stored', async () => {
      // FE-DEF-16: the filter used to read the stored expiration date alone
      // while the card fell back to opened-plus-period, so the Expired pill hid
      // the very items its own cards labelled Expired. No expiration_date here -
      // the status has to come from opened_date and pao.
      vi.mocked(getMyShelf).mockResolvedValue([
        shelfItem({ id: 'stale', opened_date: addMonthsAsDateString(new Date(), -12), pao: 6 }),
        shelfItem({ id: 'fresh', opened_date: toLocalDateString(), pao: 24 }),
      ])
      const wrapper = await mountShelf()

      await pickPill(wrapper, 'Expired')

      expect(shownIds(wrapper)).toEqual(['stale'])
    })
  })

  describe('shelfState (computed)', () => {
    it('reports failure rather than emptiness when the request never completed', async () => {
      vi.mocked(getMyShelf).mockRejectedValue(new Error('network down'))

      const wrapper = await mountShelf()

      // FE-DEF-13. Both states produce a zero-length shelf, and telling a user
      // with a full shelf that it is empty invites them to add everything again.
      expect(wrapper.text()).toContain('Shelf Unavailable')
      expect(wrapper.text()).not.toContain('Your Routine Shield is Empty')
    })

    it('reports the true empty state when the shelf genuinely holds nothing', async () => {
      vi.mocked(getMyShelf).mockResolvedValue([])

      const wrapper = await mountShelf()

      expect(wrapper.text()).toContain('Your Routine Shield is Empty')
      expect(wrapper.text()).not.toContain('Shelf Unavailable')
    })

    it('counts the whole shelf, not the filtered view', async () => {
      vi.mocked(getMyShelf).mockResolvedValue([shelfItem()])
      const wrapper = await mountShelf()

      await wrapper.find('input[type="text"]').setValue('nothing matches this')

      // A filter that excludes everything is not an empty shelf. The user owns a
      // product; offering them "Open Product Catalog" here would answer a
      // question they did not ask, and the inner message is the one that
      // matches what happened.
      expect(wrapper.text()).toContain('No items match your current search or status filters.')
      expect(wrapper.text()).not.toContain('Your Routine Shield is Empty')
    })

    it('shows only the loading state while the first request is in flight', async () => {
      let release!: (items: ShelfItem[]) => void
      vi.mocked(getMyShelf).mockReturnValue(
        new Promise<ShelfItem[]>((resolve) => {
          release = resolve
        }),
      )

      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/shelf', component: ShelfView }],
      })
      await router.push('/shelf')
      await router.isReady()
      const wrapper = mount(ShelfView, {
        global: {
          plugins: [router],
          stubs: { teleport: true, ShelfCard: ShelfCardStub, AddProductModal: true, ItemDetailsModal: true, ConfirmDeleteModal: true, ShelfQuickAddBanner: true },
        },
      })

      expect(wrapper.text()).toContain('Running Safety Check...')
      expect(wrapper.text()).not.toContain('Your Routine Shield is Empty')

      release([])
      await flushPromises()

      expect(wrapper.text()).not.toContain('Running Safety Check...')
    })
  })

  describe('executeDelete()', () => {
    const confirmDelete = async (wrapper: VueWrapper) => {
      await wrapper.findAll('.card-delete')[0]!.trigger('click')
      await flushPromises()
      wrapper.findComponent(ConfirmDeleteModal).vm.$emit('confirm')
      await flushPromises()
    }

    it('removes the item from the grid without re-fetching the shelf', async () => {
      vi.mocked(getMyShelf).mockResolvedValue([shelfItem(), shelfItem({ id: 'item-2' })])
      const wrapper = await mountShelf()

      await confirmDelete(wrapper)

      expect(removeFromShelf).toHaveBeenCalledWith('item-1')
      expect(shownIds(wrapper)).toEqual(['item-2'])
      // One call, from mount. The row is dropped locally rather than reloading
      // the whole shelf to learn something already known.
      expect(getMyShelf).toHaveBeenCalledTimes(1)
    })

    it('closes the confirmation and reports the removal in the shared wording', async () => {
      vi.mocked(getMyShelf).mockResolvedValue([shelfItem()])
      const wrapper = await mountShelf()

      await confirmDelete(wrapper)

      expect(wrapper.findComponent(ConfirmDeleteModal).exists()).toBe(false)
      // Identical to ItemDetailsModal's sentence for the same action. UC-07 and
      // UC-35 quote it verbatim, so the two paths drifting apart becomes a
      // contradiction in the SRS. FE-DEF-17.
      expect(lastToast()!.message).toBe('Product removed from active routine check.')
    })

    it('closes the details modal when the item it was showing is the one deleted', async () => {
      vi.mocked(getMyShelf).mockResolvedValue([shelfItem()])
      const wrapper = await mountShelf()
      await wrapper.findAll('.card-open')[0]!.trigger('click')
      await flushPromises()
      expect(wrapper.findComponent(ItemDetailsModal).exists()).toBe(true)

      await confirmDelete(wrapper)

      // Otherwise the modal stays open over a record that no longer exists.
      expect(wrapper.findComponent(ItemDetailsModal).exists()).toBe(false)
    })

    it('abandons the removal entirely when the confirmation is refused', async () => {
      // STC-28-TC-10. The confirmation is the only thing between the card's
      // delete control and an irreversible write, and nothing showed that its
      // refusal actually refuses: itemToDelete is already set by this point, so
      // a cancel wired to executeDelete would destroy the row the user had just
      // declined to destroy.
      vi.mocked(getMyShelf).mockResolvedValue([shelfItem(), shelfItem({ id: 'item-2' })])
      const wrapper = await mountShelf()
      await wrapper.findAll('.card-delete')[0]!.trigger('click')
      await flushPromises()
      expect(wrapper.findComponent(ConfirmDeleteModal).exists()).toBe(true)

      wrapper.findComponent(ConfirmDeleteModal).vm.$emit('cancel')
      await flushPromises()

      expect(removeFromShelf).not.toHaveBeenCalled()
      expect(wrapper.findComponent(ConfirmDeleteModal).exists()).toBe(false)
      expect(shownIds(wrapper)).toEqual(['item-1', 'item-2'])
      // And no toast either: nothing happened, so there is nothing to report.
      expect(toasts.value).toHaveLength(0)
    })

    it('keeps the item on screen and reports the failure when the delete is rejected', async () => {
      vi.mocked(removeFromShelf).mockRejectedValue(new Error('network down'))
      vi.mocked(getMyShelf).mockResolvedValue([shelfItem()])
      const wrapper = await mountShelf()

      await confirmDelete(wrapper)

      // The row is still there, because it is still on the server.
      expect(shownIds(wrapper)).toEqual(['item-1'])
      expect(lastToast()!.message).toBe('Failed to remove product')
      expect(lastToast()!.type).toBe('error')
    })
  })
})
