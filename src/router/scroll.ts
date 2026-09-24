import type { RouteLocationNormalized, RouterScrollBehavior } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    // The route keeps its filters in the address, so a change to the query
    // alone is the user narrowing the page they are on, not arriving somewhere.
    keepScrollOnQueryChange?: boolean
  }
}

const onlyQueryChanged = (to: RouteLocationNormalized, from: RouteLocationNormalized) =>
  to.path === from.path && to.hash === from.hash

/**
 * Where the window goes after a navigation.
 *
 * Back and forward return to where the user was. A new page starts at the top.
 * The exception is a route that keeps its filters in the address: Explore's
 * category chips push ?category=..., and scrolling to the top on each one threw
 * the user off the grid they were filtering - owner report. There, a change to
 * the query alone leaves the window where it is.
 */
export const scrollBehavior: RouterScrollBehavior = (to, from, savedPosition) => {
  if (savedPosition) return savedPosition
  if (to.meta.keepScrollOnQueryChange && onlyQueryChanged(to, from)) return false
  return { top: 0, behavior: 'smooth' }
}
