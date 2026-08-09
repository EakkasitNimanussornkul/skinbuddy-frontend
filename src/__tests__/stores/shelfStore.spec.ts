import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// No network: the shelf API module is replaced wholesale, so these tests never
// reach a running backend and are deterministic on any machine.
vi.mock('../../api/shelfapi', () => ({
  getMyShelf: vi.fn(),
  addToShelf: vi.fn(),
}))

import { useShelfStore } from '../../stores/shelfStore'
import { getMyShelf, addToShelf } from '../../api/shelfapi'

const shelfItem = (overrides = {}) => ({
  id: 'item-1',
  brand: 'CeraVe',
  name: 'Hydrating Facial Cleanser',
  category: 'Cleanser',
  status: 'active' as const,
  opened_date: null,
  ...overrides,
})

describe('useShelfStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('loadShelf()', () => {
    it('populates items with the shelf returned by the API', async () => {
      vi.mocked(getMyShelf).mockResolvedValue([shelfItem(), shelfItem({ id: 'item-2' })])
      const store = useShelfStore()

      await store.loadShelf()

      expect(store.items).toHaveLength(2)
      expect(store.items[0]!.id).toBe('item-1')
    })

    it('clears the loading flag after a successful load', async () => {
      vi.mocked(getMyShelf).mockResolvedValue([])
      const store = useShelfStore()

      await store.loadShelf()

      expect(store.isLoading).toBe(false)
    })

    it('sets an error message and leaves items empty when the API call fails', async () => {
      vi.mocked(getMyShelf).mockRejectedValue(new Error('network down'))
      const store = useShelfStore()

      await store.loadShelf()

      expect(store.error).toBe('Could not load shelf')
      expect(store.items).toEqual([])
    })

    it('clears the loading flag even when the API call fails', async () => {
      vi.mocked(getMyShelf).mockRejectedValue(new Error('network down'))
      const store = useShelfStore()

      await store.loadShelf()

      // Guards the `finally` block: without it a failed load leaves the UI
      // spinning forever.
      expect(store.isLoading).toBe(false)
    })
  })

  describe('addProduct()', () => {
    it('prepends the saved product returned by the API so it appears first', async () => {
      vi.mocked(getMyShelf).mockResolvedValue([shelfItem({ id: 'existing' })])
      vi.mocked(addToShelf).mockResolvedValue(shelfItem({ id: 'brand-new' }))
      const store = useShelfStore()
      await store.loadShelf()

      await store.addProduct({ product_id: 'p-1', usage_state: 'active' })

      expect(store.items[0]!.id).toBe('brand-new')
      expect(store.items).toHaveLength(2)
    })

    it('forwards the submitted payload to the shelf API unchanged', async () => {
      vi.mocked(addToShelf).mockResolvedValue(shelfItem())
      const store = useShelfStore()
      const payload = { product_id: 'p-1', usage_state: 'wishlist', opened_date: null }

      await store.addProduct(payload)

      expect(addToShelf).toHaveBeenCalledWith(payload)
    })

    it('leaves the shelf unchanged when the API rejects, rather than inserting an unsaved item', async () => {
      vi.mocked(addToShelf).mockRejectedValue(new Error('rejected'))
      const store = useShelfStore()

      await store.addProduct({ product_id: 'p-1', usage_state: 'active' })

      expect(store.items).toEqual([])
    })
  })

  describe('removeProduct()', () => {
    it('removes only the item with the given id from local state', async () => {
      vi.mocked(getMyShelf).mockResolvedValue([
        shelfItem({ id: 'keep-1' }),
        shelfItem({ id: 'drop' }),
        shelfItem({ id: 'keep-2' }),
      ])
      const store = useShelfStore()
      await store.loadShelf()

      store.removeProduct('drop')

      expect(store.items.map((i) => i.id)).toEqual(['keep-1', 'keep-2'])
    })

    it('leaves the shelf untouched when the id does not match any item', async () => {
      vi.mocked(getMyShelf).mockResolvedValue([shelfItem({ id: 'keep' })])
      const store = useShelfStore()
      await store.loadShelf()

      store.removeProduct('does-not-exist')

      expect(store.items).toHaveLength(1)
    })

    it('does not call the shelf API, because removal is local-only state', async () => {
      vi.mocked(getMyShelf).mockResolvedValue([shelfItem({ id: 'drop' })])
      const store = useShelfStore()
      await store.loadShelf()
      vi.clearAllMocks()

      store.removeProduct('drop')

      // Documents actual behaviour, not desired behaviour: removeProduct only
      // filters the local array. removeFromShelf() in src/api/shelfapi.ts is
      // never called from here, so a caller relying on this alone would see the
      // item return on reload. Callers must invoke the API themselves.
      expect(addToShelf).not.toHaveBeenCalled()
      expect(getMyShelf).not.toHaveBeenCalled()
    })
  })
})
