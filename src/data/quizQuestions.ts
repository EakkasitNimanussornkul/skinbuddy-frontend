/**
 * SkinBuddy skin-type quiz, question bank v2 (DRAFT).
 *
 * All wording is original. It is written for the four Baumann axes but does not
 * reproduce or paraphrase her published questionnaire.
 *
 * Scoring this bank is written for (approved design):
 *   - Points options score 1-4, low letter to high letter.
 *   - Skip answers ('unsure', 'not_applicable') count as NO evidence: they are
 *     left out of the axis average entirely.
 *   - Axis letter: average of counted answers >= HIGH_LETTER_THRESHOLD gives the
 *     high letter (O / S / P / W), otherwise the low letter (D / R / N / T).
 *   - After an axis's core block, backups are asked in order while that axis has
 *     fewer than MIN_COUNTED counted answers or its average is exactly the
 *     threshold, up to MAX_BACKUPS_PER_AXIS.
 *   - Low confidence: fewer than MIN_COUNTED counted answers, or the average is
 *     within CLOSE_CALL_MARGIN of the threshold.
 *
 * The "About you" answer (Sex) only selects question variants during the quiz.
 * It is never stored, never sent to the backend, never shown on the result.
 *
 * ---------------------------------------------------------------------------
 * SOURCE STATUS PER QUESTION
 *   "direct"  = the question observes the trait the letter names; no separate
 *               skin claim is needed for the axis link.
 *   "NEEDS A CHECKED SOURCE" = the axis link rests on a skin claim that must be
 *               backed by a checked source before release (claim in brackets).
 * ---------------------------------------------------------------------------
 * CORE
 *   hyd-1   NEEDS A CHECKED SOURCE [visible shine / tightness late in the day reflects oil and dryness level]
 *   hyd-2   NEEDS A CHECKED SOURCE [shine in photos reflects surface oil]
 *   hyd-3   NEEDS A CHECKED SOURCE [how a base product wears reflects oil and dryness]
 *   hyd-4   NEEDS A CHECKED SOURCE [comfort in dry indoor air reflects dryness level]
 *   sen-1   NEEDS A CHECKED SOURCE [frequency of red raised spots belongs on the sensitivity axis]
 *   sen-2   direct (reactions to products are the trait)
 *   sen-3   NEEDS A CHECKED SOURCE [acne and rosacea belong on the sensitivity axis]
 *   sen-4   NEEDS A CHECKED SOURCE [contact reaction to metal belongs on the sensitivity axis]
 *   pig-1   NEEDS A CHECKED SOURCE [dark marks after pimples / razor bumps / ingrown hairs indicate pigment tendency]
 *   pig-2   NEEDS A CHECKED SOURCE [lasting darkening after a small wound indicates pigment tendency]
 *   pig-3-hormone  NEEDS A CHECKED SOURCE [patches appearing with pregnancy or hormonal treatment indicate pigment tendency]
 *   pig-3-patches  direct (darker patches on the face are the trait)
 *   pig-4   direct (freckles and flat brown spots are the trait)
 *   age-1   direct (lines at rest and in motion are the trait)
 *   age-2   NEEDS A CHECKED SOURCE [age group is a fair input to the wrinkle-prone axis, and these bands]
 *   age-3   NEEDS A CHECKED SOURCE [past unprotected sun exposure belongs on the wrinkle-prone axis]
 *   age-4   NEEDS A CHECKED SOURCE [daily daylight exposure belongs on the wrinkle-prone axis]
 * BACKUP
 *   hyd-b1  NEEDS A CHECKED SOURCE [oil on a pressed tissue reflects oil level]
 *   hyd-b2  NEEDS A CHECKED SOURCE [time for shine to return reflects oil level]
 *   hyd-b3  NEEDS A CHECKED SOURCE [how often skin feels dry reflects dryness level]
 *   sen-b1  NEEDS A CHECKED SOURCE [lasting flushing belongs on the sensitivity axis]
 *   sen-b2  NEEDS A CHECKED SOURCE [reaction to scented products belongs on the sensitivity axis]
 *   sen-b3  NEEDS A CHECKED SOURCE [reaction to temperature change or wind belongs on the sensitivity axis]
 *   pig-b1  direct (new brown spots after sun are the trait)
 *   pig-b2-patches  direct (darker patches on the face are the trait)
 *   pig-b2-tan      NEEDS A CHECKED SOURCE [how skin darkens in sun indicates pigment tendency]
 *   pig-b3  direct (dark marks visible now are the trait)
 *   age-b1  NEEDS A CHECKED SOURCE [how long pillow creases last relates to the wrinkle-prone axis]
 *   age-b2  NEEDS A CHECKED SOURCE [sunscreen habit belongs on the wrinkle-prone axis]
 *   age-b3  direct (change in lines and firmness over time is the trait)
 */

