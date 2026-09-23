/**
 * One ingredient pair behind a conflict with another product
 * (ConflictDetail in the backend's app/schemas.py).
 */
export interface ConflictDetail {
  alert_type: string
  severity: string
  // The checked product's ingredient(s); a category rule may join several.
  ingredient: string
  conflicting_ingredient: string | null
  // The full sentence for this one pair, including why it clashes.
  message: string
}

export interface WarningAlert {
  alert_type: string
  severity: string
  message: string
  // Both optional because they are additive on the backend: an older response
  // carries neither, and a Skin Type Conflict has no other product and no
  // details. When a product clashes on two or more pairs the backend sends one
  // warning for it, with `message` a one-line summary and each pair - with its
  // explanation - in `details`, most severe first.
  conflicting_product?: string | null
  details?: ConflictDetail[]
}

/**
 * Whether a warning is a merged, per-product conflict whose pairs should be
 * listed individually. One pair or none: the warning's own message already is
 * that pair's full sentence, so there is nothing more to list.
 */
export const hasConflictDetails = (warning: Pick<WarningAlert, 'details'> | null | undefined): boolean =>
  Array.isArray(warning?.details) && warning.details.length > 1

/** Several ingredient pairs that clash for the same reason, shown as one line. */
export interface ConflictDetailGroup {
  alert_type: string
  severity: string
  // The other product's ingredients this rule fires on. One entry when the
  // pair stood alone; two or more when identical pairs were folded together.
  ingredients: string[]
  // The shared sentence, the product prefix removed when the card already
  // names the product, and the ingredient replaced by a count when grouped.
  message: string
}

const PLACEHOLDER = '\u0000'

/**
 * Fold pairs whose explanation is word for word the same apart from the other
 * product's ingredient.
 *
 * The owner's screenshot: a BHA exfoliant against the Buffet serum clashed on
 * eight peptides - Multi-Peptide Complex, Acetyl Hexapeptide-8,
 * Pentapeptide-18 and five more - and every pair carried the same sentence
 * about low-pH acids degrading peptides. Eight near-identical paragraphs said
 * one thing. Grouped here, they become one line naming the eight ingredients.
 *
 * The rule is textual and deliberately narrow: two pairs merge only when their
 * severity, alert type and message match once the conflicting ingredient is
 * blanked out. Anything else - a different explanation, a different severity,
 * a message that does not contain its own ingredient - stays its own line, so
 * nothing is ever merged on a guess about chemistry.
 *
 * The "Conflict with <product>: " prefix is dropped when the card already
 * names that product, since every line in the card would otherwise repeat it.
 * Order is kept: a group sits where its first pair was, so the backend's
 * most-severe-first order still holds.
 */
export const groupSimilarDetails = (
  details: readonly ConflictDetail[] | null | undefined,
  conflictingProduct?: string | null,
): ConflictDetailGroup[] => {
  const stripProduct = (message: string) => {
    if (!conflictingProduct) return message
    for (const prefix of [`Category Conflict with ${conflictingProduct}: `, `Conflict with ${conflictingProduct}: `]) {
      if (message.startsWith(prefix)) return message.slice(prefix.length)
    }
    return message
  }

  const groups: Array<ConflictDetailGroup & { template: string | null }> = []
  for (const detail of details ?? []) {
    const message = stripProduct(detail.message)
    const other = detail.conflicting_ingredient?.trim()
    const template = other && message.includes(other) ? message.split(other).join(PLACEHOLDER) : null
    const match = template
      ? groups.find((g) => g.template === template && g.severity === detail.severity && g.alert_type === detail.alert_type)
      : undefined

    if (match && other) {
      match.ingredients.push(other)
    } else {
      groups.push({
        alert_type: detail.alert_type,
        severity: detail.severity,
        ingredients: other ? [other] : [],
        message,
        template,
      })
    }
  }

  return groups.map(({ template, ...group }) =>
    group.ingredients.length > 1 && template
      ? { ...group, message: template.split(PLACEHOLDER).join(`these ${group.ingredients.length} ingredients`) }
      : group,
  )
}

export const SKIN_TYPE_CONFLICT = 'Skin Type Conflict'

/**
 * Merge every Skin Type Conflict into one card, the way the backend merges the
 * pairs of one clashing product.
 *
 * The backend deliberately leaves skin-type alerts one per ingredient, since
 * each is about the checked product itself rather than about another product.
 * A formula with several ingredients poorly suited to the user's type still
 * drew one near-identical card each, which is the same flood the product merge
 * removed. Grouped here instead, on the frontend, so the backend contract is
 * untouched: the merged card takes the place of the first skin-type alert, its
 * severity is the most severe of them, and each original alert becomes one
 * detail, most severe first.
 *
 * One skin-type alert is left exactly as it arrived - there is nothing to group.
 */
