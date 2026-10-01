<script setup lang="ts">
import { computed } from 'vue'
import type { QuizAxis } from '../../data/quizQuestions'
import type { AxisResult } from '../../stores/quizStore'
import { AXIS_COPY, AXIS_ORDER_NUMBER, closeCallText, confidenceText, leanText } from './axisCopy'
import LeanBar from './LeanBar.vue'
import './quizMotion.css'

// Shown after each part: where that part's answers point, how sure that is,
// and what comes next. The tick pops in and the lean bar slides out from the
// centre to the average.
const props = defineProps<{
  result: AxisResult
  /** The part after this one, or null when the result comes next. */
  nextAxis: QuizAxis | null
}>()

const copy = computed(() => AXIS_COPY[props.result.axis])
</script>

<template>
  <div class="flex flex-col">
    <div class="mt-10 lg:mt-2 flex flex-col items-center text-center">
      <span class="quiz-pop w-16 h-16 rounded-full bg-brand-primary-light dark:bg-brand-primary/20 flex items-center justify-center" style="animation-delay: 120ms">
        <svg class="w-[30px] h-[30px] text-brand-primary-strong dark:text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
      </span>
      <h1 class="mt-[18px] font-serif text-[28px] leading-tight font-bold text-stone-800 dark:text-white">{{ copy.part }}</h1>
      <p class="mt-2 text-[15px] text-stone-600 dark:text-stone-300">Here is where your answers point so far.</p>
    </div>

    <div class="mt-6 p-5 rounded-[20px] bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 lg:bg-brand-bg-light lg:dark:bg-brand-bg-dark lg:max-w-xl lg:w-full lg:mx-auto">
      <LeanBar
        :average="result.average"
        :close-call="result.closeCall"
        :low-label="copy.low"
        :high-label="copy.high"
        size="large"
        :delay-ms="150"
      />
      <p class="mt-4 text-lg font-extrabold text-stone-800 dark:text-white" data-testid="lean-text">{{ leanText(result) }}</p>
      <div class="flex flex-wrap gap-2 mt-2.5">
        <span
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
          :class="result.closeCall
            ? 'bg-[#FFF4DB] text-[#6B4600] dark:bg-amber-900/30 dark:text-amber-200'
            : 'bg-[#E3F3EC] text-[#1F6B4A] dark:bg-emerald-900/30 dark:text-emerald-300'"
          data-testid="confidence-chip"
        >
          <svg v-if="!result.closeCall" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
          {{ confidenceText(result) }}
        </span>
        <span
          v-if="result.skipped > 0"
          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300"
          data-testid="left-out-chip"
        >
          {{ result.skipped }} left out
        </span>
      </div>
      <p v-if="result.closeCall" class="mt-2.5 text-[13px] leading-relaxed text-[#6B4600] dark:text-amber-200">
        {{ closeCallText(result) }}
      </p>
    </div>

    <div class="mt-3.5 flex gap-3.5 items-center px-4 py-3.5 rounded-[18px] bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 lg:max-w-xl lg:w-full lg:mx-auto">
      <span class="w-9 h-9 shrink-0 rounded-xl bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary-strong dark:text-brand-primary flex items-center justify-center text-sm font-extrabold">
        <template v-if="nextAxis">{{ AXIS_ORDER_NUMBER[nextAxis] }}</template>
        <svg v-else class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </span>
      <span class="flex flex-col gap-0.5">
        <span class="text-xs font-bold uppercase tracking-[0.08em] text-stone-600 dark:text-stone-400">Next</span>
        <span class="text-[15px] font-bold text-brand-text dark:text-stone-100" data-testid="next-part">
          {{ nextAxis ? `${AXIS_COPY[nextAxis].part}: ${AXIS_COPY[nextAxis].topics}` : 'Your result' }}
        </span>
      </span>
    </div>
  </div>
</template>
