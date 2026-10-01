<script setup lang="ts">
import { ABOUT_YOU_QUESTION, type Sex } from '../../data/quizQuestions'
import QuizChoice from './QuizChoice.vue'

// The one question that is not scored. The answer only picks which wording a
// few questions use; the store holds it in memory and nowhere else.
defineProps<{ selected: Sex | null }>()
const emit = defineEmits<{ pick: [value: Sex] }>()
</script>

<template>
  <div class="flex flex-col">
    <h1 class="mt-6 lg:mt-0 font-serif text-[25px] lg:text-[32px] leading-tight font-bold text-stone-800 dark:text-white lg:max-w-[640px]">
      {{ ABOUT_YOU_QUESTION.text }}
    </h1>
    <p class="mt-2.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300 lg:max-w-[640px]">
      {{ ABOUT_YOU_QUESTION.subtext }}
    </p>
    <div role="radiogroup" aria-label="Biological sex" class="mt-5 lg:mt-6 flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3.5">
      <QuizChoice
        v-for="option in ABOUT_YOU_QUESTION.options"
        :key="option.value"
        :label="option.text"
        :selected="selected === option.value"
        @pick="emit('pick', option.value)"
      />
    </div>
  </div>
</template>
