/**
 * Helpers for a card grid rendered as <TransitionGroup name="card-flow">, whose
 * classes live in assets/style.css: cards fade up a few at a time as they
 * enter, glide to their new place when the list reorders or narrows, and fade
 * out where they stood when they leave. Used by the shelf and Explore grids.
 */

/** The stagger for the card at `index`, capped so a long list is not slow. */
export const cardFlowDelay = (index: number) => ({ '--enter-delay': `${Math.min(index, 10) * 35}ms` })

/**
 * @before-leave: take a leaving card out of the flow where it stands, so it can
 * fade in place while the cards after it glide into the gap. Without this the
 * grid reflows at once and the fade plays in a cell that no longer exists.
 * The grid must be position: relative.
 */
export const pinLeavingCard = (el: Element) => {
  const node = el as HTMLElement
  const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = node
  node.style.position = 'absolute'
  node.style.left = `${offsetLeft}px`
  node.style.top = `${offsetTop}px`
  node.style.width = `${offsetWidth}px`
  node.style.height = `${offsetHeight}px`
}
