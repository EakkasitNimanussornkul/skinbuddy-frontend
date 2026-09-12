import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import CompareActivesMatrix from '../../components/Compare/CompareActivesMatrix.vue'
import type { CompareResponse } from '../../api/products'
import { compareData, ingredient } from '../fixtures/compare'

describe('src/components/Compare/CompareActivesMatrix.vue', () => {
  const CLASH = {
    alert_type: 'Chemical Interaction Warning',
    severity: 'High',
    message: 'Retinol with salicylic acid can over-exfoliate and irritate.',
  }

  const mountMatrix = (data: CompareResponse) =>
    mount(CompareActivesMatrix, { props: { data } })

  describe('pairState (render)', () => {
    it('lists the conflicts the engine found between this pair', () => {
      // FE-DEF-32: this field was returned and read by no component.
      const wrapper = mountMatrix(compareData({}, {}, { conflicts: [CLASH] }))

      expect(wrapper.text()).toContain('Using These Two Together')
      expect(wrapper.text()).toContain(CLASH.message)
      expect(wrapper.text()).toContain('Chemical Interaction Warning')
      expect(wrapper.text()).not.toContain('No interaction was flagged')
    })

    it('states a clear result as one, and scopes it to the pair', () => {
      const wrapper = mountMatrix(compareData({}, {}, { conflicts: [] }))

      expect(wrapper.text()).toContain('No interaction was flagged between these two formulas.')
      // Worded so it cannot be read as a shelf-wide clearance.
      expect(wrapper.text()).toContain('it says nothing about either one against the rest of your shelf')
    })

    it('does not call an empty list clear when one product has no ingredients to check', () => {
      // An empty conflicts list is not evidence of safety on its own: the pair
      // check needs both lists, and this response carries no verdict field to
      // tell "nothing found" from "nothing to look at".
      const wrapper = mountMatrix(compareData({}, { product_ingredients: [] }, { conflicts: [] }))

      expect(wrapper.text()).toContain('These two could not be checked against each other')
      expect(wrapper.text()).toContain('This is not a clean result.')
      expect(wrapper.text()).not.toContain('No interaction was flagged')
    })

    it('names both products in the scope line', () => {
      const wrapper = mountMatrix(compareData())

      expect(wrapper.text()).toContain('Checked between Resurfacing Retinol Serum')
      expect(wrapper.text()).toContain('and BHA Liquid Exfoliant, not against your shelf.')
    })

    it('omits the severity badge rather than defaulting it when none was sent', () => {
      const wrapper = mountMatrix(
        compareData({}, {}, { conflicts: [{ ...CLASH, severity: null as unknown as string }] }),
      )

      expect(wrapper.text()).toContain(CLASH.message)
      expect(wrapper.text()).not.toContain('High')
    })
  })

  describe('formulaBreakdowns (render)', () => {
    it('shows per-product concerns under their own heading, separate from the pair', () => {
      const wrapper = mountMatrix(
        compareData({
          product_ingredients: [
            ingredient('i-ret', 'Retinol', {
              ingredient_concerns: [
                { concern_title: 'Photosensitivity', concern_description: 'Increases sun sensitivity.' },
              ],
            }),
          ],
        }),
      )

      expect(wrapper.text()).toContain('Each Formula On Its Own')
      expect(wrapper.text()).toContain('Photosensitivity')
      expect(wrapper.text()).toContain('Increases sun sensitivity.')
    })

    it('says a product with no recorded concerns has none detected', () => {
      const wrapper = mountMatrix(compareData())

      expect(
        wrapper.text().split('No active profile contraindications detected for this formula.').length - 1,
      ).toBe(2)
    })

    // Recorded rather than covered: extractSkinTypeWarnings keeps the first
    // four concerns per product and drops the rest without saying so. That is
    // a display choice rather than a defect, and it is flagged to the owner
    // rather than pinned here, because a card asserting "exactly four" would
    // make a reasonable future change - showing a count of the hidden ones -
    // look like a regression.
  })
})
