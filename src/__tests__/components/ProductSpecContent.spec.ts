import { describe, it, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import ProductSpecContent from '../../components/Catalog/ProductSpecContent.vue'
import { useAuthStore } from '../../stores/auth'

const PRODUCT = {
  id: 'p-1',
  slug: 'cerave-hydrating-cleanser',
  brand: 'CeraVe',
  name: 'Hydrating Facial Cleanser',
  category: 'Cleanser',
  skin_match_score: 82,
  match_reasons: [],
  safety_flags: { alcohol_free: true, fragrance_free: false },
  product_ingredients: [],
}

/**
 * The hero section is stubbed: it has its own spec, it mounts a router and runs
 * its own safety check, and none of that is what the overlay cards are about.
 */
const mountSpec = async (authenticated: boolean, product: Record<string, unknown> = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  await router.push('/')
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  if (authenticated) auth.setAuth('token-1', { id: 'u-1', skin_type: 'OSPW' })

  const wrapper = mount(ProductSpecContent, {
    props: { product: { ...PRODUCT, ...product }, mode: 'detail' },
    global: {
      plugins: [pinia, router],
      stubs: { teleport: true, ProductHeroSection: true, IngredientsExplained: true },
    },
  })

  return { wrapper, auth }
}

const overlay = (wrapper: VueWrapper) => wrapper.find('.absolute.inset-x-0')

describe('src/components/Catalog/ProductSpecContent.vue', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('handleGuestTrigger()', () => {
    it('covers the lower section for a guest and offers the sign-in', async () => {
      const { wrapper } = await mountSpec(false)

      expect(overlay(wrapper).exists()).toBe(true)
      expect(wrapper.text()).toContain('Want to know more about this product?')
      expect(wrapper.text()).toContain('Log in with LINE')
    })

    it('asks the popup for the sign-in in the same register as every other call site', async () => {
      // The overlay states the offer at length and asks the question; this fires
      // when the user clicks it, having answered the question, so repeating it
      // back was addressing nobody. It was also the only popup reason in the app
      // phrased as a question rather than as "Sign in to ..." - the six other
      // call sites and the guard's own default all use the imperative.
      const { wrapper, auth } = await mountSpec(false)

      await overlay(wrapper).trigger('click')

      expect(auth.showLoginPopup).toBe(true)
      expect(auth.popupReason).toBe(
        'Sign in to see the full ingredient breakdown and diagnostics for this product.',
      )
    })

    it('shows the section itself to a signed-in user, with no overlay', async () => {
      const { wrapper } = await mountSpec(true)

      expect(overlay(wrapper).exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Log in with LINE')
    })
  })

  describe('safetyChecks (render)', () => {
    it('renders each flag as its own row rather than only the satisfied ones', async () => {
      const { wrapper } = await mountSpec(true)

      // Six labels, fixed, whatever the payload says about them: a checklist
      // that hid its failures would read as a clean bill of health.
      for (const label of [
        'Alcohol-free',
        'Fragrance-free',
        'Paraben-free',
        'Silicone-free',
        'Sulfate-free',
        'Vegan',
      ]) {
        expect(wrapper.text()).toContain(label)
      }
    })

    /** Each checklist row's label span, by the label it names. */
    const checklistLabel = (wrapper: VueWrapper, label: string) =>
      wrapper
        .findAll('.grid-cols-2 > div > span:last-child')
        .find((s) => s.text().startsWith(label))!

    it('draws a confirmed property plainly', async () => {
      const { wrapper } = await mountSpec(true, { safety_flags: { alcohol_free: true } })
      const row = checklistLabel(wrapper, 'Alcohol-free')

      expect(row.text()).toBe('Alcohol-free')
      expect(row.classes()).not.toContain('line-through')
      expect(row.classes()).not.toContain('italic')
    })

    it('strikes through a property the formula is confirmed not to have', async () => {
      const { wrapper } = await mountSpec(true, { safety_flags: { fragrance_free: false } })
      const row = checklistLabel(wrapper, 'Fragrance-free')

      expect(row.text()).toBe('Fragrance-free')
      expect(row.classes()).toContain('line-through')
    })

    it('marks a property nobody recorded as not verified, rather than as absent', async () => {
      // The third state, and the one worth pinning. `?? null` keeps an omitted
      // key distinct from a recorded false, so an unrecorded property is not
      // struck through as though the formula had been checked and failed it.
      const { wrapper } = await mountSpec(true, { safety_flags: { alcohol_free: true } })
      const row = checklistLabel(wrapper, 'Vegan')

      expect(row.text()).toBe('Vegan (not verified)')
      expect(row.classes()).toContain('italic')
      expect(row.classes()).not.toContain('line-through')
    })

    it('reads a product with no safety_flags at all as unverified throughout', async () => {
      const { wrapper } = await mountSpec(true, { safety_flags: undefined })

      expect(wrapper.text().split('(not verified)').length - 1).toBe(6)
    })

    // Not pinned, and deliberately: the three markers are drawn with the text
    // glyphs ✓ and ✕ rather than the SVG CompareFlagMarker uses for the same
    // three states. That is at odds with the project's SVG-only rule for icons,
    // and this is a third copy of the tri-state rule the marker was extracted to
    // hold in one place. Asserting the glyphs here would cement both. These cards
    // read the label's state instead, which survives either being fixed.
  })

  describe('sortedRawIngredients (render)', () => {
    const tiered = (name: string, awareness_tier: string | null) => ({
      ingredients: { id: `i-${name}`, name, awareness_tier, functional_group: null, benefits: null },
    })

    /** The ingredient names in the list, in the order drawn. */
    const listed = (wrapper: VueWrapper) =>
      wrapper.findAll('.divide-y > div p.font-bold').map((p) => p.text())

    it('lists triggers first, then the medium tier, then the low', async () => {
      // The subtitle promises "triggers listed first", so the order is part of
      // what the screen says rather than a presentation detail.
      const { wrapper } = await mountSpec(true, {
        product_ingredients: [
          tiered('Glycerin', 'low'),
          tiered('Phenoxyethanol', 'medium'),
          tiered('Retinol', 'high'),
        ],
      })

      expect(listed(wrapper)).toEqual(['Retinol', 'Phenoxyethanol', 'Glycerin'])
    })

    it('keeps the catalogue order within a tier', async () => {
      // Array sort is stable, so two equal weights keep the order the backend
      // sent them in rather than being shuffled.
      const { wrapper } = await mountSpec(true, {
        product_ingredients: [tiered('Water', 'low'), tiered('Glycerin', 'low'), tiered('Squalane', 'low')],
      })

      expect(listed(wrapper)).toEqual(['Water', 'Glycerin', 'Squalane'])
    })

    it('shows five ingredients until asked for the rest', async () => {
      const seven = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((n) => tiered(n, 'low'))
      const { wrapper } = await mountSpec(true, { product_ingredients: seven })

      expect(listed(wrapper)).toHaveLength(5)

      await wrapper.findAll('button').find((b) => b.text() === 'Show all 7 ingredients')!.trigger('click')

      expect(listed(wrapper)).toHaveLength(7)
    })

    // Recorded rather than covered: an ingredient with no awareness_tier sorts
    // with the medium tier and is labelled "medium" in this list, but
    // awarenessStats counts tiers by exact value, so the same ingredient is
    // counted as nothing in the bar above - the list and the bar disagree about
    // it, and the percentages stop summing to 100. Whether that is reachable
    // depends on whether the column is nullable in the database, which is not
    // visible from the API schema (it arrives through `ingredients(*)`) and was
    // not checked. Flagged to the owner rather than pinned either way.
  })

  describe('awarenessStats', () => {
    /** The legend bar's segments as their titles. */
    const barSegments = (wrapper: VueWrapper) =>
      wrapper.findAll('.rounded-full.overflow-hidden > div').map((d) => d.attributes('title'))

    it('divides the bar by each tier’s share of the ingredients', async () => {
      const { wrapper } = await mountSpec(true, {
        product_ingredients: [
          { ingredients: { id: 'i-1', name: 'Retinol', awareness_tier: 'high' } },
          { ingredients: { id: 'i-2', name: 'Glycerin', awareness_tier: 'low' } },
          { ingredients: { id: 'i-3', name: 'Squalane', awareness_tier: 'low' } },
          { ingredients: { id: 'i-4', name: 'Water', awareness_tier: 'low' } },
        ],
      })

      expect(barSegments(wrapper)).toEqual(['High Awareness (1)', 'Safe / Low Awareness (3)'])
    })

    it('draws an empty track, not a green one, for a product with no ingredients on record', async () => {
      // The defect. This returned lowPct: 100 for an empty list, so the bar was
      // entirely green and titled "Safe / Low Awareness (0)": a width claiming
      // everything in the formula is safe, over a count saying nothing is in
      // it. No data read as a clean result.
      const { wrapper } = await mountSpec(true, { product_ingredients: [] })

      expect(barSegments(wrapper)).toEqual([])
      expect(wrapper.text()).toContain('0 Items')
    })
  })
})
