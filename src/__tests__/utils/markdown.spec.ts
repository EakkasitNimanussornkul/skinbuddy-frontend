import { describe, it, expect } from 'vitest'

import { renderMarkdown } from '../../utils/markdown'

// A reply in the answer template chat_service.py asks the model for.
const TEMPLATED_REPLY = [
  'Yes, but **not at the same time**.',
  '',
  '### How to use them',
  '1. Apply **vitamin C** in the morning.',
  '2. Apply **retinol** at night.',
  '',
  '### Tips',
  '- Start retinol 2-3 nights a week.',
  '- Always wear SPF.',
  '',
  '> **Caution:** Stop if your skin stings or peels.',
].join('\n')

const parse = (html: string) => {
  const root = document.createElement('div')
  root.innerHTML = html
  return root
}

describe('src/utils/markdown.ts', () => {
  describe('renderMarkdown()', () => {
    it('renders every part of the answer template as its own element', () => {
      const root = parse(renderMarkdown(TEMPLATED_REPLY))

      expect([...root.querySelectorAll('h3')].map((h) => h.textContent)).toEqual(['How to use them', 'Tips'])
      expect(root.querySelectorAll('ol > li')).toHaveLength(2)
      expect(root.querySelectorAll('ul > li')).toHaveLength(2)
      expect(root.querySelector('strong')?.textContent).toBe('not at the same time')
      expect(root.querySelector('blockquote')?.textContent).toContain('Caution: Stop if your skin stings')
    })

    it('numbers each step by its value, so a list split by a sentence keeps counting', () => {
      const root = parse(renderMarkdown('1. Cleanse\n2. Tone\n\nWait a minute.\n\n3. Moisturise'))

      const values = [...root.querySelectorAll('ol > li')].map((li) => li.getAttribute('value'))
      expect(values).toEqual(['1', '2', '3'])
      expect(root.querySelectorAll('ol')).toHaveLength(2)
    })

    it('keeps single line breaks inside a paragraph', () => {
      const root = parse(renderMarkdown('Morning: cleanser\nEvening: retinol'))

      expect(root.querySelectorAll('br')).toHaveLength(1)
    })

    it('strips scripts, inline handlers and javascript: links from the reply', () => {
      const html = renderMarkdown(
        'Hi <script>alert(1)</script><span onclick="alert(2)">there</span> [x](javascript:alert(3))',
      )

      expect(html).not.toContain('<script')
      expect(html).not.toContain('onclick')
      expect(html).not.toContain('javascript:')
      expect(parse(html).textContent).toContain('there')
    })

    it('drops images, which the chat bubble has no use for', () => {
      const html = renderMarkdown('![pic](https://example.com/a.png) text')

      expect(parse(html).querySelector('img')).toBeNull()
    })

    it('opens links in a new tab that cannot reach back to the app', () => {
      const link = parse(renderMarkdown('[AAD](https://www.aad.org)')).querySelector('a')

      expect(link?.getAttribute('href')).toBe('https://www.aad.org')
      expect(link?.getAttribute('target')).toBe('_blank')
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
    })

    it('returns an empty string for an empty or missing reply', () => {
      expect(renderMarkdown('')).toBe('')
      expect(renderMarkdown(undefined)).toBe('')
      expect(renderMarkdown(null)).toBe('')
    })
  })
})
