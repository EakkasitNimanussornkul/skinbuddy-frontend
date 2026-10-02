<script setup lang="ts">
import type { SelfChoiceQuestion } from '../../data/quizQuestions'
import QuizChoice from './QuizChoice.vue'

// The "your choice" question that ends a part where none of the answers
// counted, even after both extra questions. Two rows and no skip buttons: the
// pick decides the part's letter, and the result shows it as the user's choice.
// The banner is neutral rather than amber, since nothing has gone wrong; the
// user is simply asked to say which describes them.
defineProps<{
  question: SelfChoiceQuestion
  /** The letter already picked, shown selected when the user comes back. */
  selected: string | null
}>()

const emit = defineEmits<{ choose: [letter: string] }>()
</script>

<template>
  <div class="flex flex-col">
    <div
      class="mt-5 lg:mt-0 lg:mb-6 flex gap-3 items-start px-4 py-3.5 rounded-2xl bg-brand-bg-light border border-brand-surface-border dark:bg-brand-bg-dark dark:border-stone-700"
      data-testid="choice-banner"
    >
      <svg class="w-5 h-5 shrink-0 mt-px text-brand-primary-strong dark:text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></svg>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-extrabold text-brand-text dark:text-stone-100">One last question for this part</span>
        <span class="text-[13px] leading-relaxed text-stone-600 dark:text-stone-300">None of your answers here counted, so tell us which sounds more like you. Your result will show this as your choice.</span>
      </div>
    </div>

    <h1 class="mt-5 lg:mt-0 font-serif text-[25px] lg:text-[32px] leading-tight font-bold text-stone-800 dark:text-white lg:max-w-[640px]">
      {{ question.text }}
    </h1>

    <div role="radiogroup" aria-label="Your answer" class="mt-3.5 lg:mt-6 flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3.5">
      <QuizChoice
        v-for="option in question.options"
        :key="option.letter"
        :label="option.text"
        :selected="selected === option.letter"
        @pick="emit('choose', option.letter)"
      />
    </div>
  </div>
</template>