// --- Types ------------------------------------------------------------------

export type QuizAxis = 'hydration' | 'sensitivity' | 'pigmentation' | 'aging'

export type Sex = 'female' | 'male' | 'unspecified'

export type Points = 1 | 2 | 3 | 4

export interface PointsOption {
  text: string
  points: Points
}

export type SkipKind = 'unsure' | 'not_applicable'

export interface SkipOption {
  text: string
  kind: SkipKind
}

export type QuizOption = PointsOption | SkipOption

/** The parts of a question a sex variant may override. */
export interface QuestionContent {
  text: string
  subtext?: string
  /** The "Why we ask" line: what the question looks at, in plain words. */
  why: string
  /** Scored options, ordered from the low letter to the high letter. */
  options: PointsOption[]
  /** Skip buttons shown under the options, with their exact labels. */
  skips: SkipOption[]
}

export interface QuizQuestion extends QuestionContent {
  /** Stable id, never a position index. */
  id: string
  axis: QuizAxis
  /** Per-sex override of wording, options or skips. */
  variants?: Partial<Record<Sex, Partial<QuestionContent>>>
  /** Asked only for these sexes. Omitted means asked for everyone. */
  onlyFor?: Sex[]
}

/** A question after its variant for one sex has been applied. */
export interface ResolvedQuestion extends QuestionContent {
  id: string
  axis: QuizAxis
}

export interface AboutYouQuestion {
  id: string
  text: string
  subtext: string
  options: { text: string; value: Sex }[]
}

// --- Constants --------------------------------------------------------------

/** An axis with fewer counted (non-skip) answers than this gets backups. */
export const MIN_COUNTED = 2
export const MAX_BACKUPS_PER_AXIS = 2
/** An average within this distance of the threshold is a close call. */
export const CLOSE_CALL_MARGIN = 0.25
/** Average of counted answers >= this gives the high letter. */
export const HIGH_LETTER_THRESHOLD = 2.5

export const AXIS_LETTERS: Record<QuizAxis, { low: string; high: string }> = {
  hydration: { low: 'D', high: 'O' },
  sensitivity: { low: 'R', high: 'S' },
  pigmentation: { low: 'N', high: 'P' },
  aging: { low: 'T', high: 'W' },
}

// Shared skip labels.
const NOT_SURE: SkipOption = { text: "I'm not sure", kind: 'unsure' }
const CANT_REMEMBER: SkipOption = { text: "I can't remember", kind: 'unsure' }

// --- About you (asked first, not scored) --------------------------------------

export const ABOUT_YOU_QUESTION: AboutYouQuestion = {
  id: 'about-sex',
  text: 'Which best describes your biological sex?',
  subtext:
    "We only use this to choose which questions to show you. It isn't saved or shared, and it doesn't appear in your result.",
  options: [
    { text: 'Female', value: 'female' },
    { text: 'Male', value: 'male' },
    { text: 'Prefer not to say', value: 'unspecified' },
  ],
}

// --- Core questions: 4 per axis for every sex ---------------------------------

