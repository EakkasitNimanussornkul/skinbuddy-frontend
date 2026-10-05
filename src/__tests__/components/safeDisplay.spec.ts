import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'

import ExternalLink from '../../components/Shared/ExternalLink.vue'
import RevealedText from '../../components/Submissions/RevealedText.vue'
import HiddenCharsNotice from '../../components/Submissions/HiddenCharsNotice.vue'

const fallback = { fallback: () => h('span', { class: 'plain' }, 'not a web link') }

describe('safe display components', () => {
  describe('ExternalLink', () => {
    it('renders a user link for an http(s) address, in a new tab, with rel noopener noreferrer nofollow ugc', () => {
      const wrapper = mount(ExternalLink, { props: { url: 'https://brand.example/toner' }, attrs: { class: 'my-link' } })

      const a = wrapper.get('a.my-link')
      expect(a.attributes('href')).toBe('https://brand.example/toner')
      expect(a.attributes('target')).toBe('_blank')
      expect(a.attributes('rel')).toBe('noopener noreferrer nofollow ugc')
      expect(a.text()).toBe('https://brand.example/toner')
    })

    it('keeps rel noopener noreferrer for a curated source', () => {
      const wrapper = mount(ExternalLink, { props: { url: 'https://example.org/cosing', kind: 'curated' } })
      expect(wrapper.get('a').attributes('rel')).toBe('noopener noreferrer')
    })

    it('renders the fallback instead of a link for javascript:, data: or an address with no scheme, and no link at all', () => {
      for (const url of ['javascript:alert(1)', 'data:text/html,<b>x</b>', 'brand.example', null]) {
        const wrapper = mount(ExternalLink, { props: { url }, slots: fallback })
        expect(wrapper.find('a').exists()).toBe(false)
        expect(wrapper.get('.plain').text()).toBe('not a web link')
      }
    })

    it('links to the address as the browser reads it, so the link goes where the check looked', () => {
      const wrapper = mount(ExternalLink, { props: { url: '  https://brand.example/a b ' } })
      expect(wrapper.get('a').attributes('href')).toBe('https://brand.example/a%20b')
    })

    it('with show-host, shows the real host first in bold and then the full address', () => {
      const wrapper = mount(ExternalLink, { props: { url: 'https://brand.example@evil.example/login', showHost: true } })

      const parts = wrapper.get('a').element.children
      expect(parts[0]!.tagName).toBe('STRONG')
      expect(parts[0]!.textContent).toBe('evil.example')
      expect(parts[1]!.textContent).toBe('https://brand.example@evil.example/login')
    })
  })

  describe('RevealedText', () => {
    it('shows each hidden character as a marked [U+...] and adds the warning', () => {
      const wrapper = mount(RevealedText, { props: { text: 'Cera\u202EeV' } })

      expect(wrapper.get('mark.hidden-char').text()).toBe('[U+202E]')
      expect(wrapper.text()).toContain('Cera[U+202E]eV')
      expect(wrapper.get('.hidden-chars-warning').text()).toBe('This text contains hidden characters')
      expect(wrapper.html()).not.toContain('\u202E')
    })

    it('shows plain text exactly as it is, with no marker and no warning', () => {
      const wrapper = mount(RevealedText, { props: { text: 'CeraVe' } })
      expect(wrapper.text()).toBe('CeraVe')
      expect(wrapper.find('mark').exists()).toBe(false)
      expect(wrapper.find('.hidden-chars-warning').exists()).toBe(false)
    })

    it('shows markup in the text as text, never as elements', () => {
      const wrapper = mount(RevealedText, { props: { text: '<img src=x onerror=alert(1)>' } })
      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.text()).toBe('<img src=x onerror=alert(1)>')
    })

    it('leaves the warning out when asked to, keeping the markers', () => {
      const wrapper = mount(RevealedText, { props: { text: 'A\u200BB', warn: false } })
      expect(wrapper.find('mark').exists()).toBe(true)
      expect(wrapper.find('.hidden-chars-warning').exists()).toBe(false)
    })
  })

  describe('HiddenCharsNotice', () => {
    it('says a value holds hidden characters, shows them as markers, and offers to remove them', async () => {
      const wrapper = mount(HiddenCharsNotice, { props: { value: 'Cera\u200BVe', label: 'brand' } })

      expect(wrapper.text()).toContain('This text contains hidden characters')
      expect(wrapper.get('mark').text()).toBe('[U+200B]')
      await wrapper.get('button.remove-hidden-chars').trigger('click')
      expect(wrapper.emitted('clean')).toHaveLength(1)
    })

    it('shows nothing for a value without hidden characters', () => {
      expect(mount(HiddenCharsNotice, { props: { value: 'CeraVe' } }).find('.hidden-chars-notice').exists()).toBe(false)
    })
  })
})
