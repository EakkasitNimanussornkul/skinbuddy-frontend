<script setup lang="ts">
/**
 * One product's answer for one free-from property.
 *
 * Extracted because the three states were previously written out twice in
 * CompareSafetyChecklist - once for product A and once for product B - so a
 * change to any marker had to be made in both copies and could be made in only
 * one. Same reasoning as resolveMatchBand: the rule lives in one place, the
 * layout around it does not.
 *
 * `null` is a real answer and not a missing one. `safety_flags` can legitimately
 * omit a key, and drawing that as the red cross would state a fact about a
 * formulation that nobody recorded - FE-DEF-25's fault, which was a severity
 * defaulted to HIGH, and FE-DEF-12's, which was every score painted the same
 * confident green.
 */
withDefaults(defineProps<{ state: boolean | null; size?: 'sm' | 'md' }>(), { size: 'sm' })

const BOX = { sm: 'w-5 h-5', md: 'w-6 h-6' }
const ICON = { sm: 'w-3 h-3', md: 'w-3.5 h-3.5' }
</script>

<template>
  <span
    v-if="state === true"
    :class="[BOX[size], 'rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shadow-2xs shrink-0']"
  >
    <svg :class="[ICON[size], 'stroke-[3]']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  </span>

  <span
    v-else-if="state === false"
    :class="[BOX[size], 'rounded-full bg-rose-500/10 text-semantic-error border border-rose-500/20 flex items-center justify-center shadow-2xs shrink-0']"
  >
    <svg :class="[ICON[size], 'stroke-[3]']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </span>

  <span
    v-else
    :class="[BOX[size], 'rounded-full bg-stone-400/10 text-stone-400 dark:text-stone-500 border border-stone-400/20 flex items-center justify-center shadow-2xs font-bold text-[10px] shrink-0']"
  >?</span>
</template>
