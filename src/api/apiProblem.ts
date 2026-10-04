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

export const readApiProblem = (error: unknown): ApiProblem => {
  const response = (error as { response?: { status?: unknown; data?: unknown } } | null)?.response
  const status = typeof response?.status === 'number' ? response.status : null
  const data = response?.data
  const body = data && typeof data === 'object' ? (data as { detail?: unknown; code?: unknown; details?: unknown }) : null

  return {
    status,
    detail: typeof body?.detail === 'string' ? body.detail : null,
    code: typeof body?.code === 'string' ? body.code : null,
    details: body?.details ?? null,
    fields: Array.isArray(body?.detail)
      ? body.detail.map(readFieldProblem).filter((p): p is FieldProblem => p !== null)
      : [],
  }
}
