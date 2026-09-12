import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import TypologyComparisonModal from '../../components/Quiz/TypologyComparisonModal.vue'
import ImageZoomModal from '../../components/Shared/ImageZoomModal.vue'
import { typologyDetails } from '../../data/typologydata'

const OILY = typologyDetails['O']!
const DRY = typologyDetails['D']!

/**
 * Mount the comparison overlay with real trait records.
 *
 * The existing coverage for this component is in SkinProfileView.spec.ts, which
 * asserts the props are handed over correctly - but that mount stubs Teleport
 * and never renders this template, so nothing until now showed what the user is
 * actually shown. These cases render it.
 *
 * ImageZoomModal is stubbed: the overlay's own behaviour has its own spec, and
 * what matters here is which image and label it is handed.
 */
const mountModal = (
  activeTrait = OILY as (typeof typologyDetails)[string] | null,
  oppositeTrait = DRY as (typeof typologyDetails)[string] | null,
) =>
  mount(TypologyComparisonModal, {
    props: { activeTrait, oppositeTrait, isOpen: true },
    global: { stubs: { teleport: true, ImageZoomModal: true } },
  })

/** The two comparison panels, in render order: the user's side, then the other. */
const panels = (wrapper: VueWrapper) => wrapper.findAll('.rounded-3xl')

const zoom = (wrapper: VueWrapper) => wrapper.findComponent(ImageZoomModal)

describe('src/components/Quiz/TypologyComparisonModal.vue', () => {
  describe('trait panels (render)', () => {
    it('names the comparison in the header from both traits', () => {
      const wrapper = mountModal()

      expect(wrapper.get('h3').text()).toBe(`${OILY.name} vs. ${DRY.name}`)
    })

    it('marks one side as the user’s own type and the other as its opposite', () => {
      const wrapper = mountModal()

      // The whole point of the screen is that these two are not
      // interchangeable: one describes the user, the other describes what they
      // are being contrasted against.
      expect(panels(wrapper)[0]!.text()).toContain('Your Skin Type')
      expect(panels(wrapper)[1]!.text()).toContain('The Opposite')
      expect(panels(wrapper)[0]!.text()).not.toContain('The Opposite')
    })

    it('shows each trait’s name with its letter and its description', () => {
      const wrapper = mountModal()

      expect(panels(wrapper)[0]!.text()).toContain(`${OILY.name} (${OILY.letter})`)
      expect(panels(wrapper)[0]!.text()).toContain(OILY.desc)
      expect(panels(wrapper)[1]!.text()).toContain(`${DRY.name} (${DRY.letter})`)
      expect(panels(wrapper)[1]!.text()).toContain(DRY.desc)
    })

    it('lists every characteristic the trait records, on both sides', () => {
      const wrapper = mountModal()

      // Asserted against the data rather than against the number three: the
      // dictionary currently gives every trait three points, and a card that
      // hardcoded that would start hiding the fourth the day one is added.
      const listed = (panel: ReturnType<typeof panels>[number]) =>
        panel.findAll('li').map((li) => li.text())

      expect(listed(panels(wrapper)[0]!)).toEqual(OILY.points)
      expect(listed(panels(wrapper)[1]!)).toEqual(DRY.points)
      expect(listed(panels(wrapper)[0]!)).toHaveLength(3)
    })

    it('shows each trait’s photograph, labelled with the trait it illustrates', () => {
      const wrapper = mountModal()
      const images = wrapper.findAll('img')

      expect(images).toHaveLength(2)
      expect(images[0]!.attributes('src')).toBe(OILY.image)
      expect(images[0]!.attributes('alt')).toBe(OILY.name)
      expect(images[1]!.attributes('src')).toBe(DRY.image)
    })

    it('says the reference image is unavailable rather than rendering a broken tile', () => {
      // FE-DEF-08: a stored skin_type outside the sixteen produces a lookup miss
      // and a null trait. The tile is a sized container rather than an <img>, so
      // before the guard it stayed clickable and threw on activeTrait.image.
      const wrapper = mountModal(null, DRY)

      expect(wrapper.text()).toContain('Reference image unavailable')
      expect(wrapper.findAll('img')).toHaveLength(1)
    })

    it('renders nothing at all while closed', () => {
      const wrapper = mount(TypologyComparisonModal, {
        props: { activeTrait: OILY, oppositeTrait: DRY, isOpen: false },
        global: { stubs: { teleport: true, ImageZoomModal: true } },
      })

      expect(wrapper.find('h3').exists()).toBe(false)
    })
  })

  describe('triggerZoom()', () => {
    it('keeps the full-screen view closed until a photograph is clicked', () => {
      const wrapper = mountModal()

      expect(zoom(wrapper).props('isOpen')).toBe(false)
    })

    it('opens the user’s own photograph full screen when that tile is clicked', async () => {
      const wrapper = mountModal()

      await panels(wrapper)[0]!.get('.cursor-zoom-in').trigger('click')

      expect(zoom(wrapper).props('isOpen')).toBe(true)
      expect(zoom(wrapper).props('imageUrl')).toBe(OILY.image)
      expect(zoom(wrapper).props('altText')).toBe(OILY.name)
    })

    it('opens the opposing photograph when the other tile is clicked, not the first one', async () => {
      // The two tiles are near-identical markup, and a handler wired to the
      // wrong trait would still open something - so the assertion has to name
      // which image arrived.
      const wrapper = mountModal()

      await panels(wrapper)[1]!.get('.cursor-zoom-in').trigger('click')

      expect(zoom(wrapper).props('imageUrl')).toBe(DRY.image)
      expect(zoom(wrapper).props('altText')).toBe(DRY.name)
    })

    it('does not open the full-screen view for a tile with no photograph', async () => {
      const wrapper = mountModal(null, DRY)

      // The placeholder tile has no cursor-zoom-in class and no image behind
      // it; clicking it must do nothing rather than open an empty overlay.
      await panels(wrapper)[0]!.trigger('click')

      expect(zoom(wrapper).props('isOpen')).toBe(false)
    })
  })

  describe('close', () => {
    it('emits close from the dismiss button', async () => {
      const wrapper = mountModal()

      await wrapper.get('.px-6.py-5 button').trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('emits close when the backdrop itself is clicked', async () => {
      const wrapper = mountModal()

      await wrapper.get('.fixed.inset-0').trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('does not emit close when the panel inside the backdrop is clicked', async () => {
      // The handler is @click.self. Without that, every click anywhere in the
      // comparison - on a photograph, on a characteristic - would bubble to the
      // backdrop and dismiss the overlay the user is reading.
      const wrapper = mountModal()

      await panels(wrapper)[0]!.trigger('click')

      expect(wrapper.emitted('close')).toBeUndefined()
    })

    it('leaves the full-screen photograph closed behind it when dismissed', async () => {
      // Closing the comparison should not leave the nested overlay holding a
      // stale image: the zoom is a child of this component and outlives its own
      // v-if only through isZoomOpen.
      const wrapper = mountModal()
      await panels(wrapper)[0]!.get('.cursor-zoom-in').trigger('click')
      expect(zoom(wrapper).props('isOpen')).toBe(true)

      zoom(wrapper).vm.$emit('close')
      await wrapper.vm.$nextTick()

      expect(zoom(wrapper).props('isOpen')).toBe(false)
    })
  })
})
