import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'

import { useCountUp } from '../../composables/useCountUp'

/** A component that counts up to `target` and prints the rounded value. */
const mountCounter = (initial: number, duration = 900) => {
  const target = ref(initial)
  const Counter = defineComponent({
    setup() {
      const value = useCountUp(() => target.value, duration)
      return () => h('span', Math.round(value.value))
    },
  })
  const wrapper = mount(Counter)
  return { wrapper, target, read: () => Number(wrapper.text()) }
}

const setReducedMotion = (reduced: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: reduced && query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

describe('src/composables/useCountUp.ts', () => {
  beforeEach(() => {
    // The suite runs with reduced motion (see setup.ts); these cases need the
    // animation itself, driven frame by frame by fake timers.
    setReducedMotion(false)
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    setReducedMotion(true)
  })

  describe('useCountUp()', () => {
    it('climbs from 0 to the target on mount rather than appearing at it', async () => {
      // Owner request: the match ring fills from 0 when product details open.
      const { read } = mountCounter(82)
      await nextTick()
      expect(read()).toBe(0)

      vi.advanceTimersByTime(300)
      await nextTick()
      const midway = read()
      expect(midway).toBeGreaterThan(0)
      expect(midway).toBeLessThan(82)

      vi.advanceTimersByTime(1000)
      await nextTick()
      expect(read()).toBe(82)
    })

    it('eases out, covering more of the distance early than late', async () => {
      const { read } = mountCounter(100)
      vi.advanceTimersByTime(450)
      await nextTick()

      // Linear would be about 50 at the halfway point; ease-out is well past it.
      expect(read()).toBeGreaterThan(70)
    })

    it('moves from where it is when the target changes, as a reveal does', async () => {
      const { target, read } = mountCounter(0)
      vi.advanceTimersByTime(1000)
      await nextTick()
      expect(read()).toBe(0)

      target.value = 60
      await nextTick()
      vi.advanceTimersByTime(1000)
      await nextTick()
      expect(read()).toBe(60)
    })

    it('lands on the target at once for a user who has asked for less motion', async () => {
      setReducedMotion(true)
      const { read } = mountCounter(82)
      await nextTick()

      expect(read()).toBe(82)
    })

    it('stops its frames when unmounted', async () => {
      const { wrapper } = mountCounter(82)
      vi.advanceTimersByTime(100)
      wrapper.unmount()

      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
