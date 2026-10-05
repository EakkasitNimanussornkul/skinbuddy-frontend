<script setup lang="ts">
import { computed } from 'vue'
import { HIDDEN_CHARS_WARNING, hasHiddenChars, hiddenCharSegments } from '../../utils/hiddenChars'

/**
 * Submitted text shown on the review and edit screens with its hidden
 * characters made visible: each zero-width or bidi control character appears
 * as a marker such as "[U+202E]" instead of acting on the text, followed by a
 * short warning (utils/hiddenChars). Text without any shows exactly as it is.
 *
 * Only the display changes; the stored value is the caller's and stays as it
 * was. <bdi> keeps a right-to-left name from reordering the words around it.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{ text: string | null | undefined; warn?: boolean }>(), { warn: true })

const value = computed(() => props.text ?? '')
const segments = computed(() => hiddenCharSegments(value.value))
const hidden = computed(() => hasHiddenChars(value.value))
</script>

<template>
  <bdi v-bind="$attrs" class="revealed-text"><template v-for="(segment, i) in segments" :key="i"><mark v-if="segment.hidden" class="hidden-char px-0.5 rounded bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 font-mono text-[0.85em]">{{ segment.text }}</mark><template v-else>{{ segment.text }}</template></template></bdi><span
    v-if="hidden && warn"
    class="hidden-chars-warning ml-1.5 inline-flex items-center gap-1 px-1.5 py-px rounded-md bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-[11px] font-extrabold align-middle"
  >{{ ' ' }}<svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9 16H3z" /><path d="M12 10v4M12 17h.01" /></svg>{{ HIDDEN_CHARS_WARNING }}</span>
</template>
