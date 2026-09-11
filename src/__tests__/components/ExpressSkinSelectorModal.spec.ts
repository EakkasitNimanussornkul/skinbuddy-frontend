import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import ExpressSkinSelectorModal from '../../components/Quiz/ExpressSkinSelectorModal.vue'
import { skinProfiles } from '../../data/skinprofiles'

/**
 * filteredTypes is a computed inside <script setup>, so it is not importable and
 * is exercised through the control it feeds: the combobox dropdown. Reading the
 * rendered list rather than the computed's return value also pins the two things
 * the user actually depends on - that the dropdown is the filtered set, and that
 * an empty result renders no list at all rather than an empty box.
 *
 * The modal is wrapped in <Teleport to="body">, stubbed here so the markup stays
 * inside the wrapper. Without the stub every assertion would have to query
 * document.body and clean up after itself between cases.
 */
const ALL_TYPES = Object.keys(skinProfiles)

const openDropdown = async (query: string): Promise<VueWrapper> => {
  const wrapper = mount(ExpressSkinSelectorModal, {
    props: { isOpen: true, isSaving: false },
    global: { stubs: { teleport: true } },
  })

  const input = wrapper.find('input')
  // The dropdown is gated on focus, not on the query, so an unfocused input
  // renders no list however well the filter matches.
  await input.trigger('focus')
  await input.setValue(query)

  return wrapper
}

/**
 * The type codes currently listed in the dropdown, in render order.
 *
 * `ul li` is unambiguous in these cases: the only other list in this component
 * belongs to SkinProfileCard, which renders behind `v-if="selectedProfile"` and
 * so is absent while nothing has been selected. None of these cases select.
 */
const listedCodes = (wrapper: VueWrapper): string[] =>
  wrapper.findAll('ul li').map((li) => li.find('span').text())

describe('src/components/Quiz/ExpressSkinSelectorModal.vue', () => {
  describe('filteredTypes', () => {
    it('lists all sixteen Baumann types when the query is empty', async () => {
      const wrapper = await openDropdown('')

      expect(listedCodes(wrapper)).toEqual(ALL_TYPES)
      expect(listedCodes(wrapper)).toHaveLength(16)
    })

    it('still lists all sixteen when the query is only whitespace', async () => {
      // The guard is `if (!query)` applied after .trim(), so a query of spaces
      // is the empty query. Without the trim this would filter on " " and match
      // every subtitle, which reads the same on screen for the wrong reason.
      const wrapper = await openDropdown('   ')

      expect(listedCodes(wrapper)).toEqual(ALL_TYPES)
    })

    it('narrows to the single matching type for a full four-letter code', async () => {
      const wrapper = await openDropdown('OSPW')

      expect(listedCodes(wrapper)).toEqual(['OSPW'])
    })

    it('narrows to every type sharing a partial code prefix', async () => {
      const wrapper = await openDropdown('OS')

      expect(listedCodes(wrapper)).toEqual(['OSPW', 'OSNW', 'OSPT', 'OSNT'])
    })

    it('matches a code typed in lower case', async () => {
      const wrapper = await openDropdown('ospw')

      expect(listedCodes(wrapper)).toEqual(['OSPW'])
    })

    it('narrows on a keyword found in the subtitle rather than the code', async () => {
      // No Baumann code contains the letter Y, so "dry" can only have matched
      // through the subtitle branch: "The Dry Reactor" and "The Dry Ager".
      const wrapper = await openDropdown('dry')

      expect(listedCodes(wrapper)).toEqual(['DSNT', 'DRNW'])
    })

    it('matches a subtitle keyword regardless of the case it is typed in', async () => {
      const wrapper = await openDropdown('DrY')

      expect(listedCodes(wrapper)).toEqual(['DSNT', 'DRNW'])
    })

    it('renders no list at all when nothing matches the query', async () => {
      const wrapper = await openDropdown('ZZZZ')

      expect(listedCodes(wrapper)).toEqual([])
      // The <ul> itself is gated on filteredTypes.length, so an unmatched query
      // leaves no empty dropdown hanging under the input.
      expect(wrapper.find('ul').exists()).toBe(false)
    })
  })
})
