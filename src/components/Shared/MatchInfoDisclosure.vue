<script setup lang="ts">
import { ref, useId } from 'vue'

/**
 * "What is % Match?" as a disclosure, folded by default: the long explanation
 * of the score (what it is based on, that it is a guide, the methodology link)
 * stays one tap away instead of taking the space beside every score. The host
 * passes the explanation in the slot, in its own words, which this does not
 * change. Used on Explore (lg and up), the product page and Compare.
 */
withDefaults(defineProps<{ label?: string }>(), { label: 'What is % Match?' })

const uid = useId()
const open = ref(false)
</script>

<template>
  <div class="match-info">
    <button
      type="button"
      class="match-info-toggle min-h-11 -my-1 inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary-strong dark:text-brand-primary hover:underline"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="open ? `${uid}-match-info` : undefined"
      @click="open = !open"
    >
      <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
      {{ label }}
      <svg :class="['w-3.5 h-3.5 shrink-0 transition-transform duration-200 motion-reduce:transition-none', open ? 'rotate-180' : '']" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </button>
    <div v-if="open" :id="`${uid}-match-info`" class="match-info-body mt-1.5">
      <slot />
    </div>
  </div>
</template>
