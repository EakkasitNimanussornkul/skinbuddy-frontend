import {
  NOT_ENOUGH_INFO,
  describeMatchFraction,
  readMatchBreakdown,
  resolveMatchBand,
  type MatchBand,
  type MatchBreakdown,
} from '../../api/products'

/**
 * The label and palette of a skin match score badge.
 *
 * Shared by the Explore product card and the recommendation cards, which sit on
 * the same page and must not draw the same score two ways. The thresholds are
 * resolveMatchBand's (FE-DEF-12); only the look is decided here.
 *
 * `unavailable` is a real answer, not a zero: a score nobody computed is not a
 * weak match, and gets no percentage.
 *
 * 60-84 is teal, a green, not amber (owner decision). Amber read as a warning,
 * and a product in that band usually suits the user well; it is a good match,
 * one step short of a great one.
 */
export const MATCH_BADGE_CLASS: Record<MatchBand, string> = {
  strong: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  moderate: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800/50',
  weak: 'bg-rose-50 text-semantic-error dark:bg-semantic-error/15 border-semantic-error/25',
  unavailable: 'bg-stone-100 text-brand-text-muted dark:bg-stone-800 dark:text-stone-400 border-brand-surface-border dark:border-stone-700',
}

export const describeMatchBadge = (score: number | null | undefined) => {
  const band = resolveMatchBand(score)
  const percent = band === 'unavailable' ? null : Math.round(score as number)
  const label =
    percent === null ? 'Score Unavailable' : band === 'weak' ? `${percent}% Caution` : `${percent}% Match`

  return { band, percent, label, class: MATCH_BADGE_CLASS[band] }
}

/**
 * `scored`      a score with enough behind it: percentage, band and fraction
 * `limited`     a score resting on fewer than three relevant ingredients -
 *               withheld by default (owner decision), in the neutral palette
 * `unavailable` no score was computed
 *
 * A limited score keeps its real percentage in `percent` and `hiddenLabel`, so
 * a screen can offer it on request rather than lose it.
 */
export type MatchDisplayKind = 'scored' | 'limited' | 'unavailable'

export interface MatchDisplay {
  kind: MatchDisplayKind
  band: MatchBand
  percent: number | null
  label: string
  class: string
  breakdown: MatchBreakdown | null
  fraction: string | null
  hiddenLabel: string | null
}

export const describeMatchDisplay = (score: number | null | undefined, rawBreakdown: unknown): MatchDisplay => {
  const badge = describeMatchBadge(score)
  const breakdown = readMatchBreakdown(rawBreakdown)

  if (badge.band === 'unavailable') {
    return { kind: 'unavailable', ...badge, breakdown, fraction: null, hiddenLabel: null }
  }
  if (breakdown?.limited) {
    return {
      kind: 'limited',
      band: 'unavailable',
      percent: badge.percent,
      label: NOT_ENOUGH_INFO,
      class: MATCH_BADGE_CLASS.unavailable,
      breakdown,
      fraction: describeMatchFraction(breakdown),
      hiddenLabel: `${badge.label} from only ${breakdown.considered} of its ${breakdown.total_ingredients} ingredients`,
    }
  }
  return { kind: 'scored', ...badge, breakdown, fraction: breakdown ? describeMatchFraction(breakdown) : null, hiddenLabel: null }
}
