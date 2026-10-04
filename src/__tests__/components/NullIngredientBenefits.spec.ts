import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import IngredientsExplained from '../../components/Catalog/IngredientsExplained.vue'
import KeyActivesGrid from '../../components/Shelf/KeyActivesGrid.vue'
import CompareIngredientsGrid from '../../components/Compare/CompareIngredientsGrid.vue'
import { compareData } from '../fixtures/compare'

/**
 * Ingredient benefits can be null since migration 0013: an ingredient approved
 * "name only" has no profile at all. Each screen that shows ingredient notes
 * must then show nothing, or the neutral "No description yet" - never the text
 * "null", an empty quote, or an invented claim.
 */
const nameOnly = (name: string) => ({ id: `i-${name}`, name, benefits: null, functional_group: null })

describe('null ingredient benefits', () => {
  describe('IngredientsExplained (render)', () => {
    it('describes an ingredient that has benefits as before, and the next one with no profile neutrally', () => {
      const w = mount(IngredientsExplained, {
        props: {
          ingredientsList: [
            { id: 'i-gly', name: 'Glycerin', functional_group: 'Humectant', benefits: 'Draws water into the skin.' },
            nameOnly('Phytosphingosine'),
          ],
        },
      })

      expect(w.text()).toContain('Draws water into the skin.')
      expect(w.findAll('.no-description').map((p) => p.text())).toEqual(['No description yet'])
      expect(w.findAll('.ingredient-group').map((g) => g.text())).toEqual(['Humectant'])
      expect(w.text()).not.toContain('null')
    })

    it('shows the functional group when there is one, even with no benefits', () => {
      const w = mount(IngredientsExplained, {
        props: { ingredientsList: [{ id: 'i-x', name: 'Xanthan Gum', functional_group: 'Thickener', benefits: null }] },
      })

      expect(w.text()).toContain('Thickener')
      expect(w.text()).toContain('No description yet')
    })
  })

  describe('KeyActivesGrid (render)', () => {
    it('says "No description yet" for an active with a group but no benefits, instead of the old filler line', () => {
      const w = mount(KeyActivesGrid, {
        props: { ingredients: [{ ingredients: { id: 'i-nia', name: 'Niacinamide', functional_group: 'Vitamin B3', benefits: null } }] },
      })

      expect(w.get('.no-description').text()).toBe('No description yet')
      expect(w.text()).not.toContain('physiological')
      expect(w.text()).not.toContain('null')
    })

    it('leaves out an ingredient with no profile at all, as it does any ungrouped one', () => {
      const w = mount(KeyActivesGrid, { props: { ingredients: [{ ingredients: nameOnly('Phytosphingosine') }] } })

      expect(w.text()).not.toContain('Phytosphingosine')
    })
  })

  describe('CompareIngredientsGrid (render)', () => {
    it('labels an ingredient with a group but no benefits as Base, and one with neither not at all', () => {
      const data = compareData()
      data.product_a.product_ingredients = [
        { ingredients: { id: 'i-x', name: 'Xanthan Gum', functional_group: 'Thickener', benefits: null } },
        { ingredients: nameOnly('Phytosphingosine') },
      ]
      data.product_b.product_ingredients = []

      const w = mount(CompareIngredientsGrid, { props: { data } })

      expect(w.findAll('span.text-\\[9px\\]').map((s) => s.text())).toEqual(['Base'])
      expect(w.text()).toContain('Phytosphingosine')
    })
  })
})
