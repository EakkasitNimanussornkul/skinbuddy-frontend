// jsdom implements no layout, and with no layout it ships no ResizeObserver.
// useClampedText constructs one in onMounted, so every component that renders a
// clamped paragraph - the safety panels, the compare matrices - throws on mount
// without this, before any assertion runs.
//
// A no-op is the honest stub rather than a limitation being papered over: the
// observer exists to re-measure a paragraph when its width changes, and jsdom
// reports every width as 0 and never changes one. A callback that fired would
// only be feeding exceedsClamp two zeroes. Overflow behaviour is verified in a
// real browser; see the note on the useClampedText group in the Test Record.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverStub,
})
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver

// Reports prefers-reduced-motion, and nothing else. The suite runs as a user who
// has asked for less motion, so every animated value (useCountUp, the collapse
// transition) lands on its final state at once and assertions read it without
// waiting. The animation itself is tested where it lives, with this overridden.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query.includes('prefers-reduced-motion: reduce'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
