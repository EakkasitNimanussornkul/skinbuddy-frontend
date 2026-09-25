<script setup lang="ts">
import { computed } from 'vue'
import { MATCH_METHOD_PATH } from '../../api/products'

/**
 * How many of the ingredient notes beside it rest on a published source.
 *
 * Owner request: say where the data shown comes from. Sources are attached by
 * hand after each link is checked (backend feat/data-sources), so this counts
 * what the list actually carries rather than assuming either way: none yet,
 * some, or all. Each sourced ingredient shows its own sources underneath.
 */
const props = defineProps<{
  // Ingredients in the list with at least one source linked, and the list size.
  sourced: number
  total: number
}>()

const message = computed(() => {
  if (props.total > 0 && props.sourced >= props.total) {
    return 'Every ingredient here has a published source linked, shown under each one.'
  }
  if (props.sourced > 0) {
    return `${props.sourced} of ${props.total} ingredients here have a published source linked, shown under each one. The rest are general reference written by our team, not yet checked against a published source.`
  }
  return 'These ingredient notes are general reference written by our team, not yet checked against a published source.'
})
</script>

<template>
  <p class="source-status-note flex items-start gap-2 text-[11px] leading-relaxed text-brand-text-muted dark:text-stone-400">
    <svg class="w-3.5 h-3.5 shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>
      <span class="source-status-text">{{ message }}</span>
      <router-link :to="MATCH_METHOD_PATH" class="source-status-link font-bold text-brand-primary hover:underline">See our sources</router-link>
    </span>
  </p>
</template>
