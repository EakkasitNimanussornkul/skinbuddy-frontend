<script setup lang="ts">
import { computed } from 'vue'
import { groupSteps, scheduleLabel } from '../../utils/routineSchedule'

const props = defineProps<{
  steps: any[]
  applied?: boolean
}>()

const emit = defineEmits(['use', 'adjust', 'view'])

const grouped = computed(() => groupSteps(props.steps || []))

const blocks = computed(() =>
  [
    { key: 'morning', title: 'Morning', pill: 'bg-amber-200/70 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300', items: grouped.value.morning },
    { key: 'evening', title: 'Evening', pill: 'bg-brand-primary-light text-brand-primary dark:bg-brand-primary/20 dark:text-brand-primary-accent', items: grouped.value.evening },
  ].filter((b) => b.items.length),
)
</script>

<template>
  <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl border border-brand-surface-border dark:border-stone-700 shadow-sm p-4 w-full">
    <p class="text-xs font-bold uppercase tracking-widest text-brand-primary mb-3">Proposed routine</p>

    <div class="space-y-4">
      <div v-for="block in blocks" :key="block.key">
        <!-- Block header -->
        <div class="flex items-center gap-2 mb-2">
          <span class="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg" :class="block.pill">{{ block.title }}</span>
          <span class="h-px flex-1 bg-brand-surface-border dark:bg-stone-700"></span>
        </div>

        <!-- Steps -->
        <ol class="space-y-2">
          <li
            v-for="(s, i) in block.items"
            :key="s.product_id + block.key"
            class="flex items-start gap-3 p-2.5 rounded-xl bg-brand-bg-light dark:bg-stone-800/60 border border-brand-surface-border dark:border-stone-700"
          >
            <span class="text-[9px] font-bold text-brand-text-muted uppercase mt-1 w-10 shrink-0">Step {{ i + 1 }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-brand-text dark:text-stone-100 leading-tight">{{ s.product_name }}</p>

              <!-- badges: in-shelf status + schedule -->
              <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                <span
                  v-if="s.owned"
                  class="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 inline-flex items-center gap-1"
                >
                  <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
                  In your shelf
                </span>
                <span
                  v-else
                  class="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                >
                  + Adds to storage
                </span>
                <span class="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase bg-brand-surface-light dark:bg-stone-800 text-brand-text-muted border border-brand-surface-border dark:border-stone-700">
                  {{ scheduleLabel(s.frequency) }}
                </span>
              </div>

              <p v-if="s.reason" class="text-[11px] text-brand-text-muted mt-1 leading-snug">{{ s.reason }}</p>

              <!-- caution / what to look out for -->
              <p v-if="s.caution" class="text-[11px] text-amber-700 dark:text-amber-400 mt-1 leading-snug inline-flex items-start gap-1">
                <svg class="w-3 h-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {{ s.caution }}
              </p>
            </div>
          </li>
        </ol>
      </div>
    </div>

    <!-- Applied state -->
    <div v-if="applied" class="mt-3 flex items-center justify-between gap-3">
      <span class="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
        Applied as your routine
      </span>
      <button @click="emit('view')" class="text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover px-3.5 py-2 rounded-lg transition-colors cursor-pointer active:scale-95">View routine</button>
    </div>

    <!-- Action state (UC-15 step 6/7) -->
    <div v-else class="mt-3 grid grid-cols-2 gap-2">
      <button @click="emit('adjust')" class="py-2.5 rounded-lg font-bold text-xs text-brand-text dark:text-stone-300 bg-brand-bg-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700 hover:bg-brand-surface-border/40 dark:hover:bg-stone-700 transition-colors cursor-pointer">Adjust</button>
      <button @click="emit('use')" class="py-2.5 rounded-lg font-bold text-xs text-white bg-brand-primary hover:bg-brand-primary-hover transition-all shadow-sm active:scale-[0.98] cursor-pointer">Use this routine</button>
    </div>
  </div>
</template>
