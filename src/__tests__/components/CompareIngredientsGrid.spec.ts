import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import CompareIngredientsGrid from '../../components/Compare/CompareIngredientsGrid.vue'
import type { CompareResponse } from '../../api/products'
import { compareData } from '../fixtures/compare'

describe('src/components/Compare/CompareIngredientsGrid.vue', () => {
  const mountGrid = (data: CompareResponse) => mount(CompareIngredientsGrid, { props: { data } })

  const columns = (wrapper: VueWrapper) =>
    wrapper.findAll('.md\\:grid-cols-2 > div').map((col) =>
      col.findAll('span.truncate').map((s) => s.text()),
    )

  describe('shared overlap (render)', () => {
    it('counts and lists the shared ingredients, with the figure beside them', () => {
      const wrapper = mountGrid(compareData())

      expect(wrapper.text()).toContain('Shared Component Overlap (2)')
      expect(wrapper.text()).toContain('50% shared ingredients')
      expect(wrapper.text()).toContain('These two share a noticeable part of their ingredient lists.')
    })

    it('says so when the two share nothing', () => {
      const wrapper = mountGrid(compareData({}, {}, { shared_ingredients: [], similarity_score: 0 }))

      expect(wrapper.text()).toContain('Shared Component Overlap (0)')
      expect(wrapper.text()).toContain('No identical active ingredients overlap between these two formulations.')
    })
  })

  describe('ingredient decks (render)', () => {
    it('labels each column as the full list, because that is what it holds', () => {
      // The defect this label replaced: the columns were headed "Unique
      // Components Deck" directly under the banner listing what the two share,
      // while iterating each product's whole ingredient list.
      const wrapper = mountGrid(compareData())

      expect(wrapper.findAll('h5').map((h) => h.text())).toEqual([
        'Full Ingredient List',
        'Full Ingredient List',
      ])
      expect(wrapper.text()).not.toContain('Unique')
    })

    it('lists the shared ingredients in both columns as well as in the banner', () => {
      // Pinned deliberately. This is the fact that made "Unique" false, and it
      // is what a future change to filter the columns would have to change on
      // purpose - so the choice between the two stays visible rather than
      // drifting in with an unrelated edit.
      const wrapper = mountGrid(compareData())
      const [a, b] = columns(wrapper)

      expect(a).toEqual(['Water', 'Glycerin', 'Retinol'])
      expect(b).toEqual(['Water', 'Glycerin', 'Salicylic Acid'])
    })

    it('marks an ingredient with a recorded benefit as active and one without as base', () => {
      const wrapper = mountGrid(compareData())
      const badges = wrapper.findAll('span.text-\\[9px\\]').map((s) => s.text())

      // A's column: Water (no benefit), Glycerin, Retinol.
      expect(badges.slice(0, 3)).toEqual(['Base', 'Active', 'Active'])
    })

    it('falls back to the column position when a product has no brand', () => {
      const wrapper = mountGrid(compareData({ brand: null }, { brand: '' }))

      expect(wrapper.text()).toContain('Product A')
      expect(wrapper.text()).toContain('Product B')
    })
  })
})
