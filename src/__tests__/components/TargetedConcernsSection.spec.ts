import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import TargetedConcernsSection from '../../components/Shelf/TargetedConcernsSection.vue'

const withConcerns = (concerns: unknown) => ({ products: { concerns } })

/** A shelf item whose ingredients carry the given good_for / ingredient_concerns. */
const withIngredients = (...ingredients: Record<string, unknown>[]) => ({
  products: { product_ingredients: ingredients.map((ing) => ({ ingredients: ing })) },
})

const mountSection = (item: unknown) => mount(TargetedConcernsSection, { props: { item } })

const chips = (wrapper: VueWrapper) => wrapper.findAll('.flex-wrap > span').map((s) => s.text())

describe('src/components/Shelf/TargetedConcernsSection.vue', () => {
  describe('suitedFor (computed)', () => {
    it('collects short tags and skips sentence-length descriptions', () => {
      const wrapper = mountSection(
        withConcerns(['Acne', 'Dryness', 'This is a full descriptive sentence rather than a tag']),
      )

      expect(chips(wrapper)).toEqual(['Acne', 'Dryness'])
    })

    it('splits a comma-separated string and drops duplicates', () => {
      const wrapper = mountSection(withConcerns('Acne, Redness, Acne'))

      expect(chips(wrapper)).toEqual(['Acne', 'Redness'])
    })

    it('draws nothing when there is nothing to list', () => {
      const wrapper = mountSection(withConcerns([]))

      expect(wrapper.text()).toBe('')
    })

    it('reads what each ingredient is good for', () => {
      const wrapper = mountSection(
        withIngredients({ name: 'Glycerin', good_for: 'Dry Skin, Dehydrated Skin' }, { name: 'BHA', good_for: 'Oily Skin' }),
      )

      expect(chips(wrapper)).toEqual(['Dry Skin', 'Dehydrated Skin', 'Oily Skin'])
    })

    it('never lists an ingredient warning as something the product is suited for', () => {
      // The reason for the rename. ingredient_concerns are warnings - the
      // product page shows them under "Formula Concerns & Sensitivity Profile" -
      // and this component used to read their titles into the same chips as
      // good_for, under a heading that now says "Best Suited For".
      const wrapper = mountSection(
        withIngredients({
          name: 'Retinol',
          good_for: 'Aging Skin',
          ingredient_concerns: [{ concern_title: 'Photosensitivity', concern_description: 'x' }],
        }),
      )

      expect(chips(wrapper)).toEqual(['Aging Skin'])
      expect(wrapper.text()).not.toContain('Photosensitivity')
    })

    it('skips the catalogue placeholder "None" rather than listing it as a match', () => {
      const wrapper = mountSection(
        withIngredients({ name: 'Water', good_for: 'None' }, { name: 'Glycerin', good_for: 'Dry Skin' }),
      )

      expect(chips(wrapper)).toEqual(['Dry Skin'])
    })
  })

  describe('heading (render)', () => {
    it('says the chips are what the product suits, not what to worry about', () => {
      // "Targeted Skin Concerns" read as the opposite of the product page, where
      // "concerns" means warnings.
      const wrapper = mountSection(withConcerns(['Dry Skin']))

      expect(wrapper.get('h4').text()).toBe('Best Suited For')
      expect(wrapper.text()).toContain("Skin types and needs this product's ingredients are known to support.")
      expect(wrapper.text()).not.toContain('Concern')
    })
  })

  describe('stepping', () => {
    const twelve = Array.from({ length: 12 }, (_, i) => `Need ${i + 1}`)

    it('shows five, then five more at a time, then exactly what is left', async () => {
      const wrapper = mountSection(withConcerns(twelve))
      const more = () => wrapper.find('button.show-more')

      expect(chips(wrapper)).toHaveLength(5)
      expect(more().text()).toContain('Show 5 more')

      await more().trigger('click')
      expect(chips(wrapper)).toHaveLength(10)
      expect(more().text()).toContain('Show 2 more')

      await more().trigger('click')
      expect(chips(wrapper)).toHaveLength(12)
      expect(more().exists()).toBe(false)
    })

    it('keeps the full count in the header', () => {
      const wrapper = mountSection(withConcerns(twelve))

      expect(wrapper.text()).toContain('12 Listed')
    })
  })
})
