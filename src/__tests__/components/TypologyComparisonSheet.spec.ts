import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'

import TypologyComparisonModal from '../../components/Quiz/TypologyComparisonModal.vue'
import ImageZoomModal from '../../components/Shared/ImageZoomModal.vue'
import { typologyDetails } from '../../data/typologydata'

const OILY = typologyDetails['O']!
const DRY = typologyDetails['D']!
const STEPS = ['Oily vs Dry', 'Sensitive vs Resistant', 'Pigmented vs Non-Pigmented', 'Wrinkle-Prone vs Tight']

const mounted: VueWrapper[] = []

/**
 * Mount the sheet open on Oily vs Dry, attached to the document so focus and
 * document-level key presses behave as in a page. Teleport and the nested
 * ImageZoomModal are stubbed, as in TypologyComparisonModal.spec.ts.
 */
const mountSheet = (props: Partial<{ position: number; steps: string[]; isOpen: boolean }> = {}) => {
  const wrapper = mount(TypologyComparisonModal, {
    props: { activeTrait: OILY, oppositeTrait: DRY, isOpen: true, position: 0, steps: STEPS, ...props },
    attachTo: document.body,
    global: { stubs: { teleport: true, ImageZoomModal: true } },
  })
  mounted.push(wrapper)
  return wrapper
}

const key = (k: string, init: KeyboardEventInit = {}) =>
  document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }))
const prev = (wrapper: VueWrapper) => wrapper.get('button[aria-label^="Previous trait"]')
const next = (wrapper: VueWrapper) => wrapper.get('button[aria-label^="Next trait"]')
const zoom = (wrapper: VueWrapper) => wrapper.findComponent(ImageZoomModal)

