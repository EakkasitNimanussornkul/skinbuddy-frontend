import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../stores/auth'

// Feature #1 - Authentication. Supplementary: the Test Record already carries
// hand-written entries for these units, and the owner scoped regeneration to
// Features #2, #3 and #4. These are here so the auth entries have something
// executable behind them if the owner chooses to adopt them.
//
// No network: this store only touches reactive state and localStorage.

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  describe('setAuth()', () => {
    it('stores the token and marks the session authenticated', () => {
      const store = useAuthStore()

      store.setAuth('token-abc', { display_name: 'Ada' })

      expect(store.token).toBe('token-abc')
      expect(store.isAuthenticated).toBe(true)
    })

    it('persists the token and user to localStorage so the session survives a reload', () => {
      const store = useAuthStore()

      store.setAuth('token-abc', { display_name: 'Ada' })

      expect(localStorage.getItem('access_token')).toBe('token-abc')
      expect(JSON.parse(localStorage.getItem('user_info')!).name).toBe('Ada')
    })

    it('normalises the LINE display_name and avatar fields onto name and picture', () => {
      const store = useAuthStore()

      store.setAuth('token-abc', { display_name: 'Ada', avatar: 'https://example.test/a.png' })

      expect(store.user.name).toBe('Ada')
      expect(store.user.picture).toBe('https://example.test/a.png')
    })

    it('falls back to "Guest User" when the profile carries no usable name', () => {
      const store = useAuthStore()

      store.setAuth('token-abc', {})

      expect(store.user.name).toBe('Guest User')
      expect(store.user.picture).toBeNull()
    })

    it('closes the login popup once authentication succeeds', () => {
      const store = useAuthStore()
      store.triggerLoginPopup()
      expect(store.showLoginPopup).toBe(true)

      store.setAuth('token-abc', { display_name: 'Ada' })

      expect(store.showLoginPopup).toBe(false)
    })
  })

  describe('isAuthenticated (computed)', () => {
    it('reports false before any token is set', () => {
      const store = useAuthStore()

      // Note for the Test Record: this unit is a computed *property*, not a
      // method. The existing document lists it as isAuthenticated(). Calling it
      // as a function throws, which is the defect fixed in commit 769a4ba.
      expect(store.isAuthenticated).toBe(false)
    })

    it('flips to true when a token is set and back to false when the session is cleared', () => {
      const store = useAuthStore()

      store.setAuth('token-abc', {})
      expect(store.isAuthenticated).toBe(true)

      store.clearSession()
      expect(store.isAuthenticated).toBe(false)
    })
  })

  describe('updateSkinType()', () => {
    it('writes the new skin type onto the signed-in user', () => {
      const store = useAuthStore()
      store.setAuth('token-abc', { display_name: 'Ada' })

      store.updateSkinType('OSPW')

      expect(store.user.skin_type).toBe('OSPW')
    })

    it('persists the updated skin type to localStorage', () => {
      const store = useAuthStore()
      store.setAuth('token-abc', { display_name: 'Ada' })

      store.updateSkinType('DRNT')

      expect(JSON.parse(localStorage.getItem('user_info')!).skin_type).toBe('DRNT')
    })

    it('does nothing when no user is signed in, rather than creating a partial user', () => {
      const store = useAuthStore()

      store.updateSkinType('OSPW')

      expect(store.user).toBeNull()
      expect(localStorage.getItem('user_info')).toBeNull()
    })
  })

  describe('logout()', () => {
    it('clears the token and user from both memory and localStorage', () => {
      const store = useAuthStore()
      store.setAuth('token-abc', { display_name: 'Ada' })

      store.logout()

      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('user_info')).toBeNull()
    })

    it('opens the logout confirmation popup', () => {
      const store = useAuthStore()
      store.setAuth('token-abc', {})

      store.logout()

      expect(store.showLogoutPopup).toBe(true)
    })

    it('leaves the session unauthenticated afterwards', () => {
      const store = useAuthStore()
      store.setAuth('token-abc', {})

      store.logout()

      expect(store.isAuthenticated).toBe(false)
    })
  })
})
