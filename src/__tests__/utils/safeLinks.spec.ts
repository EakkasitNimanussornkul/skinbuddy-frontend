import { describe, it, expect } from 'vitest'

import { LINK_REL, isHttpUrl, linkHost, safeHref } from '../../utils/safeLinks'

describe('src/utils/safeLinks.ts', () => {
  describe('safeHref() and isHttpUrl()', () => {
    it('accepts an http or https address with a host, and gives it back as the browser reads it', () => {
      expect(safeHref('https://brand.example/cleanser')).toBe('https://brand.example/cleanser')
      expect(safeHref('  http://shop.example/p?id=1  ')).toBe('http://shop.example/p?id=1')
      expect(isHttpUrl('https://brand.example')).toBe(true)
    })

    it('refuses javascript:, data:, vbscript: and file: values, whatever their case or leading spaces', () => {
      for (const value of ['javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:msgbox(1)', 'file:///etc/passwd']) {
        expect(safeHref(value)).toBeNull()
        expect(isHttpUrl(value)).toBe(false)
      }
    })

    it('refuses a value with a tab or newline hidden inside the scheme, which a browser would still read as javascript:', () => {
      expect(safeHref('java\tscript:alert(1)')).toBeNull()
      expect(safeHref('java\nscript:alert(1)')).toBeNull()
    })

    it('refuses an address with no scheme, a scheme-relative one, an empty one and anything that is not text', () => {
      for (const value of ['brand.example', '//brand.example/x', '', '   ', 'https://', null, undefined, 42, {}]) {
        expect(safeHref(value)).toBeNull()
      }
    })
  })

  describe('linkHost()', () => {
    it('gives the host a link really goes to, not the text before an @ that pretends to be one', () => {
      expect(linkHost('https://brand.example/cleanser')).toBe('brand.example')
      expect(linkHost('https://brand.example@evil.example/login')).toBe('evil.example')
    })

    it('gives a non-ASCII lookalike host in its punycode form, which gives the lookalike away', () => {
      // "pаypal" with a Cyrillic а.
      expect(linkHost('https://pаypal.example/')).toMatch(/^xn--/)
    })

    it('gives no host for a value that is not a web address', () => {
      expect(linkHost('javascript:alert(1)')).toBeNull()
      expect(linkHost(null)).toBeNull()
    })
  })

  describe('LINK_REL', () => {
    it('marks a link a user sent as nofollow ugc, and keeps noopener noreferrer on every external link', () => {
      expect(LINK_REL.user).toBe('noopener noreferrer nofollow ugc')
      expect(LINK_REL.curated).toBe('noopener noreferrer')
    })
  })
})
