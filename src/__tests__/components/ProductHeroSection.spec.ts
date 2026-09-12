import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('../../api/shelfapi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/shelfapi')>()),
  analyzeProduct: vi.fn(),
  addToShelf: vi.fn(),
}))

import { analyzeProduct, addToShelf } from '../../api/shelfapi'
import { toLocalDateString } from '../../api/dates'
import ProductHeroSection from '../../components/Catalog/ProductHeroSection.vue'
import SafetyWarningModal from '../../components/Shelf/SafetyWarningModal.vue'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'

const { toasts } = useToast()

const PRODUCT = {
  id: 'p-1',
  slug: 'cerave-hydrating-cleanser',
  brand: 'CeraVe',
  name: 'Hydrating Facial Cleanser',
  category: 'Cleanser',
  skin_match_score: 82,
  match_reasons: [],
  product_ingredients: [],
}

const CONFLICT = { alert_type: 'Interaction', severity: 'High', message: 'Retinol and AHA.' }

const mountHero = async (authenticated = true) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/product/:slug', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  if (authenticated) auth.setAuth('token-1', { id: 'u-1', skin_type: 'OSPW' })

  const wrapper = mount(ProductHeroSection, {
    props: { product: PRODUCT, mode: 'detail' },
    global: { plugins: [pinia, router], stubs: { teleport: true, SafetyCheckModal: true } },
  })

  return { wrapper, auth }
}

const buttonWith = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(text))!

/** Press the primary add control, which runs the compatibility check first. */
const requestAdd = async (wrapper: VueWrapper) => {
  await buttonWith(wrapper, 'Save To Shelf').trigger('click')
  await flushPromises()
}

const configuratorOpen = (wrapper: VueWrapper) => wrapper.text().includes('Configure Routine Item')

const warningModal = (wrapper: VueWrapper) => wrapper.findComponent(SafetyWarningModal)

const lastToast = () => toasts.value[toasts.value.length - 1]

