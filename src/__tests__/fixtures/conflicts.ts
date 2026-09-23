/**
 * Warnings in the grouped shape the backend sends from feat/group-conflicts-by-
 * product (88733e9): one warning per clashing product, its ingredient pairs in
 * `details`, most severe first. Modelled on the live case in the owner's
 * screenshot - the 2% BHA exfoliant against the Buffet serum, where every
 * peptide pair carried the same sentence.
 */
import type { ConflictDetail, WarningAlert } from '../../api/safety'

export const BUFFET = '"Buffet" Multi-Technology Peptide Serum'

/** The backend's exact peptide sentence, one per peptide. */
export const peptidePair = (peptide: string): ConflictDetail => ({
  alert_type: 'Active Routine Clash',
  severity: 'Medium',
  ingredient: 'Salicylic Acid',
  conflicting_ingredient: peptide,
  message: `Category Conflict with ${BUFFET}: Combining Salicylic Acid with ${peptide} is unadvised. Low-pH BHA exfoliants can degrade peptide activity through deamination when layered in the same routine.`,
})

export const PEPTIDES = [
  'Multi-Peptide Complex',
  'Acetyl Hexapeptide-8',
  'Pentapeptide-18',
  'Palmitoyl Tripeptide-1',
  'Palmitoyl Tetrapeptide-7',
]

/** A pair with a reason of its own, which must never fold into the peptides. */
export const distinctPair = (severity: string, conflicting: string, reason: string): ConflictDetail => ({
  alert_type: severity === 'High' ? 'Chemical Interaction Warning' : 'Active Routine Clash',
  severity,
  ingredient: 'Salicylic Acid',
  conflicting_ingredient: conflicting,
  message: `Conflict with ${BUFFET}: Layering Salicylic Acid with ${conflicting} ${reason}`,
})

/**
 * One product, seven pairs, three reasons: a High pair with its own reason,
 * five Medium peptides sharing one sentence, a Low pair with its own reason.
 * Grouped, that is three lines - the first two shown, one behind Show more.
 */
export const mergedBuffet = (): WarningAlert => ({
  alert_type: 'Chemical Interaction Warning',
  severity: 'High',
  message: `Conflict with ${BUFFET}: 7 ingredient clashes. Salicylic Acid with Copper Tripeptide-1, Multi-Peptide Complex, ...`,
  conflicting_product: BUFFET,
  details: [
    distinctPair('High', 'Copper Tripeptide-1', 'releases free copper ions that oxidise the acid.'),
    ...PEPTIDES.map(peptidePair),
    distinctPair('Low', 'Hyaluronic Acid', 'can briefly lower its hydrating effect.'),
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
