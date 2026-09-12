import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import ExpressSkinSelectorModal from '../../components/Quiz/ExpressSkinSelectorModal.vue'
import SkinProfileCard from '../../components/Quiz/SkinProfileCard.vue'
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

    it('says the search found nothing rather than showing no response at all', async () => {
      // Until this was added the unmatched case rendered nothing whatsoever:
      // the user typed, the list did not appear, and nothing distinguished a
      // search that ran and found none from a control that had stopped
      // responding. An empty result is a result.
      const wrapper = await openDropdown('ZZZZ')

      expect(wrapper.text()).toContain('No matching skin types found.')
    })

    it('does not show the empty message while there are still matches', async () => {
      const wrapper = await openDropdown('OS')

      expect(wrapper.text()).not.toContain('No matching skin types found.')
    })

    it('does not show the empty message before the dropdown has been opened', async () => {
      // Gated on isDropdownOpen as well as the count, so an untouched control
      // does not announce a search nobody ran.
      const wrapper = mount(ExpressSkinSelectorModal, {
        props: { isOpen: true, isSaving: false },
        global: { stubs: { teleport: true } },
      })

      expect(wrapper.text()).not.toContain('No matching skin types found.')
    })
  })

  describe('selectType()', () => {
    it('shows the chosen type’s profile once a result is clicked', async () => {
      // TC-1's path: search an exact code, click the result. Nothing before this
      // clicked a result at all - the existing cases stop at what the filter
      // narrows to.
      const wrapper = await openDropdown('OSPW')

      await wrapper.findAll('ul li')[0]!.trigger('click')

      const card = wrapper.findComponent(SkinProfileCard)
      expect(card.exists()).toBe(true)
      expect(card.props('typeCode')).toBe('OSPW')
      expect(card.props('profile')).toEqual(skinProfiles['OSPW'])
    })

    it('resolves the profile from a result found by subtitle, not only by code', async () => {
      // TC-2's path. "dry" matches through the subtitle branch, and the first
      // result is DSNT - so a selection wired to the query rather than to the
      // clicked row would show the wrong profile here and be indistinguishable
      // in the case above.
      const wrapper = await openDropdown('dry')

      await wrapper.findAll('ul li')[0]!.trigger('click')

      expect(wrapper.findComponent(SkinProfileCard).props('typeCode')).toBe('DSNT')
      expect(wrapper.findComponent(SkinProfileCard).props('profile')).toEqual(
        skinProfiles['DSNT'],
      )
    })

    it('puts the chosen code in the search box and closes the list', async () => {
      const wrapper = await openDropdown('OS')

      await wrapper.findAll('ul li')[1]!.trigger('click')

      expect((wrapper.find('input').element as HTMLInputElement).value).toBe('OSNW')
      expect(wrapper.find('ul').exists()).toBe(false)
    })

    it('shows no profile card until something has been selected', async () => {
      const wrapper = await openDropdown('OSPW')

      expect(wrapper.findComponent(SkinProfileCard).exists()).toBe(false)
      expect(wrapper.text()).toContain('Search or select a type to view details.')
    })
  })

  describe('confirm gate', () => {
    // Selected structurally rather than by label: the label is itself part of
    // what the save state changes ("Confirm My Skin Type" becomes "Saving
    // Profile..."), so a text lookup stops finding the button in exactly the
    // case that needs to assert on it.
    const confirmButton = (wrapper: VueWrapper) => wrapper.get('.pt-4 button')

    it('refuses to confirm while nothing has been selected', async () => {
      const wrapper = await openDropdown('OSPW')

      // Typing a code is not choosing one. The handler emits selectedType, which
      // is empty until a row is clicked, so an enabled button here would submit
      // nothing.
      expect(confirmButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('enables the confirm button once a result has been chosen', async () => {
      const wrapper = await openDropdown('OSPW')

      await wrapper.findAll('ul li')[0]!.trigger('click')

      expect(confirmButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('stays disabled when the search matched nothing', async () => {
      const wrapper = await openDropdown('ZZZZ')

      expect(confirmButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('disables itself again while a save is in flight', async () => {
      const wrapper = await openDropdown('OSPW')
      await wrapper.findAll('ul li')[0]!.trigger('click')
      expect(confirmButton(wrapper).attributes('disabled')).toBeUndefined()

      await wrapper.setProps({ isSaving: true })

      // Both halves of the gate matter: a selected type with a save already
      // running must not be submittable twice.
      expect(confirmButton(wrapper).attributes('disabled')).toBeDefined()
      expect(confirmButton(wrapper).text()).toContain('Saving Profile...')
    })

    it('emits the chosen type to the parent when confirmed', async () => {
      const wrapper = await openDropdown('OSPW')
      await wrapper.findAll('ul li')[0]!.trigger('click')

      await confirmButton(wrapper).trigger('click')

      expect(wrapper.emitted('confirm')).toEqual([['OSPW']])
    })
  })
})
