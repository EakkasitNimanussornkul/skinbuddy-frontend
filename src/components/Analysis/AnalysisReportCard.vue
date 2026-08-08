<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  report: any
}>()

const flagged = computed<any[]>(() => props.report?.flagged_ingredients || [])
const recommendations = computed<string[]>(() => props.report?.recommendations || [])
const verdict = computed(() => props.report?.trend_verdict || '')
const incomplete = computed(() => props.report?.status === 'incomplete')
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Incomplete banner -->
    <div v-if="incomplete" class="bg-semantic-warning/10 border border-semantic-warning/30 text-brand-text dark:text-stone-200 rounded-2xl p-4 text-sm flex items-start gap-2.5">
      <svg class="w-5 h-5 text-semantic-warning shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      <span>This analysis is incomplete. You can re-submit your log to try again.</span>
    </div>

    <!-- Trend verdict -->
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl border border-brand-surface-border dark:border-stone-800 shadow-sm p-5">
      <div class="flex items-center gap-2 mb-2">
        <svg class="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
        <h3 class="text-xs font-bold uppercase tracking-widest text-brand-text-muted">Trend</h3>
      </div>
      <p class="text-sm text-brand-text dark:text-stone-200 leading-relaxed">{{ verdict || 'No trend available.' }}</p>
    </div>

    <!-- Flagged ingredients -->
    <div>
      <h3 class="text-xs font-bold uppercase tracking-widest text-brand-text-muted mb-2 px-1">Flagged ingredients</h3>
      <div v-if="flagged.length" class="space-y-2.5">
        <div
          v-for="(f, i) in flagged"
          :key="i"
          class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl border border-semantic-error/30 dark:border-semantic-error/20 shadow-sm p-4"
        >
          <div class="flex items-center gap-2 mb-1.5 flex-wrap">
            <span class="text-sm font-bold text-semantic-error">{{ f.ingredient || 'Ingredient' }}</span>
            <span v-if="f.product" class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-brand-bg-light dark:bg-stone-800 text-brand-text-muted border border-brand-surface-border dark:border-stone-700">in {{ f.product }}</span>
          </div>
          <p class="text-sm text-brand-text dark:text-stone-300 leading-relaxed">{{ f.reason }}</p>
        </div>
      </div>
      <div v-else class="bg-brand-primary-light/50 dark:bg-brand-primary/10 rounded-2xl border border-brand-primary/20 p-4 flex items-center gap-2.5">
        <svg class="w-5 h-5 text-brand-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p class="text-sm text-brand-text dark:text-stone-200 font-medium">No culprit ingredients detected this week.</p>
      </div>
    </div>

    <!-- Recommendations -->
    <div v-if="recommendations.length">
      <h3 class="text-xs font-bold uppercase tracking-widest text-brand-text-muted mb-2 px-1">Recommendations</h3>
      <ul class="space-y-2">
        <li
          v-for="(r, i) in recommendations"
          :key="i"
          class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl border border-brand-surface-border dark:border-stone-800 shadow-sm p-4 flex items-start gap-3"
        >
          <span class="w-6 h-6 shrink-0 rounded-lg bg-brand-primary-light dark:bg-brand-primary/10 text-brand-primary text-xs font-bold flex items-center justify-center">{{ i + 1 }}</span>
          <p class="text-sm text-brand-text dark:text-stone-300 leading-relaxed">{{ r }}</p>
        </li>
      </ul>
    </div>
  </div>
</template>
