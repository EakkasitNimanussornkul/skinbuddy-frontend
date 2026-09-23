import { describe, it, expect } from 'vitest'
import { nextTick, ref } from 'vue'

import { useStepList } from '../../composables/useStepList'

const letters = (n: number) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, n).split('')

describe('src/composables/useStepList.ts', () => {
  describe('useStepList()', () => {
    it('shows the first slice and says how many are left', () => {
      const list = useStepList(ref(letters(12)), { initial: 5, step: 4 })

      expect(list.visible.value).toEqual(['A', 'B', 'C', 'D', 'E'])
      expect(list.total.value).toBe(12)
      expect(list.remaining.value).toBe(7)
      expect(list.nextCount.value).toBe(4)
      expect(list.canShowMore.value).toBe(true)
      expect(list.canShowLess.value).toBe(false)
    })

    it('reveals one step at a time rather than the rest at once', () => {
      const list = useStepList(ref(letters(12)), { initial: 5, step: 4 })

      list.showMore()

      expect(list.visible.value).toHaveLength(9)
      expect(list.remaining.value).toBe(3)
      expect(list.canShowLess.value).toBe(true)
    })

    it('reports the exact size of a last, partial step', () => {
      // So the label can read "Show 3 more" instead of promising four.
      const list = useStepList(ref(letters(12)), { initial: 5, step: 4 })
      list.showMore()

      expect(list.nextCount.value).toBe(3)

      list.showMore()

      expect(list.visible.value).toHaveLength(12)
      expect(list.remaining.value).toBe(0)
      expect(list.nextCount.value).toBe(0)
      expect(list.canShowMore.value).toBe(false)
    })

    it('does not overshoot the list on a final step', () => {
      const list = useStepList(ref(letters(6)), { initial: 5, step: 4 })

      list.showMore()
      list.showMore()

      expect(list.visible.value).toHaveLength(6)
      expect(list.remaining.value).toBe(0)
    })

    it('folds back to the first slice', () => {
      const list = useStepList(ref(letters(12)), { initial: 5, step: 4 })
      list.showMore()
      list.showMore()

      list.showLess()

      expect(list.visible.value).toHaveLength(5)
      expect(list.canShowLess.value).toBe(false)
      expect(list.nextCount.value).toBe(4)
    })

    it('offers neither control for a list no longer than the first slice', () => {
      const list = useStepList(ref(letters(3)), { initial: 5, step: 4 })

      expect(list.visible.value).toEqual(['A', 'B', 'C'])
      expect(list.canShowMore.value).toBe(false)
      expect(list.canShowLess.value).toBe(false)
    })

    it('ignores a showMore on a list with nothing left, rather than shrinking it', () => {
      // Unguarded, the press would cap the shown count at the list's current
      // length - three, below the first slice of five - and a list that then
      // grew in place would stay stuck at three instead of showing five.
      const source = ref(letters(3))
      const list = useStepList(source, { initial: 5, step: 4 })

      list.showMore()
      source.value.push('D', 'E', 'F')

      expect(list.visible.value).toEqual(['A', 'B', 'C', 'D', 'E'])
      expect(list.canShowLess.value).toBe(false)
    })

    it('treats an absent list as empty', () => {
      const list = useStepList(ref<string[] | null>(null), { initial: 5, step: 4 })

      expect(list.visible.value).toEqual([])
      expect(list.canShowMore.value).toBe(false)
    })

    it('starts over when the list is replaced, even by one of the same length', async () => {
      // A details modal re-pointed at another shelf item must not open halfway
      // down the previous item's ingredients.
      const source = ref(letters(12))
      const list = useStepList(source, { initial: 5, step: 4 })
      list.showMore()

      source.value = letters(12).map((l) => l.toLowerCase())
      await nextTick()

      expect(list.visible.value).toEqual(['a', 'b', 'c', 'd', 'e'])
      expect(list.canShowLess.value).toBe(false)
    })

    it('follows a getter source', () => {
      const source = ref(letters(8))
      const list = useStepList(() => source.value, { initial: 2, step: 2 })

      expect(list.visible.value).toEqual(['A', 'B'])
      expect(list.nextCount.value).toBe(2)
    })
  })
})
