import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'

vi.mock('../../api/ingredientsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/ingredientsApi')>()),
  searchIngredients: vi.fn(),
}))

import { searchIngredients } from '../../api/ingredientsApi'
import IngredientCombobox from '../../components/Submissions/IngredientCombobox.vue'

const NIACINAMIDE = { id: 'i-nia', name: 'Niacinamide', functional_group: 'Vitamin B3', matched_alias: null }
const WATER = { id: 'i-water', name: 'Water', functional_group: null, matched_alias: 'aqua' }

const mountBox = (props: Record<string, unknown> = {}) =>
  mount(IngredientCombobox, { props: { label: 'Find an ingredient', ...props }, attachTo: document.body })

const input = (w: VueWrapper) => w.get('input[role="combobox"]')
const options = (w: VueWrapper) => w.findAll('[role="option"]')

/** Type, wait out the 250 ms pause, and let the search answer. */
const typeAndSettle = async (w: VueWrapper, text: string) => {
  await input(w).setValue(text)
  await vi.advanceTimersByTimeAsync(250)
  await flushPromises()
}

describe('src/components/Submissions/IngredientCombobox.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(searchIngredients).mockReset()
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  describe('searching (debounced)', () => {
    it('waits for a 250 ms pause in typing, then searches once with the latest text', async () => {
      vi.mocked(searchIngredients).mockResolvedValue([NIACINAMIDE])
      const w = mountBox()

      await input(w).setValue('n')
      await vi.advanceTimersByTimeAsync(100)
      await input(w).setValue('nia')
      await vi.advanceTimersByTimeAsync(249)
      expect(searchIngredients).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(1)
      expect(searchIngredients).toHaveBeenCalledTimes(1)
      expect(searchIngredients).toHaveBeenCalledWith('nia')
    })

    it('shows only the latest search, even when an older one answers last', async () => {
      let slow: (hits: unknown) => void = () => {}
      vi.mocked(searchIngredients)
        .mockImplementationOnce(() => new Promise((resolve) => (slow = resolve as (hits: unknown) => void)))
        .mockResolvedValueOnce([WATER])
      const w = mountBox()

      await typeAndSettle(w, 'ni')
      await typeAndSettle(w, 'aqua')
      slow([NIACINAMIDE])
      await flushPromises()

      expect(options(w).map((o) => o.text())).toEqual([expect.stringContaining('Water'), expect.stringContaining('Add "aqua"')])
    })
  })

  describe('options (render)', () => {
    it('lists each hit with its group and "in our list", and ends with the add-as-new option', async () => {
      vi.mocked(searchIngredients).mockResolvedValue([NIACINAMIDE, WATER])
      const w = mountBox()

      await typeAndSettle(w, 'nia')

      const rows = options(w).map((o) => o.text())
      expect(rows).toHaveLength(3)
      expect(rows[0]).toContain('Niacinamide')
      expect(rows[0]).toContain('Vitamin B3 · in our list')
      expect(rows[1]).toContain('Matches "aqua" · in our list')
      expect(rows[2]).toContain('Add "nia" as a new ingredient')
      expect(input(w).attributes('aria-expanded')).toBe('true')
    })

    it('still offers to add it as new when the search fails, and says search is not working', async () => {
      vi.mocked(searchIngredients).mockRejectedValue(new Error('Network Error'))
      const w = mountBox()

      await typeAndSettle(w, 'phyto')

      expect(options(w).map((o) => o.text())).toEqual([expect.stringContaining('Add "phyto" as a new ingredient')])
      expect(w.find('.search-failed').exists()).toBe(true)
    })

    it('marks an ingredient already in the list and will not pick it twice', async () => {
      vi.mocked(searchIngredients).mockResolvedValue([NIACINAMIDE])
      const w = mountBox({ listedIds: ['i-nia'] })

      await typeAndSettle(w, 'nia')
      await options(w)[0]!.trigger('mousedown')

      expect(options(w)[0]!.text()).toContain('Already in your list')
      expect(options(w)[0]!.attributes('aria-disabled')).toBe('true')
      expect(w.emitted('pickKnown')).toBeUndefined()
    })

    it('offers nothing and stays collapsed for a blank query', async () => {
      const w = mountBox()

      await typeAndSettle(w, '   ')

      expect(options(w)).toHaveLength(0)
      expect(input(w).attributes('aria-expanded')).toBe('false')
      expect(searchIngredients).not.toHaveBeenCalled()
    })
  })

  describe('picking (keyboard and pointer)', () => {
    it('picks the highlighted hit with Enter, then clears the box for the next one', async () => {
      vi.mocked(searchIngredients).mockResolvedValue([NIACINAMIDE])
      const w = mountBox()

      await typeAndSettle(w, 'nia')
      await input(w).trigger('keydown', { key: 'Enter' })

      expect(w.emitted('pickKnown')).toEqual([[NIACINAMIDE]])
      expect((input(w).element as HTMLInputElement).value).toBe('')
    })

    it('moves the highlight with the arrow keys, naming it in aria-activedescendant, and wraps around', async () => {
      vi.mocked(searchIngredients).mockResolvedValue([NIACINAMIDE])
      const w = mountBox()

      await typeAndSettle(w, 'nia')
      await input(w).trigger('keydown', { key: 'ArrowDown' })

      expect(input(w).attributes('aria-activedescendant')).toBe(options(w)[1]!.attributes('id'))
      expect(options(w)[1]!.attributes('aria-selected')).toBe('true')

      await input(w).trigger('keydown', { key: 'ArrowDown' })
      expect(options(w)[0]!.attributes('aria-selected')).toBe('true')

      await input(w).trigger('keydown', { key: 'ArrowUp' })
      await input(w).trigger('keydown', { key: 'Enter' })
      expect(w.emitted('pickNew')).toEqual([['nia']])
    })

    it('does not pick on Enter before the search has answered, so a known name is not added as new', async () => {
      vi.mocked(searchIngredients).mockResolvedValue([NIACINAMIDE])
      const w = mountBox()

      await input(w).setValue('niacinamide')
      await input(w).trigger('keydown', { key: 'Enter' })

      expect(w.emitted('pickNew')).toBeUndefined()
      expect(w.emitted('pickKnown')).toBeUndefined()
    })

    it('closes the list with Escape without picking anything', async () => {
      vi.mocked(searchIngredients).mockResolvedValue([NIACINAMIDE])
      const w = mountBox()

      await typeAndSettle(w, 'nia')
      await input(w).trigger('keydown', { key: 'Escape' })

      expect(input(w).attributes('aria-expanded')).toBe('false')
      expect(w.emitted('pickKnown')).toBeUndefined()
    })

    it('adds what was typed as new when the last option is clicked', async () => {
      vi.mocked(searchIngredients).mockResolvedValue([NIACINAMIDE])
      const w = mountBox()

      await typeAndSettle(w, 'Phytosphingosine')
      await options(w)[1]!.trigger('mousedown')

      expect(w.emitted('pickNew')).toEqual([['Phytosphingosine']])
    })

    it('searches straight away for a name it was opened with, to settle a pasted one', async () => {
      vi.mocked(searchIngredients).mockResolvedValue([NIACINAMIDE])
      const w = mountBox({ initialQuery: 'Vitamin B3' })
      await flushPromises()

      expect(searchIngredients).toHaveBeenCalledWith('Vitamin B3')
      await input(w).trigger('focus')
      expect(options(w)[0]!.text()).toContain('Niacinamide')
    })
  })
})
