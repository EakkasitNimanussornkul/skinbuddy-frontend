import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import ImageZoomModal from '../../components/Shared/ImageZoomModal.vue'

/**
 * Mount the zoom overlay.
 *
 * `transition: false` is load-bearing, not tidiness. Vue Test Utils stubs
 * <Transition> by default, and resetZoom is wired to its @enter hook - under the
 * default stub that hook never fires, so the reopen cases below would be
 * asserting a reset that the test itself had disabled. Verified by running them
 * both ways before writing this: stubbed, a reopened overlay still reads 110%.
 */
const mountZoom = (isOpen = true) =>
  mount(ImageZoomModal, {
    props: { isOpen, imageUrl: '/images/oily-skin.jpg', altText: 'Oily skin macro' },
    global: { stubs: { transition: false } },
  })

/** The interactive frame that carries the wheel and pointer handlers. */
const canvas = (wrapper: VueWrapper) => wrapper.get('.cursor-grab')

/** The zoom level as the user reads it off the indicator pill. */
const zoomPercent = (wrapper: VueWrapper) => Number(wrapper.text().match(/Zoom: (\d+)%/)![1])

const transform = (wrapper: VueWrapper) => wrapper.get('img').attributes('style') ?? ''

const zoomIn = async (wrapper: VueWrapper, times = 1) => {
  for (let i = 0; i < times; i += 1) await canvas(wrapper).trigger('wheel', { deltaY: -100 })
}

const zoomOut = async (wrapper: VueWrapper, times = 1) => {
  for (let i = 0; i < times; i += 1) await canvas(wrapper).trigger('wheel', { deltaY: 100 })
}

describe('src/components/Shared/ImageZoomModal.vue', () => {
  describe('handleWheel()', () => {
    it('opens at 100%, which is the photograph at its natural size', () => {
      expect(zoomPercent(mountZoom())).toBe(100)
    })

    it('magnifies in ten-percent steps as the wheel is scrolled up', async () => {
      const wrapper = mountZoom()

      await zoomIn(wrapper)
      expect(zoomPercent(wrapper)).toBe(110)

      await zoomIn(wrapper)
      expect(zoomPercent(wrapper)).toBe(120)
    })

    it('reduces in the same steps as the wheel is scrolled down', async () => {
      const wrapper = mountZoom()
      await zoomIn(wrapper, 3)

      await zoomOut(wrapper)

      expect(zoomPercent(wrapper)).toBe(120)
    })

    it('stops at 400% however far the wheel is scrolled up', async () => {
      const wrapper = mountZoom()

      // Thirty steps reaches the ceiling exactly; ten more must change nothing.
      await zoomIn(wrapper, 40)

      expect(zoomPercent(wrapper)).toBe(400)
      expect(transform(wrapper)).toContain('scale(4)')
    })

    it('stops at 100% however far the wheel is scrolled down', async () => {
      const wrapper = mountZoom()

      await zoomOut(wrapper, 5)

      // The floor is the natural size, not zero and not a negative scale. Note
      // the clamp lands on exactly 1 rather than near it, which is what lets the
      // identity checks in onDrag and below be written as === 1.
      expect(zoomPercent(wrapper)).toBe(100)
      expect(transform(wrapper)).toContain('scale(1)')
    })

    it('recentres the photograph when it is zoomed back down to 100%', async () => {
      const wrapper = mountZoom()
      await zoomIn(wrapper, 2)
      await canvas(wrapper).trigger('mousedown', { clientX: 100, clientY: 100 })
      await canvas(wrapper).trigger('mousemove', { clientX: 160, clientY: 180 })
      expect(transform(wrapper)).toContain('translate(60px, 80px)')

      await zoomOut(wrapper, 2)

      // Otherwise the image sits at its natural size but pushed off-centre, with
      // no way to bring it back short of closing the overlay.
      expect(zoomPercent(wrapper)).toBe(100)
      expect(transform(wrapper)).toContain('translate(0px, 0px)')
    })
  })

  describe('onDrag()', () => {
    it('does not move the photograph while it is at 100%', async () => {
      const wrapper = mountZoom()

      await canvas(wrapper).trigger('mousedown', { clientX: 100, clientY: 100 })
      await canvas(wrapper).trigger('mousemove', { clientX: 300, clientY: 260 })

      // At natural size the whole photograph is already visible, so panning
      // would only slide it out of the frame it is centred in.
      expect(transform(wrapper)).toContain('translate(0px, 0px)')
    })

    it('moves the photograph by the pointer delta once it is magnified', async () => {
      const wrapper = mountZoom()
      await zoomIn(wrapper)

      await canvas(wrapper).trigger('mousedown', { clientX: 100, clientY: 100 })
      await canvas(wrapper).trigger('mousemove', { clientX: 150, clientY: 130 })

      expect(transform(wrapper)).toContain('translate(50px, 30px)')
    })

    it('stops moving once the pointer is released', async () => {
      const wrapper = mountZoom()
      await zoomIn(wrapper)
      await canvas(wrapper).trigger('mousedown', { clientX: 100, clientY: 100 })
      await canvas(wrapper).trigger('mousemove', { clientX: 150, clientY: 130 })

      await canvas(wrapper).trigger('mouseup')
      await canvas(wrapper).trigger('mousemove', { clientX: 400, clientY: 400 })

      // Without this the photograph would follow the cursor around the overlay
      // after the drag had ended.
      expect(transform(wrapper)).toContain('translate(50px, 30px)')
    })
  })

  describe('resetZoom()', () => {
    it('returns to 100% when the overlay is reopened', async () => {
      const wrapper = mountZoom()
      await zoomIn(wrapper, 3)
      expect(zoomPercent(wrapper)).toBe(130)

      await wrapper.setProps({ isOpen: false })
      await wrapper.setProps({ isOpen: true })

      // The state lives in the component, not in the v-if, so without the reset
      // the next photograph the user opens would arrive at whatever zoom the
      // previous one was left at.
      expect(zoomPercent(wrapper)).toBe(100)
    })

    it('clears any panning when the overlay is reopened', async () => {
      const wrapper = mountZoom()
      await zoomIn(wrapper, 2)
      await canvas(wrapper).trigger('mousedown', { clientX: 100, clientY: 100 })
      await canvas(wrapper).trigger('mousemove', { clientX: 220, clientY: 190 })
      expect(transform(wrapper)).toContain('translate(120px, 90px)')

      await wrapper.setProps({ isOpen: false })
      await wrapper.setProps({ isOpen: true })

      expect(transform(wrapper)).toContain('translate(0px, 0px)')
    })
  })

  describe('close', () => {
    it('emits close from the dismiss button', async () => {
      const wrapper = mountZoom()

      await wrapper.findAll('button')[0]!.trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('emits close when the backdrop itself is clicked', async () => {
      const wrapper = mountZoom()

      await wrapper.get('.fixed.inset-0').trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('renders nothing at all while closed', () => {
      const wrapper = mountZoom(false)

      expect(wrapper.find('img').exists()).toBe(false)
    })
  })
})
