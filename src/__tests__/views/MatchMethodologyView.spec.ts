import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

import MatchMethodologyView from '../../views/MatchMethodologyView.vue'
import {
  MATCH_BAND_MODERATE,
  MATCH_BAND_STRONG,
  MATCH_METHOD_PATH,
  MATCH_SCORE_BASIS,
  MATCH_SCORE_DISCLAIMER,
} from '../../api/products'

const mountPage = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: MATCH_METHOD_PATH, component: MatchMethodologyView },
    ],
  })
  await router.push('/')
  await router.push(MATCH_METHOD_PATH)
  await router.isReady()

  const wrapper = mount(MatchMethodologyView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

/** Each data source block as { what, status }, in page order. */
const sources = (wrapper: VueWrapper) =>
  wrapper.findAll('.method-source').map((s) => ({
    what: s.get('h3').text(),
    status: s.get('.method-status').text(),
  }))

describe('src/views/MatchMethodologyView.vue', () => {
  describe('explanation (render)', () => {
    it('explains the score in the same words as every screen that shows it', async () => {
      // Owner request: be open about how % Match works.
      const { wrapper } = await mountPage()

      expect(wrapper.get('h1').text()).toBe('How % Match works')
      expect(wrapper.get('.method-basis').text()).toBe(MATCH_SCORE_BASIS)
      expect(wrapper.get('.method-disclaimer').text()).toBe(MATCH_SCORE_DISCLAIMER)
    })

    it('states the formula, the grade weights and a worked example that adds up', async () => {
      const { wrapper } = await mountPage()

      expect(wrapper.get('.method-formula').text()).toContain(
        'ingredients that suit you ÷ (ingredients that suit you + weighted concerns)',
      )
      expect(wrapper.findAll('.method-weight').map((w) => w.text().replace(/,\s*$/, ''))).toEqual([
        'High 1',
        'Moderate 0.6',
        'Low 0.3',
      ])
      // 6 / (6 + 0.6) = 0.909..., which rounds to 91%.
      expect(wrapper.get('.method-example').text()).toContain('6 ÷ (6 + 0.6) = 91%')
      expect(Math.round((6 / 6.6) * 100)).toBe(91)
    })

    it('explains Not enough info, and says the score can still be seen', async () => {
      const { wrapper } = await mountPage()

      expect(wrapper.get('.method-limited').text()).toContain('fewer than 3')
      expect(wrapper.get('.method-limited').text()).toContain('Not enough info')
    })

    it('draws the bands from the same cut-offs the badges use', async () => {
      const { wrapper } = await mountPage()

      expect(wrapper.findAll('.method-band').map((b) => b.text())).toEqual([
        'Great match (' + MATCH_BAND_STRONG + '% and above)',
        'Good match (' + MATCH_BAND_MODERATE + '% to ' + (MATCH_BAND_STRONG - 1) + '%)',
        'Low match, use with care (below ' + MATCH_BAND_MODERATE + '%)',
      ])
    })

    it('says plainly what the score cannot tell you', async () => {
      const { wrapper } = await mountPage()
      const limits = wrapper.get('.method-limits').text()

      expect(limits).toContain('not how much of each')
      expect(limits).toContain('far more ingredients are tagged for dry skin than for oily skin')
    })
  })

  describe('data sources (render)', () => {
    it('credits each source only for what it supplied, and marks the rest not yet checked', async () => {
      // The backend traced the catalogue: Open Beauty Facts supplied photos for
      // three products and nothing else. Crediting it with the ingredient lists
      // would name a source they did not come from.
      const { wrapper } = await mountPage()

      expect(sources(wrapper)).toEqual([
        { what: 'Some product photos', status: 'Source credited' },
        { what: 'Product names, descriptions and ingredient lists', status: 'Not yet checked' },
        { what: 'Skin types', status: 'Source credited' },
        { what: 'Ingredient notes, benefits, "good for" tags and concerns', status: 'Not yet checked' },
      ])
    })

    it('names the Baumann system and the book it comes from', async () => {
      const { wrapper } = await mountPage()

      expect(wrapper.text()).toContain("Dr Leslie Baumann's book The Skin Type Solution (2006)")
    })

    it('opens every outside link in a new tab without handing it this page', async () => {
      const { wrapper } = await mountPage()
      const links = wrapper.findAll('a.method-link')

      expect(links.map((a) => a.attributes('href'))).toEqual([
        'https://world.openbeautyfacts.org/',
        'https://opendatacommons.org/licenses/odbl/1-0/',
        'https://ec.europa.eu/growth/tools-databases/cosing/',
        'https://www.cir-safety.org/',
        'https://pubchem.ncbi.nlm.nih.gov/',
      ])
      for (const a of links) {
        expect(a.attributes('target')).toBe('_blank')
        expect(a.attributes('rel')).toBe('noopener noreferrer')
      }
    })

    it('presents the references as where sources are being looked for, not what the notes rest on', async () => {
      const { wrapper } = await mountPage()
      const notes = wrapper.findAll('.method-source')[3]!.text()

      expect(notes).toContain('have not yet been checked against a published source')
      expect(notes).toContain('We are adding sources from these references')
    })
  })

  describe('back', () => {
    it('returns to the page the user came from', async () => {
      const { wrapper, router } = await mountPage()
      const back = vi.spyOn(router, 'back')

      await wrapper.get('button').trigger('click')

      expect(back).toHaveBeenCalledTimes(1)
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('scores at either end', () => {
    it('says a perfect score is never shown as 100%, and why', async () => {
      const { wrapper } = await mountPage()

      expect(wrapper.get('.method-whole').text()).toContain('We never show 100%.')
      expect(wrapper.get('.method-whole').text()).toContain('All 11 relevant ingredients suit your skin type')
    })
  })
})
