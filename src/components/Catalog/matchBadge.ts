import { resolveMatchBand, type MatchBand } from '../../api/products'

/**
 * The label and palette of a skin match score badge.
 *
 * Shared by the Explore product card and the recommendation cards, which sit on
 * the same page and must not draw the same score two ways. The thresholds are
 * resolveMatchBand's (FE-DEF-12); only the look is decided here.
 *
 * `unavailable` is a real answer, not a zero: a score nobody computed is not a
 * weak match, and gets no percentage.
 */
export const MATCH_BADGE_CLASS: Record<MatchBand, string> = {
  strong: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  moderate: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
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
