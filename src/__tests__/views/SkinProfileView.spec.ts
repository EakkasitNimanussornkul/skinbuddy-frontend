import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// Only the request is mocked. pickTopRecommendations is left as the real
// implementation so these cases show the view genuinely narrowing a catalog
// response, rather than only that it calls something named like it does.
vi.mock('../../api/products', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  searchProducts: vi.fn(),
}))

import { searchProducts, type ScoredProduct } from '../../api/products'
import SkinProfileView from '../../views/SkinProfileView.vue'
import TypologyComparisonModal from '../../components/Quiz/TypologyComparisonModal.vue'
import SkinTypeRecommendationsWidget from '../../components/Shared/SkinTypeRecommendationsWidget.vue'
import { useAuthStore } from '../../stores/auth'
import { skinProfiles } from '../../data/skinprofiles'
import { typologyDetails } from '../../data/typologydata'

const product = (id: string, score: number | null): ScoredProduct => ({
  id,
  slug: id,
  name: `Product ${id}`,
  brand: 'Test Brand',
  image_url: null,
  skin_match_score: score,
})

/**
 * Mount the report for a user whose stored skin_type is `skinType`.
 *
 * The store is populated before mount rather than stubbed: userSkinType reads
 * authStore.user!.skin_type through a non-null assertion, so the view depends on
 * the real shape setAuth produces. A plain object stub would not prove the two
 * agree.
 */
const mountProfile = async (skinType: string) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profile', component: SkinProfileView },
      { path: '/chat', component: { template: '<div />' } },
      { path: '/product/:slug', component: { template: '<div />' } },
    ],
  })
  await router.push('/profile')
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().setAuth('token-1', { id: 'u-1', skin_type: skinType })

  const wrapper = mount(SkinProfileView, {
    global: { plugins: [pinia, router], stubs: { teleport: true } },
  })

  return wrapper
}

/** The four typology cards, read as the user sees them. */
const axisCards = (wrapper: VueWrapper) =>
  wrapper.findAll('.snap-center').map((card) => ({
    letter: card.find('.font-mono').text(),
    name: card.find('h4').text(),
    opposite: card.find('p').text(),
  }))

const modal = (wrapper: VueWrapper) => wrapper.findComponent(TypologyComparisonModal)
const widget = (wrapper: VueWrapper) => wrapper.findComponent(SkinTypeRecommendationsWidget)

