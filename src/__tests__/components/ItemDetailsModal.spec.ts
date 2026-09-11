import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'

vi.mock('../../api/shelfapi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/shelfapi')>()),
  removeFromShelf: vi.fn(),
  // Called from onMounted for the safety panel. Not the subject here, but it
  // has to resolve or every case would start with an unhandled rejection.
  analyzeProduct: vi.fn(),
}))

import { removeFromShelf, analyzeProduct } from '../../api/shelfapi'
import ItemDetailsModal from '../../components/Shelf/ItemDetailsModal.vue'
import { useToast } from '../../composables/useToast'
import type { ShelfItem } from '../../stores/shelfStore'

const { toasts } = useToast()

const shelfItem = (): ShelfItem => ({
  id: 'item-1',
  user_id: 'user-1',
  product_id: 'p-1',
  usage_state: 'active',
  opened_date: '2026-01-01',
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
    slug: 'cerave-hydrating-facial-cleanser',
    ingredients: null,
    image_url: null,
    description: null,
    pao: null,
    price_thb: null,
    price_usd: null,
  },
})

const buttonWith = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(text))!

/**
 * Walk the two-step confirmation the way a user does. The destructive action is
 * behind a confirm step, so a test that reached it any other way would not be
 * exercising the path that actually exists.
 */
const confirmDelete = async (wrapper: VueWrapper) => {
  await buttonWith(wrapper, 'Permanently Delete').trigger('click')
  await buttonWith(wrapper, 'Yes, Delete').trigger('click')
  await flushPromises()
}

describe('src/components/Shelf/ItemDetailsModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toasts.value.splice(0)
    vi.mocked(analyzeProduct).mockResolvedValue({ is_safe: true, warnings: [], duplicates: [] })
    vi.mocked(removeFromShelf).mockResolvedValue({})
  })

  describe('handleExecuteDelete()', () => {
    it('deletes the item the modal is showing', async () => {
      const wrapper = mount(ItemDetailsModal, { props: { item: shelfItem() } })
      await flushPromises()

      await confirmDelete(wrapper)

      expect(removeFromShelf).toHaveBeenCalledWith('item-1')
    })

    it('keeps the delete behind its confirmation step', async () => {
      const wrapper = mount(ItemDetailsModal, { props: { item: shelfItem() } })
      await flushPromises()

      await buttonWith(wrapper, 'Permanently Delete').trigger('click')

      // Reaching the confirm step is not the same as confirming. A single
      // mis-click must not be able to destroy a shelf record.
      expect(removeFromShelf).not.toHaveBeenCalled()
      expect(buttonWith(wrapper, 'Yes, Delete')).toBeTruthy()
    })

    it('tells the parent to refresh and reports the removal', async () => {
      const wrapper = mount(ItemDetailsModal, { props: { item: shelfItem() } })
      await flushPromises()

      await confirmDelete(wrapper)

      expect(wrapper.emitted('refresh')).toHaveLength(1)
      expect(toasts.value[0]!.message).toBe('Product removed from active routine check.')
      // Wording pinned, not just presence. ShelfView's own delete path emits the
      // identical sentence, and UC-07 and UC-35 quote it verbatim - the
      // documents copy interface strings, so a drift here becomes a drift in the
      // SRS. FE-DEF-17.
      expect(toasts.value[0]!.type).toBe('info')
    })

    it('reports the failure and does not tell the parent anything changed', async () => {
      vi.mocked(removeFromShelf).mockRejectedValue(new Error('network down'))
      const wrapper = mount(ItemDetailsModal, { props: { item: shelfItem() } })
      await flushPromises()

      await confirmDelete(wrapper)

      // No 'refresh': the shelf behind the modal still holds the item, and
      // re-fetching would only redraw what is already correct while suggesting
      // the delete had gone through.
      expect(wrapper.emitted('refresh')).toBeUndefined()
      expect(toasts.value[0]!.message).toBe('Failed to delete shelf item.')
      expect(toasts.value[0]!.type).toBe('error')
    })
  })
})
