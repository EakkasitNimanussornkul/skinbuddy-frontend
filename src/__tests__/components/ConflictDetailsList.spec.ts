import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import ConflictDetailsList from '../../components/Shared/ConflictDetailsList.vue'
import { groupSkinTypeConflicts } from '../../api/safety'
import { mergedBuffet, skinAlert, PEPTIDES } from '../fixtures/conflicts'

const mountList = (props: Record<string, unknown>) => mount(ConflictDetailsList, { props: props as never })

const pairs = (wrapper: VueWrapper) => wrapper.findAll('li.conflict-detail p').map((p) => p.text())

describe('src/components/Shared/ConflictDetailsList.vue', () => {
  describe('render', () => {
    it('names the clashing product and how many pairs it clashes on', () => {
      const w = mergedBuffet()
      const wrapper = mountList({ details: w.details, conflictingProduct: w.conflicting_product })

      expect(wrapper.get('p').text()).toBe('With "Buffet" Multi-Technology Peptide Serum · 5 ingredient clashes')
    })

    it('shows the two most severe pairs first, each with its own explanation', () => {
      // The owner request: a card with a pair or two, then Show more. Each pair
      // carries the rule's reason, which the one-line summary leaves out.
      const w = mergedBuffet()
      const wrapper = mountList({ details: w.details, conflictingProduct: w.conflicting_product })

      expect(pairs(wrapper)).toHaveLength(2)
      expect(pairs(wrapper)[0]).toContain(PEPTIDES[0])
      expect(pairs(wrapper)[0]).toContain('the low pH can degrade it')
      expect(wrapper.findAll('li.conflict-detail span').map((s) => s.text())).toEqual(['High', 'Medium'])
    })

    it('reveals the rest two at a time, then exactly what is left', async () => {
      const w = mergedBuffet()
      const wrapper = mountList({ details: w.details, conflictingProduct: w.conflicting_product })
      const more = () => wrapper.find('button.show-more')

      expect(more().text()).toContain('Show 2 more clashes')
      await more().trigger('click')
      expect(pairs(wrapper)).toHaveLength(4)
      expect(more().text()).toContain('Show 1 more clash')
      expect(more().text()).not.toContain('clashes')

      await more().trigger('click')
      expect(pairs(wrapper)).toHaveLength(5)
      expect(more().exists()).toBe(false)
    })

    it('lists every pair with no control when told not to fold', () => {
      // The Proceed Anyway dialogue: nothing there is ever behind a control.
      const w = mergedBuffet()
      const wrapper = mountList({ details: w.details, conflictingProduct: w.conflicting_product, fold: false })

      expect(pairs(wrapper)).toHaveLength(5)
      expect(wrapper.find('button').exists()).toBe(false)
    })

    it('heads a grouped skin-type card by the skin type, not by a product', () => {
      const grouped = groupSkinTypeConflicts([skinAlert('Heavy occlusive.'), skinAlert('Drying alcohol.')])[0]!
      const wrapper = mountList({ details: grouped.details })

      expect(wrapper.get('p').text()).toBe('Poorly suited to your skin type · 2 ingredients')
    })

    it('omits a pair severity chip it cannot band', () => {
      const w = mergedBuffet()
      w.details![0] = { ...w.details![0]!, severity: 'catastrophic' }
      const wrapper = mountList({ details: w.details })

      expect(wrapper.findAll('li.conflict-detail')[0]!.find('span').exists()).toBe(false)
    })
  })
})
