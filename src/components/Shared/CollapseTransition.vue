<script setup lang="ts">
/**
 * Height and fade for a region folded with v-show or v-if.
 *
 * CSS cannot transition to `height: auto`, so each direction is measured: the
 * region opens from 0 to its own scrollHeight and closes from its current height
 * to 0, and the inline styles are cleared afterwards so the open region keeps
 * resizing with its content (a "Show more" inside it, a paragraph re-wrapping).
 *
 * The folded element should carry no vertical padding or margin of its own -
 * put those on a child - because padding survives `height: 0` and would leave
 * a strip showing while it closes.
 *
 * Skipped entirely under prefers-reduced-motion, where the region simply
 * appears and disappears as it did before.
 */
const DURATION_MS = 280
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Finishes on transitionend, with a timer as the backstop: transitionend does
// not fire when nothing actually changed, such as a region with no content.
const finishAfter = (el: HTMLElement, done: () => void) => {
  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    el.removeEventListener('transitionend', onEnd)
    done()
  }
  const onEnd = (event: TransitionEvent) => {
    if (event.target === el && event.propertyName === 'height') finish()
  }
  el.addEventListener('transitionend', onEnd)
  window.setTimeout(finish, DURATION_MS + 60)
}

const clear = (el: Element) => {
  const style = (el as HTMLElement).style
  style.height = ''
  style.opacity = ''
  style.overflow = ''
  style.transition = ''
}

const onEnter = (el: Element, done: () => void) => {
  const node = el as HTMLElement
  if (reducedMotion()) return done()

  node.style.overflow = 'hidden'
  node.style.height = '0px'
  node.style.opacity = '0'
  // Commit the starting frame before the transition is set.
  void node.offsetHeight
  node.style.transition = `height ${DURATION_MS}ms ${EASING}, opacity ${DURATION_MS}ms ease`
  node.style.height = `${node.scrollHeight}px`
  node.style.opacity = '1'
  finishAfter(node, done)
}

const onLeave = (el: Element, done: () => void) => {
  const node = el as HTMLElement
  if (reducedMotion()) return done()

  node.style.overflow = 'hidden'
  node.style.height = `${node.scrollHeight}px`
  node.style.opacity = '1'
  void node.offsetHeight
  node.style.transition = `height ${DURATION_MS}ms ${EASING}, opacity ${Math.round(DURATION_MS * 0.7)}ms ease`
  node.style.height = '0px'
  node.style.opacity = '0'
  finishAfter(node, done)
}
</script>

<template>
  <Transition :css="false" @enter="onEnter" @after-enter="clear" @enter-cancelled="clear" @leave="onLeave" @after-leave="clear" @leave-cancelled="clear">
    <slot />
  </Transition>
</template>
