import { describe, it, expect, vi } from 'vitest'

// The consent rules of the guard, exercised directly: resolveNavigation is a
// pure function over the target, the auth state and what is known about the
// user, so no router and no views are needed for these.
import {
  resolveNavigation,
  safeNext,
  TERMS_GATE_OPEN,
  type GuardAuth,
  type GuardConsent,
  type GuardTarget,
} from '../../router/guard'

const target = (name: string, fullPath: string, meta: GuardTarget['meta'] = { requiresAuth: true }): GuardTarget => ({ name, fullPath, meta })

const auth = (overrides: Partial<GuardAuth> = {}): GuardAuth => ({
  isAuthenticated: true,
  user: { skin_type: 'OSPW' },
  triggerLoginPopup: vi.fn(),
  ...overrides,
})

const withConsent = (consent: GuardConsent | null | undefined) => ({ isAdmin: null, consent })

const NEEDS_TERMS = { needs_terms: true, needs_health_consent: true }
const NEEDS_HEALTH = { needs_terms: false, needs_health_consent: true }

describe('src/router/guard.ts', () => {
  describe('resolveNavigation() terms gate', () => {
    it('sends a signed-in user who has not agreed to the terms to /welcome, carrying where they were going', () => {
      expect(resolveNavigation(target('shelf', '/shelf?tab=open'), auth(), withConsent(NEEDS_TERMS))).toEqual({
        path: '/welcome',
        query: { next: '/shelf?tab=open' },
      })
    })

    it('holds back every page that needs a sign-in, admin pages included', () => {
      for (const [name, path] of [['settings', '/settings'], ['chat', '/chat'], ['skin-analysis', '/analysis'], ['admin-submissions', '/admin/submissions']] as const) {
        const result = resolveNavigation(target(name, path, { requiresAuth: true, requiresAdmin: name === 'admin-submissions' }), auth(), { isAdmin: true, consent: NEEDS_TERMS })
        expect(result).toEqual({ path: '/welcome', query: { next: path } })
      }
    })

    it('leaves open the agreement, the policy pages, sign-in and the account deletion steps', () => {
      expect(TERMS_GATE_OPEN).toEqual(['welcome', 'privacy', 'terms', 'authCallback', 'account-delete-callback', 'account-deleted'])
      expect(resolveNavigation(target('welcome', '/welcome?next=/shelf'), auth(), withConsent(NEEDS_TERMS))).toBe(true)
      expect(resolveNavigation(target('account-delete-callback', '/account/delete/callback?code=x'), auth(), withConsent(NEEDS_TERMS))).toBe(true)
      expect(resolveNavigation(target('privacy', '/privacy', {}), auth(), withConsent(NEEDS_TERMS))).toBe(true)
      expect(resolveNavigation(target('terms', '/terms', {}), auth(), withConsent(NEEDS_TERMS))).toBe(true)
      expect(resolveNavigation(target('account-deleted', '/account/deleted', {}), auth(), withConsent(NEEDS_TERMS))).toBe(true)
      expect(resolveNavigation(target('authCallback', '/auth/callback', {}), auth(), withConsent(NEEDS_TERMS))).toBe(true)
    })

    it('lets every page on the open list through even when it needs a sign-in, so the gate never sends /welcome to itself', () => {
      for (const name of TERMS_GATE_OPEN) {
        expect(resolveNavigation(target(name, `/${name}`), auth(), withConsent(NEEDS_TERMS))).toBe(true)
      }
    })

    it('leaves public pages public for a user who has not agreed', () => {
      expect(resolveNavigation(target('explore', '/explore', {}), auth(), withConsent(NEEDS_TERMS))).toBe(true)
      expect(resolveNavigation(target('ProductDetail', '/product/x', {}), auth(), withConsent(NEEDS_TERMS))).toBe(true)
      expect(resolveNavigation(target('home', '/', {}), auth(), withConsent(NEEDS_TERMS))).toBe(true)
    })

    it('lets a user who has agreed through', () => {
      expect(resolveNavigation(target('shelf', '/shelf'), auth(), withConsent({ needs_terms: false, needs_health_consent: false }))).toBe(true)
    })

    it('sets no gate when the consent state is missing (an older backend) or could not be read', () => {
      expect(resolveNavigation(target('shelf', '/shelf'), auth(), withConsent(null))).toBe(true)
      expect(resolveNavigation(target('shelf', '/shelf'), auth(), withConsent(undefined))).toBe(true)
      expect(resolveNavigation(target('shelf', '/shelf'), auth(), { isAdmin: null })).toBe(true)
      expect(resolveNavigation(target('weekly-checkin', '/checkin'), auth(), withConsent(null))).toBe(true)
    })

    it('never gates a guest, who gets the login prompt on a signed-in page instead', () => {
      const guest = auth({ isAuthenticated: false, user: null })

      expect(resolveNavigation(target('shelf', '/shelf'), guest, withConsent(NEEDS_TERMS))).toBe(false)
      expect(guest.triggerLoginPopup).toHaveBeenCalledTimes(1)
      expect(resolveNavigation(target('explore', '/explore', {}), guest, withConsent(NEEDS_TERMS))).toBe(true)
    })
  })

  describe('resolveNavigation() health consent gate', () => {
    it('sends a user without the health consent from /checkin to /consent/health?next=/checkin', () => {
      expect(resolveNavigation(target('weekly-checkin', '/checkin'), auth(), withConsent(NEEDS_HEALTH))).toEqual({
        path: '/consent/health',
        query: { next: '/checkin' },
      })
    })

    it('gates the weekly check-in only: reading reports on /analysis and every other page stay open', () => {
      expect(resolveNavigation(target('skin-analysis', '/analysis'), auth(), withConsent(NEEDS_HEALTH))).toBe(true)
      expect(resolveNavigation(target('chat', '/chat'), auth(), withConsent(NEEDS_HEALTH))).toBe(true)
      expect(resolveNavigation(target('routine', '/routine'), auth(), withConsent(NEEDS_HEALTH))).toBe(true)
      expect(resolveNavigation(target('settings', '/settings'), auth(), withConsent(NEEDS_HEALTH))).toBe(true)
    })

    it('lets a user who has given the health consent through to /checkin', () => {
      expect(resolveNavigation(target('weekly-checkin', '/checkin'), auth(), withConsent({ needs_terms: false, needs_health_consent: false }))).toBe(true)
    })

    it('asks for the terms before the health consent when both are missing', () => {
      expect(resolveNavigation(target('weekly-checkin', '/checkin'), auth(), withConsent(NEEDS_TERMS))).toEqual({
        path: '/welcome',
        query: { next: '/checkin' },
      })
    })
  })

  describe('safeNext()', () => {
    it('keeps a path inside the app, with its query', () => {
      expect(safeNext('/shelf')).toBe('/shelf')
      expect(safeNext('/explore?category=Toners')).toBe('/explore?category=Toners')
    })

    it('refuses an address on another site, a protocol-relative one and a backslash trick', () => {
      expect(safeNext('https://evil.example/')).toBe('/')
      expect(safeNext('//evil.example/')).toBe('/')
      expect(safeNext('/\\evil.example/')).toBe('/')
      expect(safeNext('javascript:alert(1)')).toBe('/')
      expect(safeNext('shelf')).toBe('/')
    })

    it('uses the fallback for a missing value or a repeated query parameter', () => {
      expect(safeNext(undefined)).toBe('/')
      expect(safeNext(null, '/checkin')).toBe('/checkin')
      expect(safeNext(['/shelf', '/chat'])).toBe('/')
      expect(safeNext('//evil.example', '/checkin')).toBe('/checkin')
    })
  })
})
