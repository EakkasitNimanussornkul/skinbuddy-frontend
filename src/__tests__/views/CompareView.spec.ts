import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('../../api/products', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  getProductComparison: vi.fn(),
}))

import CompareView from '../../views/CompareView.vue'

/**
 * Mount the comparison screen at `path`.
 *
 * The default is the address with no pair on it, which is deliberate: that
 * branch sets the error copy without issuing a request, so both back controls -
 * the one in the sticky header and the one in the error panel - are on screen
 * at once and neither case has to stand up a comparison to reach them.
 */
const mountCompare = async (path = '/compare') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/compare', component: CompareView },
      { path: '/explore', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  await router.isReady()

  const wrapper = mount(CompareView, {
    global: {
      plugins: [router],
      stubs: {
        CompareIdentityHeader: true,
        CompareSafetyChecklist: true,
        CompareActivesMatrix: true,
        CompareIngredientsGrid: true,
      },
    },
  })
  await flushPromises()

  return { wrapper, router }
}

const backButton = (wrapper: VueWrapper) => wrapper.get('button[aria-label="Go back"]')

const returnToRegistry = (wrapper: VueWrapper) =>
  wrapper.findAll('button').find((b) => b.text().includes('Return to Registry'))!

describe('src/views/CompareView.vue', () => {
  beforeEach(() => {
    // No resolved value is set: these cases mount at the address with no pair
    // on it, where loadComparison returns before issuing the request. Stubbing
    // a return here would describe a call that never happens.
    vi.clearAllMocks()
  })

  describe('router.back() (back controls)', () => {
    it('returns to the previous page when the header back control is clicked', async () => {
      const { wrapper, router } = await mountCompare()
      const back = vi.spyOn(router, 'back')

      await backButton(wrapper).trigger('click')

      expect(back).toHaveBeenCalledTimes(1)
    })

    it('goes back rather than pushing a destination of its own', async () => {
      // back() and push('/somewhere') both leave the page, so a case asserting
      // only that navigation happened would accept either. They are not
      // interchangeable: this control returns the user wherever they came from,
      // and a push would send everyone to one fixed place and grow the history
      // stack instead of unwinding it.
      const { wrapper, router } = await mountCompare()
      const back = vi.spyOn(router, 'back')
      const push = vi.spyOn(router, 'push')

      await backButton(wrapper).trigger('click')

      expect(back).toHaveBeenCalledTimes(1)
      expect(push).not.toHaveBeenCalled()
    })

    it('is reachable by its accessible name, not only by its position', async () => {
      const { wrapper } = await mountCompare()

      expect(wrapper.findAll('button[aria-label="Go back"]')).toHaveLength(1)
    })

    it('also goes back from the error panel, rather than to a fixed registry route', async () => {
      // A second control on the same view, reachable only in the failure state,
      // and the one whose label most invites the wrong implementation: "Return
      // to Registry" reads like it should push /explore. It does not - it
      // unwinds - and a user who arrived from a product page is returned there
      // rather than to a catalogue they were not on. Covered separately because
      // the header cases cannot reach it and it is a distinct call site.
      const { wrapper, router } = await mountCompare()
      const back = vi.spyOn(router, 'back')
      const push = vi.spyOn(router, 'push')

      await returnToRegistry(wrapper).trigger('click')

      expect(back).toHaveBeenCalledTimes(1)
      expect(push).not.toHaveBeenCalled()
    })
  })
})