describe('src/views/SkinProfileView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    // Every case mounts the view, and mounting runs loadRecommendations from
    // onMounted. Cases not about recommendations still need the request to
    // settle rather than reject into an unhandled rejection.
    vi.mocked(searchProducts).mockResolvedValue([])
  })

  describe('profileData (computed)', () => {
    it('resolves the dictionary entry for the stored skin type', async () => {
      const wrapper = await mountProfile('DRNT')
      const profile = skinProfiles['DRNT']!

      expect(wrapper.get('h2').text()).toBe(profile.subtitle)
      expect(wrapper.text()).toContain(`${profile.maintenanceLevel} Maintenance`)
      expect(wrapper.text()).toContain(profile.focusTitle)
    })

    it('resolves a different entry for a different stored type', async () => {
      // Paired with the case above deliberately. On its own, a view that always
      // returned the OSPW fallback would satisfy an OSPW assertion, so at least
      // one case has to show two stored types producing two different reports.
      const wrapper = await mountProfile('OSPW')

      expect(wrapper.get('h2').text()).toBe(skinProfiles['OSPW']!.subtitle)
      expect(wrapper.get('h2').text()).not.toBe(skinProfiles['DRNT']!.subtitle)
    })

    it('falls back to OSPW when the stored code is not one of the sixteen', async () => {
      // Bad data, a truncated string, or a code added server-side before the
      // frontend knows it. The route guard does not cover this, and without the
      // fallback every read of profileData below would throw on render.
      const wrapper = await mountProfile('XYZQ')

      expect(wrapper.get('h2').text()).toBe(skinProfiles['OSPW']!.subtitle)
      expect(wrapper.text()).toContain(skinProfiles['OSPW']!.focusTitle)
    })

    it('still shows the stored code in the header when the body has fallen back', async () => {
      // The fallback replaces the guidance, not the label: the badge reports
      // what is actually on the account. Asserted so the distinction is
      // deliberate rather than incidental - a reader of this report is told the
      // code it was generated from.
      const wrapper = await mountProfile('XYZQ')

      expect(wrapper.text()).toContain('Type XYZQ')
    })
  })

  describe('axes (computed)', () => {
    it('derives the four axis cards from an OSPW code', async () => {
      const wrapper = await mountProfile('OSPW')

      expect(axisCards(wrapper)).toEqual([
        { letter: 'O', name: 'Oily', opposite: 'vs. Dry' },
        { letter: 'S', name: 'Sensitive', opposite: 'vs. Resistant' },
        { letter: 'P', name: 'Pigmented', opposite: 'vs. Non-Pigmented' },
        { letter: 'W', name: 'Wrinkle-Prone', opposite: 'vs. Tight' },
      ])
    })

    it('derives the opposite four from a DRNT code', async () => {
      // DRNT is OSPW's complement on every axis, so between these two cases
      // both branches of all four ternaries are taken.
      const wrapper = await mountProfile('DRNT')

      expect(axisCards(wrapper)).toEqual([
        { letter: 'D', name: 'Dry', opposite: 'vs. Oily' },
        { letter: 'R', name: 'Resistant', opposite: 'vs. Sensitive' },
        { letter: 'N', name: 'Non-Pigmented', opposite: 'vs. Pigmented' },
        { letter: 'T', name: 'Tight', opposite: 'vs. Wrinkle-Prone' },
      ])
    })

    it('reads each letter from its own position rather than sharing one verdict', async () => {
      // A mixed code, for the same reason the quiz store has one: a code whose
      // letters are all first-branch or all second-branch cannot show that the
      // four positions are independent of each other.
      const wrapper = await mountProfile('ORPT')

      expect(axisCards(wrapper).map((a) => a.letter)).toEqual(['O', 'R', 'P', 'T'])
      expect(axisCards(wrapper).map((a) => a.name)).toEqual([
        'Oily',
        'Resistant',
        'Pigmented',
        'Tight',
      ])
    })
  })

  describe('openTypologyModal()', () => {
    it('keeps the comparison modal closed until an axis is opened', async () => {
      const wrapper = await mountProfile('OSPW')

      expect(modal(wrapper).props('isOpen')).toBe(false)
    })

    it('opens the modal with both trait records for the axis that was clicked', async () => {
      const wrapper = await mountProfile('OSPW')

      await wrapper.findAll('.snap-center')[0]!.trigger('click')

      expect(modal(wrapper).props('isOpen')).toBe(true)
      expect(modal(wrapper).props('activeTrait')).toEqual(typologyDetails['O'])
      expect(modal(wrapper).props('oppositeTrait')).toEqual(typologyDetails['D'])
    })

    it('resolves the traits of whichever axis was clicked, not always the first', async () => {
      const wrapper = await mountProfile('OSPW')

      await wrapper.findAll('.snap-center')[2]!.trigger('click')

      expect(modal(wrapper).props('activeTrait')).toEqual(typologyDetails['P'])
      expect(modal(wrapper).props('oppositeTrait')).toEqual(typologyDetails['N'])
    })

    it('passes null rather than undefined when the stored letter has no trait record', async () => {
      // The `?? null` branch, and the reason TypologyComparisonModal types both
      // props as nullable (FE-DEF-08). X is not a Baumann letter, so the active
      // lookup misses; the opposite is still derived from the ternary and so
      // still resolves.
      const wrapper = await mountProfile('XYZQ')

      await wrapper.findAll('.snap-center')[0]!.trigger('click')

      expect(modal(wrapper).props('activeTrait')).toBeNull()
      expect(modal(wrapper).props('oppositeTrait')).toEqual(typologyDetails['O'])
      expect(modal(wrapper).props('isOpen')).toBe(true)
    })
  })

  describe('loadRecommendations()', () => {
    it('narrows the catalog response to the four highest-scoring products', async () => {
      vi.mocked(searchProducts).mockResolvedValue([
        product('p-40', 40),
        product('p-91', 91),
        product('p-12', 12),
        product('p-88', 88),
        product('p-63', 63),
        product('p-77', 77),
      ])

      const wrapper = await mountProfile('OSPW')
      await flushPromises()

      expect(searchProducts).toHaveBeenCalled()
      expect(widget(wrapper).props('products').map((p: ScoredProduct) => p.id)).toEqual([
        'p-91',
        'p-88',
        'p-77',
        'p-63',
      ])
    })

    it('clears the loading flag once the request settles', async () => {
      const wrapper = await mountProfile('OSPW')

      expect(widget(wrapper).props('loading')).toBe(true)

      await flushPromises()

      expect(widget(wrapper).props('loading')).toBe(false)
      expect(widget(wrapper).props('failed')).toBe(false)
    })

    it('empties the list and marks the section failed when the request rejects', async () => {
      vi.mocked(searchProducts).mockRejectedValue(new Error('Network Error'))

      const wrapper = await mountProfile('OSPW')
      await flushPromises()

      expect(widget(wrapper).props('products')).toEqual([])
      expect(widget(wrapper).props('failed')).toBe(true)
      // The finally clause runs on both paths: a failure that left this true
      // would leave the widget showing a spinner over its own error state.
      expect(widget(wrapper).props('loading')).toBe(false)
    })

    it('clears the failed state when a retry succeeds', async () => {
      // Nothing else resets recommendationsFailed. Without the reset at the top
      // of loadRecommendations, a user who retried successfully would keep the
      // error panel over a list that had loaded.
      vi.mocked(searchProducts).mockRejectedValueOnce(new Error('Network Error'))

      const wrapper = await mountProfile('OSPW')
      await flushPromises()
      expect(widget(wrapper).props('failed')).toBe(true)

      vi.mocked(searchProducts).mockResolvedValue([product('p-70', 70)])
      widget(wrapper).vm.$emit('retry')
      await flushPromises()

      expect(widget(wrapper).props('failed')).toBe(false)
      expect(widget(wrapper).props('products').map((p: ScoredProduct) => p.id)).toEqual(['p-70'])
    })

    it('drops products the backend returned without a score', async () => {
      vi.mocked(searchProducts).mockResolvedValue([
        product('scored', 55),
        product('unscored', null),
      ])

      const wrapper = await mountProfile('OSPW')
      await flushPromises()

      expect(widget(wrapper).props('products').map((p: ScoredProduct) => p.id)).toEqual(['scored'])
    })
  })
})
