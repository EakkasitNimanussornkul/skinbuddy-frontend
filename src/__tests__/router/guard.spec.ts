import { describe, it, expect, vi } from 'vitest'

// No router instance and no components: resolveNavigation is a pure function
// over the target route and the auth state, so it can be exercised directly.
// Imported from router/guard rather than router/index on purpose - index pulls
// in every view, and through ChatbotView the chat store, which does not
// type-check under tsconfig.vitest.json's narrowed `types`.
import { resolveNavigation, type GuardAuth, type GuardTarget } from '../../router/guard'

const target = (overrides: Partial<GuardTarget> = {}): GuardTarget => ({
  name: 'skin-profile',
  meta: {},
  fullPath: '/profile',
  ...overrides,
})

const auth = (overrides: Partial<GuardAuth> = {}): GuardAuth => ({
  isAuthenticated: true,
  user: { skin_type: 'OSPW' },
  triggerLoginPopup: vi.fn(),
  ...overrides,
})

describe('src/router/index.ts', () => {
  describe('resolveNavigation()', () => {
    it('allows an authenticated user who has a skin type through to the profile page', () => {
      const result = resolveNavigation(
        target({ meta: { requiresAuth: true, requiresSkinType: true } }),
        auth(),
      )

      expect(result).toBe(true)
    })

    it('redirects an authenticated user with no skin type to the setup page, carrying where they were going', () => {
      const result = resolveNavigation(
        target({ meta: { requiresAuth: true, requiresSkinType: true } }),
        auth({ user: { skin_type: null } }),
      )

      expect(result).toEqual({
        name: 'SkinTypeLanding',
        query: { redirect: '/profile' },
      })
    })

    it('redirects when the user object exists but carries no skin type field at all', () => {
      const result = resolveNavigation(
        target({ meta: { requiresAuth: true, requiresSkinType: true } }),
        auth({ user: {} }),
      )

      expect(result).toEqual({
        name: 'SkinTypeLanding',
        query: { redirect: '/profile' },
      })
    })

    it('shows the login prompt and stops an unauthenticated visitor rather than sending them to setup', () => {
      // Ordering matters: an unauthenticated visitor has no user object, so a
      // skin-type check placed first would redirect them to a setup page they
      // cannot use instead of asking them to sign in.
      const triggerLoginPopup = vi.fn()
      const result = resolveNavigation(
        target({ meta: { requiresAuth: true, requiresSkinType: true } }),
        auth({ isAuthenticated: false, user: null, triggerLoginPopup }),
      )

      expect(result).toBe(false)
      expect(triggerLoginPopup).toHaveBeenCalled()
    })

    it('leaves routes without the skin type requirement reachable when no skin type is set', () => {
      const result = resolveNavigation(
        target({ name: 'shelf', fullPath: '/shelf', meta: { requiresAuth: true } }),
        auth({ user: { skin_type: null } }),
      )

      expect(result).toBe(true)
    })

    it('lets the auth callback through without any checks, so sign-in can complete', () => {
      const result = resolveNavigation(
        target({ name: 'authCallback', fullPath: '/auth/callback', meta: { requiresAuth: true } }),
        auth({ isAuthenticated: false, user: null }),
      )

      expect(result).toBe(true)
    })

    it('preserves the full path including its query string when redirecting to setup', () => {
      const result = resolveNavigation(
        target({ fullPath: '/profile?tab=axes', meta: { requiresSkinType: true } }),
        auth({ user: { skin_type: null } }),
      )

      expect(result).toEqual({
        name: 'SkinTypeLanding',
        query: { redirect: '/profile?tab=axes' },
      })
    })
  })
})
