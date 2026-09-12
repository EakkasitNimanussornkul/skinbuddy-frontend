/**
 * Shared CompareResponse fixtures for the four compare-panel specs.
 *
 * Kept outside any *.spec.ts file so vitest does not collect it, and shared
 * rather than copied because the panels render the same response - a fixture
 * that drifted between two of their specs would let them disagree about what a
 * comparison looks like.
 */
import type { CompareResponse } from '../../api/products'

export const ingredient = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  ingredients: { id, name, benefits: null, functional_group: null, ...extra },
})

export const WATER = ingredient('i-water', 'Water')
export const GLYCERIN = ingredient('i-gly', 'Glycerin', {
  benefits: 'Draws water into the skin.',
  functional_group: 'Humectant',
})
export const RETINOL = ingredient('i-ret', 'Retinol', {
  benefits: 'Speeds cell turnover.',
  functional_group: 'Retinoid',
})
export const SALICYLIC = ingredient('i-bha', 'Salicylic Acid', {
  benefits: 'Clears pores.',
  functional_group: 'Exfoliant',
})

export const compareProduct = (overrides: Record<string, unknown> = {}) => ({
  id: 'p-a',
  brand: 'CeraVe',
  name: 'Resurfacing Retinol Serum',
  category: 'Serum',
  skin_match_score: null,
  safety_flags: {},
  product_ingredients: [WATER, GLYCERIN, RETINOL],
  ...overrides,
})

/**
 * A retinol serum against a BHA exfoliant. They share Water and Glycerin - a
 * base and a humectant, not an active - which is the ordinary shape of a real
 * comparison and the one that exposed the "Unique" label.
 */
export const compareData = (
  a: Record<string, unknown> = {},
  b: Record<string, unknown> = {},
  rest: Partial<CompareResponse> = {},
): CompareResponse => ({
  product_a: compareProduct(a),
  product_b: compareProduct({
    id: 'p-b',
    brand: 'Paula’s Choice',
    name: 'BHA Liquid Exfoliant',
    product_ingredients: [WATER, GLYCERIN, SALICYLIC],
    ...b,
  }),
  shared_ingredients: [
    // `benefits` omitted rather than null: SharedIngredient types it as
    // `string | undefined`. The backend builds it with `.get("benefits")`, which
    // serialises a missing value as null, so that type is narrower than what
    // can arrive - noted, not changed here, since nothing reads the field.
    { id: 'i-water', name: 'Water' },
    { id: 'i-gly', name: 'Glycerin', benefits: 'Draws water into the skin.' },
  ],
  similarity_score: 50,
  conflicts: [],
  ...rest,
})
