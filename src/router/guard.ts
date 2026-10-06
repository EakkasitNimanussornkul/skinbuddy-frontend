import type { RouteMeta } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresSkinType?: boolean
    requiresAdmin?: boolean
    /** The page draws its own way out, so App.vue hides the site navigation. */
    fullScreen?: boolean
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
 * What is known about the user's role for this navigation: true for an admin,
 * false for anyone else, null when it could not be read. Only asked for on a
 * requiresAdmin route (see router/index.ts), so null elsewhere.
 */
export interface GuardAccess {
  isAdmin: boolean | null
  /**
   * The signed-in user's consent state (useConsent). Null or missing means no
   * consent screen: a guest, an older backend without `consent`, or a read
   * that failed.
   */
  consent?: GuardConsent | null
}

export interface GuardConsent {
  needs_terms?: boolean
  needs_health_consent?: boolean
}

/**
 * Pages a user who has not yet agreed to the terms can still open: the
 * agreement itself, what it agrees to, and the steps of signing in and of
 * deleting an account. Routes without requiresAuth are never gated either.
 */
export const TERMS_GATE_OPEN = ['welcome', 'privacy', 'terms', 'authCallback', 'account-delete-callback', 'account-deleted']

/** The weekly check-in, the one page that needs the health consent. Reading reports (/analysis) does not. */
export const HEALTH_GATED_ROUTE = 'weekly-checkin'

/**
 * A `next` address read from the query, kept only when it is a path inside
 * this app: it starts with "/" and not "//" (or "/\", which browsers read the
 * same way), so it can never send the user to another site. Anything else -
 * missing, a list, a full URL - is `fallback`.
 */
export const safeNext = (value: unknown, fallback = '/'): string => {
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  return value
}

/** Where a signed-in user who is not an admin is sent from an admin page. */
export const ADMIN_ONLY_REDIRECT = {
  name: 'error',
  query: {
    title: 'For the SkinBuddy team',
    message: 'This page is for the people who review product submissions. You can follow your own submissions in My submissions.',
  },
} as const

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
export const resolveNavigation = (to: GuardTarget, auth: GuardAuth, access: GuardAccess = { isAdmin: null }) => {
  // Always allow callback, error, and wildcard 404 pages without checking
  if (to.name === 'authCallback' || to.name === 'error' || to.name === 'not-found') {
    return true
  }

  // If the route requires auth AND the user is NOT authenticated
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    auth.triggerLoginPopup('Sign in to access your personalized skin routine.')
    return false // Stops navigation gracefully
  }

  // A signed-in user who has not agreed to the current terms (or confirmed
  // their age) agrees first, then carries on to where they were going. Only
  // pages that need a sign-in are held back; public pages stay public.
  const consent = auth.isAuthenticated ? access.consent : null
  if (consent?.needs_terms && to.meta.requiresAuth && !TERMS_GATE_OPEN.includes(String(to.name ?? ''))) {
    return { path: '/welcome', query: { next: safeNext(to.fullPath) } }
  }

  // The weekly check-in asks for the health consent first. What the page
  // offers, not security: POST /analysis/log answers 403
  // health_consent_required without it.
  if (consent?.needs_health_consent && to.name === HEALTH_GATED_ROUTE) {
    return { path: '/consent/health', query: { next: safeNext(to.fullPath, '/checkin') } }
  }

  // An admin page turns away a user known not to be an admin. A role that
  // could not be read (null) lets them through: the page's own requests answer
  // 403 to a non-admin, and the page shows that, so a failed role check does
  // not lock an admin out. This is about what the page offers, not security -
  // the backend enforces every admin route.
  //
  // After the requiresAuth block, so a signed-out visitor gets the login popup
  // rather than being told the page is not for them.
  if (to.meta.requiresAdmin && access.isAdmin === false) {
    return { name: ADMIN_ONLY_REDIRECT.name, query: { ...ADMIN_ONLY_REDIRECT.query } }
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
