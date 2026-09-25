import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import SourceList from '../../components/Shared/SourceList.vue'
import { readIngredientSources, readSourceList } from '../../api/sources'

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
})
