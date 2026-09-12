import { describe, it, expect } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

import SkinTypeRecommendationsWidget from '../../components/Shared/SkinTypeRecommendationsWidget.vue'

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
})
