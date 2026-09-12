import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'

vi.mock('../../api/products', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  searchProducts: vi.fn(),
}))
vi.mock('../../api/shelfapi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/shelfapi')>()),
  analyzeProduct: vi.fn(),
  addToShelf: vi.fn(),
}))

import { searchProducts } from '../../api/products'
import { analyzeProduct, addToShelf } from '../../api/shelfapi'
import { toLocalDateString } from '../../api/dates'
import AddProductModal from '../../components/Shelf/AddProductModal.vue'
import CatalogSearchView from '../../components/Catalog/CatalogSearchView.vue'
import ProductConfigurator from '../../components/Shelf/ProductConfigurator.vue'
import SafetyWarningModal from '../../components/Shelf/SafetyWarningModal.vue'
import { useToast } from '../../composables/useToast'

const { toasts } = useToast()

const CONFIG = { isOpened: true, expirationDate: '2027-03-01', selectedPao: 12 }

/**
 * Mount the modal and select a product, which is what renders the configurator
 * that handleSave is reached from.
 *
 * The three children are stubbed because none of them is the subject: the whole
 * of handleSave runs between the configurator's `save` and the call to
 * addToShelf, and the stubs keep their own catalogue fetching and rendering out
 * of these assertions while leaving the emit contract intact.
 */
const mountModal = async () => {
  const wrapper = mount(AddProductModal, {
    global: {
      stubs: {
        teleport: true,
        CatalogSearchView: true,
        ProductConfigurator: true,
        SafetyWarningModal: true,
      },
    },
  })
  await flushPromises()

  wrapper.findComponent(CatalogSearchView).vm.$emit('select-product', { id: 'p-1' })
  await flushPromises()

  return wrapper
}

const save = async (wrapper: VueWrapper, config: unknown = CONFIG) => {
  wrapper.findComponent(ProductConfigurator).vm.$emit('save', config)
  await flushPromises()
}

const lastToast = () => toasts.value[toasts.value.length - 1]

