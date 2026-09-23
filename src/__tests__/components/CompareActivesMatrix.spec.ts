import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import CompareActivesMatrix from '../../components/Compare/CompareActivesMatrix.vue'
import type { CompareResponse } from '../../api/products'
import { compareData, ingredient } from '../fixtures/compare'
import { mergedBuffet } from '../fixtures/conflicts'

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

    /**
     * The severity chip in a conflict card.
     *
     * Not `span.text-[9px]` alone: the KeyActivesGrid higher up this panel draws
     * its functional-group chips at the same size, so that selector found them
     * too. The severity chip is the one that is both widest-tracked and
     * rounded-md; the grid's chips are wider-tracked and rounded-lg.
     */
    const severityChips = (wrapper: VueWrapper) =>
      wrapper.findAll('span.text-\\[9px\\].tracking-widest.rounded-md')

    it('shows the severity the engine sent', () => {
      const wrapper = mountMatrix(compareData({}, {}, { conflicts: [CLASH] }))

      expect(severityChips(wrapper).map((s) => s.text())).toEqual(['High'])
    })

    it('omits the severity chip rather than defaulting it when none was sent', () => {
      // Asserted on the element, not on the text. The first version of this
      // card checked only that "High" did not appear - and forcing the chip to
      // always render still passed it, because a null severity renders an
      // empty chip rather than the word. The property is that no chip is drawn
      // at all: an empty coloured badge still reads as a graded warning.
      const wrapper = mountMatrix(
        compareData({}, {}, { conflicts: [{ ...CLASH, severity: null as unknown as string }] }),
      )

      expect(wrapper.text()).toContain(CLASH.message)
      expect(severityChips(wrapper)).toHaveLength(0)
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

    // extractSkinTypeWarnings used to keep the first four concerns per product
    // and drop the rest without saying so. It now returns them all and the
    // panel steps through them - covered in the stepping group below.
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('stepping', () => {
    const clash = (severity: string, message: string) => ({ alert_type: 'Chemical Interaction Warning', severity, message })

    it('lists pair conflicts most severe first, two at a time', async () => {
      const wrapper = mountMatrix(
        compareData({}, {}, { conflicts: [clash('Low', 'low one'), clash('High', 'high one'), clash('Medium', 'medium one')] }),
      )

      expect(wrapper.text()).toContain('high one')
      expect(wrapper.text()).toContain('medium one')
      expect(wrapper.text()).not.toContain('low one')

      await wrapper.get('button.show-more').trigger('click')
      expect(wrapper.text()).toContain('low one')
    })

    it('keeps a fifth concern reachable instead of silently dropping it', async () => {
      // This list was cut to four with no indication. Stepping keeps the rest.
      const concerns = Array.from({ length: 6 }, (_, i) => ({ concern_title: `Concern ${i + 1}`, concern_description: 'x' }))
      const wrapper = mountMatrix(
        compareData({ product_ingredients: [ingredient('i-ret', 'Retinol', { ingredient_concerns: concerns })] }),
      )

      expect(wrapper.text()).toContain('Concern 4')
      expect(wrapper.text()).not.toContain('Concern 5')

      const more = wrapper.findAll('button.show-more').find((b) => b.text().includes('concerns'))!
      await more.trigger('click')

      expect(wrapper.text()).toContain('Concern 6')
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('grouped conflicts', () => {
    it('lists a merged pair conflict pair by pair, two at a time', () => {
      const wrapper = mountMatrix(compareData({}, {}, { conflicts: [mergedBuffet()] }))

      expect(wrapper.text()).toContain('5 ingredient clashes')
      expect(wrapper.findAll('li.conflict-detail')).toHaveLength(2)
    })
  })
})
