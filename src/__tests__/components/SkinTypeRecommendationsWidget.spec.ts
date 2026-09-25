import { describe, it, expect } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

import SkinTypeRecommendationsWidget from '../../components/Shared/SkinTypeRecommendationsWidget.vue'
import { describeMatchBadge } from '../../components/Catalog/matchBadge'

const recommendation = (overrides: Record<string, unknown> = {}) => ({
  id: 'p-1',
  slug: 'cerave-hydrating-cleanser',
  brand: 'CeraVe',
  name: 'Hydrating Facial Cleanser',
  image_url: 'https://cdn.example.com/cerave.png',
  skin_match_score: 91,
  ...overrides,
})

/**
 * Rendered for real, with EmptyState and router-link left unstubbed.
 *
 * Both hosts' specs assert only which props reach this widget. What it draws
 * from them - the exact empty and failed sentences, the card metadata, and
 * where a card goes - is observable only here.
 */
const mountWidget = async (props: Record<string, unknown> = {}) => {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/explore', component: { template: '<div />' } },
      { path: '/product/:slug', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()

  const wrapper = mount(SkinTypeRecommendationsWidget, {
    props: { userSkinType: 'OSPW', products: [], ...props },
    global: { plugins: [router] },
  })
  return { wrapper, router }
}

const buttonLabelled = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().trim() === text)

