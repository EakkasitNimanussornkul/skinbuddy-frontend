import type { SeverityBand } from '../../api/safety'

/**
 * Classes for one `ingredient_concerns` entry, by its severity band.
 *
 * Every concern used to be drawn in the same alarm red, whatever its grade, so
 * a Low preservative note looked as serious as a High retinoid one - the
 * FE-DEF-25 pattern, on concerns rather than warnings. The product page and the
 * compare page draw the same records, so they share one palette here; it is the
 * one the shelf's inspection card already uses for the same grades.
 *
 * `unknown` is toned like Low and has no grade chip: an ungraded concern is not
 * more alarming for having no grade.
 */
export const CONCERN_TONE: Record<SeverityBand, { card: string; icon: string; grade: string }> = {
  high: {
    card: 'bg-semantic-error/5 dark:bg-semantic-error/10 border-semantic-error/15',
    icon: 'bg-semantic-error/10 border-semantic-error/20 text-semantic-error',
    grade: 'bg-semantic-error/10 border-semantic-error/20 text-semantic-error',
  },
  medium: {
    card: 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50',
    icon: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/80 dark:border-amber-800/60 dark:text-amber-400',
    grade: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/80 dark:border-amber-800/60 dark:text-amber-400',
  },
  low: {
    card: 'bg-brand-bg-light dark:bg-stone-900/50 border-brand-surface-border dark:border-stone-700',
    icon: 'bg-stone-100 border-stone-300 text-stone-600 dark:bg-stone-800/80 dark:border-stone-600/60 dark:text-stone-300',
    grade: 'bg-stone-100 border-stone-300 text-stone-600 dark:bg-stone-800/80 dark:border-stone-600/60 dark:text-stone-300',
  },
  unknown: {
    card: 'bg-brand-bg-light dark:bg-stone-900/50 border-brand-surface-border dark:border-stone-700',
    icon: 'bg-stone-100 border-stone-300 text-stone-600 dark:bg-stone-800/80 dark:border-stone-600/60 dark:text-stone-300',
    grade: '',
  },
}
