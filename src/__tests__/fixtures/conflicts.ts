/**
 * Warnings in the grouped shape the backend sends from feat/group-conflicts-by-
 * product (88733e9): one warning per clashing product, its ingredient pairs in
 * `details`, most severe first. Modelled on the live case that prompted it -
 * the 2% BHA exfoliant against the Buffet serum, eight pairs in one product.
 */
import type { ConflictDetail, WarningAlert } from '../../api/safety'

export const detail = (severity: string, conflicting: string): ConflictDetail => ({
  alert_type: 'Active Routine Clash',
  severity,
  ingredient: 'Salicylic Acid',
  conflicting_ingredient: conflicting,
  message: `Combining Salicylic Acid with ${conflicting} is unadvised: the low pH can degrade it.`,
})

export const PEPTIDES = [
  'Multi-Peptide Complex',
  'Acetyl Hexapeptide-8',
  'Pentapeptide-18',
  'Palmitoyl Tripeptide-1',
  'Palmitoyl Tetrapeptide-7',
]

/** One product clashing on five pairs: High first, then Medium. */
export const mergedBuffet = (): WarningAlert => ({
  alert_type: 'Active Routine Clash',
  severity: 'High',
  message: 'Conflict with "Buffet" Multi-Technology Peptide Serum: 5 ingredient clashes. Salicylic Acid with Multi-Peptide Complex, ...',
  conflicting_product: '"Buffet" Multi-Technology Peptide Serum',
  details: [
    detail('High', PEPTIDES[0]!),
    detail('Medium', PEPTIDES[1]!),
    detail('Medium', PEPTIDES[2]!),
    detail('Medium', PEPTIDES[3]!),
    detail('Low', PEPTIDES[4]!),
  ],
})

/** A product with exactly one pair: the original sentence, one detail. */
export const singlePair = (): WarningAlert => ({
  alert_type: 'Chemical Interaction Warning',
  severity: 'Medium',
  message: 'Conflict with Glycolic Toner: layering two exfoliating acids can over-exfoliate.',
  conflicting_product: 'Glycolic Toner',
  details: [
    {
      alert_type: 'Chemical Interaction Warning',
      severity: 'Medium',
      ingredient: 'Salicylic Acid',
      conflicting_ingredient: 'Glycolic Acid',
      message: 'Conflict with Glycolic Toner: layering two exfoliating acids can over-exfoliate.',
    },
  ],
})

export const skinAlert = (message: string, severity = 'High'): WarningAlert => ({
  alert_type: 'Skin Type Conflict',
  severity,
  message,
  conflicting_product: null,
  details: [],
})
