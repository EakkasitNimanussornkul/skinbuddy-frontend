import { nextTick, onBeforeUnmount, onMounted, ref, type ComponentPublicInstance } from 'vue'

/**
 * Sub-pixel line heights mean a paragraph that fits its clamp exactly can still
 * report a scroll height a fraction larger than its client height, and both are
 * rounded to integers before we see them. One pixel of slack is enough to
 * absorb that without hiding a real extra line, which is never less than a
 * whole line tall.
 */
export const OVERFLOW_TOLERANCE_PX = 1

/**
 * Whether a line-clamped element holds more text than it is showing.
 *
 * Pure and exported separately from the composable below so the rule can be
 * tested - this project has no component-mount layer, so the measurement
 * lifecycle around it is verified in the browser instead.
 */
export const exceedsClamp = (scrollHeight: number, clientHeight: number): boolean =>
  scrollHeight - clientHeight > OVERFLOW_TOLERANCE_PX

/**
 * Per-item state for a list of line-clamped paragraphs each offering a
 * "Read more" control.
 *
 * The point of it is that the control is rendered from a **measurement** rather
 * than from a guess. Two components had got this wrong in opposite directions:
 * one rendered the toggle for every item, including one-line messages where it
 * revealed nothing; the other rendered it only when the message was longer than
 * 90 characters, which has no relationship to how many lines the text occupies
 * and so hid the toggle on messages that really were cut off - text the reader
 * could not reach at all.
 *
 * Whether a paragraph overflows depends on the font, the viewport width and
 * where the words happen to break. Only the element knows.
 */
export const useClampedText = () => {
  const elements = new Map<number, HTMLElement>()
  const overflowing = ref<Record<number, boolean>>({})
  const expanded = ref<Record<number, boolean>>({})

  let observer: ResizeObserver | null = null

  const measureOne = (key: number, el: HTMLElement) => {
    // An expanded paragraph is not clamped, so it reports no overflow. Keep the
    // answer taken while it was clamped rather than re-measuring it and
    // concluding its own "Read less" control is unnecessary.
    if (expanded.value[key]) return
    overflowing.value[key] = exceedsClamp(el.scrollHeight, el.clientHeight)
  }

  const measureAll = () => {
    elements.forEach((el, key) => measureOne(key, el))
  }

  /**
   * Template ref callback: `:ref="(el) => setElement(idx, el)"`.
   */
  const setElement = (key: number, el: Element | ComponentPublicInstance | null) => {
    const previous = elements.get(key)
    if (previous && observer) observer.unobserve(previous)

    if (!(el instanceof HTMLElement)) {
      elements.delete(key)
      delete overflowing.value[key]
      delete expanded.value[key]
      return
    }

    elements.set(key, el)
    observer?.observe(el)
    measureOne(key, el)
  }

  const toggle = (key: number) => {
    expanded.value[key] = !expanded.value[key]
  }

  /** Re-measure after the list itself changes. */
  const remeasure = async () => {
    await nextTick()
    measureAll()
  }

  onMounted(async () => {
    // Width is the variable that matters: the same message occupies two lines
    // on a wide card and four on a narrow one, so the answer has to be taken
    // again whenever the paragraph is resized rather than only on mount.
    observer = new ResizeObserver(measureAll)
    elements.forEach((el) => observer?.observe(el))

    // A webfont arriving after mount changes the line height without changing
    // the clamped box, so the observer does not fire for it.
    const fonts = document.fonts as FontFaceSet | undefined
    if (fonts) fonts.ready.then(measureAll).catch(() => {})

    await remeasure()
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  return { overflowing, expanded, setElement, toggle, remeasure }
}
