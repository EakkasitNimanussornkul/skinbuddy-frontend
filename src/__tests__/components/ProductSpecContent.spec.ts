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
const mountSpec = async (authenticated: boolean) => {
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
    props: { product: PRODUCT, mode: 'detail' },
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
  })
})
