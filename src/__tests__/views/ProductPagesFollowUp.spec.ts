import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import ProductSpecContent from '../../components/Catalog/ProductSpecContent.vue'
import { useAuthStore } from '../../stores/auth'

// Follow-ups to feat/22 on the product pages and the site chrome, from an
// independent verifier's notes.

const mounted: VueWrapper[] = []

const memoryRouter = async (routes: { path: string; meta?: Record<string, unknown> }[], address: string) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: routes.map((r) => ({ ...r, component: { template: '<div />' } })),
  })
  await router.push(address)
  await router.isReady()
  return router
}

describe('feat/22 follow-ups (product pages and site chrome)', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
  })

  describe('ProductSpecContent ingredient list (functional group label)', () => {
    const mountSpec = async (productIngredients: unknown[]) => {
      const router = await memoryRouter([{ path: '/' }], '/')
      const pinia = createPinia()
      setActivePinia(pinia)
      useAuthStore().setAuth('token-1', { id: 'u-1', skin_type: 'OSPW' })
      const wrapper = mount(ProductSpecContent, {
        props: {
          product: { id: 'p-1', slug: 'p', brand: 'B', name: 'N', category: 'Cleansers', match_reasons: [], product_ingredients: productIngredients },
          mode: 'detail',
        },
        global: { plugins: [pinia, router], stubs: { teleport: true, ProductHeroSection: true, IngredientsExplained: true } },
      })
      mounted.push(wrapper)
      await flushPromises()
      return wrapper
    }
    const rows = (w: VueWrapper) => w.findAll('.divide-y > div')

    it('shows no group label for a name-only ingredient, rather than calling it "Skin Conditioning"', async () => {
      const wrapper = await mountSpec([
        { ingredients: { id: 'i-new', name: 'Phytosphingosine', awareness_tier: 'low', functional_group: null } },
      ])

      expect(rows(wrapper)).toHaveLength(1)
      expect(rows(wrapper)[0]!.text()).toContain('Phytosphingosine')
      expect(rows(wrapper)[0]!.find('.ingredient-group').exists()).toBe(false)
      expect(wrapper.text()).not.toMatch(/skin conditioning/i)
    })

    it('still shows the group an ingredient has on record', async () => {
      const wrapper = await mountSpec([{ ingredients: { id: 'i-gly', name: 'Glycerin', awareness_tier: 'low', functional_group: 'Humectant' } }])

      expect(rows(wrapper)[0]!.get('.ingredient-group').text()).toBe('Humectant')
    })
  })
})
