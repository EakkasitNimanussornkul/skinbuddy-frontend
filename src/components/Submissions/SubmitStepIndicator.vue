<script setup lang="ts">
import type { StepNumber } from './submissionDraft'

// Phone: three bars under the header, the current one labelled bold. From lg:
// a column of step cards beside the form, each with a one-line summary; a step
// already passed is a button back to it.
const props = defineProps<{
  current: StepNumber
  summaries: [string, string, string]
}>()
const emit = defineEmits<{ go: [step: StepNumber] }>()

const STEPS: { n: StepNumber; label: string }[] = [
  { n: 1, label: 'Basics' },
  { n: 2, label: 'Ingredients *' },
  { n: 3, label: 'Extras' },
]

const state = (n: StepNumber) => (n < props.current ? 'done' : n === props.current ? 'current' : 'todo')
</script>

<template>
  <!-- Phone -->
  <ol aria-label="Steps" class="lg:hidden list-none mt-3 p-0 grid grid-cols-3 gap-1.5">
    <li
      v-for="step in STEPS"
      :key="step.n"
      :aria-current="state(step.n) === 'current' ? 'step' : undefined"
      class="flex flex-col gap-1.5"
    >
      <span
        :class="[
          'h-1.5 rounded-full',
          state(step.n) === 'todo' ? 'bg-brand-surface-border dark:bg-stone-600' : 'bg-brand-primary-strong dark:bg-brand-primary',
        ]"
      />
      <span
        :class="[
          'text-xs',
          state(step.n) === 'current'
            ? 'font-extrabold text-brand-primary-strong-hover dark:text-brand-primary-accent'
            : 'font-semibold text-stone-500 dark:text-stone-400',
        ]"
      >
        {{ step.n }} · {{ step.label.replace(' *', '') }}
        <span v-if="state(step.n) === 'done'" class="sr-only">(done)</span>
      </span>
    </li>
  </ol>

  <!-- Desktop -->
  <nav aria-label="Steps" class="hidden lg:flex flex-col gap-2.5">
    <span class="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-primary-strong-hover dark:text-brand-primary-accent">Submit a product</span>
    <template v-for="(step, i) in STEPS" :key="step.n">
      <button
        v-if="state(step.n) === 'done'"
        type="button"
        class="step-done flex gap-3 items-center text-left px-3.5 py-3 rounded-2xl bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-600 hover:border-brand-primary-strong dark:hover:border-brand-primary transition-colors"
        @click="emit('go', step.n)"
      >
        <span class="w-[30px] h-[30px] rounded-full bg-brand-primary-strong dark:bg-brand-primary flex items-center justify-center shrink-0">
          <svg class="w-3.5 h-3.5 text-white dark:text-stone-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
        </span>
        <span class="flex flex-col min-w-0">
          <span class="text-sm font-extrabold text-stone-800 dark:text-white">{{ step.label }} <span class="sr-only">(done, edit)</span></span>
          <span class="text-xs text-stone-500 dark:text-stone-400 truncate">{{ summaries[i] }}</span>
        </span>
      </button>
      <div
        v-else
        :aria-current="state(step.n) === 'current' ? 'step' : undefined"
        :class="[
          'flex gap-3 items-center rounded-2xl',
          state(step.n) === 'current'
            ? 'px-[13px] py-[11px] bg-brand-primary-light dark:bg-brand-primary/15 border-2 border-brand-primary-strong dark:border-brand-primary'
            : 'px-3.5 py-3 border border-brand-surface-border dark:border-stone-600',
        ]"
      >
        <span
          :class="[
            'w-[30px] h-[30px] rounded-full flex items-center justify-center text-[13px] font-extrabold shrink-0',
            state(step.n) === 'current'
              ? 'bg-brand-surface-light dark:bg-brand-surface-dark border-2 border-brand-primary-strong dark:border-brand-primary text-brand-primary-strong-hover dark:text-brand-primary-accent'
              : 'bg-brand-bg-light dark:bg-stone-700 text-stone-500 dark:text-stone-300',
          ]"
        >{{ step.n }}</span>
        <span class="flex flex-col min-w-0">
          <span
            :class="[
              'text-sm',
              state(step.n) === 'current' ? 'font-extrabold text-brand-primary-strong-hover dark:text-brand-primary-accent' : 'font-bold text-stone-500 dark:text-stone-400',
            ]"
          >{{ step.label }}</span>
          <span
            :class="['text-xs truncate', state(step.n) === 'current' ? 'text-brand-primary-strong-hover dark:text-brand-primary-accent' : 'text-stone-500 dark:text-stone-400']"
          >{{ summaries[i] }}</span>
        </span>
      </div>
    </template>
    <p class="mt-1.5 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">Our team checks every submission before it appears in the catalogue.</p>
  </nav>
</template>
