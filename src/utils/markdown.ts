// Markdown -> safe HTML for chatbot replies (UC-13).
//
// The model is prompted to answer in a fixed Markdown shape (see chat_service.py):
// a direct answer, up to three "###" sections, lists, bold key terms, and an
// optional "> **Caution:**" line. This turns that into HTML for v-html.
//
// The text comes from an LLM, so the HTML is always sanitised: script, style,
// event handlers and javascript: URLs are stripped by DOMPurify, and images and
// forms are dropped because the chat bubble has no use for them.

import DOMPurify from 'dompurify'
import { Marked } from 'marked'

// A private instance, so options here never leak into any other marked user.
const md = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    // Number every step explicitly. The model often puts a sentence between two
    // steps, which ends the list and opens a new <ol start="2">; a CSS counter
    // would restart that one at 1. ChatMarkdown.vue shows `value` in the chip.
    list(token) {
      if (!token.ordered) return false
      const start = typeof token.start === 'number' ? token.start : 1
      const items = token.items
        .map((item, i) => this.listitem(item).replace('<li>', `<li value="${start + i}">`))
        .join('')
      return `<ol>\n${items}</ol>\n`
    },
  },
})

// Links in a reply leave the app in a new tab and cannot reach back to it.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

export function renderMarkdown(text: string | null | undefined): string {
  if (!text) return ''
  const html = md.parse(text, { async: false })
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['img', 'style', 'form', 'input', 'button', 'iframe'],
    FORBID_ATTR: ['style'],
  })
}
