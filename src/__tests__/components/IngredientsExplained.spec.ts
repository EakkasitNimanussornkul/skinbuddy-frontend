import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import IngredientsExplained from '../../components/Catalog/IngredientsExplained.vue'

const ingredient = (name: string, overrides: Record<string, unknown> = {}) => ({
  id: `i-${name}`,
  name,
  functional_group: 'Humectant',
  awareness_tier: 'low',
  benefits: `${name} benefit.`,
  ...overrides,
})

const many = (n: number) => Array.from({ length: n }, (_, i) => ingredient(`Ingredient ${i + 1}`))

const mountExplained = (ingredientsList: unknown[]) =>
  mount(IngredientsExplained, { props: { ingredientsList } })

const shown = (wrapper: VueWrapper) => wrapper.findAll('h4').map((h) => h.text())
const more = (wrapper: VueWrapper) => wrapper.find('button.show-more')

describe('src/components/Catalog/IngredientsExplained.vue', () => {
  describe('explanations (render)', () => {
    it('explains each ingredient with its group and benefit', () => {
      const wrapper = mountExplained([ingredient('Glycerin')])

      expect(wrapper.text()).toContain('Glycerin')
      expect(wrapper.text()).toContain('Humectant')
      expect(wrapper.text()).toContain('Glycerin benefit.')
      expect(wrapper.text()).toContain('1 Total')
    })

    it('falls back to a base-formula explanation when no benefit is recorded', () => {
      const wrapper = mountExplained([ingredient('Water', { benefits: null, functional_group: null })])

      expect(wrapper.text()).toContain('Formulation Base')
      expect(wrapper.text()).toContain('Supports the overall formula')
    })
  })

  describe('stepping', () => {
    it('shows five explanations, then four more at a time', () => {
      // Owner request: this jumped from five to every explanation at once.
      const wrapper = mountExplained(many(12))

      expect(shown(wrapper)).toHaveLength(5)
      expect(more(wrapper).text()).toContain('Show 4 more explanations')
    })

    it('reveals the next four, then exactly what is left', async () => {
      const wrapper = mountExplained(many(12))

      await more(wrapper).trigger('click')
      expect(shown(wrapper)).toHaveLength(9)
      expect(more(wrapper).text()).toContain('Show 3 more explanations')

      await more(wrapper).trigger('click')
      expect(shown(wrapper)).toHaveLength(12)
      expect(more(wrapper).exists()).toBe(false)
    })

    it('folds back to five', async () => {
      const wrapper = mountExplained(many(12))
      await more(wrapper).trigger('click')

      await wrapper.get('button.show-less').trigger('click')

      expect(shown(wrapper)).toHaveLength(5)
    })

    it('offers no control for five or fewer', () => {
      const wrapper = mountExplained(many(5))

      expect(shown(wrapper)).toHaveLength(5)
      expect(wrapper.findAll('button')).toHaveLength(0)
    })

    it('keeps the total visible whatever is folded', () => {
      const wrapper = mountExplained(many(12))

      expect(wrapper.text()).toContain('12 Total')
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('source status', () => {
    it('says the ingredient notes are not yet checked against a published source, and links to our sources', () => {
      // The backend's ingredients.source says exactly that for every entry.
      const wrapper = mountExplained(many(2))
      const note = wrapper.get('.source-status-note')
      const link = note.get('.source-status-link')

      expect(note.text()).toContain('not yet checked against a published source')
      expect(link.attributes('href') ?? link.attributes('to')).toBe('/how-match-works')
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('sources per ingredient', () => {
    const sourceRef = (id: string) => ({
      id,
      title: 'Source ' + id,
      publisher: 'European Commission',
      url: 'https://example.org/' + id,
      source_type: 'regulatory_register',
      accessed_on: null,
      notes: null,
    })

    it("lists each ingredient's sources under it, and says when there are none yet", () => {
      const wrapper = mountExplained([
        ingredient('Glycerin', { ingredient_sources: [{ claim: 'good_for', sources: sourceRef('cosing') }] }),
        ingredient('Water'),
      ])
      const lists = wrapper.findAll('.source-list')

      expect(lists[0]!.get('a.source-link').text()).toBe('Source cosing')
      expect(lists[0]!.get('.source-claim').text()).toBe('Good for:')
      expect(lists[1]!.get('.source-none').text()).toBe('No published source linked yet')
    })

    it('counts the sourced ingredients in the note above the list', () => {
      const none = mountExplained([ingredient('Water'), ingredient('Glycerin')])
      expect(none.get('.source-status-text').text()).toContain('not yet checked against a published source')

      const some = mountExplained([
        ingredient('Glycerin', { ingredient_sources: [{ claim: 'good_for', sources: sourceRef('a') }] }),
        ingredient('Water'),
      ])
      expect(some.get('.source-status-text').text()).toContain('1 of 2 ingredients here have a published source linked')

      const all = mountExplained([ingredient('Glycerin', { ingredient_sources: [{ claim: 'good_for', sources: sourceRef('a') }] })])
      expect(all.get('.source-status-text').text()).toBe('Every ingredient here has a published source linked, shown under each one.')
    })
  })
})
