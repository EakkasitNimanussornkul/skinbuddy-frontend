<script setup lang="ts">
import { computed } from 'vue'
import { scheduleLabel } from '../../utils/routineSchedule'

const props = withDefaults(
  defineProps<{
    step: any
    stepNumber: number
    accent: 'morning' | 'evening' | 'weekly'
    busy?: boolean
    dueToday?: boolean
    // Completion state for THIS card's session. A "both" product renders one
    // card in each session, so the parent passes the per-session flag rather
    // than the card reading a single whole-step value.
    completed?: boolean
  }>(),
  { dueToday: true },
)

const emit = defineEmits(['toggle-complete', 'edit-frequency', 'remove'])

const product = computed(() => props.step?.products || {})
const name = computed(() => product.value?.name || 'Product')
const imageUrl = computed(() => product.value?.image_url || null)
const completed = computed(() =>
  props.completed !== undefined ? props.completed : !!props.step?.completed_today,
)

const frequency = computed(() => props.step?.frequency || 'daily')
// Same vocabulary as the proposal card: "Daily", "Tue · Sat", "Mon · Wed · Fri".
const frequencyLabel = computed(() => scheduleLabel(frequency.value))
const isPeriodic = computed(() => frequency.value !== 'daily')

// Accent (STEP label) colour per block, echoing the reference checklist.
const accentText = computed(() => ({
  morning: 'text-amber-500 dark:text-amber-400',
  evening: 'text-brand-primary',
  weekly: 'text-violet-500 dark:text-violet-400',
}[props.accent]))
</script>

<template>
  <div class="group flex items-center gap-3 py-2.5" :class="completed ? 'opacity-60' : !dueToday ? 'opacity-45' : ''">
    <!-- Product icon -->
    <div class="w-10 h-10 shrink-0 bg-brand-bg-light dark:bg-stone-800 rounded-xl p-1 border border-brand-surface-border dark:border-stone-700 flex items-center justify-center">
      <img v-if="imageUrl" :src="imageUrl" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" :alt="name" />
      <svg v-else class="w-5 h-5 text-brand-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 3h6l-1 4H10L9 3zm0 4h6a2 2 0 012 2v9a3 3 0 01-3 3H10a3 3 0 01-3-3V9a2 2 0 012-2z" /></svg>
    </div>

    <!-- Step + name -->
    <div class="flex-1 min-w-0">
      <p class="text-[10px] font-bold uppercase tracking-widest" :class="accentText">Step {{ stepNumber }}</p>
      <p class="text-sm font-bold text-brand-text dark:text-stone-100 leading-tight line-clamp-2" :class="completed ? 'line-through' : ''">{{ name }}</p>

      <!-- subtle controls: frequency (click to edit) + remove -->
      <div class="flex items-center gap-2 mt-1">
        <button
          @click="emit('edit-frequency')"
          class="text-[10px] font-semibold text-brand-text-muted hover:text-brand-primary inline-flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span v-if="isPeriodic" class="px-1.5 py-0.5 rounded bg-brand-bg-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700">{{ frequencyLabel }}</span>
          <span v-else>{{ frequencyLabel }}</span>
          <svg class="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" /></svg>
        </button>
        <button
          @click="emit('remove')"
          :disabled="busy"
          class="text-[10px] font-semibold text-brand-text-muted hover:text-semantic-error inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all cursor-pointer disabled:opacity-40"
        >
          Remove
        </button>
      </div>
    </div>

    <!-- Not scheduled today: no checkbox to tick -->
    <span
      v-if="!dueToday"
      class="shrink-0 text-[9px] font-bold uppercase tracking-wider text-brand-text-muted border border-brand-surface-border dark:border-stone-700 rounded-lg px-2 py-1.5"
    >
      Not today
    </span>

    <!-- Completion checkbox -->
    <button
      v-else
      @click="emit('toggle-complete')"
      :disabled="busy"
      class="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border-2 transition-all cursor-pointer active:scale-90 disabled:opacity-40"
      :class="completed
        ? 'bg-brand-primary border-brand-primary text-white shadow-sm shadow-brand-primary/30'
        : 'border-brand-surface-border dark:border-stone-600 text-transparent hover:border-brand-primary'"
      :aria-label="completed ? 'Mark not done' : 'Mark done'"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
    </button>
  </div>
</template>
