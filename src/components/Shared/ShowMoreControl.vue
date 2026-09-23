<script setup lang="ts">
/**
 * The one "Show N more" / "Show less" row every stepped list uses, so the
 * wording and the target size are the same on the product page, the shelf and
 * the compare screen. Driven by useStepList; renders nothing when there is
 * nothing to reveal or fold back.
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    nextCount: number
    remaining: number
    canShowMore: boolean
    canShowLess: boolean
    // Plural noun for the items, e.g. "ingredients", "conflicts".
    noun?: string
    // Used when exactly one item is left. Defaults to the plural without its
    // final "s", which is right for every noun in use.
    singular?: string
    // The id of the list this row extends, for aria-controls.
    controls?: string
  }>(),
  { noun: '', singular: undefined, controls: undefined },
)

const emit = defineEmits<{ more: []; less: [] }>()

// "Show 1 more conflict", not "Show 1 more conflicts".
const label = computed(() => {
  if (!props.noun) return `Show ${props.nextCount} more`
  const word = props.nextCount === 1 ? (props.singular ?? props.noun.replace(/s$/, '')) : props.noun
  return `Show ${props.nextCount} more ${word}`
})
</script>

<template>
  <div v-if="canShowMore || canShowLess" class="flex flex-wrap items-center gap-2 pt-2">
    <button
      v-if="canShowMore"
      type="button"
      :aria-controls="controls"
      class="show-more px-5 py-2.5 bg-brand-bg-light dark:bg-stone-800/80 hover:bg-brand-surface-border dark:hover:bg-stone-700 text-brand-text dark:text-stone-200 font-bold text-xs rounded-xl border border-brand-surface-border dark:border-stone-700 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2 active:scale-[0.98]"
      @click="emit('more')"
    >
      <span>{{ label }}</span>
      <span class="text-[10px] font-mono text-brand-text-muted">({{ remaining }} left)</span>
      <svg class="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <button
      v-if="canShowLess"
      type="button"
      :aria-controls="controls"
      class="show-less px-4 py-2.5 text-brand-text-muted hover:text-brand-primary font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
      @click="emit('less')"
    >
      <span>Show less</span>
      <svg class="w-3.5 h-3.5 stroke-[2.5] rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  </div>
</template>
