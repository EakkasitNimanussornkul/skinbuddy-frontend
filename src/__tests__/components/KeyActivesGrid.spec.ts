import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import KeyActivesGrid from '../../components/Shelf/KeyActivesGrid.vue'

const row = (name: string, functional_group: string | null = 'Humectant') => ({
  ingredients: { id: `i-${name}`, name, benefits: `${name} benefit.`, functional_group },
})

const actives = (n: number) => Array.from({ length: n }, (_, i) => row(`Active ${i + 1}`))

const mountGrid = (ingredients: ReturnType<typeof row>[], collapsible = false) =>
  mount(KeyActivesGrid, { props: { ingredients, collapsible } })

const names = (wrapper: VueWrapper) =>
  wrapper.findAll('.grid > div span.truncate.block').map((s) => s.text())

const more = (wrapper: VueWrapper) => wrapper.find('button.show-more')
const foldToggle = (wrapper: VueWrapper) => wrapper.find('h3 button')

describe('src/components/Shelf/KeyActivesGrid.vue', () => {
  describe('keyActives (computed)', () => {
    it('drops stabilisers, solvents, vehicles and ungrouped ingredients', () => {
      const wrapper = mountGrid([
        row('Niacinamide', 'Vitamin B3'),
        row('Water', 'Solvent'),
        row('Xanthan Gum', 'Formulation Stabilizer'),
        row('Carrier', 'Vehicle'),
        row('Mystery', null),
      ])

      expect(names(wrapper)).toEqual(['Niacinamide'])
      expect(wrapper.text()).toContain('1 Actives')
    })

    it('says so when nothing qualifies, rather than drawing an empty grid', () => {
      const wrapper = mountGrid([row('Water', 'Solvent')])

      expect(wrapper.text()).toContain('No therapeutic chemical groups found')
      expect(more(wrapper).exists()).toBe(false)
    })
  })

  describe('stepping', () => {
    it('shows four actives, then four more at a time', async () => {
      // Owner request: this went from four to every active at once, which
      // flooded the shelf item details.
      const wrapper = mountGrid(actives(10))

      expect(names(wrapper)).toHaveLength(4)
      expect(more(wrapper).text()).toContain('Show 4 more actives')

      await more(wrapper).trigger('click')
      expect(names(wrapper)).toHaveLength(8)
      expect(more(wrapper).text()).toContain('Show 2 more actives')

      await more(wrapper).trigger('click')
      expect(names(wrapper)).toHaveLength(10)
    })

    it('keeps the full count in the header while folded down to four', () => {
      const wrapper = mountGrid(actives(10))

      expect(wrapper.text()).toContain('10 Actives')
    })
  })

  describe('collapsible', () => {
    it('offers no fold where the host did not ask for one', () => {
      // The compare matrix, where the actives are the panel's subject.
      const wrapper = mountGrid(actives(3))

      expect(foldToggle(wrapper).exists()).toBe(false)
      expect(wrapper.get('h3').text()).toContain('Key Active Formulas')
    })

    it('starts open, and folds the whole grid from the heading', async () => {
      const wrapper = mountGrid(actives(6), true)
      const region = () => wrapper.get(`[id="${foldToggle(wrapper).attributes('aria-controls')}"]`)
      // v-show's inline style, read directly. isVisible() reported this region
      // visible after the fold on an unattached mount even though its style was
      // display: none, so it could not tell the two states apart here.
      const hidden = () => (region().attributes('style') ?? '').includes('display: none')

      expect(foldToggle(wrapper).attributes('aria-expanded')).toBe('true')
      expect(foldToggle(wrapper).text()).toContain('Hide')
      expect(hidden()).toBe(false)

      await foldToggle(wrapper).trigger('click')

      expect(foldToggle(wrapper).attributes('aria-expanded')).toBe('false')
      expect(foldToggle(wrapper).text()).toContain('Show')
      expect(hidden()).toBe(true)
      // Folded, the heading still says what is behind it.
      expect(foldToggle(wrapper).text()).toContain('6 Actives')
    })

    it('keeps the stepped position across a fold and unfold', async () => {
      const wrapper = mountGrid(actives(10), true)
      await more(wrapper).trigger('click')

      await foldToggle(wrapper).trigger('click')
      await foldToggle(wrapper).trigger('click')

      expect(names(wrapper)).toHaveLength(8)
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('source status', () => {
    it('labels the active notes as not yet checked, and says nothing when there are none', () => {
      const withActives = mountGrid(actives(1))
      expect(withActives.get('.source-status-note').text()).toContain('not yet checked against a published source')

      const empty = mountGrid([])
      expect(empty.find('.source-status-note').exists()).toBe(false)
    })
  })
})
