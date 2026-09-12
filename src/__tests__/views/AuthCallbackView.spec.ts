import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// This view posts to /auth/line through the shared client inline, not through
// authApi.exchangeLineCode - which is why authApi.spec.ts's coverage of that
// function is not coverage of this screen. The client is what has to be mocked.
vi.mock('../../api', () => ({
  apiClient: { post: vi.fn() },
}))

import { apiClient } from '../../api'
import AuthCallbackView from '../../views/AuthCallbackView.vue'
import { useAuthStore } from '../../stores/auth'

const NEW_USER = { id: 'u-1', display_name: 'Tee' }
const RETURNING_USER = { id: 'u-2', display_name: 'Tee', skin_type: 'OSPW' }

const mountCallback = async (path = '/auth/callback?code=line-auth-code') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/auth/callback', component: AuthCallbackView },
      { path: '/setup-profile', component: { template: '<div />' } },
      { path: '/error', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  const push = vi.spyOn(router, 'push')

  const wrapper = mount(AuthCallbackView, { global: { plugins: [pinia, router] } })
  await flushPromises()

  return { wrapper, router, push, auth }
}

describe('src/views/AuthCallbackView.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('LINE callback exchange', () => {
    it('exchanges the authorization code from the callback address', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { access_token: 'token-1', user: RETURNING_USER },
      })

      await mountCallback()

      expect(apiClient.post).toHaveBeenCalledWith('/auth/line', { code: 'line-auth-code' })
    })

    it('opens the session with the token and user the exchange returned', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { access_token: 'token-1', user: RETURNING_USER },
      })

      const { auth } = await mountCallback()

      expect(auth.isAuthenticated).toBe(true)
      expect(auth.user.id).toBe('u-2')
      expect(localStorage.getItem('access_token')).toBe('token-1')
    })

    it('sends a first-time user to set up a profile', async () => {
      // The whole reason this branch exists: a user with no skin type has
      // nothing for the rest of the app to personalise against, and every
      // requiresSkinType page would bounce them here anyway.
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { access_token: 'token-1', user: NEW_USER },
      })

      const { push } = await mountCallback()

      expect(push).toHaveBeenCalledWith('/setup-profile')
    })

    it('sends a returning user who already has a type to home', async () => {
      // The two branches differ only by a field on the user object, so both
      // have to be pinned: a condition inverted here would send established
      // users to a setup page and new users to a home screen personalised
      // against nothing.
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { access_token: 'token-1', user: RETURNING_USER },
      })

      const { push } = await mountCallback()

      expect(push).toHaveBeenCalledWith('/')
    })

    it('does nothing at all when the exchange returns no token', async () => {
      // A 200 with no access_token is not a login. Opening a session on it
      // would leave the app believing it had credentials it never received.
      vi.mocked(apiClient.post).mockResolvedValue({ data: { user: RETURNING_USER } })

      const { push, auth } = await mountCallback()

      expect(auth.isAuthenticated).toBe(false)
      expect(push).not.toHaveBeenCalled()
    })
  })

  describe('callback failures', () => {
    it('reports a failed exchange to the user rather than leaving the spinner up', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('network down'))

      const { wrapper, auth } = await mountCallback()

      expect(wrapper.text()).toContain('Login Failed')
      expect(wrapper.text()).toContain('Failed to log in. Please try again.')
      expect(wrapper.text()).not.toContain('Authenticating')
      expect(auth.isAuthenticated).toBe(false)
    })

    it('returns the user to home after letting them read the failure', async () => {
      // The three-second delay is the point: navigating immediately would
      // replace the message with the home screen before it could be read.
      vi.mocked(apiClient.post).mockRejectedValue(new Error('network down'))

      const { push } = await mountCallback()
      expect(push).not.toHaveBeenCalled()

      vi.advanceTimersByTime(3000)
      await flushPromises()

      expect(push).toHaveBeenCalledWith('/')
    })

    it('sends the user to the error screen when the provider returned no code', async () => {
      // Arriving here with no code means the LINE redirect itself failed, so
      // there is nothing to exchange and no request is made.
      const { push } = await mountCallback('/auth/callback')

      expect(apiClient.post).not.toHaveBeenCalled()
      expect(push).toHaveBeenCalledWith({
        path: '/error',
        query: { message: 'Failed to log in. Please try again.' },
      })
    })
  })
})
