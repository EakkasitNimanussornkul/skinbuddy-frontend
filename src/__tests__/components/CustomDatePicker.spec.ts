import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import CustomDatePicker from '../../components/Shared/CustomDatePicker.vue'

const mountPicker = async (props: { modelValue: string | null; minDate?: string }) => {
  const wrapper = mount(CustomDatePicker, { props })
  // Open it the way a user does. The panel is v-show rather than v-if, so its
  // day buttons are in the document either way - opening first keeps these
  // cards describing a picker the user can actually see.
  await wrapper.get('input').trigger('click')
  return wrapper
}

const monthLabel = (wrapper: VueWrapper) => wrapper.get('span.tracking-widest').text()

/**
 * The two month-navigation arrows, scoped to the panel header.
 *
 * Not `findAll('button')[0]` and `[1]`: the first button in the component is
 * the calendar toggle beside the input, so those indices read the toggle and
 * the previous-month arrow.
 */
const navigate = async (wrapper: VueWrapper, direction: 'prev' | 'next') => {
  const arrows = wrapper.findAll('.justify-between button')
  await arrows[direction === 'prev' ? 0 : 1]!.trigger('click')
}

/**
 * A day button by its number.
 *
 * Safe for any number up to 22: the grid is padded at the front with the tail
 * of the previous month and not at all at the back, so every borrowed day is a
 * high number and every low one belongs to the month on screen.
 */
const day = (wrapper: VueWrapper, n: number) =>
  wrapper.findAll('.grid-cols-7 button').find((b) => b.text() === String(n))!

describe('src/components/Shared/CustomDatePicker.vue', () => {
  describe('calendarGrid (render)', () => {
    it('opens on the month of the stored date, read as a calendar day', async () => {
      // FE-DEF-22's shape. `new Date("2026-09-06")` is UTC midnight, which is
      // the 5th in any zone behind UTC, so the picker used to open on and
      // highlight a day either side of the one stored depending on where it was
      // being read.
      const wrapper = await mountPicker({ modelValue: '2026-09-06' })

      expect(monthLabel(wrapper)).toBe('September 2026')
      expect(wrapper.get('input').element.value).toBe('2026-09-06')
    })

    it('marks the stored day as the selected one', async () => {
      const wrapper = await mountPicker({ modelValue: '2026-09-06' })

      expect(day(wrapper, 6).classes()).toContain('!bg-brand-primary')
      expect(day(wrapper, 7).classes()).not.toContain('!bg-brand-primary')
    })

    it('moves a month at a time without losing the selection', async () => {
      const wrapper = await mountPicker({ modelValue: '2026-09-06' })

      await navigate(wrapper, 'next')
      expect(monthLabel(wrapper)).toBe('October 2026')

      await navigate(wrapper, 'prev')
      await navigate(wrapper, 'prev')
      expect(monthLabel(wrapper)).toBe('August 2026')

      // Nothing was picked, so nothing is emitted - navigating is not choosing.
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('shows a placeholder and no selection when nothing is stored yet', async () => {
      const wrapper = await mountPicker({ modelValue: null })

      expect(wrapper.get('input').element.value).toBe('')
      expect(wrapper.get('input').attributes('placeholder')).toBe('Select a date')
    })
  })

  describe('handleDateSelect()', () => {
    it('emits the picked day as a local calendar date and closes the panel', async () => {
      const wrapper = await mountPicker({ modelValue: '2026-09-06' })

      await day(wrapper, 20).trigger('click')

      // The string, not an ISO timestamp: this value is written straight to
      // expiration_date, and toISOString() would record the previous day for
      // the whole local morning east of UTC (FE-DEF-21).
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['2026-09-20'])
      expect(wrapper.get('div.mt-2').isVisible()).toBe(false)
    })
  })

  describe('isPastDate()', () => {
    it('disables every day before the floor and leaves the rest selectable', async () => {
      const wrapper = await mountPicker({ modelValue: '2026-09-20', minDate: '2026-09-15' })

      expect(day(wrapper, 14).attributes('disabled')).toBeDefined()
      expect(day(wrapper, 1).attributes('disabled')).toBeDefined()
      expect(day(wrapper, 16).attributes('disabled')).toBeUndefined()
      expect(day(wrapper, 20).attributes('disabled')).toBeUndefined()
    })

    it('still offers the floor day itself', async () => {
      // The comparison is strictly before the minimum, so the earliest allowed
      // day is allowed. This is the same boundary paoPeriodHasElapsed draws for
      // the period buttons that sit beside this control, and the two have to
      // agree or one panel contradicts the other (FE-DEF-19).
      const wrapper = await mountPicker({ modelValue: '2026-09-20', minDate: '2026-09-15' })

      expect(day(wrapper, 15).attributes('disabled')).toBeUndefined()
    })

    it('offers every day when no floor was given', async () => {
      const wrapper = await mountPicker({ modelValue: '2026-09-20' })

      expect(day(wrapper, 1).attributes('disabled')).toBeUndefined()
      expect(day(wrapper, 14).attributes('disabled')).toBeUndefined()
    })

    // Not covered, and stated rather than faked: handleDateSelect repeats the
    // isPastDate check internally, and that repeat is unreachable from a test at
    // this level. jsdom does not dispatch clicks on disabled controls, so a case
    // clicking a disabled day passes with the internal guard deleted - it would
    // be testing the disabled attribute while appearing to test the guard. Same
    // limitation, same reason, as setEditPAO in ProductLifecycleController.
  })

  describe('manualInput (FE-DEF-18)', () => {
    it('refuses typed input rather than displaying a date it will not save', async () => {
      const wrapper = await mountPicker({ modelValue: '2026-09-06' })

      expect(wrapper.get('input').attributes('readonly')).toBeDefined()
    })

    it('emits nothing even if a value reaches the field', async () => {
      // The field accepted keystrokes and showed them, but the only emit in the
      // component is handleDateSelect, reached from the grid - so a user could
      // type a date, see it, save, and have the previously selected value
      // written instead. `readonly` is the fix rather than parsing the text,
      // because a typed date would also bypass the floor the grid enforces.
      const wrapper = await mountPicker({ modelValue: '2026-09-06' })

      await wrapper.get('input').setValue('2026-12-25')

      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
  })
})
