<script setup lang="ts">
import { ref } from 'vue'
import './quizMotion.css'

// One answer row: a full-width button with a radio dot, part of a radiogroup.
// Tapping it both selects it and, through the view, moves the quiz on.
defineProps<{ label: string; selected: boolean }>()
const emit = defineEmits<{ pick: [] }>()

// The check pops only when it is tapped here, not when a row is shown already
// selected after going back.
const justPicked = ref(false)

const pick = () => {
  justPicked.value = true
  emit('pick')
}
</script>

<template>
  <button
    type="button"
    role="radio"
    :aria-checked="selected ? 'true' : 'false'"
    class="min-h-[58px] lg:min-h-[72px] w-full flex items-center gap-3.5 px-4 py-3 lg:px-5 lg:py-4 rounded-2xl lg:rounded-[18px] text-left text-[15px] lg:text-base transition-colors duration-200"
    :class="selected
      ? 'border-2 border-brand-primary-strong dark:border-brand-primary bg-brand-primary-light dark:bg-brand-primary/20 font-bold text-brand-primary-strong-hover dark:text-white'
      : 'border-[1.5px] border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark font-semibold text-brand-text dark:text-stone-200 hover:border-brand-primary dark:hover:border-brand-primary'"
    @click="pick"
  >
    <span
      v-if="selected"
      class="w-[22px] h-[22px] shrink-0 rounded-full bg-brand-primary-strong dark:bg-brand-primary flex items-center justify-center"
      :class="{ 'quiz-pop': justPicked }"
      data-testid="choice-check"
    >
      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
    </span>
    <span v-else class="w-[22px] h-[22px] shrink-0 rounded-full border-2 border-stone-300 dark:border-stone-500" />
    <span>{{ label }}</span>
  </button>
</template>
