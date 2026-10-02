<script setup lang="ts">
import { computed } from 'vue'
import type { QuizAxis } from '../../data/quizQuestions'
import { AXIS_ORDER, type AxisResult } from '../../stores/quizStore'
import { AXIS_COPY, closeCallText, confidenceText, leanText, letterWord } from './axisCopy'
import LeanBar from './LeanBar.vue'
import QuizResultDashboard from './QuizResultDashboard.vue'
import './quizMotion.css'

// The result: the code and its four letters in words, how each part came out
// and how sure that is, the save actions, and below them the existing profile
// guidance for the type.
//
// Phone: one column (type, part cards, actions, profile). From lg: the type and
// the actions in a sticky card on the left, the part cards and the profile on
// the right. The two wrappers are `display: contents` below lg, so their
// children join a single ordered column there.
//
// On arrival the code fades up first, then the part cards follow one after
// another, each lean bar sliding out from the centre once its card is in.
const props = defineProps<{
  skinType: string
  results: Record<QuizAxis, AxisResult>
  isSaving: boolean
}>()

const emit = defineEmits<{
  save: []
  seeProfile: []
  retakePart: [axis: QuizAxis]
  retakeAll: []
}>()

const parts = computed(() => AXIS_ORDER.map((axis) => props.results[axis]))

/** When each part card starts to fade up: after the code, then 80 ms apart. */
const cardDelay = (index: number) => 200 + index * 80

const lettersInWords = computed(() => parts.value.map((r) => letterWord(r.axis, r.letter)).join(' · '))

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four']

const summary = computed(() => {
  const close = parts.value.filter((r) => r.closeCall).length
  if (close === 0) return 'All four parts came out clearly.'
  const clear = 4 - close
  const clearText = clear === 0 ? 'No part came out clearly.' : `${NUMBER_WORDS[clear]} ${clear === 1 ? 'part' : 'parts'} came out clearly.`
  const closeText = close === 1
    ? 'One is a close call, marked with its part, so treat that letter as a starting point.'
    : `${NUMBER_WORDS[close]} are close calls, marked with their parts, so treat those letters as a starting point.`
  return `${clearText} ${closeText}`
})
</script>

