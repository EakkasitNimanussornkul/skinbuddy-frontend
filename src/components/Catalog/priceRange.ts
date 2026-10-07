/**
 * The price filter's rules, in one place for Explore and its slider.
 *
 * A price filter is a lowest price and a highest price, and the highest may be
 * absent: `maxCap` is a number of baht, or `null` for no upper limit. The bar
 * starts at 0 to 1,500 and its far end reads "฿1,500+": it stands for no limit,
 * not for 1,500, so a product above 1,500 is not hidden unless the shopper
 * asked for a cap. Typing a higher number sets a cap and grows the bar to fit.
 */

/** The lowest price there is. */
export const PRICE_FLOOR = 0
/** The end of the bar before anyone types a higher cap; it stands for no limit. */
export const PRICE_SCALE_DEFAULT = 1500
/** The highest cap that can be set (the old desktop ceiling box's limit). */
export const PRICE_CAP_LIMIT = 20000
/** The least the two handles may be apart, in baht. */
export const PRICE_GAP = 20
/** A grown bar ends on a multiple of this, so its scale reads as a tidy number. */
export const PRICE_SCALE_STEP = 500
/** What one keyboard step or one notch of a handle moves, in baht. */
export const PRICE_HANDLE_STEP = 10

/**
 * A price filter, as one object so everything that carries it (the page's active
 * state, the phone sheet's draft, the slider's events) changes in one place.
 */
export interface PriceRange {
  min: number
  maxCap: number | null
}

/**
 * Said wherever a price filter is on: a product with no listed price is neither
 * at least the lowest nor at most the cap, so the server leaves it out.
 */
export const UNPRICED_NOTE = 'Products with no listed price are hidden while a price filter is on.'

/**
 * Where the bar ends for a cap: 1,500 for no limit or a cap below it, and
 * otherwise the cap rounded up to the next 500, never above 20,000. A cap of
 * exactly 1,500 gets a bar to 2,000, so that 1,500 stays a real cap rather than
 * the end of the default bar, which means no limit.
 */
export const scaleEndFor = (maxCap: number | null): number => {
  if (maxCap === null || !Number.isFinite(maxCap) || maxCap < PRICE_SCALE_DEFAULT) return PRICE_SCALE_DEFAULT
  if (maxCap === PRICE_SCALE_DEFAULT) return PRICE_SCALE_DEFAULT + PRICE_SCALE_STEP
  return Math.min(PRICE_CAP_LIMIT, Math.ceil(maxCap / PRICE_SCALE_STEP) * PRICE_SCALE_STEP)
}

export const baht = (amount: number) => `฿${amount.toLocaleString('en-US')}`

export const isPriceFiltered = (min: number, maxCap: number | null) => min > PRICE_FLOOR || maxCap !== null

/** The wording of the removable chip: "Up to ฿1,000", "฿200 to ฿800", "From ฿200". */
export const priceChipLabel = (min: number, maxCap: number | null) => {
  if (maxCap === null) return `From ${baht(min)}`
  return min <= PRICE_FLOOR ? `Up to ${baht(maxCap)}` : `${baht(min)} to ${baht(maxCap)}`
}

/** The wording on the Price button: "Price: any", "Price: up to ฿800" and so on. */
export const priceButtonLabel = (min: number, maxCap: number | null) => {
  if (!isPriceFiltered(min, maxCap)) return 'Price: any'
  if (maxCap === null) return `Price: from ${baht(min)}`
  return min <= PRICE_FLOOR ? `Price: up to ${baht(maxCap)}` : `Price: ${baht(min)} – ${baht(maxCap)}`
}

/** A price as a whole number of baht; anything that is not a number of zero or more is the fallback. */
export const readBaht = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback

/**
 * A range from anywhere (the phone sheet's draft, the popover) made safe to
 * request: a lowest price that is not a number is 0, a highest that is not a
 * number is no limit, a cap above 20,000 is 20,000, and a range given the wrong
 * way round is put in order.
 */
export const normalizePriceRange = (min: unknown, maxCap: unknown): PriceRange => {
  let low = readBaht(min, PRICE_FLOOR)
  let cap: number | null = maxCap === null || maxCap === undefined ? null : readBaht(maxCap, -1)
  if (cap !== null && cap < 0) cap = null
  if (cap !== null && cap > PRICE_CAP_LIMIT) cap = PRICE_CAP_LIMIT
  if (cap !== null && low > cap) [low, cap] = [cap, low]
  return { min: low, maxCap: cap }
}

export type TypedPrice = { kind: 'empty' } | { kind: 'value'; value: number } | { kind: 'invalid' }

/**
 * What was typed into Lowest or Highest: blank, a whole number of baht (a ฿ sign,
 * commas and spaces are allowed), or something else.
 */
export const parseTypedPrice = (text: string): TypedPrice => {
  const cleaned = text.replace(/[฿,\s]/g, '')
  if (cleaned === '') return { kind: 'empty' }
  if (!/^\d{1,9}$/.test(cleaned)) return { kind: 'invalid' }
  return { kind: 'value', value: Number(cleaned) }
}
