/**
 * Helpers for a card grid rendered as <TransitionGroup name="card-flow">, whose
 * classes live in assets/style.css: cards fade up a few at a time as they
 * enter, glide to their new place when the list reorders or narrows, and fade
 * out where they stood when they leave. Used by the shelf and Explore grids.
 */

/** The stagger for the card at `index`, capped so a long list is not slow. */
export const cardFlowDelay = (index: number) => ({ '--enter-delay': `${Math.min(index, 10) * 35}ms` })

type Box = { left: number; top: number; width: number; height: number }

// Where every card stood before the first one of this patch was pinned. Vue calls
// @before-leave for each leaving card in turn, and pinning one takes it out of
// the flow, so the grid reflows: a card read after that would be read from its
// new place and pinned on top of the one before it. All the boxes are read at
// the first call, with no write in between (one layout, not one per card), and
// dropped once the patch is over.
let boxes = new WeakMap<Element, Box>()

const read = (node: HTMLElement): Box => ({
  left: node.offsetLeft,
  top: node.offsetTop,
  width: node.offsetWidth,
  height: node.offsetHeight,
})

/**
 * @before-leave: take a leaving card out of the flow where it stands, so it can
 * fade in place while the cards after it glide into the gap. Without this the
 * grid reflows at once and the fade plays in a cell that no longer exists.
 * The grid must be position: relative.
 */
export const pinLeavingCard = (el: Element) => {
  const node = el as HTMLElement
  if (!boxes.has(node)) {
    for (const card of Array.from(node.parentElement?.children ?? [node])) boxes.set(card, read(card as HTMLElement))
    queueMicrotask(() => { boxes = new WeakMap() })
  }
  const { left, top, width, height } = boxes.get(node)!
  node.style.position = 'absolute'
  node.style.left = `${left}px`
  node.style.top = `${top}px`
  node.style.width = `${width}px`
  node.style.height = `${height}px`
}
