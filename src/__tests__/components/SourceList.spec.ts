import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import SourceList from '../../components/Shared/SourceList.vue'
import { readIngredientSources, readProductSources, readSourceList } from '../../api/sources'

const ref = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  title: `Source ${id}`,
  publisher: 'European Commission',
  url: `https://example.org/${id}`,
  source_type: 'regulatory_register',
  accessed_on: null,
  notes: null,
  ...overrides,
})

describe('src/components/Shared/SourceList.vue', () => {
  describe('render', () => {
    it('says no source is linked yet rather than disappearing', () => {
      // Owner request, and the backend's advice: keep the gap visible.
      const wrapper = mount(SourceList, { props: { entries: [] } })

      expect(wrapper.get('.source-none').text()).toBe('No published source linked yet')
      expect(wrapper.find('a').exists()).toBe(false)
    })

    it('links each source in a new tab without handing it this page', () => {
      const wrapper = mount(SourceList, { props: { entries: readSourceList([ref('cosing'), ref('cir')]) } })
      const links = wrapper.findAll('a.source-link')

      expect(links.map((a) => a.text())).toEqual(['Source cosing', 'Source cir'])
      expect(links.map((a) => a.attributes('href'))).toEqual(['https://example.org/cosing', 'https://example.org/cir'])
      for (const a of links) {
        expect(a.attributes('target')).toBe('_blank')
        expect(a.attributes('rel')).toBe('noopener noreferrer')
      }
      expect(wrapper.find('.source-none').exists()).toBe(false)
    })

    it('names which claim each source backs, and who published it', () => {
      const wrapper = mount(SourceList, {
        props: { entries: readIngredientSources([{ claim: 'good_for', sources: ref('a') }]) },
      })

      expect(wrapper.get('.source-claim').text()).toBe('Good for:')
      expect(wrapper.get('.source-publisher').text()).toBe('(European Commission)')
    })

    it('names a book without a link', () => {
      const wrapper = mount(SourceList, {
        props: { entries: readSourceList([ref('book', { url: null, source_type: 'reference_book' })]) },
      })

      expect(wrapper.find('a').exists()).toBe(false)
      expect(wrapper.get('.source-title').text()).toBe('Source book')
      expect(wrapper.get('.source-title').attributes('title')).toBe('Book')
    })

    it('never renders an unsafe link, because the reader has already dropped it', () => {
      const wrapper = mount(SourceList, { props: { entries: readSourceList([ref('x', { url: 'javascript:alert(1)' })]) } })

      expect(wrapper.find('a').exists()).toBe(false)
      expect(wrapper.get('.source-title').text()).toBe('Source x')
    })
  })

  // Appended last (backend feat/product-sources), so no group ID above moves.
  describe('product facts', () => {
    it('labels each product fact, and dates the price, since a price is only true on the day it was seen', () => {
      const wrapper = mount(SourceList, {
        props: {
          entries: readProductSources({
            product_sources: [
              { claim: 'price', sources: ref('shop', { accessed_on: '2026-09-20' }) },
              { claim: 'image', sources: ref('obf', { accessed_on: '2026-09-21' }) },
            ],
          }),
        },
      })
      const entries = wrapper.findAll('.source-entry')

      expect(entries.map((e) => e.get('.source-claim').text())).toEqual(['Price:', 'Photo:'])
      expect(entries[0]!.get('.source-seen').text()).toBe('seen Sep 20, 2026')
      // Only a price is dated: a photo or a listing does not go stale by day.
      expect(entries[1]!.find('.source-seen').exists()).toBe(false)
    })

    it('does not date a price source with no date', () => {
      const wrapper = mount(SourceList, {
        props: { entries: readProductSources({ product_sources: [{ claim: 'price', sources: ref('shop') }] }) },
      })

      expect(wrapper.find('.source-seen').exists()).toBe(false)
    })

    it('says what the line is about when given a label, and "Sources:" otherwise', () => {
      const labelled = mount(SourceList, { props: { entries: [], label: 'Where these details come from:' } })
      expect(labelled.get('.source-label').text()).toBe('Where these details come from:')

      expect(mount(SourceList, { props: { entries: [] } }).get('.source-label').text()).toBe('Sources:')
    })
  })
})