<template>
  <div class="w-full max-w-md mx-auto px-5 pt-8 pb-12 flex flex-col gap-5 lg:max-w-[1280px] lg:px-16 lg:py-9 lg:grid lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-8 lg:items-start">
    <!-- Left on desktop: the type and the actions -->
    <div class="contents lg:flex lg:flex-col lg:sticky lg:top-9 lg:rounded-[28px] lg:bg-brand-surface-light lg:dark:bg-brand-surface-dark lg:border lg:border-brand-surface-border lg:dark:border-stone-700 lg:px-8 lg:py-9">
      <section aria-label="Your skin type" class="order-1 flex flex-col items-center text-center lg:items-start lg:text-left">
        <span class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-primary-strong dark:text-brand-primary">Your skin type</span>
        <span class="quiz-rise mt-1.5 lg:mt-2.5 font-serif text-[56px] lg:text-[76px] leading-none font-bold tracking-[0.04em] text-brand-primary-strong-hover dark:text-brand-primary" data-testid="result-code">{{ skinType }}</span>
        <span class="mt-2 text-sm text-stone-600 dark:text-stone-300 lg:hidden" data-testid="result-words">{{ lettersInWords }}</span>

        <div class="hidden lg:grid grid-cols-2 gap-2 mt-[22px] w-full">
          <span
            v-for="r in parts"
            :key="r.axis"
            class="px-3 py-2.5 rounded-xl text-sm font-bold"
            :class="r.closeCall
              ? 'bg-[#FFF4DB] text-[#6B4600] dark:bg-amber-900/30 dark:text-amber-200'
              : 'bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100'"
          ><span :class="r.closeCall ? '' : 'text-brand-primary-strong dark:text-brand-primary'">{{ r.letter }}</span> · {{ letterWord(r.axis, r.letter) }}</span>
        </div>
        <p class="hidden lg:block mt-[22px] text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">{{ summary }}</p>
      </section>

      <div class="order-3 flex flex-col gap-2.5 lg:mt-8">
        <button
          type="button"
          :disabled="isSaving"
          class="h-[54px] rounded-2xl bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white text-base font-bold transition-colors disabled:opacity-60 disabled:cursor-wait"
          @click="emit('save')"
        >
          {{ isSaving ? 'Saving...' : 'Save my skin type' }}
        </button>
        <button
          type="button"
          :disabled="isSaving"
          class="h-11 rounded-2xl text-sm font-bold text-brand-primary-strong dark:text-brand-primary hover:text-brand-primary-strong-hover dark:hover:text-brand-primary-accent transition-colors disabled:opacity-60 disabled:cursor-wait"
          @click="emit('seeProfile')"
        >
          See what {{ skinType }} means
        </button>
        <button
          type="button"
          :disabled="isSaving"
          class="h-12 rounded-2xl border-[1.5px] border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-[15px] font-bold text-brand-primary-strong dark:text-brand-primary hover:border-brand-primary-strong dark:hover:border-brand-primary transition-colors disabled:opacity-60"
          @click="emit('retakeAll')"
        >
          Retake the whole quiz
        </button>
        <p class="mt-1 text-center lg:text-left text-xs leading-relaxed text-stone-600 dark:text-stone-400">
          A starting point for your routine, not a diagnosis. For a skin condition, see a dermatologist.
        </p>
      </div>
    </div>

    <!-- Right on desktop: each part, then the profile guidance -->
    <div class="contents lg:flex lg:flex-col lg:gap-5 lg:min-w-0">
      <section aria-labelledby="parts-heading" class="order-2 flex flex-col">
        <h2 id="parts-heading" class="sr-only lg:not-sr-only font-serif text-2xl font-bold text-stone-800 dark:text-white">How each part came out</h2>
        <ul class="flex flex-col gap-2.5 lg:mt-5 lg:grid lg:grid-cols-2 lg:gap-4">
          <li
            v-for="(r, i) in parts"
            :key="r.axis"
            class="quiz-rise rounded-[18px] lg:rounded-[22px] px-4 py-3.5 lg:px-[22px] lg:py-5"
            :class="r.closeCall
              ? 'bg-[#FFFBF0] border-[1.5px] border-[#F0D79A] dark:bg-amber-900/10 dark:border-amber-700/50'
              : 'bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700'"
            :data-testid="`axis-card-${r.axis}`"
            :style="{ animationDelay: `${cardDelay(i)}ms` }"
          >
            <div class="flex justify-between items-center gap-2">
              <span class="flex flex-col">
                <span class="hidden lg:block text-[13px] font-bold" :class="r.closeCall ? 'text-[#6B4600] dark:text-amber-200' : 'text-stone-600 dark:text-stone-400'">{{ AXIS_COPY[r.axis].part }}</span>
                <span class="text-[15px] lg:text-xl lg:mt-2 font-extrabold text-stone-800 dark:text-white">{{ letterWord(r.axis, r.letter) }}</span>
              </span>
              <span
                class="shrink-0 self-start inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                :class="r.closeCall
                  ? 'bg-[#FFF4DB] text-[#6B4600] dark:bg-amber-900/30 dark:text-amber-200'
                  : 'bg-[#E3F3EC] text-[#1F6B4A] dark:bg-emerald-900/30 dark:text-emerald-300'"
              >{{ confidenceText(r) }}</span>
            </div>
            <div class="mt-0.5 lg:mt-1.5">
              <LeanBar
                :average="r.average"
                :close-call="r.closeCall"
                :low-label="AXIS_COPY[r.axis].low"
                :high-label="AXIS_COPY[r.axis].high"
                size="compact"
                :delay-ms="cardDelay(i) + 200"
              />
            </div>
            <template v-if="r.closeCall">
              <p v-if="r.choice" class="mt-2.5 text-[13px] font-bold text-[#6B4600] dark:text-amber-200" data-testid="choice-text">{{ leanText(r) }}</p>
              <p class="mt-2.5 text-[13px] leading-relaxed text-[#6B4600] dark:text-amber-200">{{ closeCallText(r) }}</p>
              <button
                type="button"
                class="mt-1 inline-flex items-center gap-1.5 min-h-11 text-[13px] lg:text-sm font-extrabold text-brand-primary-strong dark:text-brand-primary hover:text-brand-primary-strong-hover dark:hover:text-brand-primary-accent"
                @click="emit('retakePart', r.axis)"
              >
                Retake this part
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </template>
          </li>
        </ul>
      </section>

      <div class="order-4 mt-4 lg:mt-0">
        <QuizResultDashboard :skin-type="skinType" />
      </div>
    </div>
  </div>
</template>
