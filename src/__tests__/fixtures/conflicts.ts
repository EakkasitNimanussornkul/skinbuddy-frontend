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

/**
 * An ingredient-pair (pass 1) clash, in the backend's exact form. Unlike the
 * category sentence above it never names the other product's ingredient - the
 * name is only in conflicting_ingredient. A different reason keeps it from
 * folding into anything.
 */
export const distinctPair = (severity: string, conflicting: string, reason: string): ConflictDetail => ({
  alert_type: severity === 'High' ? 'Chemical Interaction Warning' : 'Active Routine Clash',
  severity,
  ingredient: 'Salicylic Acid',
  conflicting_ingredient: conflicting,
  message: `Conflict with ${BUFFET}: Layering Salicylic Acid directly alongside it triggers a structural clash. ${reason}`,
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
    distinctPair('High', 'Copper Tripeptide-1', 'Releases free copper ions that oxidise the acid.'),
    ...PEPTIDES.map(peptidePair),
    distinctPair('Low', 'Hyaluronic Acid', 'Can briefly lower its hydrating effect.'),
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

/**
 * A skin-type alert in the shape of backend feat/skin-type-explanations
 * (b4c7e66): one reason per matched trait of the user's code, in code order,
 * the alert graded by its worst reason. Modelled on the backend's own example -
 * Alcohol Denat. for a DSPT user, flagged for (D) and (S).
 */
export const explainedAlcohol = (): WarningAlert => ({
  alert_type: 'Skin Type Conflict',
  severity: 'High',
  message: 'Personalized Alert: Alcohol Denat. is known to trigger adverse reactions for Baumann Type DSPT.',
  conflicting_product: null,
  details: [],
  reasons: [
    {
      trait: 'Extremely Dry Skin (D)',
      title: 'Barrier Stripping',
      description: 'Drying alcohols dissolve surface lipids and worsen water loss on dry skin.',
      severity: 'High',
    },
    {
      trait: 'Highly Sensitive Skin (S)',
      title: 'Stinging on Application',
      description: 'Can sting reactive skin, especially over a compromised barrier.',
      severity: 'Medium',
    },
  ],
})

/** One explained reason graded Medium, so the whole alert is Medium. */
export const explainedNiacinamide = (): WarningAlert => ({
  alert_type: 'Skin Type Conflict',
  severity: 'Medium',
  message: 'Personalized Alert: Niacinamide is known to trigger adverse reactions for Baumann Type OSPW.',
  conflicting_product: null,
  details: [],
  reasons: [
    {
      trait: 'Highly Sensitive Skin (S)',
      title: 'Flush & Stinging Flare',
      description: 'High concentrations can cause temporary flushing on sensitive skin.',
      severity: 'Medium',
    },
  ],
})

/** A trigger with no concern written yet: the trait alone, graded High. */
export const unexplainedPreservative = (): WarningAlert => ({
  alert_type: 'Skin Type Conflict',
  severity: 'High',
  message: 'Personalized Alert: Methylisothiazolinone is known to trigger adverse reactions for Baumann Type OSPW.',
  conflicting_product: null,
  details: [],
  reasons: [{ trait: 'Highly Sensitive Skin (S)', title: null, description: null, severity: 'High' }],
})
