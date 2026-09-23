import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import ConflictDetailsList from '../../components/Shared/ConflictDetailsList.vue'
import { groupSkinTypeConflicts } from '../../api/safety'
import { BUFFET, PEPTIDES, mergedBuffet, skinAlert } from '../fixtures/conflicts'

const mountList = (props: Record<string, unknown>) => mount(ConflictDetailsList, { props: props as never })

const lines = (wrapper: VueWrapper) => wrapper.findAll('li.conflict-detail > p').map((p) => p.text())
const chips = (wrapper: VueWrapper) => wrapper.findAll('.ingredient-chip').map((c) => c.text())

const buffetList = (extra: Record<string, unknown> = {}) => {
  const w = mergedBuffet()
  return mountList({ details: w.details, conflictingProduct: w.conflicting_product, ...extra })
}

describe('src/components/Shared/ConflictDetailsList.vue', () => {
  describe('render', () => {
    it('names the clashing product and how many pairs it clashes on', () => {
      const wrapper = buffetList()

      expect(wrapper.get('p').text()).toBe(`With ${BUFFET} · 7 ingredient clashes`)
    })

    it('folds pairs that clash for the same reason into one line naming each ingredient', () => {
      // The owner's screenshot: eight peptides, eight identical paragraphs.
      // Here five of them share one sentence and become one line.
      const wrapper = buffetList()

      expect(lines(wrapper)[1]).toBe(
        'Combining Salicylic Acid with these 5 ingredients is unadvised. Low-pH BHA exfoliants can degrade peptide activity through deamination when layered in the same routine.',
      )
      expect(chips(wrapper)).toEqual(PEPTIDES)
    })

    it('drops the product prefix the card heading already states', () => {
      const wrapper = buffetList()

      expect(lines(wrapper)[0]).toBe('Layering Salicylic Acid with Copper Tripeptide-1 releases free copper ions that oxidise the acid.')
      expect(lines(wrapper).join(' ')).not.toContain('Conflict with')
    })

    it('shows the two most severe lines, then the rest on request', async () => {
      const wrapper = buffetList()
      const more = () => wrapper.find('button.show-more')

      expect(lines(wrapper)).toHaveLength(2)
      expect(wrapper.findAll('li.conflict-detail > span').map((s) => s.text())).toEqual(['High', 'Medium'])
      expect(more().text()).toContain('Show 1 more clash')

      await more().trigger('click')
      expect(lines(wrapper)).toHaveLength(3)
      expect(more().exists()).toBe(false)
    })

    it('lists every line with no control when told not to fold', () => {
      // The Proceed Anyway dialogue: nothing there is ever behind a control.
      const wrapper = buffetList({ fold: false })

      expect(lines(wrapper)).toHaveLength(3)
      expect(wrapper.find('button').exists()).toBe(false)
    })

    it('heads a grouped skin-type card by the skin type, not by a product', () => {
      const grouped = groupSkinTypeConflicts([skinAlert('Heavy occlusive.'), skinAlert('Drying alcohol.')])[0]!
      const wrapper = mountList({ details: grouped.details })

      expect(wrapper.get('p').text()).toBe('Poorly suited to your skin type · 2 ingredients')
      expect(lines(wrapper)).toEqual(['Heavy occlusive.', 'Drying alcohol.'])
    })

    it('omits a line severity chip it cannot band', () => {
      const w = mergedBuffet()
      w.details![0] = { ...w.details![0]!, severity: 'catastrophic' }
      const wrapper = mountList({ details: w.details })

      expect(wrapper.findAll('li.conflict-detail')[0]!.find('li > span').exists()).toBe(false)
    })
  })
})