export const CORE_QUESTIONS: QuizQuestion[] = [
  // ---------------- Hydration (Dry 1 ... Oily 4) ----------------
  {
    id: 'hyd-1',
    axis: 'hydration',
    text: 'At the end of a normal day, before you wash your face, how does the skin on your forehead, nose and cheeks look and feel?',
    why: 'This looks at how much shine or dryness your skin shows after a full day.',
    options: [
      { text: 'Rough, flaky or tight in most places', points: 1 },
      { text: 'Comfortable, with no shine', points: 2 },
      { text: 'Shiny on the forehead and nose, but not the cheeks', points: 3 },
      { text: 'Shiny across most of my face', points: 4 },
    ],
    skips: [NOT_SURE],
  },
  {
    id: 'hyd-2',
    axis: 'hydration',
    text: 'In photos or video calls taken later in the day, how does your face usually come across?',
    why: 'This looks at whether your skin reflects light, which a camera often shows more clearly than a mirror.',
    options: [
      { text: 'Dull, or with dry-looking patches', points: 1 },
      { text: 'Even, with no shine', points: 2 },
      { text: 'Some shine on the forehead or nose', points: 3 },
      { text: 'Shiny over most of my face', points: 4 },
    ],
    skips: [{ text: "I can't tell from photos", kind: 'unsure' }],
  },
  {
    id: 'hyd-3',
    axis: 'hydration',
    text: "When you wear sunscreen, tinted moisturiser or foundation, how does it look by mid-afternoon if you haven't touched it up?",
    why: 'This looks at how your skin changes a product sitting on top of it over several hours.',
    options: [
      { text: 'Patchy, or clinging to dry areas', points: 1 },
      { text: 'Much the same as when I put it on', points: 2 },
      { text: 'Shiny in places', points: 3 },
      { text: 'Shiny all over, or starting to break up and slide', points: 4 },
    ],
    skips: [{ text: "I don't wear any of these", kind: 'not_applicable' }, NOT_SURE],
  },
  {
    id: 'hyd-4',
    axis: 'hydration',
    text: 'After several hours in an air-conditioned room with no moisturiser on, how does your face feel?',
    why: 'This looks at how your skin copes when the air around it is dry.',
    options: [
      { text: 'Dry, itchy or starting to flake', points: 1 },
      { text: 'A little tight', points: 2 },
      { text: 'Comfortable', points: 3 },
      { text: 'Comfortable, and oily by the end', points: 4 },
    ],
    skips: [
      { text: "I'm rarely in air-conditioning that long", kind: 'not_applicable' },
      NOT_SURE,
    ],
  },

  // ---------------- Sensitivity (Resistant 1 ... Sensitive 4) ----------------
  {
    id: 'sen-1',
    axis: 'sensitivity',
    text: 'In a typical month, how many new red, raised spots appear on your face? Count pimples and irritation bumps, not insect bites.',
    why: 'This looks at how often your skin becomes red and inflamed.',
    options: [
      { text: 'None', points: 1 },
      { text: 'One or two', points: 2 },
      { text: 'Three to five', points: 3 },
      { text: 'More than five', points: 4 },
    ],
    skips: [NOT_SURE],
    variants: {
      female: {
        subtext: 'If this changes over your cycle, think of an average month.',
      },
      male: {
        subtext: 'Leave out bumps that only appear after shaving; a later question covers those.',
      },
    },
  },
  {
    id: 'sen-2',
    axis: 'sensitivity',
    text: 'When you start using a new face product, such as a cleanser, moisturiser, sunscreen or makeup, how does your skin usually respond?',
    why: 'This looks at how easily products on your face cause stinging, itching, redness or breakouts.',
    options: [
      { text: 'No reaction', points: 1 },
      { text: 'Now and then a mild tingle that soon fades', points: 2 },
      { text: 'Stinging, itching, redness or breakouts with some products', points: 3 },
      { text: 'Stinging, itching, redness or breakouts with most products', points: 4 },
    ],
    skips: [{ text: "I don't use face products", kind: 'not_applicable' }, NOT_SURE],
    variants: {
      male: {
        text: 'When you start using a new face product, such as a cleanser, moisturiser, sunscreen, shaving foam or aftershave, how does your skin usually respond?',
      },
    },
  },
  {
    id: 'sen-3',
    axis: 'sensitivity',
    text: 'This one is about acne and rosacea. Which fits you best?',
    why: 'This looks at whether you have a known long-term skin condition that involves redness or breakouts.',
    options: [
      { text: "I don't have either, as far as I know", points: 1 },
      { text: "I think I may have one, but it hasn't been checked", points: 2 },
      { text: 'A health professional confirmed one, and it is mild or under control', points: 3 },
      { text: 'A health professional confirmed one, and it is moderate, severe or needs prescription treatment', points: 4 },
    ],
    skips: [NOT_SURE],
  },
  {
    id: 'sen-4',
    axis: 'sensitivity',
    text: 'Where metal rests on your skin for hours, such as earrings, a watch back, a belt buckle or a jeans button, do you get an itchy rash?',
    why: 'This looks at whether everyday contact with metal makes your skin react.',
    options: [
      { text: 'Never', points: 1 },
      { text: 'Once or twice', points: 2 },
      { text: 'Often', points: 3 },
      { text: 'Every time', points: 4 },
    ],
    skips: [
      { text: 'Nothing metal touches my skin for long', kind: 'not_applicable' },
      NOT_SURE,
    ],
  },

  // ---------------- Pigmentation (Non-pigmented 1 ... Pigmented 4) ----------------
  {
    id: 'pig-1',
    axis: 'pigmentation',
    text: 'Once a pimple or an ingrown hair has gone down, what is left on the skin?',
    why: 'This looks at whether your skin darkens where it has been inflamed.',
    options: [
      { text: 'Nothing; it looks as it did before', points: 1 },
      { text: 'A faint mark that fades within days', points: 2 },
      { text: 'A brown or dark mark that lasts a few weeks', points: 3 },
      { text: 'A dark mark that lasts for months', points: 4 },
    ],
    skips: [
      { text: 'I rarely get pimples or ingrown hairs', kind: 'not_applicable' },
      NOT_SURE,
    ],
    variants: {
      male: {
        text: 'Once a pimple, a razor bump or an ingrown hair in your beard area has gone down, what is left on the skin?',
        skips: [
          { text: 'I rarely get any of these', kind: 'not_applicable' },
          NOT_SURE,
        ],
      },
    },
  },
  {
    id: 'pig-2',
    axis: 'pigmentation',
    text: 'Think of the last small cut, graze or kitchen burn you had. After it closed up, did the skin stay darker than the skin around it?',
    subtext: 'Ignore pink or raised scars. This is only about brown or darker colour.',
    why: 'This looks at how long your skin keeps extra colour after a small injury heals.',
    options: [
      { text: 'No, it matched my usual colour', points: 1 },
      { text: 'Yes, for about a week', points: 2 },
      { text: 'Yes, for several weeks', points: 3 },
      { text: 'Yes, for months', points: 4 },
    ],
    skips: [CANT_REMEMBER],
  },
  {
    // Female only. Male and unspecified get pig-3-patches in the same slot.
    id: 'pig-3-hormone',
    axis: 'pigmentation',
    onlyFor: ['female'],
    text: 'During a pregnancy, or while taking hormonal contraception or hormone therapy, did new darker patches appear on your face?',
    why: 'This looks at whether your skin made new darker patches during a change in your hormones.',
    options: [
      { text: 'No new patches appeared', points: 1 },
      { text: 'One small patch', points: 2 },
      { text: 'A few patches', points: 3 },
      { text: 'Large patches, or many', points: 4 },
    ],
    skips: [
      { text: "This hasn't applied to me", kind: 'not_applicable' },
      NOT_SURE,
    ],
  },
  {
    // Male and unspecified. Asks for everyone what pig-3-hormone asks only in
    // one situation, so no skip is needed for "doesn't apply".
    id: 'pig-3-patches',
    axis: 'pigmentation',
    onlyFor: ['male', 'unspecified'],
    text: 'Look at your face in daylight, without makeup. Are there flat patches darker than the skin around them, for example on the cheeks, forehead or upper lip?',
    subtext: "Don't count moles or single freckles.",
    why: 'This looks at whether your skin has areas that have become darker than the rest.',
    options: [
      { text: 'None', points: 1 },
      { text: 'One small patch', points: 2 },
      { text: 'A few patches', points: 3 },
      { text: 'Large patches, or many', points: 4 },
    ],
    skips: [NOT_SURE],
  },
  {
    id: 'pig-4',
    axis: 'pigmentation',
    text: 'Not counting moles, how many freckles or small flat brown spots can you see on your face, shoulders and arms?',
    why: 'This looks at how many small spots of extra colour your skin has.',
    options: [
      { text: 'None', points: 1 },
      { text: 'A handful', points: 2 },
      { text: 'Quite a few', points: 3 },
      { text: 'Too many to count', points: 4 },
    ],
    skips: [NOT_SURE],
  },

  // ---------------- Aging (Tight 1 ... Wrinkle-prone 4) ----------------
  {
    id: 'age-1',
    axis: 'aging',
    text: 'In good light, look in a mirror with your face relaxed, then smile and raise your eyebrows. What do you see around your eyes and on your forehead?',
    why: 'This looks at whether lines show only when your face moves, or stay when it is still.',
    options: [
      { text: 'Smooth both times', points: 1 },
      { text: 'Lines appear only while I move', points: 2 },
      { text: 'A few faint lines stay when I relax', points: 3 },
      { text: 'Clear lines stay when I relax', points: 4 },
    ],
    skips: [NOT_SURE],
  },
  {
    id: 'age-2',
    axis: 'aging',
    text: 'Which age group are you in?',
    why: 'Your age group is weighed together with what you see in the mirror, not on its own.',
    options: [
      { text: 'Under 25', points: 1 },
      { text: '25 to 39', points: 2 },
      { text: '40 to 55', points: 3 },
      { text: '56 or over', points: 4 },
    ],
    skips: [],
  },
  {
    id: 'age-3',
    axis: 'aging',
    text: 'Over the years, how much time have you spent in strong sun without protecting your face, for example sunbathing, sport, outdoor work or beach trips?',
    why: 'This looks at how much unprotected sun your face has had over your life so far.',
    options: [
      { text: 'Very little', points: 1 },
      { text: 'Some, now and then', points: 2 },
      { text: 'A lot during some years', points: 3 },
      { text: 'A lot for most of my life', points: 4 },
    ],
    skips: [NOT_SURE],
  },
  {
    id: 'age-4',
    axis: 'aging',
    text: 'On a typical day, how long is your face in direct daylight?',
    subtext: 'Count travel, errands and time outdoors, whether or not you wear sunscreen.',
    why: 'This looks at how much daylight your face gets on an ordinary day.',
    options: [
      { text: 'Less than 15 minutes', points: 1 },
      { text: '15 minutes to an hour', points: 2 },
      { text: '1 to 3 hours', points: 3 },
      { text: 'More than 3 hours', points: 4 },
    ],
    skips: [NOT_SURE],
  },
]

