import { stripHiddenChars } from '../utils/hiddenChars'

/**
 * One reading of a failed request, whatever shape the backend answered in.
 *
 * The submission routes (backend as-built, 2026-10-04) fail in three shapes:
 *   - a route error:          {"detail": "message"}
 *   - a database function:    {"detail": "message", "code": "SBUNK", "details": [...]}
 *   - Pydantic validation:    422 {"detail": [{"loc": ["body", ...], "msg": "..."}, ...]}
 *
 * Every screen reads the same four things from that - the status, a message,
 * a machine code and the per-field problems - so they are read here once
 * rather than by each caller poking at `error.response.data`.
 *
 * `status` is null when no answer arrived at all (offline, server down, CORS),
 * which is a different thing to tell the user from any answer the server gave.
 */
export interface FieldProblem {
  /** The field's path inside the request body, joined with dots: "ingredients.2.new_name". */
  field: string
  message: string
}

export interface ApiProblem {
  status: number | null
  /** The `detail` text, when it is text. A Pydantic 422 carries a list instead. */
  detail: string | null
  /** The database function's code (SBUNK, SBDUP, ...), when there is one. */
  code: string | null
  /** The extra JSON a database function attached, as sent. Null when absent. */
  details: unknown
  fields: FieldProblem[]
}

// Pydantic prefixes a custom validator's message with this; the rest is ours.
const VALUE_ERROR_PREFIX = /^Value error,\s*/i

const readFieldProblem = (item: unknown): FieldProblem | null => {
  const entry = item as { loc?: unknown; msg?: unknown } | null
  if (!entry || typeof entry !== 'object' || typeof entry.msg !== 'string') return null
  const loc = Array.isArray(entry.loc) ? entry.loc : []
  // "body" is where FastAPI says the field lives, not part of the field's name.
  const path = (loc[0] === 'body' ? loc.slice(1) : loc).filter(
    (part): part is string | number => typeof part === 'string' || typeof part === 'number',
  )
  const message = entry.msg.replace(VALUE_ERROR_PREFIX, '').trim()
  return {
    field: path.join('.'),
    message: message ? message.charAt(0).toUpperCase() + message.slice(1) : 'Check this field',
  }
}

// A field path written into a text refusal: "sources.1.url", "sources[1].url",
// "ingredients.2.details.source_url".
const FIELD_IN_TEXT = /\b((?:sources|ingredients)(?:\.\d+|\[\d+\])(?:\.[a-z_]+|\.\d+|\[\d+\])*)/

/**
 * A text refusal that names the one field it is about - beside the text as
 * `loc` (["body", "sources", 1, "url"] or "sources.1.url"), or inside the text
 * itself - as a field problem, so the form can put it on that field. The
 * link checks (backend fix/submission-hardening) refuse a link this way.
 */
const readTextFieldProblem = (detail: string, loc: unknown): FieldProblem | null => {
  if (Array.isArray(loc)) return readFieldProblem({ loc, msg: detail })
  if (typeof loc === 'string' && loc.trim()) return readFieldProblem({ loc: loc.trim().split('.'), msg: detail })
  const found = FIELD_IN_TEXT.exec(detail)
  if (!found) return null
  const path = found[1]!
  const field = path.replace(/\[(\d+)\]/g, '.$1')
  // "sources.1.url: Links to ... aren't accepted" reads as its message alone.
  const rest = detail.startsWith(path) ? detail.slice(path.length).replace(/^\s*[:\-–]\s*/, '') : detail
  return readFieldProblem({ loc: field.split('.'), msg: rest || detail })
}

export const readApiProblem = (error: unknown): ApiProblem => {
  const response = (error as { response?: { status?: unknown; data?: unknown } } | null)?.response
  const status = typeof response?.status === 'number' ? response.status : null
  const data = response?.data
  const body = data && typeof data === 'object' ? (data as { detail?: unknown; code?: unknown; details?: unknown; loc?: unknown }) : null
  const detail = typeof body?.detail === 'string' ? body.detail : null
  const textField = status === 422 && detail ? readTextFieldProblem(detail, body?.loc) : null

  return {
    status,
    detail,
    code: typeof body?.code === 'string' ? body.code : null,
    details: body?.details ?? null,
    fields: Array.isArray(body?.detail)
      ? body.detail.map(readFieldProblem).filter((p): p is FieldProblem => p !== null)
      : textField
        ? [textField]
        : [],
  }
}

// ---------------------------------------------------------------------------
// Words for refusals every screen shares
// ---------------------------------------------------------------------------

const DETAIL_LIMIT = 300

/**
 * The backend's `detail`, when it is text a person can read: trimmed, with
 * control and hidden characters taken out, and not so long it is clearly not
 * meant for a person. Null otherwise, and the caller uses its own words.
 *
 * Screens show it for the refusals whose exact wording the backend owns (the
 * rate limit, the pending cap, the link and image checks), so a change to that
 * wording needs no change here. It is always shown as text, never as HTML.
 */
export const plainDetail = (problem: Pick<ApiProblem, 'detail'>): string | null => {
  if (typeof problem.detail !== 'string') return null
  const text = stripHiddenChars(problem.detail).replace(/\p{Cc}+/gu, ' ').trim()
  return text && text.length <= DETAIL_LIMIT ? text : null
}

/** A detail as the end of one of our sentences: "...: links must be public. Nothing was saved." */
export const detailClause = (detail: string): string => detail.replace(/[.!\s]+$/, '')

/** A detail as a sentence of its own, ending in a full stop. */
export const detailSentence = (detail: string): string => (/[.!?]$/.test(detail) ? detail : `${detail}.`)

export const RATE_LIMIT_MESSAGE = "You've sent a lot in a short time. Please wait a bit and try again."

/**
 * A 429 - the upload rate limit, or the cap on submissions waiting for review -
 * in the backend's words when it gave some, which say which limit it was.
 * Null for any other answer.
 */
export const rateLimitMessage = (problem: Pick<ApiProblem, 'status' | 'detail'>): string | null =>
  problem.status === 429 ? (plainDetail(problem) ?? RATE_LIMIT_MESSAGE) : null

export const PHOTO_REFUSAL_FALLBACK: Record<413 | 415 | 422, string> = {
  413: 'That photo is over 5 MB. Choose a smaller one.',
  415: "That file isn't a JPG, PNG or WebP image. Choose a photo in one of those.",
  422: "That photo couldn't be read as an image. Choose a different photo.",
}

/**
 * A refused photo upload, for the line under the photo field: the rate limit,
 * or the size, type and decoding checks (413, 415, 422; the backend re-encodes
 * every image, so a file that is not really a photo is refused there). Null
 * for any other answer, which the caller words for its own screen.
 */
export const photoRefusalMessage = (problem: Pick<ApiProblem, 'status' | 'detail'>): string | null => {
  const limited = rateLimitMessage(problem)
  if (limited) return limited
  const { status } = problem
  if (status === 413 || status === 415 || status === 422) return plainDetail(problem) ?? PHOTO_REFUSAL_FALLBACK[status]
  return null
}
