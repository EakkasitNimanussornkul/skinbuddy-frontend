export interface WarningAlert {
  alert_type: string
  severity: string
  message: string
}

/**
 * A product already on the user's shelf whose active ingredients substantially
 * overlap the one being viewed. Advisory only - a dupe is not a hazard.
 *
 * `brand` and `slug` are nullable in the backend schema (DuplicateMatch in
 * app/schemas.py), so neither can be assumed present when rendering.
 */
export interface DuplicateMatch {
  product_id: string
  name: string
  brand?: string | null
  slug?: string | null
  similarity: number
  shared_actives?: string[]
}

export interface SafetyAnalysis {
  is_safe?: boolean
  warnings?: WarningAlert[]
  duplicates?: DuplicateMatch[]
}

/**
 * `cleared`     the check ran and found nothing
 * `warned`      the check ran and found conflicts
 * `unavailable` the check did not produce an answer
 */
export type SafetyStatus = 'cleared' | 'warned' | 'unavailable'

export interface SafetyOutcome {
  status: SafetyStatus
  warnings: WarningAlert[]
  duplicates: DuplicateMatch[]
}

/**
 * Interpret the result of analyzeProduct().
 *
 * Pure and exported deliberately, so the decision can be tested without
 * mounting a component - the same reason resolveNavigation lives in
 * src/router/guard.ts. Three call sites previously each made this judgement
 * inline and each got it wrong in a different way.
 *
 * The rule that matters: an empty warnings list is NOT sufficient evidence of
 * safety. It is equally the shape produced by a request that never completed.
 * Only an explicit `is_safe: true` clears a product.
 *
 * @param analysis the parsed response, or null when the request threw
 * @param failed   true when the request threw
 */
export const evaluateSafety = (
  analysis: SafetyAnalysis | null | undefined,
  failed: boolean,
): SafetyOutcome => {
  if (failed || analysis == null) {
    return { status: 'unavailable', warnings: [], duplicates: [] }
  }

  const warnings = Array.isArray(analysis.warnings) ? analysis.warnings : []

  // Carried on every branch below, including the unavailable one, rather than
  // being emptied there. A partial response can genuinely arrive with dupes and
  // no verdict, and hiding that here would leave showsDuplicates() looking like
  // it guards something that cannot happen.
  const duplicates = Array.isArray(analysis.duplicates) ? analysis.duplicates : []

  // Warnings win over a contradictory verdict. If the backend reports conflicts
  // it does not matter what is_safe says - the conservative reading applies.
  if (warnings.length > 0) {
    return { status: 'warned', warnings, duplicates }
  }

  if (analysis.is_safe === true) {
    return { status: 'cleared', warnings: [], duplicates }
  }

  // No warnings and no affirmative verdict. We did not receive an answer, so we
  // must not report one.
  return { status: 'unavailable', warnings: [], duplicates }
}

/**
 * Whether an action gated on this check may proceed without interruption.
 *
 * Anything other than an explicit pass stops the flow. Callers must branch on
 * this rather than on `warnings.length`, which cannot distinguish "nothing
 * found" from "nothing received".
 */
export const blocksAction = (outcome: SafetyOutcome) => outcome.status !== 'cleared'

/**
 * Whether the "you already own something similar" section should be rendered.
 *
 * Both halves are load-bearing. `duplicates.length > 0` alone repeats the exact
 * mistake FE-DEF-03 recorded for warnings: an empty list means "you own nothing
 * similar" after a completed check and "we do not know" after a failed one, and
 * the length cannot tell them apart. The status check is what separates them.
 *
 * Note this deliberately does NOT feed blocksAction. Owning a similar product
 * is information, not a hazard, and must never stop a save.
 */
export const showsDuplicates = (outcome: SafetyOutcome) =>
  outcome.status !== 'unavailable' && outcome.duplicates.length > 0

/**
 * Round a similarity percentage for display, or return null when the backend
 * sent something unusable. Null rather than 0 so the caller can omit the figure
 * instead of printing a number nobody computed.
 */
const formatSimilarity = (value: number | null | undefined): string | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return `${Math.round(Math.min(100, Math.max(0, value)))}%`
}

/**
 * Join ingredient names into a readable phrase: "A", "A and B", "A, B and C".
 * Extracted rather than done in the template so it can be tested - this project
 * has no component-mount layer.
 */
export const formatSharedActives = (names: string[] | null | undefined): string => {
  if (!Array.isArray(names)) return ''

  const clean = names
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
    .map((name) => name.trim())

  const last = clean[clean.length - 1]
  if (last === undefined) return ''
  if (clean.length === 1) return last

  return `${clean.slice(0, -1).join(', ')} and ${last}`
}

/**
 * The sentence shown beneath a duplicate's name. Degrades to a wording that
 * claims less when the backend omitted the figure or the ingredient list,
 * rather than rendering "0% match" or a dangling "including".
 */
export const describeDuplicateOverlap = (duplicate: DuplicateMatch): string => {
  const percentage = formatSimilarity(duplicate.similarity)
  const actives = formatSharedActives(duplicate.shared_actives)

  const opening = percentage
    ? `${percentage} of its active ingredients match`
    : 'Its active ingredients substantially match'

  return actives ? `${opening}, including ${actives}.` : `${opening}.`
}

/**
 * Run the check and interpret it in one step, converting a thrown request into
 * an `unavailable` outcome rather than letting it escape as an exception.
 */
export const resolveSafety = async (
  run: () => Promise<SafetyAnalysis>,
): Promise<SafetyOutcome> => {
  try {
    return evaluateSafety(await run(), false)
  } catch {
    return evaluateSafety(null, true)
  }
}
