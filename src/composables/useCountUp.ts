import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * A number that climbs to its target instead of appearing at it.
 *
 * Owner request: the match score ring should fill from 0 to the score when a
 * product's details open, and again when a withheld score is revealed. Starts
 * at 0 on mount; whenever the target changes it moves from where it is to the
 * new one, eased out so it settles rather than stops.
 *
 * Jumps straight to the target under prefers-reduced-motion, and where the
 * browser has no animation frames - so the final value is always reached.
 */
export const DEFAULT_COUNT_UP_MS = 900

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

export const useCountUp = (target: () => number, duration: number = DEFAULT_COUNT_UP_MS) => {
  const value = ref(0)
  let frame: number | null = null

  const stop = () => {
    if (frame !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
    frame = null
  }

  const run = (to: number) => {
    stop()
    if (reducedMotion() || typeof requestAnimationFrame !== 'function' || duration <= 0) {
      value.value = to
      return
    }
    const from = value.value
    let start: number | null = null
    const step = (now: number) => {
      if (start === null) start = now
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      value.value = from + (to - from) * eased
      frame = t < 1 ? requestAnimationFrame(step) : null
    }
    frame = requestAnimationFrame(step)
  }

  onMounted(() => run(target()))
  watch(target, (to) => run(to))
  onBeforeUnmount(stop)

  return value
}