describe('src/components/Catalog/ProductHeroSection.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    toasts.value.splice(0)
    vi.mocked(addToShelf).mockResolvedValue({})
  })

  describe('handleOpenConfigurator()', () => {
    it('opens the configurator when the compatibility check clears the product', async () => {
      vi.mocked(analyzeProduct).mockResolvedValue({ is_safe: true, warnings: [], duplicates: [] })
      const { wrapper } = await mountHero()

      await requestAdd(wrapper)

      expect(analyzeProduct).toHaveBeenCalledWith('p-1')
      expect(configuratorOpen(wrapper)).toBe(true)
      // Nothing is written yet: clearing the product opens the form, it does not
      // save on the user's behalf.
      expect(addToShelf).not.toHaveBeenCalled()
    })

    it('refuses to open the configurator when the check could not run', async () => {
      vi.mocked(analyzeProduct).mockRejectedValue(new Error('network down'))
      const { wrapper } = await mountHero()

      await requestAdd(wrapper)

      // A check that did not run is not a check that passed. Same rule as
      // AddProductModal, and now the same sentence.
      expect(configuratorOpen(wrapper)).toBe(false)
      expect(warningModal(wrapper).exists()).toBe(false)
      expect(lastToast()!.message).toBe('Failed to analyze product. Please try again.')
    })

    it('refuses to open the configurator for an unassessed product, and names the consequence', async () => {
      // A completed check carrying no verdict: no conflicts, but no is_safe.
      vi.mocked(analyzeProduct).mockResolvedValue({ warnings: [], duplicates: [] })
      const { wrapper } = await mountHero()

      await requestAdd(wrapper)

      expect(configuratorOpen(wrapper)).toBe(false)
      expect(lastToast()!.message).toBe('This product has not been assessed, so it cannot be added.')
      // FE-DEF-29: its own branch, so this status never reaches a modal that
      // would list conflicts it does not have.
      expect(warningModal(wrapper).exists()).toBe(false)
    })

    it('offers the conflict dialogue rather than blocking when warnings are found', async () => {
      vi.mocked(analyzeProduct).mockResolvedValue({
        is_safe: false,
        warnings: [CONFLICT],
        duplicates: [],
      })
      const { wrapper } = await mountHero()

      await requestAdd(wrapper)

      expect(warningModal(wrapper).exists()).toBe(true)
      expect(warningModal(wrapper).props('warnings')).toEqual([CONFLICT])
      expect(configuratorOpen(wrapper)).toBe(false)
      expect(addToShelf).not.toHaveBeenCalled()
    })

    it('asks an anonymous visitor to sign in instead of checking anything', async () => {
      const { wrapper, auth } = await mountHero(false)

      await requestAdd(wrapper)

      expect(analyzeProduct).not.toHaveBeenCalled()
      expect(auth.showLoginPopup).toBe(true)
    })
  })

  describe('handleBypassProceed()', () => {
    const reachOverride = async (wrapper: VueWrapper) => {
      vi.mocked(analyzeProduct).mockResolvedValue({
        is_safe: false,
        warnings: [CONFLICT],
        duplicates: [],
      })
      await requestAdd(wrapper)
      warningModal(wrapper).vm.$emit('proceed')
      await flushPromises()
    }

    it('opens the configurator rather than saving, because nothing has been configured yet', async () => {
      // Deliberate, and the difference from AddProductModal is the ordering
      // rather than a missing step. That screen collects the configuration
      // first and checks on save, so its "Proceed Anyway" has a pendingPayload
      // to commit. Here the check runs first, so at this point the user has
      // chosen no period, no opened state and no date - committing would store
      // defaults they never picked.
      const { wrapper } = await mountHero()

      await reachOverride(wrapper)

      expect(warningModal(wrapper).exists()).toBe(false)
      expect(configuratorOpen(wrapper)).toBe(true)
      expect(addToShelf).not.toHaveBeenCalled()
    })

    it('saves what the user then configures, not a default', async () => {
      // The second step earning its place: the period committed is the one
      // chosen after the override, which is information that did not exist when
      // the warning was dismissed.
      const { wrapper } = await mountHero()
      await reachOverride(wrapper)

      await buttonWith(wrapper, '6M').trigger('click')
      await buttonWith(wrapper, 'Confirm').trigger('click')
      await flushPromises()

      expect(addToShelf).toHaveBeenCalledWith({
        product_id: 'p-1',
        usage_state: 'active',
        opened_date: toLocalDateString(),
        expiration_date: null,
        pao: 6,
      })
    })

    it('abandons the add entirely when the conflict dialogue is cancelled', async () => {
      const { wrapper } = await mountHero()
      vi.mocked(analyzeProduct).mockResolvedValue({
        is_safe: false,
        warnings: [CONFLICT],
        duplicates: [],
      })
      await requestAdd(wrapper)

      warningModal(wrapper).vm.$emit('cancel')
      await flushPromises()

      expect(warningModal(wrapper).exists()).toBe(false)
      expect(configuratorOpen(wrapper)).toBe(false)
      expect(addToShelf).not.toHaveBeenCalled()
    })
  })

  describe('handleCommitToShelf()', () => {
    const openConfigurator = async (wrapper: VueWrapper) => {
      vi.mocked(analyzeProduct).mockResolvedValue({ is_safe: true, warnings: [], duplicates: [] })
      await requestAdd(wrapper)
    }

    it('saves the product as unopened with no date when the user says it is unopened', async () => {
      const { wrapper } = await mountHero()
      await openConfigurator(wrapper)

      await buttonWith(wrapper, 'Sealed').trigger('click')
      await buttonWith(wrapper, 'Confirm').trigger('click')
      await flushPromises()

      expect(addToShelf).toHaveBeenCalledWith(
        expect.objectContaining({ usage_state: 'unopened', opened_date: null }),
      )
    })

    it('closes the configurator and reports the addition on success', async () => {
      const { wrapper } = await mountHero()
      await openConfigurator(wrapper)

      await buttonWith(wrapper, 'Confirm').trigger('click')
      await flushPromises()

      expect(configuratorOpen(wrapper)).toBe(false)
      expect(wrapper.emitted('shelf-updated')).toHaveLength(1)
      expect(lastToast()!.type).toBe('success')
    })

    it('keeps the configurator open and reports a failed write', async () => {
      vi.mocked(addToShelf).mockRejectedValue(new Error('network down'))
      const { wrapper } = await mountHero()
      await openConfigurator(wrapper)

      await buttonWith(wrapper, 'Confirm').trigger('click')
      await flushPromises()

      // The user's configuration is still on screen to retry from, and the
      // parent is not told a shelf item exists that does not.
      expect(configuratorOpen(wrapper)).toBe(true)
      expect(wrapper.emitted('shelf-updated')).toBeUndefined()
      expect(lastToast()!.message).toBe('Could not save product.')
    })
  })
})
