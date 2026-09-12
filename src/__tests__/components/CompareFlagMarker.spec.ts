import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import CompareFlagMarker from '../../components/Compare/CompareFlagMarker.vue'

describe('src/components/Compare/CompareFlagMarker.vue', () => {
  const marker = (state: boolean | null) => mount(CompareFlagMarker, { props: { state } })

  describe('state (render)', () => {
    it('draws a tick for a property the formula has', () => {
      const wrapper = marker(true)

      expect(wrapper.classes()).toContain('text-emerald-500')
      expect(wrapper.text()).toBe('')
    })

    it('draws a cross for a property the formula lacks', () => {
      const wrapper = marker(false)

      expect(wrapper.classes()).toContain('text-semantic-error')
    })

    it('draws a question mark, not a cross, for a property nobody recorded', () => {
      // The reason this component exists as a third state. `safety_flags` can
      // legitimately omit a key, and drawing that as the red cross would state a
      // fact about the formulation that no one established - FE-DEF-25's fault
      // in a different field.
      const wrapper = marker(null)

      expect(wrapper.text()).toBe('?')
      expect(wrapper.classes()).not.toContain('text-semantic-error')
      expect(wrapper.classes()).not.toContain('text-emerald-500')
    })
  })
})