export const groupSkinTypeConflicts = (warnings: readonly WarningAlert[] | null | undefined): WarningAlert[] => {
  const list: WarningAlert[] = [...(warnings ?? [])]
  const skin = list.filter((w) => w.alert_type === SKIN_TYPE_CONFLICT)
  if (skin.length < 2) return list

  const ordered = sortBySeverity(skin)
  const merged: WarningAlert = {
    alert_type: SKIN_TYPE_CONFLICT,
    severity: ordered[0]!.severity,
    message: `${skin.length} ingredients in this formula are poorly suited to your skin type.`,
    conflicting_product: null,
    details: ordered.map((w) => ({
      alert_type: SKIN_TYPE_CONFLICT,
      severity: w.severity,
      ingredient: '',
      conflicting_ingredient: null,
      message: w.message,
    })),
  }

  // Everything before the first skin-type alert is a non-skin warning, so its
  // index in the filtered list is the same as in the original.
  const first = list.findIndex((w) => w.alert_type === SKIN_TYPE_CONFLICT)
  const rest = list.filter((w) => w.alert_type !== SKIN_TYPE_CONFLICT)
  rest.splice(first, 0, merged)
  return rest
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
 * `unassessed`  the check ran and returned no verdict for this product
 * `unavailable` the check did not run
 *
 * FE-DEF-29: the last two were one member. Both are "we cannot say this product
 * is safe", which is why they share every consequence that matters - neither
 * clears a product and neither lets a save through - but they have opposite
 * remedies, and the copy on all three surfaces could only be true of one of
 * them. "Please try again shortly" is the right thing to tell someone whose
 * request never completed and the wrong thing to tell someone looking at a
 * catalogue row with nothing recorded to check against, for whom retrying will
 * never do anything.
 *
 * Which of the two it is was never missing: `failed` is an argument to
 * evaluateSafety and the response body is in front of it. The two were being
 * collapsed here and the information discarded, so the components downstream
 * had nothing left to phrase a true sentence from. Splitting the member gives
 * it back to them without the API growing a field.
 */
export type SafetyStatus = 'cleared' | 'warned' | 'unassessed' | 'unavailable'

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

  // Carried on every branch below, including the unassessed one, rather than
  // being emptied there. A response can genuinely arrive with dupes and no
  // verdict, and hiding that here would leave showsDuplicates() looking like it
  // guards something that cannot happen.
  const duplicates = Array.isArray(analysis.duplicates) ? analysis.duplicates : []

  // Warnings win over a contradictory verdict. If the backend reports conflicts
  // it does not matter what is_safe says - the conservative reading applies.
  if (warnings.length > 0) {
    return { status: 'warned', warnings, duplicates }
  }

  if (analysis.is_safe === true) {
    return { status: 'cleared', warnings: [], duplicates }
  }

  // The request completed and the body came back without conflicts and without
  // an affirmative verdict. Still not a pass - the rule above holds - but it is
  // an answer, and the thing it says is that this product was not assessed.
  // Distinct from the branch at the top, which is the absence of an answer.
  return { status: 'unassessed', warnings: [], duplicates }
}

/**
 * Whether an action gated on this check may proceed without interruption.
 *
 * Anything other than an explicit pass stops the flow. Callers must branch on
 * this rather than on `warnings.length`, which cannot distinguish "nothing
 * found" from "nothing received".
 *
 * Written against `cleared` rather than against a list of the statuses that
 * stop, so splitting `unavailable` into two members in FE-DEF-29 could not
 * quietly open the gate: a new way of failing to clear a product fails closed
 * here by construction, without this line being touched.
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
 * It tests `unavailable` and not "anything short of cleared", which is the
 * difference that matters after FE-DEF-29 split the two. An `unassessed`
 * response came back: its duplicate scan ran and its list means what it says,
 * even though the conflict check reached no verdict. Those dupes are shown.
 * The distinction being drawn here is answered against unanswered, not safe
 * against unsafe - which is also why this must not be rewritten in terms of
 * blocksAction, whose line is drawn in the other place.
 *
 * Note this deliberately does NOT feed blocksAction. Owning a similar product
 * is information, not a hazard, and must never stop a save.
 */
export const showsDuplicates = (outcome: SafetyOutcome) =>
  outcome.status !== 'unavailable' && outcome.duplicates.length > 0

/**
 * `high` `medium` `low` `unknown`
 *
 * The strength of a warning's severity, for components that colour by it.
 *
 * FE-DEF-25: three components render this field and each banded it differently
 * - one three ways, one two ways, and one not at all, painting every warning
 * the same alarm red. The engine emits three severities, and the Low rule
 * (niacinamide with ascorbic acid, "short-term facial flushing") was drawn in
 * the same red as a retinoid layered with a BHA. Same class as FE-DEF-12, where
 * every match score was painted the same confident green; this is its mirror,
 * failing toward alarm rather than reassurance.
 *
 * The band is shared, not the colours. The three call sites render genuinely
 * different things - a badge chip in two of them, a line of text in the third -
 * so each keeps its own palette and takes the banding from here, which is the
 * arrangement resolveMatchBand already established.
 *
 * `unknown` is a real answer, not a default. A missing severity used to print
 * as "HIGH" through `severity || 'HIGH'`, a value the backend never sent.
 */
export type SeverityBand = 'high' | 'medium' | 'low' | 'unknown'

export const resolveSeverityBand = (severity: string | null | undefined): SeverityBand => {
  if (typeof severity !== 'string') return 'unknown'

  const normalised = severity.trim().toLowerCase()
  if (normalised === 'high') return 'high'
  if (normalised === 'medium') return 'medium'
  if (normalised === 'low') return 'low'
  return 'unknown'
}

const SEVERITY_ORDER: Record<SeverityBand, number> = { high: 0, medium: 1, low: 2, unknown: 3 }

/**
 * Warnings ordered most severe first, as a new array.
 *
 * Lists that show only their first few warnings put the worst one on screen by
 * construction, so a High clash can never be the one behind "Show more".
 * Warnings of equal severity keep the order the backend sent them in, because
 * Array.prototype.sort is stable (ES2019) - no index tiebreak is needed.
 * Unknown severities sort last rather than first - an unbanded warning is not
 * more alarming for having no grade (FE-DEF-25).
 */
export const sortBySeverity = <T extends { severity?: string | null }>(warnings: readonly T[] | null | undefined): T[] =>
  [...(warnings ?? [])].sort(
    (a, b) => SEVERITY_ORDER[resolveSeverityBand(a.severity)] - SEVERITY_ORDER[resolveSeverityBand(b.severity)],
  )

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
