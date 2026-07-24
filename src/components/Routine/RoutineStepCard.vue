<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  step: any
  index: number
  busy?: boolean
}>()

const emit = defineEmits(['toggle-complete', 'remove', 'edit-frequency'])

const product = computed(() => props.step?.products || {})
const name = computed(() => product.value?.name || 'Product')
const brand = computed(() => product.value?.brand || '')
const category = computed(() => product.value?.category || '')
const imageUrl = computed(() => product.value?.image_url || null)
const completed = computed(() => !!props.step?.completed_today)

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  '3x_week': '3× / week',
  '2x_week': '2× / week',
  weekly: 'Weekly',
}
const frequencyLabel = computed(() => FREQUENCY_LABELS[props.step?.frequency] || props.step?.frequency || 'Daily')

const timeBadge = computed(() => {
  const t = (props.step?.time_of_day || 'both').toLowerCase()
  if (t === 'am') return { label: 'AM', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
  if (t === 'pm') return { label: 'PM', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' }
  return { label: 'AM / PM', cls: 'bg-brand-primary-light text-brand-primary dark:bg-brand-primary/10 dark:text-brand-primary-accent' }
})
</script>

<template>
  <div
    class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl border border-brand-surface-border dark:border-stone-800 shadow-sm p-3 sm:p-4 flex items-center gap-3 transition-all"
    :class="completed ? 'opacity-70' : ''"
  >
    <!-- Drag handle (UC-20) + step number -->
    <div class="flex flex-col items-center gap-1 text-brand-text-muted cursor-grab active:cursor-grabbing select-none" title="Drag to reorder">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" /></svg>
      <span class="text-[10px] font-bold tabular-nums">{{ index + 1 }}</span>
    </div>

    <!-- Product thumbnail -->
    <div class="w-12 h-12 shrink-0 bg-brand-bg-light dark:bg-stone-800 rounded-xl p-1 border border-brand-surface-border dark:border-stone-700 flex items-center justify-center">
      <img v-if="imageUrl" :src="imageUrl" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" :alt="name" />
      <svg v-else class="w-6 h-6 text-brand-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0">
      <p v-if="brand" class="text-[10px] font-bold text-brand-primary uppercase tracking-wider line-clamp-1">{{ brand }}</p>
      <p class="text-sm font-bold text-brand-text dark:text-stone-100 leading-tight line-clamp-2" :class="completed ? 'line-through' : ''">{{ name }}</p>
      <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
        <span class="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide" :class="timeBadge.cls">{{ timeBadge.label }}</span>
        <button
          @click="emit('edit-frequency')"
          class="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide bg-brand-bg-light dark:bg-stone-800 text-brand-text-muted border border-brand-surface-border dark:border-stone-700 hover:border-brand-primary hover:text-brand-primary transition-colors cursor-pointer inline-flex items-center gap-1"
        >
          {{ frequencyLabel }}
          <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" /></svg>
        </button>
        <span v-if="category" class="text-[9px] font-medium text-brand-text-muted lowercase hidden sm:inline">· {{ category }}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1 shrink-0">
      <button
        @click="emit('remove')"
        :disabled="busy"
        class="w-8 h-8 flex items-center justify-center rounded-lg text-brand-text-muted hover:text-semantic-error hover:bg-semantic-error/10 transition-colors cursor-pointer disabled:opacity-40"
        aria-label="Remove step"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>

      <!-- Completion checkbox (UC-22) -->
      <button
        @click="emit('toggle-complete')"
        :disabled="busy"
        class="w-9 h-9 flex items-center justify-center rounded-xl border-2 transition-all cursor-pointer active:scale-90 disabled:opacity-40"
        :class="completed
          ? 'bg-brand-primary border-brand-primary text-white shadow-sm shadow-brand-primary/30'
          : 'border-brand-surface-border dark:border-stone-600 text-transparent hover:border-brand-primary'"
        :aria-label="completed ? 'Mark step not done' : 'Mark step done'"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
      </button>
    </div>
  </div>
</template>