describe('src/components/Quiz/TypologyComparisonModal.vue (sheet)', () => {
  afterEach(() => {
    mounted.splice(0).forEach((w) => w.unmount())
  })

  describe('stepping between traits', () => {
    it('names the neighbouring pairs on the previous and next buttons', () => {
      const wrapper = mountSheet({ position: 1 })

      expect(prev(wrapper).attributes('aria-label')).toBe('Previous trait: Oily vs Dry')
      expect(next(wrapper).attributes('aria-label')).toBe('Next trait: Pigmented vs Non-Pigmented')
    })

    it('names the pair it wraps round to at either end', () => {
      expect(prev(mountSheet({ position: 0 })).attributes('aria-label')).toBe('Previous trait: Wrinkle-Prone vs Tight')
      expect(next(mountSheet({ position: 3 })).attributes('aria-label')).toBe('Next trait: Oily vs Dry')
    })

    it('asks the host to step forward or back, and does not move itself', async () => {
      const wrapper = mountSheet({ position: 1 })

      await next(wrapper).trigger('click')
      await prev(wrapper).trigger('click')

      expect(wrapper.emitted('step')).toEqual([[1], [-1]])
    })

    it('draws one dot per trait and widens the current one', () => {
      const wrapper = mountSheet({ position: 2 })
      const dots = wrapper.findAll('[data-testid="trait-dot"]')

      expect(dots).toHaveLength(4)
      expect(dots.map((d) => d.classes('w-[18px]'))).toEqual([false, false, true, false])
      expect(wrapper.get('[data-testid="trait-step-count"]').text()).toBe('Trait 3 of 4')
    })

    it('shows no previous / next row when it is given a single pair', () => {
      const wrapper = mountSheet({ steps: [] })

      expect(wrapper.find('button[aria-label^="Next trait"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-testid="trait-dot"]')).toHaveLength(0)
    })

    it('slides the pair the way the user is stepping', async () => {
      // VTU stubs <Transition>, so this reads which transition is named. The
      // slide itself can only be seen in a browser.
      const wrapper = mountSheet()
      const pairTransition = () => wrapper.get('transition-stub[mode="out-in"]').attributes('name')

      expect(pairTransition()).toBe('pair-next')

      await prev(wrapper).trigger('click')
      expect(pairTransition()).toBe('pair-prev')

      await next(wrapper).trigger('click')
      expect(pairTransition()).toBe('pair-next')
    })
  })

  describe('dialog keyboard and focus', () => {
    it('is a modal dialog labelled by its heading', () => {
      const wrapper = mountSheet()
      const dialog = wrapper.get('[role="dialog"]')

      expect(dialog.attributes('aria-modal')).toBe('true')
      expect(wrapper.get(`#${dialog.attributes('aria-labelledby')}`).text()).toBe('Oily vs Dry')
    })

    it('puts focus on the close button when it mounts open', async () => {
      const wrapper = mountSheet()
      await flushPromises()

      expect(document.activeElement).toBe(wrapper.get('button[aria-label="Close"]').element)
    })

    it('puts focus on the close button when it opens later', async () => {
      const wrapper = mountSheet({ isOpen: false })
      await wrapper.setProps({ isOpen: true })
      await flushPromises()

      expect(document.activeElement).toBe(wrapper.get('button[aria-label="Close"]').element)
    })

    it('asks to close on Escape', () => {
      const wrapper = mountSheet()

      key('Escape')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('closes the full-screen photo first when Escape is pressed over it', async () => {
      const wrapper = mountSheet()
      await wrapper.get('.cursor-zoom-in').trigger('click')
      expect(zoom(wrapper).props('isOpen')).toBe(true)

      key('Escape')
      await flushPromises()

      expect(zoom(wrapper).props('isOpen')).toBe(false)
      expect(wrapper.emitted('close')).toBeUndefined()
    })

    it('stops listening for Escape once closed', async () => {
      const wrapper = mountSheet()
      await wrapper.setProps({ isOpen: false })

      key('Escape')

      expect(wrapper.emitted('close')).toBeUndefined()
    })

    it('removes its key listener when it is removed while open', () => {
      // Read off removeEventListener rather than a later Escape: Vue drops an
      // emit from an unmounted component, so a leaked listener would make no
      // visible emit and a case built on one could not fail.
      const wrapper = mountSheet()
      const removed = vi.spyOn(document, 'removeEventListener')

      wrapper.unmount()
      mounted.splice(mounted.indexOf(wrapper), 1)

      expect(removed).toHaveBeenCalledWith('keydown', expect.any(Function))
      removed.mockRestore()
    })

    it('does not listen for Escape while it is closed from the start', () => {
      const wrapper = mountSheet({ isOpen: false })

      key('Escape')

      expect(wrapper.emitted('close')).toBeUndefined()
    })

    it('wraps Tab from the last control back to the first', async () => {
      const wrapper = mountSheet()
      const nextButton = next(wrapper).element as HTMLElement
      nextButton.focus()

      key('Tab')

      expect(document.activeElement).toBe(wrapper.get('button[aria-label="Close"]').element)
    })

    it('wraps Shift+Tab from the first control to the last', async () => {
      const wrapper = mountSheet()
      ;(wrapper.get('button[aria-label="Close"]').element as HTMLElement).focus()

      key('Tab', { shiftKey: true })

      expect(document.activeElement).toBe(next(wrapper).element)
    })

    it('leaves Tab alone between the first and last controls', async () => {
      const wrapper = mountSheet()
      const middle = prev(wrapper).element as HTMLElement
      middle.focus()

      key('Tab')
      expect(document.activeElement).toBe(middle)

      key('Tab', { shiftKey: true })
      expect(document.activeElement).toBe(middle)
    })

    it('closes the full-screen photo along with the sheet', async () => {
      const wrapper = mountSheet()
      await wrapper.get('.cursor-zoom-in').trigger('click')

      await wrapper.setProps({ isOpen: false })

      expect(zoom(wrapper).props('isOpen')).toBe(false)
    })
  })
})