// --- Backup questions: 3 per axis for every sex, asked in this order ----------

export const BACKUP_QUESTIONS: QuizQuestion[] = [
  // ---------------- Hydration ----------------
  {
    id: 'hyd-b1',
    axis: 'hydration',
    text: 'Press a clean tissue flat on your nose and forehead for a few seconds, a few hours after washing. What do you see on it?',
    why: 'This looks at how much oil sits on your skin, using something you can see.',
    options: [
      { text: 'Nothing, and my skin feels tight', points: 1 },
      { text: 'Nothing', points: 2 },
      { text: 'A faint oily mark', points: 3 },
      { text: 'Clear oily patches', points: 4 },
    ],
    skips: [{ text: "I can't check this now", kind: 'unsure' }],
  },
  {
    id: 'hyd-b2',
    axis: 'hydration',
    text: 'After you wash your face in the morning, when does it start to look shiny?',
    why: 'This looks at how quickly shine builds up again after washing.',
    options: [
      { text: "It doesn't; it feels tight or rough instead", points: 1 },
      { text: "It doesn't really get shiny", points: 2 },
      { text: 'By the evening', points: 3 },
      { text: 'Within a few hours', points: 4 },
    ],
    skips: [NOT_SURE],
  },
  {
    id: 'hyd-b3',
    axis: 'hydration',
    text: 'How often does your face feel dry enough that you want to put something on it?',
    why: 'This looks at how often your skin feels dry during an ordinary day.',
    options: [
      { text: 'Several times a day', points: 1 },
      { text: 'About once a day', points: 2 },
      { text: 'Rarely', points: 3 },
      { text: 'Never; it feels oily rather than dry', points: 4 },
    ],
    skips: [NOT_SURE],
  },

  // ---------------- Sensitivity ----------------
  {
    id: 'sen-b1',
    axis: 'sensitivity',
    text: 'After heat, spicy food, a hot drink or exercise, does your face turn red and stay that way for a while?',
    why: 'This looks at how easily your face flushes and how long it takes to settle.',
    options: [
      { text: 'No', points: 1 },
      { text: 'It goes pink and settles quickly', points: 2 },
      { text: 'Often, for 15 minutes or more', points: 3 },
      { text: 'Almost always, sometimes with a burning feeling', points: 4 },
    ],
    skips: [NOT_SURE],
  },
  {
    id: 'sen-b2',
    axis: 'sensitivity',
    text: 'Where scented products touch your skin, such as perfume, scented lotion, aftershave or laundry detergent, do you get itching or redness?',
    why: 'This looks at whether fragranced products make your skin react where they touch it.',
    options: [
      { text: 'Never', points: 1 },
      { text: 'Once or twice', points: 2 },
      { text: 'Often', points: 3 },
      { text: 'Every time', points: 4 },
    ],
    skips: [{ text: 'I avoid scented products', kind: 'not_applicable' }, NOT_SURE],
  },
  {
    id: 'sen-b3',
    axis: 'sensitivity',
    text: 'When you move between cold air-conditioning and outdoor heat, or face strong wind, how does your face react?',
    why: 'This looks at how your skin responds to sudden changes in temperature or air.',
    options: [
      { text: 'No change', points: 1 },
      { text: 'Slightly pink, and it fades quickly', points: 2 },
      { text: 'Red or itchy for a while', points: 3 },
      { text: 'Red, itchy or stinging most times', points: 4 },
    ],
    skips: [NOT_SURE],
  },

  // ---------------- Pigmentation ----------------
  {
    id: 'pig-b1',
    axis: 'pigmentation',
    text: 'After several days of strong sun, do new small brown spots or freckles appear on your face, shoulders or arms?',
    why: 'This looks at whether sun brings out new spots of colour on your skin.',
    options: [
      { text: 'No', points: 1 },
      { text: 'A few, and they fade', points: 2 },
      { text: 'Several, and they fade slowly', points: 3 },
      { text: 'Many, and some stay', points: 4 },
    ],
    skips: [{ text: "I'm rarely in strong sun", kind: 'not_applicable' }, NOT_SURE],
  },
  {
    // Female: the patches question, which male and unspecified already had in core.
    id: 'pig-b2-patches',
    axis: 'pigmentation',
    onlyFor: ['female'],
    text: 'Look at your face in daylight, without makeup. Are there flat patches darker than the skin around them, for example on the cheeks, forehead or upper lip?',
    subtext: "Don't count moles or single freckles.",
    why: 'This looks at whether your skin has areas that have become darker than the rest.',
    options: [
      { text: 'None', points: 1 },
      { text: 'One small patch', points: 2 },
      { text: 'A few patches', points: 3 },
      { text: 'Large patches, or many', points: 4 },
    ],
    skips: [NOT_SURE],
  },
  {
    id: 'pig-b2-tan',
    axis: 'pigmentation',
    onlyFor: ['male', 'unspecified'],
    text: 'After a few days outdoors without sunscreen, what happens to the colour of your skin?',
    why: 'This looks at how readily your skin darkens in the sun and how long that lasts.',
    options: [
      { text: 'It goes red, then back to my usual shade', points: 1 },
      { text: 'It darkens a little', points: 2 },
      { text: 'It darkens easily', points: 3 },
      { text: 'It darkens quickly and stays darker for months', points: 4 },
    ],
    skips: [
      { text: 'I always protect my skin from the sun', kind: 'not_applicable' },
      NOT_SURE,
    ],
  },
  {
    id: 'pig-b3',
    axis: 'pigmentation',
    text: 'Look at your face in a mirror now. Can you see flat brown or dark marks where old pimples or spots used to be?',
    why: 'This looks at marks you can see today, instead of asking you to remember how long past ones lasted.',
    options: [
      { text: 'None', points: 1 },
      { text: 'One or two', points: 2 },
      { text: 'Several', points: 3 },
      { text: 'Many', points: 4 },
    ],
    skips: [{ text: "I've rarely had pimples or spots", kind: 'not_applicable' }, NOT_SURE],
    variants: {
      male: {
        text: 'Look at your face in a mirror now. Can you see flat brown or dark marks where old pimples, razor bumps or ingrown hairs used to be?',
        skips: [{ text: "I've rarely had any of these", kind: 'not_applicable' }, NOT_SURE],
      },
    },
  },

  // ---------------- Aging ----------------
  {
    id: 'age-b1',
    axis: 'aging',
    text: 'When you wake up, how long do creases from your pillow stay on your face?',
    why: 'This looks at how quickly your skin springs back after being pressed.',
    options: [
      { text: "Gone within minutes, or I don't get any", points: 1 },
      { text: 'Up to half an hour', points: 2 },
      { text: 'About an hour', points: 3 },
      { text: 'Several hours', points: 4 },
    ],
    skips: [{ text: "I haven't noticed", kind: 'unsure' }],
  },
  {
    id: 'age-b2',
    axis: 'aging',
    text: 'How often do you put sunscreen on your face before going out in daylight?',
    why: 'This looks at how much of your daily sun your face is protected from.',
    options: [
      { text: 'Every day', points: 1 },
      { text: 'Most days', points: 2 },
      { text: 'Only on sunny or beach days', points: 3 },
      { text: 'Rarely or never', points: 4 },
    ],
    skips: [],
  },
  {
    id: 'age-b3',
    axis: 'aging',
    text: 'Compare your face today with a photo of yourself from about five years ago. What has changed?',
    why: 'This looks at how your lines and firmness have changed over a few years.',
    options: [
      { text: 'Nothing I can see', points: 1 },
      { text: 'A few new fine lines', points: 2 },
      { text: 'More lines, or skin looks less firm', points: 3 },
      { text: 'Clearly more lines and some sagging', points: 4 },
    ],
    skips: [
      { text: "I don't have a photo to compare", kind: 'not_applicable' },
      NOT_SURE,
    ],
  },
]

