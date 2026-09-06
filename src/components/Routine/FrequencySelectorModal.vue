<script setup lang="ts">
import { ref } from 'vue'

import { computed } from 'vue'
import { scheduleLabel } from '../../utils/routineSchedule'

const props = defineProps<{
  current?: string
  currentTimeOfDay?: string
  productName?: string
}>()

const emit = defineEmits(['cancel', 'save'])

// Two independent axes: which session the step runs in, and on which days.
// Kept separate rather than collapsed into "every morning" / "every evening",
// which would need a 12-value list and could not express "PM, twice a week".
const SESSIONS = [
  { value: 'AM', label: 'Morning', hint: 'Part of the AM routine' },
  { value: 'PM', label: 'Evening', hint: 'Part of the PM routine' },
  { value: 'both', label: 'Both', hint: 'Morning and evening' },
]

const FREQUENCIES = [
  { value: 'daily', label: 'Every day', hint: 'Every day' },
  { value: '3x_week', label: '3× per week', hint: 'Mon · Wed · Fri' },
  { value: '2x_week', label: '2× per week', hint: 'Tue · Sat' },
  { value: 'weekly', label: 'Weekly', hint: 'Sun' },
]

const selected = ref(props.current || 'daily')
const session = ref(props.currentTimeOfDay || 'both')

// Reads back as one sentence: "Every evening", "Evening · Tue · Sat".
const summary = computed(() => {
  const when = SESSIONS.find((o) => o.value === session.value)?.label ?? 'Both'
  const days = scheduleLabel(selected.value)
  if (selected.value === 'daily') {
    if (session.value === 'AM') return 'Every morning'
    if (session.value === 'PM') return 'Every evening'
    return 'Every morning and evening'
  }
  return `${when} · ${days}`
})
</script>

<template>
  <div class="fixed inset-0 z-[90] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-fade-in" @click.self="emit('cancel')">
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-brand-surface-border dark:border-stone-800 animate-slide-up">

      <div class="px-6 pt-6 pb-4 border-b border-brand-surface-border dark:border-stone-800">
        <h2 class="text-lg font-serif font-bold text-brand-text dark:text-white">When do you use this?</h2>
        <p v-if="productName" class="text-xs text-brand-text-muted mt-0.5 line-clamp-1">{{ productName }}</p>
        <p class="text-xs font-bold text-brand-primary mt-1.5">{{ summary }}</p>
      </div>

      <div class="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
        <p class="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted px-1">Which session</p>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="opt in SESSIONS"
            :key="opt.value"
            @click="session = opt.value"
            class="p-3 rounded-2xl border transition-all text-center cursor-pointer"
            :class="session === opt.value
              ? 'border-brand-primary bg-brand-primary-light/60 dark:bg-brand-primary/10'
              : 'border-brand-surface-border dark:border-stone-700 hover:border-brand-primary/50'"
          >
            <p class="text-xs font-bold text-brand-text dark:text-stone-100">{{ opt.label }}</p>
          </button>
        </div>

        <p class="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted px-1 pt-2">How often</p>
        <button
          v-for="opt in FREQUENCIES"
          :key="opt.value"
          @click="selected = opt.value"
          class="w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all text-left cursor-pointer"
          :class="selected === opt.value
            ? 'border-brand-primary bg-brand-primary-light/60 dark:bg-brand-primary/10'
            : 'border-brand-surface-border dark:border-stone-700 hover:border-brand-primary/50'"
        >
          <div>
            <p class="text-sm font-bold text-brand-text dark:text-stone-100">{{ opt.label }}</p>
            <p class="text-[11px] text-brand-text-muted">{{ opt.hint }}</p>
          </div>
          <div
            class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
            :class="selected === opt.value ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-surface-border dark:border-stone-600'"
          >
            <svg v-if="selected === opt.value" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
          </div>
        </button>
      </div>

      <div class="p-4 grid grid-cols-2 gap-3 border-t border-brand-surface-border dark:border-stone-800">
        <button @click="emit('cancel')" class="py-3 rounded-xl font-bold text-sm text-brand-text dark:text-stone-300 bg-brand-bg-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700 hover:bg-brand-surface-border/50 dark:hover:bg-stone-700 transition-colors">Cancel</button>
        <button @click="emit('save', { frequency: selected, time_of_day: session })" class="py-3 rounded-xl font-bold text-sm text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors shadow-sm active:scale-[0.98]">Save</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
</style>
