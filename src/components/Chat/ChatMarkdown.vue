<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown'

// Renders a chatbot reply written in the Markdown answer template (UC-13).
// renderMarkdown sanitises the HTML, so v-html is safe here.
const props = defineProps<{ text: string }>()

const html = computed(() => renderMarkdown(props.text))
</script>

<template>
  <div
    class="chat-md text-sm leading-relaxed break-words
      [--md-strong:#2f2f2f] [--md-muted:#6b7577] [--md-rule:#DCE5E8] [--md-chip:#DFF4F3] [--md-chip-text:#2f6f72]
      [--md-code:#F3F7F8] [--md-warn-bg:#FDF6E3] [--md-warn-text:#7a5a12]
      dark:[--md-strong:#fafaf9] dark:[--md-muted:#a8a29e] dark:[--md-rule:#57534e] dark:[--md-chip:rgba(108,193,197,0.18)]
      dark:[--md-chip-text:#B0F1F1] dark:[--md-code:#2C2C2C] dark:[--md-warn-bg:rgba(233,191,84,0.12)] dark:[--md-warn-text:#f5d27a]"
    v-html="html"
  />
</template>

<style scoped>
/* v-html content carries no scope id, so every rule reaches it through :deep(). */

.chat-md > :deep(:first-child) { margin-top: 0; }
.chat-md > :deep(:last-child) { margin-bottom: 0; }

.chat-md :deep(p) { margin: 0 0 0.6em; }

.chat-md :deep(strong) { font-weight: 700; color: var(--md-strong); }

/* Section headings: "### Heading" in the template. h1/h2 are styled the same in
   case the model ignores the instruction, so a stray "#" never shouts. */
.chat-md :deep(:is(h1, h2, h3, h4)) {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin: 1em 0 0.4em;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--md-strong);
}
.chat-md :deep(:is(h1, h2, h3, h4)::before) {
  content: '';
  width: 3px;
  height: 0.95em;
  border-radius: 2px;
  background: var(--color-brand-primary);
  flex-shrink: 0;
}

.chat-md :deep(:is(ul, ol)) { margin: 0 0 0.6em; padding: 0; list-style: none; }
.chat-md :deep(li) { position: relative; margin: 0.3em 0; }
.chat-md :deep(li > p) { margin: 0; }
.chat-md :deep(li :is(ul, ol)) { margin: 0.3em 0 0; }

/* Bullets: a small brand dot. */
.chat-md :deep(ul > li) { padding-left: 1.1em; }
.chat-md :deep(ul > li::before) {
  content: '';
  position: absolute;
  left: 0.2em;
  top: 0.62em;
  width: 0.38em;
  height: 0.38em;
  border-radius: 9999px;
  background: var(--color-brand-primary);
}

/* Numbered steps: the number in a soft chip, so an application order reads as steps.
   The number is each item's value attribute (set in utils/markdown.ts), not a CSS
   counter, so a list the model split in two keeps counting. */
.chat-md :deep(ol > li) { padding-left: 1.9em; }
.chat-md :deep(ol > li::before) {
  content: attr(value);
  position: absolute;
  left: 0;
  top: 0.1em;
  width: 1.45em;
  height: 1.45em;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--md-chip);
  color: var(--md-chip-text);
}

/* "> **Caution:** ..." in the template becomes a warning callout. */
.chat-md :deep(blockquote) {
  margin: 0.8em 0 0.2em;
  padding: 0.55em 0.8em;
  border-left: 3px solid var(--color-semantic-warning);
  border-radius: 0 0.6em 0.6em 0;
  background: var(--md-warn-bg);
  color: var(--md-warn-text);
}
.chat-md :deep(blockquote strong) { color: inherit; }
.chat-md :deep(blockquote p) { margin: 0; }

.chat-md :deep(a) {
  color: var(--md-strong);
  text-decoration: underline;
  text-decoration-color: var(--color-brand-primary);
  text-underline-offset: 2px;
}

.chat-md :deep(code) {
  padding: 0.1em 0.35em;
  border-radius: 0.3em;
  font-size: 0.85em;
  background: var(--md-code);
}
.chat-md :deep(pre) { margin: 0 0 0.6em; overflow-x: auto; white-space: pre-wrap; }

.chat-md :deep(hr) { margin: 0.8em 0; border: 0; border-top: 1px solid var(--md-rule); }

.chat-md :deep(table) { display: block; margin: 0 0 0.6em; overflow-x: auto; border-collapse: collapse; font-size: 0.8rem; }
.chat-md :deep(:is(th, td)) { padding: 0.35em 0.6em; border: 1px solid var(--md-rule); text-align: left; }
</style>