describe('src/components/Shelf/AddProductModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toasts.value.splice(0)
    vi.mocked(searchProducts).mockResolvedValue([])
    vi.mocked(addToShelf).mockResolvedValue({})
  })

  describe('handleSave()', () => {
    it('saves the configured product once the compatibility check clears it', async () => {
      vi.mocked(analyzeProduct).mockResolvedValue({ is_safe: true, warnings: [], duplicates: [] })
      const wrapper = await mountModal()

      await save(wrapper)

      expect(analyzeProduct).toHaveBeenCalledWith('p-1')
      expect(addToShelf).toHaveBeenCalledWith({
        product_id: 'p-1',
        usage_state: 'active',
        // The local calendar day. Under toISOString() this recorded the product
        // as opened yesterday for the whole local morning east of UTC.
        opened_date: toLocalDateString(),
        expiration_date: '2027-03-01',
        pao: 12,
      })
      expect(wrapper.emitted('refresh')).toHaveLength(1)
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('stores an unopened product with no dates against it', async () => {
      vi.mocked(analyzeProduct).mockResolvedValue({ is_safe: true, warnings: [], duplicates: [] })
      const wrapper = await mountModal()

      await save(wrapper, { isOpened: false, expirationDate: '2027-03-01', selectedPao: 12 })

      // Both dates dropped, not just the opened one: an unopened product has no
      // opened date, and an expiry derived from one would be describing a clock
      // that has not started.
      expect(addToShelf).toHaveBeenCalledWith(
        expect.objectContaining({
          usage_state: 'unopened',
          opened_date: null,
          expiration_date: null,
        }),
      )
    })

    it('refuses to save when the compatibility check could not run', async () => {
      vi.mocked(analyzeProduct).mockRejectedValue(new Error('network down'))
      const wrapper = await mountModal()

      await save(wrapper)

      // The central rule of the safety module, at the call site that matters
      // most. A check that did not run is not a check that passed - this catch
      // used to only log, so control fell through to addToShelf and the product
      // was committed unchecked while the user was told it succeeded.
      expect(addToShelf).not.toHaveBeenCalled()
      expect(lastToast()!.message).toBe('Failed to analyze product. Please try again.')
      expect(wrapper.emitted('refresh')).toBeUndefined()
    })

    it('refuses to save an unassessed product, and does not open the conflict dialogue', async () => {
      // A completed check carrying no verdict: no conflicts, but no is_safe
      // either.
      vi.mocked(analyzeProduct).mockResolvedValue({ warnings: [], duplicates: [] })
      const wrapper = await mountModal()

      await save(wrapper)

      expect(addToShelf).not.toHaveBeenCalled()
      expect(lastToast()!.message).toBe(
        'This product has not been assessed, so it cannot be added.',
      )
      // FE-DEF-29's other half. Without its own branch this status fell into the
      // warnings branch below and opened a dialogue listing no conflicts, over a
      // "Proceed Anyway" button, for a product nobody had assessed.
      expect(wrapper.findComponent(SafetyWarningModal).exists()).toBe(false)
    })

    it('offers the conflict dialogue rather than blocking when warnings are found', async () => {
      vi.mocked(analyzeProduct).mockResolvedValue({
        is_safe: false,
        warnings: [{ alert_type: 'Interaction', severity: 'High', message: 'Retinol and AHA.' }],
        duplicates: [],
      })
      const wrapper = await mountModal()

      await save(wrapper)

      // Warnings are a decision for the user, not a refusal: the dialogue opens
      // and nothing is written yet.
      expect(wrapper.findComponent(SafetyWarningModal).exists()).toBe(true)
      expect(wrapper.findComponent(SafetyWarningModal).props('warnings')).toHaveLength(1)
      expect(addToShelf).not.toHaveBeenCalled()
    })

    it('abandons the save entirely when the user cancels out of the warnings', async () => {
      // The other half of the conflict dialogue. Only `proceed` was covered
      // here, so nothing showed that declining actually declines - and the
      // pendingPayload is still sitting in the component at this point, so a
      // cancel that fell through to the write would commit a product the user
      // had just refused on a safety warning.
      vi.mocked(analyzeProduct).mockResolvedValue({
        is_safe: false,
        warnings: [{ alert_type: 'Interaction', severity: 'High', message: 'Retinol and AHA.' }],
        duplicates: [],
      })
      const wrapper = await mountModal()
      await save(wrapper)
      expect(wrapper.findComponent(SafetyWarningModal).exists()).toBe(true)

      wrapper.findComponent(SafetyWarningModal).vm.$emit('cancel')
      await flushPromises()

      expect(wrapper.findComponent(SafetyWarningModal).exists()).toBe(false)
      expect(addToShelf).not.toHaveBeenCalled()
      // The modal stays open behind the dialogue, so the user is returned to
      // their configuration rather than having the flow closed out from under
      // them.
      expect(wrapper.emitted('close')).toBeUndefined()
      expect(wrapper.emitted('refresh')).toBeUndefined()
    })

    it('saves the payload it was holding when the user proceeds past the warnings', async () => {
      vi.mocked(analyzeProduct).mockResolvedValue({
        is_safe: false,
        warnings: [{ alert_type: 'Interaction', severity: 'High', message: 'Retinol and AHA.' }],
        duplicates: [],
      })
      const wrapper = await mountModal()
      await save(wrapper)

      wrapper.findComponent(SafetyWarningModal).vm.$emit('proceed')
      await flushPromises()

      // Proceed calls handleSave(null, true), so the payload cannot come from
      // the argument - it has to be the one stashed before the dialogue opened.
      // A regression here would save a product with no configuration at all.
      expect(addToShelf).toHaveBeenCalledWith(
        expect.objectContaining({ product_id: 'p-1', pao: 12, expiration_date: '2027-03-01' }),
      )
      // Checked once, not twice: the forced save skips the gate the user has
      // just answered.
      expect(analyzeProduct).toHaveBeenCalledTimes(1)
    })

    it('reports a failed write without closing the modal over the user’s configuration', async () => {
      vi.mocked(analyzeProduct).mockResolvedValue({ is_safe: true, warnings: [], duplicates: [] })
      vi.mocked(addToShelf).mockRejectedValue(new Error('network down'))
      const wrapper = await mountModal()

      await save(wrapper)

      expect(lastToast()!.message).toBe('Failed to save product. Please try again.')
      expect(lastToast()!.type).toBe('error')
      expect(wrapper.emitted('refresh')).toBeUndefined()
      expect(wrapper.emitted('close')).toBeUndefined()
    })
  })
})
