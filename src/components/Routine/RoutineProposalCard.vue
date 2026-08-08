<script setup lang="ts">
defineProps<{
  steps: any[]
  applied?: boolean
}>()

const emit = defineEmits(['use', 'adjust', 'view'])

const TIME_LABEL: Record<string, string> = { am: 'AM', pm: 'PM', both: 'AM / PM' }
</script>

<template>
  <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl border border-brand-surface-border dark:border-stone-700 shadow-sm p-4 w-full">
    <p class="text-xs font-bold uppercase tracking-widest text-brand-primary mb-3">Proposed routine</p>

    <ol class="space-y-2">
      <li
        v-for="(s, i) in steps"
        :key="i"
        class="flex items-start gap-3 p-2.5 rounded-xl bg-brand-bg-light dark:bg-stone-800/60 border border-brand-surface-border dark:border-stone-700"
      >
        <span class="w-6 h-6 shrink-0 rounded-lg bg-brand-primary text-white text-xs font-bold flex items-center justify-center">{{ i + 1 }}</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-brand-text dark:text-stone-100 leading-tight">{{ s.product_name }}</p>
          <div class="flex items-center gap-1.5 mt-1 flex-wrap">
            <span class="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase bg-brand-primary-light text-brand-primary dark:bg-brand-primary/10 dark:text-brand-primary-accent">{{ TIME_LABEL[s.time_of_day] || 'AM / PM' }}</span>
            <span class="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase bg-brand-surface-light dark:bg-stone-800 text-brand-text-muted border border-brand-surface-border dark:border-stone-700">{{ s.frequency }}</span>
            <span v-if="s.owned === false" class="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">+ adds to storage</span>
          </div>
          <p v-if="s.reason" class="text-[11px] text-brand-text-muted mt-1 leading-snug">{{ s.reason }}</p>
        </div>
      </li>
    </ol>

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
