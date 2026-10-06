import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../../api/index', () => ({
  apiClient: { post: vi.fn() },
}))

import { apiClient } from '../../api/index'
import {
  DELETE_STATE_KEY,
  DELETE_STATE_TTL_MS,
  LINE_MISMATCH_MESSAGE,
  completeAccountDeletion,
  deletionConfigured,
  deletionFailureMessage,
  resetDeletionState,
  startAccountDeletion,
  takeDeleteState,
} from '../../api/accountDeletion'

const REDIRECT = 'http://localhost:5173/account/delete/callback'
const NOW = 1_800_000_000_000

const configure = () => {
  vi.stubEnv('VITE_LINE_CLIENT_ID', 'client-1')
  vi.stubEnv('VITE_LINE_DELETE_REDIRECT_URI', REDIRECT)
}

const storeState = (value: string, expires: number) => sessionStorage.setItem(DELETE_STATE_KEY, JSON.stringify({ value, expires }))
const refusal = (status: number, data: unknown) => Object.assign(new Error(`status ${status}`), { response: { status, data } })

describe('src/api/accountDeletion.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    resetDeletionState()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  describe('startAccountDeletion()', () => {
    it('stores a random state with a 10-minute expiry and goes to LINE with the exact authorize parameters', () => {
      configure()
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-2222-3333-4444-555555555555')
      const go = vi.fn()

      expect(startAccountDeletion(NOW, go)).toBe(true)

      expect(JSON.parse(sessionStorage.getItem(DELETE_STATE_KEY)!)).toEqual({
        value: '11111111-2222-3333-4444-555555555555',
        expires: NOW + 10 * 60 * 1000,
      })
      expect(DELETE_STATE_TTL_MS).toBe(600_000)
      expect(go).toHaveBeenCalledTimes(1)
      const url = new URL(go.mock.calls[0]![0] as string)
      expect(`${url.origin}${url.pathname}`).toBe('https://access.line.me/oauth2/v2.1/authorize')
      expect(Object.fromEntries(url.searchParams)).toEqual({
        response_type: 'code',
        client_id: 'client-1',
        redirect_uri: REDIRECT,
        state: '11111111-2222-3333-4444-555555555555',
        scope: 'profile openid',
      })
    })

    it('does nothing and answers false when the delete redirect address is not set', () => {
      vi.stubEnv('VITE_LINE_CLIENT_ID', 'client-1')
      vi.stubEnv('VITE_LINE_DELETE_REDIRECT_URI', '')
      const go = vi.fn()

      expect(deletionConfigured()).toBe(false)
      expect(startAccountDeletion(NOW, go)).toBe(false)
      expect(go).not.toHaveBeenCalled()
      expect(sessionStorage.getItem(DELETE_STATE_KEY)).toBeNull()
    })

    it('does nothing and answers false when the LINE client id is not set', () => {
      vi.stubEnv('VITE_LINE_CLIENT_ID', '')
      vi.stubEnv('VITE_LINE_DELETE_REDIRECT_URI', REDIRECT)
      const go = vi.fn()

      expect(startAccountDeletion(NOW, go)).toBe(false)
      expect(go).not.toHaveBeenCalled()
    })
  })

  describe('takeDeleteState()', () => {
    it('accepts the stored state within its 10 minutes, once', () => {
      storeState('s-1', NOW + 1000)

      expect(takeDeleteState('s-1', NOW)).toBe(true)
      expect(sessionStorage.getItem(DELETE_STATE_KEY)).toBeNull()
      expect(takeDeleteState('s-1', NOW)).toBe(false)
    })

    it('refuses a different state, and clears the stored one', () => {
      storeState('s-1', NOW + 1000)

      expect(takeDeleteState('s-2', NOW)).toBe(false)
      expect(sessionStorage.getItem(DELETE_STATE_KEY)).toBeNull()
    })

    it('refuses a state at or past its expiry', () => {
      storeState('s-1', NOW)
      expect(takeDeleteState('s-1', NOW)).toBe(false)

      storeState('s-1', NOW - 1)
      expect(takeDeleteState('s-1', NOW)).toBe(false)
    })

    it('refuses when nothing was stored, or the stored value is unreadable', () => {
      expect(takeDeleteState('s-1', NOW)).toBe(false)

      sessionStorage.setItem(DELETE_STATE_KEY, 'not json')
      expect(takeDeleteState('s-1', NOW)).toBe(false)

      storeState('s-1', NOW + 1000)
      expect(takeDeleteState(undefined, NOW)).toBe(false)
    })
  })

  describe('completeAccountDeletion()', () => {
    it('sends the code once when the state matches, and reads line_deauthorized', async () => {
      storeState('s-1', NOW + 1000)
      vi.mocked(apiClient.post).mockResolvedValue({ data: { deleted: true, line_deauthorized: false } })

      await expect(completeAccountDeletion({ code: 'c-1', state: 's-1' }, NOW)).resolves.toEqual({ kind: 'deleted', lineDeauthorized: false })
      expect(apiClient.post).toHaveBeenCalledWith('/auth/me/delete', { code: 'c-1' })
      expect(sessionStorage.getItem(DELETE_STATE_KEY)).toBeNull()
    })

    it('sends nothing for a state that does not match', async () => {
      storeState('s-1', NOW + 1000)

      await expect(completeAccountDeletion({ code: 'c-1', state: 's-2' }, NOW)).resolves.toEqual({ kind: 'not-sent', reason: 'state' })
      expect(apiClient.post).not.toHaveBeenCalled()
    })

    it('sends nothing for an expired state', async () => {
      storeState('s-1', NOW - 1)

      await expect(completeAccountDeletion({ code: 'c-1', state: 's-1' }, NOW)).resolves.toEqual({ kind: 'not-sent', reason: 'state' })
      expect(apiClient.post).not.toHaveBeenCalled()
    })

    it('sends nothing when LINE sent an error, and clears the stored state', async () => {
      storeState('s-1', NOW + 1000)

      await expect(completeAccountDeletion({ state: 's-1', error: 'access_denied' }, NOW)).resolves.toEqual({ kind: 'not-sent', reason: 'line-error' })
      expect(apiClient.post).not.toHaveBeenCalled()
      expect(sessionStorage.getItem(DELETE_STATE_KEY)).toBeNull()
    })

    it('sends nothing without a code', async () => {
      storeState('s-1', NOW + 1000)

      await expect(completeAccountDeletion({ state: 's-1' }, NOW)).resolves.toEqual({ kind: 'not-sent', reason: 'state' })
      expect(apiClient.post).not.toHaveBeenCalled()
    })

    it('sends a code only once, even when asked twice (a page mounted again)', async () => {
      storeState('s-1', NOW + 1000)
      vi.mocked(apiClient.post).mockResolvedValue({ data: { deleted: true, line_deauthorized: true } })

      const [first, second] = await Promise.all([
        completeAccountDeletion({ code: 'c-1', state: 's-1' }, NOW),
        completeAccountDeletion({ code: 'c-1', state: 's-1' }, NOW),
      ])
      const third = await completeAccountDeletion({ code: 'c-1', state: 's-1' }, NOW)

      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect([first, second, third]).toEqual([
        { kind: 'deleted', lineDeauthorized: true },
        { kind: 'deleted', lineDeauthorized: true },
        { kind: 'deleted', lineDeauthorized: true },
      ])
    })

    it('reads a refusal into a problem', async () => {
      storeState('s-1', NOW + 1000)
      vi.mocked(apiClient.post).mockRejectedValue(refusal(409, { code: 'admin_account', detail: 'x' }))

      const outcome = await completeAccountDeletion({ code: 'c-1', state: 's-1' }, NOW)

      expect(outcome).toMatchObject({ kind: 'failed', problem: { status: 409, code: 'admin_account' } })
    })
  })

  describe('deletionFailureMessage()', () => {
    const problem = (status: number | null, code: string | null, detail: string | null = null) => ({ status, code, detail })

    it('words line_account_mismatch as the owner-approved sentence, whatever the detail', () => {
      expect(deletionFailureMessage(problem(403, 'line_account_mismatch', 'That LINE account is not the one you are signed in with.'))).toBe(LINE_MISMATCH_MESSAGE)
      expect(LINE_MISMATCH_MESSAGE).toBe("That LINE account isn't the one you use for SkinBuddy. Nothing was deleted. Try again and sign in with the same LINE account.")
    })

    it('shows the backend detail and "Nothing was deleted." for admin_account, line_signin_failed and deletion_not_configured', () => {
      expect(deletionFailureMessage(problem(409, 'admin_account', "Admin accounts can't be deleted here. Ask the owner to change this account to a normal user first.")))
        .toBe("Admin accounts can't be deleted here. Ask the owner to change this account to a normal user first. Nothing was deleted.")
      expect(deletionFailureMessage(problem(400, 'line_signin_failed', 'LINE sign-in could not be confirmed. Please try again.')))
        .toBe('LINE sign-in could not be confirmed. Please try again. Nothing was deleted.')
      expect(deletionFailureMessage(problem(503, 'deletion_not_configured', 'Account deletion is not configured yet.')))
        .toBe('Account deletion is not configured yet. Nothing was deleted.')
    })

    it('shows internal_error\'s own detail, which already says nothing was removed', () => {
      expect(deletionFailureMessage(problem(500, 'internal_error', 'The account could not be deleted. Nothing was removed.')))
        .toBe('The account could not be deleted. Nothing was removed.')
    })

    it('says a user_not_found account may already be deleted, without claiming nothing was', () => {
      const text = deletionFailureMessage(problem(404, 'user_not_found', 'User not found'))
      expect(text).toBe('User not found. Your account may already have been deleted.')
      expect(text).not.toContain('Nothing was deleted')
    })

    it('uses the contract wording for a known code that came without a readable detail', () => {
      expect(deletionFailureMessage(problem(400, 'line_signin_failed'))).toBe('LINE sign-in could not be confirmed. Please try again. Nothing was deleted.')
      expect(deletionFailureMessage(problem(500, 'internal_error'))).toBe('The account could not be deleted. Nothing was removed.')
    })

    it('words an expired sign-in (401) and no answer at all in plain words', () => {
      expect(deletionFailureMessage(problem(401, null, 'Could not validate credentials'))).toBe('Your sign-in has expired, so nothing was deleted. Sign in again, then start from Settings.')
      expect(deletionFailureMessage(problem(null, null))).toContain("Couldn't reach SkinBuddy")
    })
  })
})
