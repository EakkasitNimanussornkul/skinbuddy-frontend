<script setup lang="ts">
import { computed } from 'vue'
import type { ResolvedQuestion } from '../../data/quizQuestions'
import type { BackupReason, QuizAnswer } from '../../stores/quizStore'
import QuizChoice from './QuizChoice.vue'

const props = defineProps<{
  question: ResolvedQuestion
  /** The answer already given, shown selected when the user comes back. */
  selected: QuizAnswer | null
  /** Set when this is an extra (backup) question, with why it is being asked. */
  backupReason: BackupReason | null
}>()

const emit = defineEmits<{ answer: [answer: QuizAnswer] }>()

const BACKUP_REASON_TEXT: Record<BackupReason, string> = {
  none_counted: 'None of your answers in this part counted, so here is an easier one to help us decide.',
  one_counted: 'Only one of your answers in this part counted, so here is an easier one to help us decide.',
  tie: 'Your answers in this part point both ways equally, so here is one more to help us decide.',
}

const isPicked = (points: number) => props.selected?.kind === 'points' && props.selected.points === points
const isSkipPicked = (kind: string) => props.selected?.kind === kind

const skipColumns = computed(() => (props.question.skips.length > 1 ? 'grid-cols-2' : 'grid-cols-1'))
</script>

<template>
  <div class="flex flex-col">
    <div
      v-if="backupReason"
      class="mt-5 lg:mt-0 lg:mb-6 flex gap-3 items-start px-4 py-3.5 rounded-2xl bg-[#FFF4DB] border border-[#F0D79A] dark:bg-amber-900/20 dark:border-amber-700/50"
      data-testid="backup-banner"
    >
      <svg class="w-5 h-5 shrink-0 mt-px text-[#8A5A00] dark:text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-extrabold text-[#6B4600] dark:text-amber-200">One extra question</span>
        <span class="text-[13px] leading-relaxed text-[#6B4600] dark:text-amber-200">{{ BACKUP_REASON_TEXT[backupReason] }}</span>
      </div>
    </div>

    <h1
      class="font-serif text-[25px] lg:text-[32px] leading-tight font-bold text-stone-800 dark:text-white lg:max-w-[640px]"
      :class="backupReason ? 'mt-5 lg:mt-0' : 'mt-6 lg:mt-0'"
    >
      {{ question.text }}
    </h1>
    <p v-if="question.subtext" class="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300 lg:max-w-[640px]">
      {{ question.subtext }}
    </p>

    <details class="mt-1.5">
      <summary class="inline-flex items-center gap-1.5 min-h-11 cursor-pointer list-none text-[13px] lg:text-sm font-bold text-brand-primary-strong dark:text-brand-primary [&::-webkit-details-marker]:hidden">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
        Why we ask
      </summary>
      <p class="mt-1 text-[13px] lg:text-sm leading-relaxed text-stone-600 dark:text-stone-300 lg:max-w-[640px]">{{ question.why }}</p>
    </details>

    <div role="radiogroup" aria-label="Your answer" class="mt-3.5 lg:mt-6 flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3.5">
      <QuizChoice
        v-for="option in question.options"
        :key="option.points"
        :label="option.text"
        :selected="isPicked(option.points)"
        @pick="emit('answer', { kind: 'points', points: option.points })"
      />
    </div>

    <template v-if="question.skips.length">
      <div class="flex items-center gap-2.5 mt-[18px]" aria-hidden="true">
        <span class="flex-grow h-px bg-brand-surface-border dark:bg-stone-700" />
        <span class="text-xs font-semibold text-stone-600 dark:text-stone-400">or</span>
        <span class="flex-grow h-px bg-brand-surface-border dark:bg-stone-700" />
      </div>
      <div class="grid gap-2.5 mt-3 lg:flex lg:gap-3.5" :class="skipColumns">
        <button
          v-for="skip in question.skips"
          :key="skip.kind"
          type="button"
          :aria-pressed="isSkipPicked(skip.kind) ? 'true' : 'false'"
          class="min-h-12 px-2 lg:px-[22px] rounded-[14px] border-[1.5px] border-dashed text-sm lg:text-[15px] font-bold transition-colors duration-150"
          :class="isSkipPicked(skip.kind)
            ? 'border-brand-primary-strong dark:border-brand-primary bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary-strong-hover dark:text-white'
            : 'border-stone-300 dark:border-stone-600 text-brand-text dark:text-stone-200 hover:border-stone-400 dark:hover:border-stone-500'"
          @click="emit('answer', { kind: skip.kind })"
        >
          {{ skip.text }}
        </button>
      </div>
    </template>
  </div>
</template>
