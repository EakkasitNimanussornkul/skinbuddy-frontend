import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}))

import { apiClient } from '../../api/index'
import AccountDeleteCallbackView from '../../views/AccountDeleteCallbackView.vue'
import AccountDeletedView from '../../views/AccountDeletedView.vue'
import { DELETE_STATE_KEY, LINE_MISMATCH_MESSAGE, resetDeletionState } from '../../api/accountDeletion'
import { useAuthStore } from '../../stores/auth'

const page = { template: '<div />' }
const mounted: VueWrapper[] = []

const storeState = (value: string, expiresIn = 60_000) =>
  sessionStorage.setItem(DELETE_STATE_KEY, JSON.stringify({ value, expires: Date.now() + expiresIn }))

const refusal = (status: number, data: unknown) => Object.assign(new Error(`status ${status}`), { response: { status, data } })

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: page },
      { path: '/account/delete/callback', component: AccountDeleteCallbackView },
      { path: '/account/deleted', component: AccountDeletedView },
      { path: '/settings', component: page },
      { path: '/explore', component: page },
    ],
  })

/** Mount a view at `address`, signed in. `router` is reused to mount a page a second time. */
const mountAt = async (component: object, address: string, router: Router = makeRouter()) => {
  await router.push(address)
  await router.isReady()
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().setAuth('token-1', { id: 'u-1', display_name: 'Ploy' })
  const wrapper = mount(component, { global: { plugins: [pinia, router] } })
  mounted.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

describe('feat/25 account deletion pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    resetDeletionState()
  })

  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
  })

  describe('AccountDeleteCallbackView (/account/delete/callback)', () => {
    it('on success sends the code once, signs out and replaces the page with /account/deleted?line=1', async () => {
      storeState('s-1')
      vi.mocked(apiClient.post).mockResolvedValue({ data: { deleted: true, line_deauthorized: true } })
      const router = makeRouter()
      const replace = vi.spyOn(router, 'replace')

      await mountAt(AccountDeleteCallbackView, '/account/delete/callback?code=c-1&state=s-1', router)

      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(apiClient.post).toHaveBeenCalledWith('/auth/me/delete', { code: 'c-1' })
      expect(useAuthStore().isAuthenticated).toBe(false)
      expect(replace).toHaveBeenCalledWith({ path: '/account/deleted', query: { line: '1' } })
      expect(router.currentRoute.value.fullPath).toBe('/account/deleted?line=1')
      expect(sessionStorage.getItem(DELETE_STATE_KEY)).toBeNull()
    })

    it('carries line=0 when LINE could not be told', async () => {
      storeState('s-1')
      vi.mocked(apiClient.post).mockResolvedValue({ data: { deleted: true, line_deauthorized: false } })

      const { router } = await mountAt(AccountDeleteCallbackView, '/account/delete/callback?code=c-1&state=s-1')

      expect(router.currentRoute.value.fullPath).toBe('/account/deleted?line=0')
    })

    it('sends nothing for a state that does not match, says nothing was deleted and links back to Settings', async () => {
      storeState('s-1')

      const { wrapper } = await mountAt(AccountDeleteCallbackView, '/account/delete/callback?code=c-1&state=s-other')

      expect(apiClient.post).not.toHaveBeenCalled()
      expect(wrapper.get('h1').text()).toBe('Nothing was deleted')
      expect(wrapper.get('a.delete-back').attributes('href')).toBe('/settings')
      expect(useAuthStore().isAuthenticated).toBe(true)
      expect(sessionStorage.getItem(DELETE_STATE_KEY)).toBeNull()
    })

    it('sends nothing for a state older than 10 minutes', async () => {
      storeState('s-1', -1)

      const { wrapper } = await mountAt(AccountDeleteCallbackView, '/account/delete/callback?code=c-1&state=s-1')

      expect(apiClient.post).not.toHaveBeenCalled()
      expect(wrapper.get('h1').text()).toBe('Nothing was deleted')
    })

    it('sends nothing when no state was stored in this browser', async () => {
      const { wrapper } = await mountAt(AccountDeleteCallbackView, '/account/delete/callback?code=c-1&state=s-1')

      expect(apiClient.post).not.toHaveBeenCalled()
      expect(wrapper.get('h1').text()).toBe('Nothing was deleted')
    })

    it('sends nothing when LINE sent an error, and clears the stored state', async () => {
      storeState('s-1')

      const { wrapper } = await mountAt(AccountDeleteCallbackView, '/account/delete/callback?error=access_denied&state=s-1')

      expect(apiClient.post).not.toHaveBeenCalled()
      expect(wrapper.get('h1').text()).toBe('Nothing was deleted')
      expect(wrapper.get('[role="alert"]').text()).toBe("LINE didn't confirm it was you, so nothing was sent to SkinBuddy.")
      expect(sessionStorage.getItem(DELETE_STATE_KEY)).toBeNull()
    })

    it('posts once when the page is mounted a second time with the same code', async () => {
      storeState('s-1')
      let finish: (value: unknown) => void = () => {}
      vi.mocked(apiClient.post).mockReturnValue(new Promise((resolve) => (finish = resolve)))
      const router = makeRouter()

      await mountAt(AccountDeleteCallbackView, '/account/delete/callback?code=c-1&state=s-1', router)
      await mountAt(AccountDeleteCallbackView, '/account/delete/callback?code=c-1&state=s-1', router)
      finish({ data: { deleted: true, line_deauthorized: true } })
      await flushPromises()

      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(router.currentRoute.value.path).toBe('/account/deleted')
    })

    it('shows the owner-approved words for line_account_mismatch and keeps the session', async () => {
      storeState('s-1')
      vi.mocked(apiClient.post).mockRejectedValue(refusal(403, { code: 'line_account_mismatch', detail: 'That LINE account is not the one you are signed in with.' }))

      const { wrapper, router } = await mountAt(AccountDeleteCallbackView, '/account/delete/callback?code=c-1&state=s-1')

      expect(wrapper.get('h1').text()).toBe("Your account wasn't deleted")
      expect(wrapper.get('[role="alert"]').text()).toBe(LINE_MISMATCH_MESSAGE)
      expect(useAuthStore().isAuthenticated).toBe(true)
      expect(router.currentRoute.value.path).toBe('/account/delete/callback')
    })

    it('shows each refusal code in the backend\'s words, with "Nothing was deleted." where that is true', async () => {
      const cases: [number, string, string, string][] = [
        [409, 'admin_account', "Admin accounts can't be deleted here. Ask the owner to change this account to a normal user first.", "Admin accounts can't be deleted here. Ask the owner to change this account to a normal user first. Nothing was deleted."],
        [400, 'line_signin_failed', 'LINE sign-in could not be confirmed. Please try again.', 'LINE sign-in could not be confirmed. Please try again. Nothing was deleted.'],
        [503, 'deletion_not_configured', 'Account deletion is not configured yet.', 'Account deletion is not configured yet. Nothing was deleted.'],
        [404, 'user_not_found', 'User not found', 'User not found. Your account may already have been deleted.'],
        [500, 'internal_error', 'The account could not be deleted. Nothing was removed.', 'The account could not be deleted. Nothing was removed.'],
      ]
      for (const [status, code, detail, shown] of cases) {
        sessionStorage.clear()
        resetDeletionState()
        storeState('s-1')
        vi.mocked(apiClient.post).mockRejectedValueOnce(refusal(status, { code, detail }))

        const { wrapper } = await mountAt(AccountDeleteCallbackView, `/account/delete/callback?code=c-${code}&state=s-1`)

        expect(wrapper.get('[role="alert"]').text()).toBe(shown)
      }
    })
  })

  describe('AccountDeletedView (/account/deleted)', () => {
    it('says the account was deleted and links to /explore, with no LINE step when LINE was told (line=1)', async () => {
      const { wrapper } = await mountAt(AccountDeletedView, '/account/deleted?line=1')

      expect(wrapper.get('h1').text()).toBe('Your account was deleted.')
      expect(wrapper.find('.line-hint').exists()).toBe(false)
      expect(wrapper.get('a.deleted-explore').attributes('href')).toBe('/explore')
    })

    it('asks the user to remove SkinBuddy in LINE when LINE could not be told (line=0)', async () => {
      const { wrapper } = await mountAt(AccountDeletedView, '/account/deleted?line=0')

      expect(wrapper.get('.line-hint').text()).toBe('Also remove SkinBuddy in LINE: Settings › Account › Authorized apps.')
      expect(wrapper.get('a.deleted-explore').attributes('href')).toBe('/explore')
    })

    it('adds the LINE step only for line=0, not for an address without the flag', async () => {
      const { wrapper } = await mountAt(AccountDeletedView, '/account/deleted')

      expect(wrapper.get('h1').text()).toBe('Your account was deleted.')
      expect(wrapper.find('.line-hint').exists()).toBe(false)
    })
  })
})
