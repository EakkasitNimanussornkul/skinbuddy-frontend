import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

export interface StepListOptions {
  /** How many items show before the user asks for more. */
  initial: number
  /** How many more each "Show more" reveals. */
  step: number
}

/**
 * Reveal a long list a few items at a time.
 *
 * Replaces the "first N, then everything" toggle several lists used. On a
 * product with 30+ ingredients, "Show all" turned one click into a page several
 * screens long, which is the opposite of what the user asked for by clicking.
 * Here each press adds `step` more, and the label can say exactly how many
 * ("Show 3 more" on the last, partial step) because `nextCount` is computed
 * rather than assumed.
 *
 * The shown count resets when the source list is replaced - a modal re-pointed
 * at a different shelf item should not open halfway down the previous item's
 * ingredients. It is keyed on the array identity, not its length, so a list of
 * the same length for a different product still resets.
 */
export const useStepList = <T>(source: MaybeRefOrGetter<readonly T[] | null | undefined>, options: StepListOptions) => {
  const items = computed<readonly T[]>(() => toValue(source) ?? [])
  const shown = ref(options.initial)

  watch(
    () => toValue(source),
    () => {
      shown.value = options.initial
    },
  )

  const total = computed(() => items.value.length)
  const visible = computed(() => items.value.slice(0, shown.value))
  const remaining = computed(() => Math.max(total.value - shown.value, 0))
  const nextCount = computed(() => Math.min(options.step, remaining.value))
  const canShowMore = computed(() => remaining.value > 0)
  // Only once something beyond the first slice is on screen. `shown` can pass
  // `initial` only through showMore, which refuses to run on a list with
  // nothing left, so a list shorter than `initial` never offers this.
  const canShowLess = computed(() => shown.value > options.initial)

  const showMore = () => {
    if (!canShowMore.value) return
    shown.value = Math.min(shown.value + options.step, total.value)
  }

  const showLess = () => {
    shown.value = options.initial
  }

  return { visible, total, remaining, nextCount, canShowMore, canShowLess, showMore, showLess }
}
