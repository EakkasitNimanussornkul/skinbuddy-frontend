import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

vi.mock('../../api/products', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  searchProducts: vi.fn(),
}))

import { searchProducts } from '../../api/products'
import CompareSelectorModal from '../../components/Compare/CompareSelectorModal.vue'
import { useToast } from '../../composables/useToast'

const { toasts } = useToast()

const BASE = { id: 'p-base', slug: 'cerave-hydrating-cleanser', brand: 'CeraVe', name: 'Hydrating Cleanser', category: 'Cleanser' }

const catalogue = () => [
  BASE,
  { id: 'p-serum', slug: 'to-niacinamide', brand: 'The Ordinary', name: 'Niacinamide Serum', category: 'Serum' },
  { id: 'p-clean', slug: 'lrp-toleriane', brand: 'La Roche-Posay', name: 'Toleriane Cleanser', category: 'Cleanser' },
  { id: 'p-toner', slug: 'klairs-toner', brand: 'Klairs', name: 'Supple Toner', category: 'Toner' },
]

const mountSelector = async (baseProduct: Record<string, unknown> = BASE) => {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/compare', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()

  const wrapper = mount(CompareSelectorModal, {
    props: { baseProduct },
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

/** Each suggestion's name, in the order rendered. */
const suggestions = (wrapper: VueWrapper) =>
  wrapper.findAll('.select-none h5').map((h) => h.text())

const suggestion = (wrapper: VueWrapper, name: string) =>
  wrapper.findAll('.select-none').find((row) => row.get('h5').text() === name)!

const confirmButton = (wrapper: VueWrapper) =>
  wrapper.get('.border-t button')

describe('src/components/Compare/CompareSelectorModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toasts.value.splice(0)
    vi.mocked(searchProducts).mockResolvedValue(catalogue())
  })

  describe('loadSuggestions()', () => {
    it('offers every other product, never the one being compared against', async () => {
      const { wrapper } = await mountSelector()

      expect(suggestions(wrapper)).not.toContain('Hydrating Cleanser')
      expect(suggestions(wrapper)).toHaveLength(3)
    })

    it('reports a list that could not be loaded rather than showing it empty', async () => {
      // The reported gap, and a defect rather than only a missing card: the
      // catch used to log and stop, leaving a blank list beneath a footer that
      // asked the user to pick from it. Empty by failure and empty by result
      // were the same screen - FE-DEF-09's shape, in a third place.
      vi.mocked(searchProducts).mockRejectedValue(new Error('network down'))
      const { wrapper } = await mountSelector()

      expect(wrapper.text()).toContain('Products Unavailable')
      expect(wrapper.text()).toContain("We couldn't load products to compare against.")
      expect(suggestions(wrapper)).toHaveLength(0)
    })

    it('recovers when the retry succeeds', async () => {
      vi.mocked(searchProducts).mockRejectedValueOnce(new Error('network down'))
      const { wrapper } = await mountSelector()

      await wrapper.findAll('button').find((b) => b.text() === 'Try Again')!.trigger('click')
      await flushPromises()

      expect(wrapper.text()).not.toContain('Products Unavailable')
      expect(suggestions(wrapper)).toHaveLength(3)
    })
  })

  describe('sortedSuggestions (computed)', () => {
    it('ranks products in the same category first', async () => {
      const { wrapper } = await mountSelector()

      expect(suggestions(wrapper)[0]).toBe('Toleriane Cleanser')
      expect(suggestion(wrapper, 'Toleriane Cleanser').text()).toContain('Same Category')
      expect(suggestion(wrapper, 'Niacinamide Serum').text()).not.toContain('Same Category')
    })

    it('narrows by name or brand as the user types', async () => {
      const { wrapper } = await mountSelector()

      await wrapper.get('input').setValue('klairs')
      expect(suggestions(wrapper)).toEqual(['Supple Toner'])

      await wrapper.get('input').setValue('serum')
      expect(suggestions(wrapper)).toEqual(['Niacinamide Serum'])
    })

    it('says a search matched nothing rather than going blank', async () => {
      const { wrapper } = await mountSelector()

      await wrapper.get('input').setValue('zzz no such product')

      expect(wrapper.text()).toContain('No products match "zzz no such product".')
      expect(wrapper.text()).not.toContain('Products Unavailable')
    })

    it('says there is nothing to compare against when the catalogue holds only the base', async () => {
      vi.mocked(searchProducts).mockResolvedValue([BASE])
      const { wrapper } = await mountSelector()

      expect(wrapper.text()).toContain('There are no other products to compare against.')
    })
  })

  describe('handleConfirmCompare()', () => {
    it('keeps the confirm control disabled until a product is picked', async () => {
      const { wrapper } = await mountSelector()

      expect(confirmButton(wrapper).attributes('disabled')).toBeDefined()
      expect(confirmButton(wrapper).text()).toBe('Select a product above')
    })

    it('names the picked product on the confirm control', async () => {
      const { wrapper } = await mountSelector()

      await suggestion(wrapper, 'Supple Toner').trigger('click')

      expect(confirmButton(wrapper).attributes('disabled')).toBeUndefined()
      expect(confirmButton(wrapper).text()).toBe('Compare vs Klairs')
    })

    it('routes to the pair by slug and closes itself', async () => {
      const { wrapper, router } = await mountSelector()
      await suggestion(wrapper, 'Supple Toner').trigger('click')

      await confirmButton(wrapper).trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/compare')
      expect(router.currentRoute.value.query).toEqual({ a: 'cerave-hydrating-cleanser', b: 'klairs-toner' })
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('falls back to the id for a product that carries no slug', async () => {
      // Looks dead and is not: a CompareResponse product has no slug field, so
      // the day a comparison result is passed back in as the base, the id is
      // what keeps this working (FE-DEF-35).
      const { wrapper, router } = await mountSelector({ ...BASE, slug: undefined })
      await suggestion(wrapper, 'Supple Toner').trigger('click')

      await confirmButton(wrapper).trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({ a: 'p-base', b: 'klairs-toner' })
    })
  })

  describe('close', () => {
    it('closes from the backdrop but not from a click inside the dialogue', async () => {
      const { wrapper } = await mountSelector()

      await wrapper.get('.max-w-lg').trigger('click')
      expect(wrapper.emitted('close')).toBeUndefined()

      await wrapper.get('.fixed.inset-0').trigger('click')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })
})
