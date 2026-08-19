export interface WarningAlert {
  alert_type: string
  severity: string
  message: string
}

export interface SafetyAnalysis {
  is_safe?: boolean
  warnings?: WarningAlert[]
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
    return { status: 'unavailable', warnings: [] }
  }

  const warnings = Array.isArray(analysis.warnings) ? analysis.warnings : []

  // Warnings win over a contradictory verdict. If the backend reports conflicts
  // it does not matter what is_safe says - the conservative reading applies.
  if (warnings.length > 0) {
    return { status: 'warned', warnings }
  }

  if (analysis.is_safe === true) {
    return { status: 'cleared', warnings: [] }
  }

  // No warnings and no affirmative verdict. We did not receive an answer, so we
  // must not report one.
  return { status: 'unavailable', warnings: [] }
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
