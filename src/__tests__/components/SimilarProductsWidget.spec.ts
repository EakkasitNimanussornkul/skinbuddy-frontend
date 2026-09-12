import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

import SimilarProductsWidget from '../../components/Catalog/SimilarProductsWidget.vue'
import { useToast } from '../../composables/useToast'

const { toasts } = useToast()

const similar = (overrides: Record<string, unknown> = {}) => ({
  id: 'p-2',
  slug: 'lrp-toleriane-cleanser',
  brand: 'La Roche-Posay',
  name: 'Toleriane Hydrating Cleanser',
  image_url: 'https://cdn.example.com/lrp.png',
  ...overrides,
})

const mountWidget = async (similarProducts: unknown[], baseProductSlug = 'cerave-hydrating-cleanser') => {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/compare', component: { template: '<div />' } },
      { path: '/product/:slug', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()

  const wrapper = mount(SimilarProductsWidget, {
    props: { similarProducts, baseProductSlug },
    global: { plugins: [router] },
  })
  return { wrapper, router }
}

describe('src/components/Catalog/SimilarProductsWidget.vue', () => {
  beforeEach(() => {
    toasts.value.splice(0)
  })

  describe('similar products (render)', () => {
    it('renders nothing at all when there are no similar products', async () => {
      // Hidden rather than shown empty: a heading promising "products similar
      // to this" over no products would be a claim with nothing under it.
      const { wrapper } = await mountWidget([])

      expect(wrapper.text()).toBe('')
    })

    it('renders each similar product with its brand, name and photo', async () => {
      const { wrapper } = await mountWidget([
        similar(),
        similar({ id: 'p-3', slug: 'vanicream', brand: 'Vanicream', name: 'Gentle Cleanser', image_url: null }),
      ])

      expect(wrapper.text()).toContain('Recommended products similar to this')
      expect(wrapper.findAll('h4').map((h) => h.text())).toEqual([
        'Toleriane Hydrating Cleanser',
        'Gentle Cleanser',
      ])
      expect(wrapper.text()).toContain('Vanicream')
      expect(wrapper.findAll('img')).toHaveLength(1)
    })

    it('links each card to that product', async () => {
      const { wrapper, router } = await mountWidget([similar()])

      await wrapper.get('a').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/product/lrp-toleriane-cleanser')
    })
  })

  describe('goToCompare()', () => {
    it('compares the page product against the chosen one, base first', async () => {
      const { wrapper, router } = await mountWidget([similar()])

      await wrapper.findAll('button').find((b) => b.text().includes('Compare'))!.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/compare')
      expect(router.currentRoute.value.query).toEqual({
        a: 'cerave-hydrating-cleanser',
        b: 'lrp-toleriane-cleanser',
      })
    })

    it('encodes a slug rather than letting it corrupt the other product', async () => {
      // The template used to interpolate `/compare?a=...&b=...` by hand, so an
      // ampersand in a slug would have split the query. buildComparePath is
      // the one place that contract is written, and it escapes both halves.
      const { wrapper, router } = await mountWidget([similar({ slug: 'a&b=c' })])

      await wrapper.findAll('button').find((b) => b.text().includes('Compare'))!.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query.b).toBe('a&b=c')
      expect(router.currentRoute.value.query.a).toBe('cerave-hydrating-cleanser')
    })

    it('reports a product that cannot be compared instead of navigating', async () => {
      const { wrapper, router } = await mountWidget([similar({ slug: '' })])

      await wrapper.findAll('button').find((b) => b.text().includes('Compare'))!.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/')
      expect(toasts.value[0]!.message).toBe('That product cannot be compared right now.')
    })
  })
})
