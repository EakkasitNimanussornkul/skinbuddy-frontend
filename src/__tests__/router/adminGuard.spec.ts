import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { Router } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

// The guard is a pure function over the target and what is known about the
// user, so the requiresAdmin rule is exercised directly - no router, no views.
import { ADMIN_ONLY_REDIRECT, resolveNavigation, type GuardAuth, type GuardTarget } from '../../router/guard'
import { apiClient } from '../../api/index'
import { resetAdminState } from '../../composables/useAdmin'
import { resetConsentState } from '../../composables/useConsent'
import { useAuthStore } from '../../stores/auth'

// The real router, for the wiring cases. Imported by a path held in a variable
// so vue-tsc does not follow it into every view (see profileRoute.spec.ts).
const ROUTER_MODULE = '../../router/index'
const loadRouter = async (): Promise<Router> =>
  ((await import(/* @vite-ignore */ ROUTER_MODULE)) as { default: Router }).default
beforeAll(async () => {
  await loadRouter()
}, 60_000)

const adminPage = (overrides: Partial<GuardTarget> = {}): GuardTarget => ({
  name: 'admin-submissions',
  meta: { requiresAuth: true, requiresAdmin: true },
  fullPath: '/admin/submissions',
  ...overrides,
})

const auth = (overrides: Partial<GuardAuth> = {}): GuardAuth => ({
  isAuthenticated: true,
  user: { skin_type: 'OSPW' },
  triggerLoginPopup: vi.fn(),
  ...overrides,
})

describe('src/router/guard.ts', () => {
  describe('resolveNavigation() with requiresAdmin', () => {
    it('lets an admin through to an admin page', () => {
      expect(resolveNavigation(adminPage(), auth(), { isAdmin: true })).toBe(true)
    })

    it('sends a signed-in user who is not an admin to the explanation page instead', () => {
      expect(resolveNavigation(adminPage(), auth(), { isAdmin: false })).toEqual({
        name: 'error',
        query: { ...ADMIN_ONLY_REDIRECT.query },
      })
    })

    it('lets the page answer when the role could not be read, so a failed check does not lock an admin out', () => {
      expect(resolveNavigation(adminPage(), auth(), { isAdmin: null })).toBe(true)
    })

    it('treats a missing role answer as unknown rather than as "not an admin"', () => {
      expect(resolveNavigation(adminPage(), auth())).toBe(true)
    })

    it('shows the login prompt to a signed-out visitor before any admin rule', () => {
      const signedOut = auth({ isAuthenticated: false, user: null })

      expect(resolveNavigation(adminPage(), signedOut, { isAdmin: false })).toBe(false)
      expect(signedOut.triggerLoginPopup).toHaveBeenCalledTimes(1)
    })

    it('leaves a page without requiresAdmin alone for a user who is not an admin', () => {
      const mySubmissions = adminPage({ name: 'my-submissions', meta: { requiresAuth: true }, fullPath: '/submissions' })

      expect(resolveNavigation(mySubmissions, auth(), { isAdmin: false })).toBe(true)
    })

    it('words the explanation as who the page is for, pointing to My submissions', () => {
      expect(ADMIN_ONLY_REDIRECT.query.title).toBe('For the SkinBuddy team')
      expect(ADMIN_ONLY_REDIRECT.query.message).toContain('My submissions')
    })
  })

  describe('router.beforeEach (the role check)', () => {
    let router: Router

    beforeEach(async () => {
      vi.clearAllMocks()
      localStorage.clear()
      setActivePinia(createPinia())
      resetAdminState()
      resetConsentState()
      router = await loadRouter()
      await router.push('/')
    })

    const signInAs = (role: string) => {
      useAuthStore().setAuth(`token-${role}`, { id: 'u-1', skin_type: 'OSPW' })
      vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'u-1', role } })
    }

    it('takes an admin to the review page', async () => {
      signInAs('admin')

      await router.push('/admin/submissions')

      expect(router.currentRoute.value.name).toBe('admin-submissions')
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me')
    })

    it('sends a normal user to the explanation page instead of the review page', async () => {
      signInAs('user')

      await router.push('/admin/submissions')

      expect(router.currentRoute.value.name).toBe('error')
      expect(router.currentRoute.value.query.title).toBe(ADMIN_ONLY_REDIRECT.query.title)
    })

    it('asks for the role only on an admin route', async () => {
      signInAs('user')

      await router.push('/submissions')

      // Since feat/25 a signed-in page reads GET /auth/me once for the consent
      // state (useConsent). That is the only request: no separate role read.
      expect(router.currentRoute.value.name).toBe('my-submissions')
      expect(apiClient.get).toHaveBeenCalledTimes(1)
    })
  })
})
