import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// Only the fetch is replaced; resolveRequestFailure stays real. Nothing here
// depends on it, but replacing a pure reading rule wholesale is how a mock
// starts disagreeing with the code it stands for.
vi.mock('../../api/products', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  getProductBySlug: vi.fn(),
}))

import { getProductBySlug } from '../../api/products'
import ProductDetailView from '../../views/ProductDetailView.vue'

const PRODUCT = {
  id: 'p-1',
  slug: 'cerave-hydrating-cleanser',
  brand: 'CeraVe',
  name: 'Hydrating Facial Cleanser',
  category: 'Cleanser',
  similar_products: [],
}

/**
 * Mount the detail page for a slug.
 *
 * The heavy children are stubbed: none of them is involved in the header, and
 * the back control under test sits in the sticky bar that renders in every
 * state - loading, resolved and not-found alike - so these cases do not depend
 * on which body branch is showing.
 */
const mountDetail = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/product/:slug', component: ProductDetailView },
      { path: '/explore', component: { template: '<div />' } },
      { path: '/compare', component: { template: '<div />' } },
    ],
  })
  await router.push('/product/cerave-hydrating-cleanser')
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)

  const wrapper = mount(ProductDetailView, {
    global: {
      plugins: [pinia, router],
      stubs: {
        teleport: true,
        ProductSpecContent: true,
        SimilarProductsWidget: true,
        CompareSelectorModal: true,
      },
    },
  })
  await flushPromises()

  return { wrapper, router }
}

const backButton = (wrapper: VueWrapper) => wrapper.get('button[aria-label="Go back"]')

describe('src/views/ProductDetailView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(getProductBySlug).mockResolvedValue(PRODUCT)
  })

  describe('router.back() (header back control)', () => {
    it('returns to the previous page when the back control is clicked', async () => {
      const { wrapper, router } = await mountDetail()
      const back = vi.spyOn(router, 'back')

      await backButton(wrapper).trigger('click')

      expect(back).toHaveBeenCalledTimes(1)
    })

    it('goes back rather than pushing a destination of its own', async () => {
      // back() and push('/somewhere') both leave the page, so a case asserting
      // only that navigation happened would accept either. They are not
      // interchangeable: this control returns the user wherever they came from,
      // and a push would send everyone to one fixed place and grow the history
      // stack instead of unwinding it. On this view in particular the arrival
      // point varies - Explore, a compare result, a similar-products card - so
      // there is no correct fixed destination to push to.
      const { wrapper, router } = await mountDetail()
      const back = vi.spyOn(router, 'back')
      const push = vi.spyOn(router, 'push')

      await backButton(wrapper).trigger('click')

      expect(back).toHaveBeenCalledTimes(1)
      expect(push).not.toHaveBeenCalled()
    })

    it('is reachable by its accessible name, not only by its position', async () => {
      // The control renders an icon and no text. Without the label the only
      // handle on it is "the first button on the page", and the two cases above
      // would be pinning position rather than identity.
      const { wrapper } = await mountDetail()

      expect(wrapper.findAll('button[aria-label="Go back"]')).toHaveLength(1)
    })
  })
})
