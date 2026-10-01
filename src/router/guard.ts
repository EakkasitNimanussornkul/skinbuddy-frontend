import type { RouteMeta } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresSkinType?: boolean
  }
}

export interface GuardTarget {
  name?: string | symbol | null
  meta: RouteMeta
  fullPath: string
}

export interface GuardAuth {
  isAuthenticated: boolean
  user: { skin_type?: string | null } | null
  triggerLoginPopup: (reason?: string) => void
}

/**
 * Decide whether a navigation may proceed.
 *
 * Deliberately in its own module, importing nothing but a type. Kept next to
 * the route table it would drag every view - and through ChatbotView, the chat
 * store - into whichever tsconfig project imports it. tsconfig.vitest.json
 * narrows `types` to node and jsdom, which drops the persistedstate plugin's
 * augmentation of pinia, so a test importing the route table fails to compile
 * on an unrelated file. Isolating the guard keeps the unit genuinely a unit.
 */
export const resolveNavigation = (to: GuardTarget, auth: GuardAuth) => {
  // Always allow callback, error, and wildcard 404 pages without checking
  if (to.name === 'authCallback' || to.name === 'error' || to.name === 'not-found') {
    return true
  }

  // If the route requires auth AND the user is NOT authenticated
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    auth.triggerLoginPopup('Sign in to access your personalized skin routine.')
    return false // Stops navigation gracefully
  }

  // A page that cannot work without a skin type sends a user who has none to
  // set one. No route sets this today: /profile did, and now shows its own
  // empty state for a user with no type, offering the quiz and the selector.
  //
  // Deliberately after the requiresAuth block: an unauthenticated visitor has
  // no user object at all, and must get the login popup rather than being sent
  // to a setup page they cannot use.
  if (to.meta.requiresSkinType && !auth.user?.skin_type) {
    return { name: 'SkinTypeLanding', query: { redirect: to.fullPath } }
  }

  return true // Allow navigation
}
