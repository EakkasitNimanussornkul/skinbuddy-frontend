import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import SkinTypeReasons from '../../components/Shared/SkinTypeReasons.vue'
import { explainedAlcohol, explainedNiacinamide, unexplainedPreservative } from '../fixtures/conflicts'

const mountReasons = (reasons: unknown) => mount(SkinTypeReasons, { props: { reasons: reasons as never } })

describe('src/components/Shared/SkinTypeReasons.vue', () => {
  describe('render', () => {
    it('explains each matched trait with its concern, in the order the backend sent', () => {
      // A skin-type alert used to say only that an ingredient triggers the
      // user's type - no reason, and no indication which letter matched.
      const wrapper = mountReasons(explainedAlcohol().reasons)

      expect(wrapper.findAll('.reason-title').map((t) => t.text())).toEqual(['Barrier Stripping', 'Stinging on Application'])
      expect(wrapper.text()).toContain('Drying alcohols dissolve surface lipids')
      expect(wrapper.findAll('.reason-trait').map((t) => t.text())).toEqual([
        'Flagged for: Extremely Dry Skin (D)',
        'Flagged for: Highly Sensitive Skin (S)',
      ])
    })

    it('grades each reason when there are several, since they can differ', () => {
      const wrapper = mountReasons(explainedAlcohol().reasons)

      expect(wrapper.findAll('.reason-grade').map((g) => g.text())).toEqual(['High', 'Medium'])
    })

    it('leaves the grade to the alert badge when there is only one reason', () => {
      // The backend grades the alert by its worst reason, so with one reason the
      // badge already says it - a second chip would repeat it.
      const wrapper = mountReasons(explainedNiacinamide().reasons)

      expect(wrapper.find('.reason-grade').exists()).toBe(false)
      expect(wrapper.get('.reason-title').text()).toBe('Flush & Stinging Flare')
    })

    it('shows the trait alone when no concern has been written for it yet', () => {
      // Twelve of the twenty live triggers are in this state today. The trait
      // still says which part of the user's type the ingredient is flagged for.
      const wrapper = mountReasons(unexplainedPreservative().reasons)

      expect(wrapper.find('.reason-title').exists()).toBe(false)
      expect(wrapper.find('.reason-description').exists()).toBe(false)
      expect(wrapper.get('.reason-trait').text()).toBe('Flagged for: Highly Sensitive Skin (S)')
    })

    it('renders nothing for an alert that carries no reasons', () => {
      const wrapper = mountReasons([])

      expect(wrapper.find('ul').exists()).toBe(false)
    })

    it('omits a grade it cannot band rather than printing a guess', () => {
      const reasons = explainedAlcohol().reasons!
      reasons[1] = { ...reasons[1]!, severity: 'Critical' }
      const wrapper = mountReasons(reasons)

      expect(wrapper.findAll('.reason-grade').map((g) => g.text())).toEqual(['High'])
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('sources', () => {
    const sourceRef = (id: string) => ({
      id,
      title: 'Source ' + id,
      publisher: 'European Commission',
      url: 'https://example.org/' + id,
      source_type: 'regulatory_register',
      accessed_on: null,
      notes: null,
    })

    it("shows the sources behind each reason's concern", () => {
      const reasons = explainedAlcohol().reasons!
      reasons[0] = { ...reasons[0]!, sources: [sourceRef('cir')] }
      const wrapper = mountReasons(reasons)
      const items = wrapper.findAll('li.skin-reason')

      expect(items[0]!.get('a.source-link').text()).toBe('Source cir')
      expect(items[1]!.find('.source-none').exists()).toBe(true)
    })
  })
})
