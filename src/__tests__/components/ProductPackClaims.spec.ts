import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn() },
}))
vi.mock('axios', () => ({
  default: { get: vi.fn() },
}))

import axios from 'axios'
import { getProductBySlug } from '../../api/products'
import ProductPackClaims from '../../components/Catalog/ProductPackClaims.vue'

const mountClaims = (product: unknown) => mount(ProductPackClaims, { props: { product } })

describe('src/components/Catalog/ProductPackClaims.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('pack claims (render)', () => {
    it('shows good_for as chips and each benefit on its own line, headed as what the brand says', () => {
      const w = mountClaims({
        good_for: ['Dry skin', 'Sensitive'],
        benefits: ['Cleanses without stripping', 'Supports the skin barrier'],
      })

      expect(w.findAll('.pack-good-for li').map((li) => li.text())).toEqual(['Dry skin', 'Sensitive'])
      expect(w.findAll('.pack-benefits li').map((li) => li.text())).toEqual(['Cleanses without stripping', 'Supports the skin barrier'])
      expect(w.text()).toContain('What the brand says about this product')
    })

    it('says how long the product keeps after opening when pao_months is set', () => {
      const w = mountClaims({ pao_months: 12 })

      expect(w.get('.pack-pao').text()).toBe('Use within 12 months after opening')
    })

    it('shows nothing at all when every field is empty or null', () => {
      for (const product of [{ good_for: [], benefits: [], pao_months: null }, { good_for: null, benefits: null }, {}, null]) {
        expect(mountClaims(product).find('.pack-claims').exists()).toBe(false)
      }
    })

    it('shows only the parts that have content, skipping blank or non-text entries', () => {
      const w = mountClaims({ good_for: ['Oily', '', 7], benefits: ['  '], pao_months: 0 })

      expect(w.findAll('.pack-good-for li').map((li) => li.text())).toEqual(['Oily'])
      expect(w.find('.pack-benefits').exists()).toBe(false)
      expect(w.find('.pack-pao').exists()).toBe(false)
      expect(w.text()).not.toContain('null')
    })
  })

  describe('getProductBySlug() (migration 0013 fields)', () => {
    it('keeps updated_at as the exact string the backend sent, microseconds and offset included', async () => {
      // PATCH /products/{id} needs this value back exactly; a trip through
      // new Date() drops the microseconds and every save would answer 409.
      const stamp = '2026-10-04T08:15:30.123456+00:00'
      vi.mocked(axios.get).mockResolvedValue({ data: { id: 'p-1', slug: 's', updated_at: stamp, benefits: null, good_for: null, pao_months: null } })

      const product = await getProductBySlug('s')

      expect(typeof product.updated_at).toBe('string')
      expect(product.updated_at).toBe(stamp)
    })
  })
})
