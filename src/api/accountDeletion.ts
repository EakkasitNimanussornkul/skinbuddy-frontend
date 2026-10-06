import { deleteAccount } from './consentApi'
import { detailSentence, plainDetail, readApiProblem, type ApiProblem } from './apiProblem'

/**
 * Deleting an account (LINE User Data Policy 3.2.10 and 3.5.2), as agreed with
 * the backend: the user confirms who they are with a fresh LINE sign-in, LINE
 * sends a code to /account/delete/callback, and that code goes to
 * POST /auth/me/delete, where the backend checks it is the same LINE account,
 * deletes everything and tells LINE.
 *
 * `state` ties the code that comes back to the request this browser started:
 * a random value kept in sessionStorage for 10 minutes. A missing, different
 * or old state, or an error from LINE, sends nothing at all.
 *
 * VITE_LINE_DELETE_REDIRECT_URI must equal the backend's
 * LINE_DELETE_REDIRECT_URI and be on the LINE channel's Callback URL list.
 * Without it (or VITE_LINE_CLIENT_ID) deletion is "not available yet" and
 * nothing is started.
 */

export const DELETE_STATE_KEY = 'sb_delete_state'
export const DELETE_STATE_TTL_MS = 10 * 60 * 1000
export const LINE_AUTHORIZE_URL = 'https://access.line.me/oauth2/v2.1/authorize'
export const DELETION_UNAVAILABLE = "Account deletion isn't available yet."

interface DeleteConfig {
  clientId: string
  redirectUri: string
}

const readConfig = (): DeleteConfig | null => {
  const clientId: unknown = import.meta.env.VITE_LINE_CLIENT_ID
  const redirectUri: unknown = import.meta.env.VITE_LINE_DELETE_REDIRECT_URI
  if (typeof clientId !== 'string' || !clientId.trim()) return null
  if (typeof redirectUri !== 'string' || !redirectUri.trim()) return null
  return { clientId, redirectUri }
}

/** Whether deletion can be started here at all. */
export const deletionConfigured = (): boolean => readConfig() !== null

/** LINE's sign-in page for confirming a deletion: the same client and scope as sign-in, its own callback. */
export const buildDeleteAuthorizeUrl = (config: DeleteConfig, state: string): string => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    scope: 'profile openid',
  })
  return `${LINE_AUTHORIZE_URL}?${params.toString()}`
}

/**
 * Store a new state and leave for LINE. False, with nothing stored and no
 * redirect, when deletion is not configured. `go` is the page change, passed
 * in by tests (jsdom cannot leave the page).
 */
export const startAccountDeletion = (
  now: number = Date.now(),
  go: (url: string) => void = (url) => window.location.assign(url),
): boolean => {
  const config = readConfig()
  if (!config) return false
  const state = crypto.randomUUID()
  sessionStorage.setItem(DELETE_STATE_KEY, JSON.stringify({ value: state, expires: now + DELETE_STATE_TTL_MS }))
  go(buildDeleteAuthorizeUrl(config, state))
  return true
}

/**
 * Whether `received` is the state this browser stored, within its 10 minutes.
 * The stored state is removed either way, so it can be used only once.
 */
export const takeDeleteState = (received: unknown, now: number = Date.now()): boolean => {
  const raw = sessionStorage.getItem(DELETE_STATE_KEY)
  sessionStorage.removeItem(DELETE_STATE_KEY)
  if (typeof received !== 'string' || !received || !raw) return false
  try {
    const stored = JSON.parse(raw) as { value?: unknown; expires?: unknown } | null
    return stored?.value === received && typeof stored.expires === 'number' && now < stored.expires
  } catch {
    return false
  }
}

export type DeletionOutcome =
  | { kind: 'not-sent'; reason: 'line-error' | 'state' }
  | { kind: 'deleted'; lineDeauthorized: boolean }
  | { kind: 'failed'; problem: ApiProblem }

// One request per code for the life of the page: a callback page mounted a
// second time with the same code waits for the first answer rather than
// sending the code again (LINE codes are single-use).
const sent = new Map<string, Promise<DeletionOutcome>>()

/** Finish a deletion from the callback's query: check, then send the code once. */
export const completeAccountDeletion = (
  query: { code?: unknown; state?: unknown; error?: unknown },
  now: number = Date.now(),
): Promise<DeletionOutcome> => {
  const code = typeof query.code === 'string' ? query.code : ''
  const running = code ? sent.get(code) : undefined
  if (running) return running

  if (query.error !== undefined && query.error !== null) {
    sessionStorage.removeItem(DELETE_STATE_KEY)
    return Promise.resolve({ kind: 'not-sent', reason: 'line-error' })
  }
  if (!takeDeleteState(query.state, now) || !code) {
    return Promise.resolve({ kind: 'not-sent', reason: 'state' })
  }

  const request: Promise<DeletionOutcome> = deleteAccount(code)
    .then((answer): DeletionOutcome => ({ kind: 'deleted', lineDeauthorized: answer.line_deauthorized }))
    .catch((error: unknown): DeletionOutcome => ({ kind: 'failed', problem: readApiProblem(error) }))
  sent.set(code, request)
  return request
}

/** Forget the codes already sent. For tests. */
export const resetDeletionState = () => sent.clear()

const NOTHING_DELETED = 'Nothing was deleted.'

export const LINE_MISMATCH_MESSAGE =
  "That LINE account isn't the one you use for SkinBuddy. Nothing was deleted. Try again and sign in with the same LINE account."

// The backend's own words (contract 2026-10-07), for when an answer carries no
// readable detail.
const DETAIL_FALLBACK: Record<string, string> = {
  admin_account: "Admin accounts can't be deleted here. Ask the owner to change this account to a normal user first.",
  line_signin_failed: 'LINE sign-in could not be confirmed. Please try again.',
  deletion_not_configured: 'Account deletion is not configured yet.',
  user_not_found: 'User not found.',
  internal_error: 'The account could not be deleted. Nothing was removed.',
}

// Refused before anything was removed, so it is true to say so. internal_error
// says it in its own detail; user_not_found means the account is already gone.
const REFUSED_BEFORE_DELETING = new Set(['admin_account', 'line_signin_failed', 'deletion_not_configured'])

/** What the callback page says when the deletion was refused or failed. */
export const deletionFailureMessage = (problem: Pick<ApiProblem, 'status' | 'code' | 'detail'>): string => {
  if (problem.code === 'line_account_mismatch') return LINE_MISMATCH_MESSAGE
  if (problem.status === 401) return 'Your sign-in has expired, so nothing was deleted. Sign in again, then start from Settings.'
  if (problem.status === null) {
    return "Couldn't reach SkinBuddy to finish this. Check your connection, then open Settings to see whether your account is still there."
  }

  const code = problem.code ?? ''
  const fallback = DETAIL_FALLBACK[code]
  if (fallback) {
    const detail = detailSentence(plainDetail(problem) ?? fallback)
    if (code === 'user_not_found') return `${detail} Your account may already have been deleted.`
    return REFUSED_BEFORE_DELETING.has(code) ? `${detail} ${NOTHING_DELETED}` : detail
  }

  const detail = plainDetail(problem)
  return detail ? detailSentence(detail) : 'Something went wrong while deleting your account. Open Settings to see whether it is still there.'
}