describe('src/components/Shared/SkinTypeRecommendationsWidget.vue', () => {
  describe('render states', () => {
    it('shows placeholder cards, not the empty state, while the ranking is loading', async () => {
      // The bug this state was added for: without it the empty state rendered
      // for the duration of the fetch and read as "we found nothing for you".
      const { wrapper } = await mountWidget({ loading: true })

      expect(wrapper.findAll('.animate-pulse')).toHaveLength(4)
      expect(wrapper.text()).not.toContain('No Curated Items Ready')
    })

    it('reports a failed ranking as a connection problem, and offers a retry', async () => {
      const { wrapper } = await mountWidget({ failed: true })

      expect(wrapper.text()).toContain("Couldn't Load Recommendations")
      expect(wrapper.text()).toContain('This is a connection problem, not an empty result.')
      expect(wrapper.text()).not.toContain('No Curated Items Ready')

      await buttonLabelled(wrapper, 'Try Again')!.trigger('click')
      expect(wrapper.emitted('retry')).toHaveLength(1)
    })

    it('reports a genuinely empty ranking in its own words', async () => {
      const { wrapper } = await mountWidget({ products: [] })

      expect(wrapper.text()).toContain('No Curated Items Ready')
      expect(wrapper.text()).toContain('There are currently no products indexed matching your exact diagnostic profile properties.')
      expect(wrapper.text()).not.toContain("Couldn't Load Recommendations")
    })

    it('prefers the failure panel over the empty one when both could apply', async () => {
      // A failed request also leaves `products` empty. The order of the branches
      // is what keeps that from reading as "nothing matched you".
      const { wrapper } = await mountWidget({ failed: true, products: [] })

      expect(wrapper.text()).toContain("Couldn't Load Recommendations")
      expect(wrapper.text()).not.toContain('No Curated Items Ready')
    })
  })

  describe('recommendation cards (render)', () => {
    it('renders each product with its brand, name and photo', async () => {
      const { wrapper } = await mountWidget({
        products: [recommendation(), recommendation({ id: 'p-2', slug: 'lrp', brand: 'La Roche-Posay', name: 'Toleriane', image_url: null })],
      })

      expect(wrapper.findAll('h4').map((h) => h.text())).toEqual(['Hydrating Facial Cleanser', 'Toleriane'])
      expect(wrapper.text()).toContain('CeraVe')
      expect(wrapper.text()).toContain('La Roche-Posay')
      expect(wrapper.findAll('img')).toHaveLength(1)
      expect(wrapper.get('img').attributes('src')).toBe('https://cdn.example.com/cerave.png')
    })

    it('links each card to that product by slug', async () => {
      const { wrapper, router } = await mountWidget({ products: [recommendation()] })

      await wrapper.get('a').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/product/cerave-hydrating-cleanser')
    })

    it('uses the host heading when one is given, and its own otherwise', async () => {
      const { wrapper: own } = await mountWidget()
      expect(own.get('h3').text()).toBe('Recommended products for you')

      const { wrapper: hosted } = await mountWidget({ heading: 'Picked for OSPW', subheading: 'Ranked for you.' })
      expect(hosted.get('h3').text()).toBe('Picked for OSPW')
      expect(hosted.text()).toContain('Ranked for you.')
    })
  })

  describe('hideCatalogLink', () => {
    it('offers the catalogue from the empty state by default, and goes there', async () => {
      // SkinProfileView's case: the profile page is not the catalogue, so the
      // way out of an empty ranking is a real destination.
      const { wrapper, router } = await mountWidget({ products: [] })

      await buttonLabelled(wrapper, 'Explore Global Catalog')!.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/explore')
    })

    it('withholds that link on a host that is itself the catalogue', async () => {
      // The defect. The prop existed for exactly this and read nothing: the
      // per-card link it once hid had been removed, and the one catalogue link
      // that survived - this button - ignored it. ExploreView passes the prop,
      // so an empty ranking there offered the page it was drawn on.
      const { wrapper } = await mountWidget({ products: [], hideCatalogLink: true })

      expect(wrapper.text()).toContain('No Curated Items Ready')
      expect(buttonLabelled(wrapper, 'Explore Global Catalog')).toBeUndefined()
    })

    it('leaves the failure retry in place, which is not a catalogue link', async () => {
      const { wrapper } = await mountWidget({ failed: true, hideCatalogLink: true })

      expect(buttonLabelled(wrapper, 'Try Again')).toBeTruthy()
    })
  })

  // Appended after the groups already cited, so adding it moves none of their IDs.
  describe('collapsible', () => {
    /** The fold toggle, which is the button inside the heading. */
    const toggle = (wrapper: VueWrapper) => wrapper.find('h3 button')

    /** The region the toggle controls, found by the id it points at. */
    // An attribute selector rather than `#id`: useId can produce characters an
    // id selector would need escaped, and jsdom provides no CSS.escape.
    const region = (wrapper: VueWrapper) =>
      wrapper.get(`[id="${toggle(wrapper).attributes('aria-controls')}"]`)

    it('starts open, with the products showing and the toggle offering to hide them', async () => {
      const { wrapper } = await mountWidget({ collapsible: true, products: [recommendation()] })

      expect(toggle(wrapper).attributes('aria-expanded')).toBe('true')
      expect(toggle(wrapper).text()).toContain('Hide')
      expect(region(wrapper).isVisible()).toBe(true)
      expect(wrapper.get('h4').isVisible()).toBe(true)
    })

    it('folds the products away when the heading is pressed, and keeps the heading', async () => {
      const { wrapper } = await mountWidget({ collapsible: true, products: [recommendation()] })

      await toggle(wrapper).trigger('click')

      expect(toggle(wrapper).attributes('aria-expanded')).toBe('false')
      expect(toggle(wrapper).text()).toContain('Show')
      expect(region(wrapper).isVisible()).toBe(false)
      // Still findable to unfold: the heading is the control, so it must stay.
      expect(toggle(wrapper).text()).toContain('Recommended products for you')
    })

    it('unfolds on a second press without losing the cards it had', async () => {
      // v-show rather than v-if, so the cards survive the fold and nothing asks
      // the host to fetch again.
      const { wrapper } = await mountWidget({ collapsible: true, products: [recommendation()] })

      await toggle(wrapper).trigger('click')
      await toggle(wrapper).trigger('click')

      expect(toggle(wrapper).attributes('aria-expanded')).toBe('true')
      expect(wrapper.get('h4').isVisible()).toBe(true)
      expect(wrapper.emitted('retry')).toBeUndefined()
    })

    it('folds the loading and failed states too, not only the cards', async () => {
      const { wrapper } = await mountWidget({ collapsible: true, failed: true })

      await toggle(wrapper).trigger('click')

      expect(buttonLabelled(wrapper, 'Try Again')!.isVisible()).toBe(false)
    })

    it('tells the host when it folds, so the host can shrink its own frame', async () => {
      const { wrapper } = await mountWidget({ collapsible: true, products: [recommendation()] })

      await toggle(wrapper).trigger('click')
      await toggle(wrapper).trigger('click')

      expect(wrapper.emitted('update:collapsed')).toEqual([[true], [false]])
    })

    it('follows a folded state the host passes in', async () => {
      const { wrapper } = await mountWidget({ collapsible: true, collapsed: true, products: [recommendation()] })

      expect(toggle(wrapper).attributes('aria-expanded')).toBe('false')
      expect(wrapper.get('h4').isVisible()).toBe(false)
    })

    it('shrinks to a one-line label while folded, showing how many picks are behind it', async () => {
      // The owner's follow-up: a folded section that kept the serif title and
      // its vertical rhythm was still too tall to pass over on the way to the
      // filtered grid.
      const { wrapper } = await mountWidget({
        collapsible: true,
        compact: true,
        products: [recommendation(), recommendation({ id: 'p-2', slug: 'b' })],
      })
      expect(wrapper.get('h3').classes()).toContain('font-serif')

      await toggle(wrapper).trigger('click')

      const heading = wrapper.get('h3')
      expect(heading.classes()).not.toContain('font-serif')
      expect(heading.classes()).toContain('text-xs')
      expect(wrapper.classes()).not.toContain('space-y-4')
      expect(toggle(wrapper).text()).toMatch(/Recommended products for you\s*2\s*Show/)
    })

    it('shows no count while the ranking is loading or has failed', async () => {
      // A number there would be a figure nobody computed.
      const { wrapper: loading } = await mountWidget({ collapsible: true, collapsed: true, loading: true })
      const { wrapper: failed } = await mountWidget({ collapsible: true, collapsed: true, failed: true, products: [recommendation()] })

      expect(toggle(loading).text()).not.toMatch(/\d/)
      expect(toggle(failed).text()).not.toMatch(/\d/)
    })

    it('offers no toggle and cannot be folded on a host that did not ask for it', async () => {
      // SkinProfileView's case, where the recommendations are part of the
      // report rather than a section to put away.
      const { wrapper } = await mountWidget({ products: [recommendation()] })

      expect(toggle(wrapper).exists()).toBe(false)
      expect(wrapper.get('h3').text()).toBe('Recommended products for you')
      expect(wrapper.get('h4').isVisible()).toBe(true)
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('rank and match', () => {
    // As both hosts pass them: pickTopRecommendations' output, best first.
    const ranked = () => [
      recommendation({ id: 'p-a', slug: 'a', name: 'First', skin_match_score: 94 }),
      recommendation({ id: 'p-b', slug: 'b', name: 'Second', skin_match_score: 71.6 }),
      recommendation({ id: 'p-c', slug: 'c', name: 'Third', skin_match_score: 40 }),
    ]

    it('numbers each card by its place in the ranking', async () => {
      // Owner request: show the recommendations by rank.
      const { wrapper } = await mountWidget({ products: ranked() })

      expect(wrapper.findAll('.rec-rank').map((r) => r.text())).toEqual(['#1', '#2', '#3'])
      expect(wrapper.findAll('.rec-rank').map((r) => r.attributes('aria-label'))).toEqual(['Rank 1', 'Rank 2', 'Rank 3'])
    })

    it('shows each card its match, worded as the Explore card words it', async () => {
      const { wrapper } = await mountWidget({ products: ranked() })

      expect(wrapper.findAll('.rec-match').map((m) => m.text())).toEqual(['94% Match', '72% Match', '40% Caution'])
    })

    it('draws the match in the Explore card palette, so one score reads one way on the page', async () => {
      const { wrapper } = await mountWidget({ products: ranked() })

      const expected = describeMatchBadge(71.6).class.split(' ')
      expect(wrapper.findAll('.rec-match')[1]!.classes()).toEqual(expect.arrayContaining(expected))
    })

    it('omits the match rather than printing a figure nobody computed', async () => {
      const { wrapper } = await mountWidget({ products: [recommendation({ skin_match_score: null })] })

      expect(wrapper.find('.rec-match').exists()).toBe(false)
      expect(wrapper.get('.rec-rank').text()).toBe('#1')
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('limited information', () => {
    it('flags a recommendation whose score rests on very few ingredients', async () => {
      // A 100% on one ingredient otherwise tops the ranking unremarked.
      const { wrapper } = await mountWidget({
        products: [
          recommendation({
            id: 'p-a',
            slug: 'a',
            skin_match_score: 100,
            match_breakdown: { helpful: 1, concerns: 0, concern_weight: 0, considered: 1, total_ingredients: 6, limited: true },
          }),
          recommendation({
            id: 'p-b',
            slug: 'b',
            skin_match_score: 90,
            match_breakdown: { helpful: 9, concerns: 1, concern_weight: 0.3, considered: 10, total_ingredients: 30, limited: false },
          }),
        ],
      })

      expect(wrapper.findAll('.rec-limited').map((r) => r.text())).toEqual(['Limited info'])
    })
  })
})
