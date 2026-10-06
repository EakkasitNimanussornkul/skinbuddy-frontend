import { plainDetail, type ApiProblem } from '../../api/apiProblem'

/**
 * The words for a refused consent choice, shared by the terms screen, the
 * health consent screen and the Privacy card in Settings. The backend's own
 * detail is shown when it is plain text (it words 409 policy_version_changed,
 * 422 age_not_confirmed and 500 internal_error for a person); these are for
 * when it gave none.
 */
export const CONSENT_SAVE_FALLBACK = 'Your choice could not be saved. Please try again.'
export const CONSENT_OFFLINE = "Couldn't reach SkinBuddy. Check your connection and try again."
export const CONSENT_VERSION_MISSING = "We couldn't load the current version to agree to. Reload the page and try again."

export const consentRefusalMessage = (problem: Pick<ApiProblem, 'status' | 'detail'>): string => {
  if (problem.status === null) return CONSENT_OFFLINE
  return plainDetail(problem) ?? CONSENT_SAVE_FALLBACK
}
