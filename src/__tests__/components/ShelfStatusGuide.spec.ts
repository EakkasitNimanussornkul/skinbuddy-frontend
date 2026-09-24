import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import ShelfStatusGuide from '../../components/Shelf/ShelfStatusGuide.vue'
import ItemBadge from '../../components/Shelf/ItemBadge.vue'

const toggle = (wrapper: VueWrapper) => wrapper.get('button.status-guide-toggle')
// v-show leaves the element mounted, so visibility is read off its style.
const isHidden = (wrapper: VueWrapper) =>
  (wrapper.get(`#${toggle(wrapper).attributes('aria-controls')}`).attributes('style') ?? '').includes('display: none')

describe('src/components/Shelf/ShelfStatusGuide.vue', () => {
  describe('render', () => {
    it('starts folded, and opens and closes on its header', async () => {
      const wrapper = mount(ShelfStatusGuide)

      expect(isHidden(wrapper)).toBe(true)
      expect(toggle(wrapper).attributes('aria-expanded')).toBe('false')

      await toggle(wrapper).trigger('click')
      expect(isHidden(wrapper)).toBe(false)
      expect(toggle(wrapper).attributes('aria-expanded')).toBe('true')

      await toggle(wrapper).trigger('click')
      expect(isHidden(wrapper)).toBe(true)
    })

    it('explains every badge a shelf card can show, drawn with the cards own badge', () => {
      // ShelfCard draws these five badge types and no others.
      const wrapper = mount(ShelfStatusGuide)

      expect(wrapper.findAllComponents(ItemBadge).map((b) => b.props('type'))).toEqual([
        'error',
        'warning',
        'good',
        'unopened',
        'archived',
      ])
    })

    it('says where archived products went', () => {
      // They are hidden from "All", which is the default view.
      const wrapper = mount(ShelfStatusGuide)

      expect(wrapper.text()).toContain('Hidden from "All" - pick the Archived filter to see these.')
    })

    it('tells In Routine apart from the badges', () => {
      const wrapper = mount(ShelfStatusGuide)
      const entries = wrapper.findAll('li.status-guide-entry').map((li) => li.text())

      expect(entries).toHaveLength(6)
      expect(entries[5]).toContain('A step in your current routine uses it.')
      expect(entries[5]).toContain('an unopened product can be in your routine too')
    })

    it('explains the default order', () => {
      const wrapper = mount(ShelfStatusGuide)

      expect(wrapper.get('.status-guide-order').text()).toContain(
        'lists expired products, then those expiring soon, then active ones',
      )
    })
  })
})