// --- Helpers ----------------------------------------------------------------

export const isSkip = (option: QuizOption): option is SkipOption => 'kind' in option

export const appliesTo = (question: QuizQuestion, sex: Sex): boolean =>
  !question.onlyFor || question.onlyFor.includes(sex)

/** Apply the sex variant, if any, over the base wording. */
export const resolveQuestion = (question: QuizQuestion, sex: Sex): ResolvedQuestion => {
  const variant = question.variants?.[sex] ?? {}
  return {
    id: question.id,
    axis: question.axis,
    text: variant.text ?? question.text,
    subtext: variant.subtext ?? question.subtext,
    why: variant.why ?? question.why,
    options: variant.options ?? question.options,
    skips: variant.skips ?? question.skips,
  }
}

/** The 16 core questions for one sex, in order. */
export const coreQuestionsFor = (sex: Sex): ResolvedQuestion[] =>
  CORE_QUESTIONS.filter((q) => appliesTo(q, sex)).map((q) => resolveQuestion(q, sex))

/** The 3 backups for one axis and sex, in the order they should be asked. */
export const backupQuestionsFor = (sex: Sex, axis: QuizAxis): ResolvedQuestion[] =>
  BACKUP_QUESTIONS.filter((q) => q.axis === axis && appliesTo(q, sex)).map((q) =>
    resolveQuestion(q, sex),
  )
