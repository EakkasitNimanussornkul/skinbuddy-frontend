import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import CompareFlagMarker from '../../components/Compare/CompareFlagMarker.vue'
import CompareSafetyChecklist from '../../components/Compare/CompareSafetyChecklist.vue'
import type { CompareResponse } from '../../api/products'
import { compareData } from '../fixtures/compare'

describe('src/components/Compare/CompareSafetyChecklist.vue', () => {
  const mountChecklist = (data: CompareResponse) =>
    mount(CompareSafetyChecklist, { props: { data } })

  /** Each row's [A state, label, B state], read off the two markers' own props. */
  const rows = (wrapper: VueWrapper) =>
    wrapper.findAll('.grid-cols-12').map((row) => {
      const markers = row.findAllComponents(CompareFlagMarker)
      return [markers[0]!.props('state'), row.get('.col-span-8').text(), markers[1]!.props('state')]
    })

  describe('verifyFlagState()', () => {
    it('renders all seven properties as rows, whatever the payload says', () => {
      const wrapper = mountChecklist(compareData())

      expect(rows(wrapper).map((r) => r[1])).toEqual([
        'Alcohol-free',
        'Fragrance-free',
        'Paraben-free',
        'Silicone-free',
        'Sulfate-free',
        'Vegan',
        'Fungal-acne safe',
      ])
    })

    it('puts product A on the left and product B on the right of every row', () => {
      const wrapper = mountChecklist(
        compareData(
          { safety_flags: { fragrance_free: true } },
          { safety_flags: { fragrance_free: false } },
        ),
      )

      expect(rows(wrapper)[1]).toEqual([true, 'Fragrance-free', false])
    })

    it('reports a flag the payload omits as unknown rather than as false', () => {
      const wrapper = mountChecklist(
        compareData({ safety_flags: { alcohol_free: true } }, { safety_flags: {} }),
      )

      // A omitted vegan; B omitted everything. Both read as the third state.
      expect(rows(wrapper)[0]).toEqual([true, 'Alcohol-free', null])
      expect(rows(wrapper)[5]).toEqual([null, 'Vegan', null])
    })

    it('keeps an explicit false distinct from an omitted key', () => {
      // `!== undefined` rather than truthiness, so a recorded false is kept as
      // false and not collapsed into the unknown state alongside a missing key.
      const wrapper = mountChecklist(
        compareData({ safety_flags: { paraben_free: false } }, { safety_flags: {} }),
      )

      expect(rows(wrapper)[2]).toEqual([false, 'Paraben-free', null])
    })

    it('reports every flag as unknown for a product with no safety_flags object at all', () => {
      const wrapper = mountChecklist(compareData({ safety_flags: undefined }))

      expect(rows(wrapper).every((r) => r[0] === null)).toBe(true)
    })
  })

  describe('labelFor()', () => {
    it('names each side by product as well as brand', () => {
      // The brand alone identifies nothing when both products are the same
      // brand, which is the comparison a user is most likely to run.
      const wrapper = mountChecklist(compareData({}, { brand: 'CeraVe', name: 'Foaming Cleanser' }))

      expect(wrapper.text()).toContain('Resurfacing Retinol Serum')
      expect(wrapper.text()).toContain('Foaming Cleanser')
    })

    it('falls back to its column position when a product has neither name nor brand', () => {
      const wrapper = mountChecklist(compareData({ name: '', brand: '' }, { name: null, brand: null }))

      expect(wrapper.text()).toContain('Formula A')
      expect(wrapper.text()).toContain('Formula B')
    })
  })
})
