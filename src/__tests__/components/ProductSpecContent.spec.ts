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

    it('shows five ingredients, then four more at a time rather than all at once', async () => {
      // Owner request. This jumped from five straight to every ingredient,
      // which on a long formula was several screens for one click.
      const twelve = 'ABCDEFGHIJKL'.split('').map((n) => tiered(n, 'low'))
      const { wrapper } = await mountSpec(true, { product_ingredients: twelve })
      const more = () => wrapper.findAll('button.show-more').find((b) => b.text().includes('ingredients'))

      expect(listed(wrapper)).toHaveLength(5)
      expect(more()!.text()).toContain('Show 4 more ingredients')

      await more()!.trigger('click')
      expect(listed(wrapper)).toHaveLength(9)

      // The last step says exactly what is left rather than "4".
      expect(more()!.text()).toContain('Show 3 more ingredients')
      await more()!.trigger('click')
      expect(listed(wrapper)).toHaveLength(12)
      expect(more()).toBeUndefined()
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

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('activeBenefits (stepping)', () => {
    const benefit = (n: number) => ({
      ingredients: { id: `b-${n}`, name: `Benefit Active ${n}`, awareness_tier: 'low', functional_group: 'Humectant', benefits: `does ${n}` },
    })

    it('reaches every benefit, which the old flag with no button never could', async () => {
      // The defect: showAllBenefits existed and nothing set it, so benefits past
      // the fourth - past the second on mobile - were unreachable.
      const { wrapper } = await mountSpec(true, { product_ingredients: Array.from({ length: 7 }, (_, i) => benefit(i + 1)) })
      const shown = () => wrapper.findAll('h5').filter((h) => h.text().startsWith('Benefit Active')).length
      const more = () => wrapper.findAll('button.show-more').find((b) => b.text().includes('benefits'))

      expect(shown()).toBe(4)
      expect(wrapper.text()).toContain('7 Actives Identified')

      await more()!.trigger('click')

      expect(shown()).toBe(7)
      expect(more()).toBeUndefined()
    })

    it('no longer hides benefits past the second on narrow screens', async () => {
      const { wrapper } = await mountSpec(true, { product_ingredients: Array.from({ length: 4 }, (_, i) => benefit(i + 1)) })

      expect(wrapper.html()).not.toContain('hidden sm:flex')
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('productConcerns (severity)', () => {
    const concern = (concern_title: string, severity?: string | null) => ({
      concern_title,
      concern_description: `${concern_title} description.`,
      ...(severity === undefined ? {} : { severity }),
    })

    /** One ingredient carrying the given ingredient_concerns rows. */
    const withConcerns = (...concerns: Record<string, unknown>[]) => ({
      product_ingredients: [
        { ingredients: { id: 'i-1', name: 'Phenoxyethanol', awareness_tier: 'medium', ingredient_concerns: concerns } },
      ],
    })

    const cards = (wrapper: VueWrapper) => wrapper.findAll('.ingredient-concern')

    it('lists concerns most severe first', async () => {
      const { wrapper } = await mountSpec(
        true,
        withConcerns(concern('Mild Preservative Note', 'Low'), concern('Retinoid Purging', 'High'), concern('Stinging', 'Moderate')),
      )

      expect(cards(wrapper).map((c) => c.get('h5').text())).toEqual(['Retinoid Purging', 'Stinging', 'Mild Preservative Note'])
    })

    it('draws only a High concern in alarm red, and tones the rest by grade', async () => {
      // The defect: every concern box was semantic-error whatever its grade, so
      // the eight Low preservative rows looked as serious as a High one.
      const { wrapper } = await mountSpec(
        true,
        withConcerns(concern('Retinoid Purging', 'High'), concern('Stinging', 'Moderate'), concern('Mild Preservative Note', 'Low')),
      )

      expect(cards(wrapper).map((c) => c.attributes('data-band'))).toEqual(['high', 'medium', 'low'])
      expect(cards(wrapper).map((c) => c.classes().some((k) => k.includes('semantic-error')))).toEqual([true, false, false])
    })

    it('prints the grade the concerns table holds', async () => {
      const { wrapper } = await mountSpec(true, withConcerns(concern('Stinging', 'Moderate'), concern('Mild Note', 'Low')))

      expect(wrapper.findAll('.concern-grade').map((g) => g.text())).toEqual(['Moderate', 'Low'])
    })

    it('leaves an ungraded concern ungraded rather than calling it Moderate', async () => {
      // `concern.severity || 'Moderate'` invented a grade the row did not have.
      const { wrapper } = await mountSpec(true, withConcerns(concern('Ungraded Note')))

      expect(cards(wrapper)[0]!.attributes('data-band')).toBe('unknown')
      expect(wrapper.find('.concern-grade').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Moderate')
    })

    it('does not put a red count over a product whose concerns are all Low', async () => {
      const { wrapper } = await mountSpec(true, withConcerns(concern('Note A', 'Low'), concern('Note B', 'Low')))

      expect(wrapper.get('.concern-count').text()).toBe('2 Alerts')
      expect(wrapper.get('.concern-count').classes().some((k) => k.includes('semantic-error'))).toBe(false)
    })

    it('keeps the count red when the worst concern is High', async () => {
      const { wrapper } = await mountSpec(true, withConcerns(concern('Note A', 'Low'), concern('Retinoid Purging', 'High')))

      expect(wrapper.get('.concern-count').classes()).toContain('text-semantic-error')
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('concern sources', () => {
    const sourceRef = (id: string) => ({
      id,
      title: 'Source ' + id,
      publisher: 'European Commission',
      url: 'https://example.org/' + id,
      source_type: 'regulatory_register',
      accessed_on: null,
      notes: null,
    })

    it("lists each concern's sources, and says when there are none yet", async () => {
      const { wrapper } = await mountSpec(true, {
        product_ingredients: [
          {
            ingredients: {
              id: 'i-1',
              name: 'Phenoxyethanol',
              awareness_tier: 'medium',
              ingredient_concerns: [
                { concern_title: 'Preservative Sensitivity', concern_description: 'x', severity: 'Moderate', concern_sources: [{ sources: sourceRef('cir') }] },
                { concern_title: 'Unsourced Note', concern_description: 'y', severity: 'Low' },
              ],
            },
          },
        ],
      })
      const cards = wrapper.findAll('.ingredient-concern')

      expect(cards[0]!.get('a.source-link').text()).toBe('Source cir')
      expect(cards[1]!.get('.source-none').text()).toBe('No published source linked yet')
    })
  })
})
