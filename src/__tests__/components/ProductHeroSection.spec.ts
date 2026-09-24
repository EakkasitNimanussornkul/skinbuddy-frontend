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
import { MATCH_SCORE_BASIS } from '../../api/products'
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

const mountHero = async (
  authenticated = true,
  overrides: { product?: Record<string, unknown>; skinType?: string | null } = {},
) => {
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
  if (authenticated) {
    const skinType = 'skinType' in overrides ? overrides.skinType : 'OSPW'
    auth.setAuth('token-1', { id: 'u-1', skin_type: skinType })
  }

  const wrapper = mount(ProductHeroSection, {
    props: { product: { ...PRODUCT, ...overrides.product }, mode: 'detail' },
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

  describe('matchAvailability (render)', () => {
    it('shows the score when the backend computed one', async () => {
      const { wrapper } = await mountHero()

      expect(wrapper.get('.match-percent').text()).toBe('82%')
      expect(wrapper.text()).toContain('Your Skin Match')
    })

    it('tells a user with no skin type to take the quiz, and blames nothing', async () => {
      // FE-DEF-31 applied here. The card is gated on isAuthenticated, which
      // looked like it already covered the missing case - but signing in is not
      // having a profile. The backend returns a null score whenever it has no
      // Baumann type to score against, which is every authenticated user who
      // has not finished the quiz.
      const { wrapper } = await mountHero(true, {
        product: { skin_match_score: null },
        skinType: null,
      })

      expect(wrapper.text()).toContain('Take the skin quiz')
      expect(wrapper.text()).toContain('Take the skin quiz to see how this suits your skin.')
      expect(wrapper.text()).toContain('not on file yet')

      // The two sentences this replaced, and both were wrong in the same
      // direction: a permanent, known, blameless state reported as a failure,
      // and then attributed to the product.
      expect(wrapper.text()).not.toContain('Failed to calculate')
      expect(wrapper.text()).not.toContain('incomplete ingredient metadata')
    })

    it('keeps the catalogue explanation for a profile that exists and still scored nothing', async () => {
      // The residual case, and the only one of the three where something has
      // actually gone wrong: quiz taken, type on file, no number back. Here the
      // catalogue is a fair candidate, so the sentence naming it stays - the
      // fix above was about not saying it when the cause is known to be
      // something else.
      const { wrapper } = await mountHero(true, { product: { skin_match_score: null } })

      expect(wrapper.text()).toContain('Not scored')
      expect(wrapper.text()).toContain('This formula could not be scored against your profile.')
      expect(wrapper.text()).toContain('incomplete ingredient metadata')
      expect(wrapper.text()).not.toContain('Failed to calculate')
      expect(wrapper.text()).not.toContain('Take the skin quiz')
    })

    it('shows the visitor preview instead of the card when nobody is signed in', async () => {
      const { wrapper } = await mountHero(false, { product: { skin_match_score: null } })

      // 'signed-out' is unreachable inside the card because this branch owns
      // the case, which is why the card words only the other three.
      expect(wrapper.text()).not.toContain('Not scored')
      expect(wrapper.text()).not.toContain('Failed to calculate')
    })
  })

  describe('handleTriggerSafetyCheck()', () => {
    const requestCheck = async (wrapper: VueWrapper) => {
      await buttonWith(wrapper, 'Safety Check').trigger('click')
      await flushPromises()
    }

    it('opens the report and records that a check has completed', async () => {
      vi.mocked(analyzeProduct).mockResolvedValue({ is_safe: true, warnings: [], duplicates: [] })
      const { wrapper } = await mountHero()

      await requestCheck(wrapper)

      const modal = wrapper.findComponent({ name: 'SafetyCheckModal' })
      expect(modal.props('isOpen')).toBe(true)
      expect(modal.props('hasChecked')).toBe(true)
      expect(modal.props('scanStatus')).toBe('cleared')
    })

    it('does not borrow the add flow sentence for a check that returned no verdict', async () => {
      // The reported defect. runBackendAnalysis is shared with the add flow,
      // and the sentences used to live inside it - so asking for a safety
      // report on a product that came back unassessed was answered with "so it
      // cannot be added", naming a consequence that does not exist on this
      // screen for an action the user did not take.
      vi.mocked(analyzeProduct).mockResolvedValue({ warnings: [], duplicates: [] })
      const { wrapper } = await mountHero()

      await requestCheck(wrapper)

      expect(lastToast()!.message).toBe(
        'This product has not been assessed, so it cannot be checked against your shelf.',
      )
      expect(lastToast()!.message).not.toContain('cannot be added')
      // The report is still opened and still says so in its own panel: the
      // toast was the only thing wrong here.
      expect(wrapper.findComponent({ name: 'SafetyCheckModal' }).props('scanStatus')).toBe(
        'unassessed',
      )
    })

    it('scopes a failed check to the check rather than to an analysis of a product', async () => {
      vi.mocked(analyzeProduct).mockRejectedValue(new Error('network down'))
      const { wrapper } = await mountHero()

      await requestCheck(wrapper)

      expect(lastToast()!.message).toBe('Could not complete the safety check. Please try again.')
      expect(wrapper.findComponent({ name: 'SafetyCheckModal' }).props('scanStatus')).toBe(
        'unavailable',
      )
    })

    it('says nothing extra when the check produced a verdict', async () => {
      // Neither a clean result nor a conflict raises a toast on this path. The
      // panel is the report, and the user opened it deliberately.
      vi.mocked(analyzeProduct).mockResolvedValue({
        is_safe: false,
        warnings: [CONFLICT],
        duplicates: [],
      })
      const { wrapper } = await mountHero()

      await requestCheck(wrapper)

      expect(toasts.value).toHaveLength(0)
      expect(wrapper.findComponent({ name: 'SafetyCheckModal' }).props('warnings')).toEqual([
        CONFLICT,
      ])
      // And the add flow's conflict dialogue is not what a report request opens.
      expect(warningModal(wrapper).exists()).toBe(false)
    })

    it('asks an anonymous visitor to sign in instead of checking anything', async () => {
      const { wrapper, auth } = await mountHero(false)

      await requestCheck(wrapper)

      expect(analyzeProduct).not.toHaveBeenCalled()
      expect(auth.showLoginPopup).toBe(true)
      expect(auth.popupReason).toBe(
        'Sign in to perform routine safety checks on your skin barrier.',
      )
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

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('match card (clarity)', () => {
    it('says the score in words as well as in numbers, by band', async () => {
      // Owner request: clearer on the product page than on the Explore badge.
      const verdict = async (score: number) =>
        (await mountHero(true, { product: { skin_match_score: score } })).wrapper.get('.match-verdict').text()

      expect(await verdict(91)).toBe('Great match')
      expect(await verdict(70)).toBe('Fair match')
      expect(await verdict(30)).toBe('Low match, use with care')
    })

    it('draws a meter filled to the score, held inside its track', async () => {
      const { wrapper } = await mountHero(true, { product: { skin_match_score: 82.4 } })
      const meter = wrapper.get('.match-meter')

      expect(meter.attributes('aria-valuenow')).toBe('82')
      expect(meter.get('div').attributes('style')).toContain('width: 82%')

      const { wrapper: over } = await mountHero(true, { product: { skin_match_score: 130 } })
      expect(over.get('.match-meter div').attributes('style')).toContain('width: 100%')
    })

    it('explains what the score is based on, in plain words', async () => {
      const { wrapper } = await mountHero()

      expect(wrapper.get('.match-basis').text()).toBe(MATCH_SCORE_BASIS)
      expect(wrapper.text()).not.toContain('Baumann')
    })

    it('titles the reasons, and draws no empty section when there are none', async () => {
      const { wrapper } = await mountHero(true, { product: { match_reasons: ['Contains ceramides for dry skin.'] } })
      expect(wrapper.get('.match-why').text()).toBe('Why this score')
      expect(wrapper.text()).toContain('Contains ceramides for dry skin.')

      const { wrapper: none } = await mountHero(true, { product: { match_reasons: [] } })
      expect(none.find('.match-why').exists()).toBe(false)
    })

    it('tells a visitor in plain words how to get a score', async () => {
      const { wrapper } = await mountHero(false, { product: { skin_match_score: null } })

      expect(wrapper.text()).toContain('Sign in and take the skin quiz to see how well this product suits your skin.')
      expect(wrapper.text()).not.toContain('Baumann')
    })
  })
})
