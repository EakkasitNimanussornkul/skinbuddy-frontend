<script setup lang="ts">
import { AXIS_COPY } from './axisCopy'
import { AXIS_ORDER } from '../../stores/quizStore'
import { MAX_BACKUPS_PER_AXIS } from '../../data/quizQuestions'
import './quizMotion.css'

// Phone: one column (intro, the four parts, the note, then the actions at the
// foot). From lg: a top bar, then the intro and the actions on the left and the
// four parts in a card on the right. The left wrapper is `display: contents`
// below lg, so its children join the single ordered column there.
defineProps<{ showCancel: boolean }>()
const emit = defineEmits<{ start: []; cancel: []; knowType: [] }>()

/** The part rows fade up one after another, this far apart. */
const ROW_STAGGER_MS = 60
</script>

<template>
  <div class="flex-grow flex flex-col">
    <!-- Desktop top bar -->
    <div class="hidden lg:flex h-16 px-10 items-center justify-between border-b border-brand-surface-border dark:border-stone-700 bg-brand-surface-light dark:bg-brand-surface-dark">
      <span class="font-serif text-xl font-bold text-stone-800 dark:text-white">SkinBuddy</span>
      <button
        v-if="showCancel"
        type="button"
        class="h-11 px-4 rounded-xl border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-sm font-bold text-stone-600 dark:text-stone-300 hover:border-brand-primary-strong dark:hover:border-brand-primary transition-colors"
        @click="emit('cancel')"
      >
        Leave the quiz
      </button>
    </div>

    <div class="flex-grow w-full max-w-md mx-auto px-5 pt-5 pb-6 flex flex-col lg:max-w-[1280px] lg:grid lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-14 lg:px-24 lg:py-14 lg:items-center">
      <!-- Phone header row -->
      <div class="order-0 flex items-center justify-between h-11 lg:hidden">
        <button
          v-if="showCancel"
          type="button"
          aria-label="Close the quiz"
          class="w-11 h-11 -ml-2 flex items-center justify-center text-brand-text dark:text-stone-200 hover:text-semantic-error transition-colors"
          @click="emit('cancel')"
        >
          <svg class="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <span v-else class="w-11" />
        <span class="text-xs font-bold uppercase tracking-[0.12em] text-brand-primary-strong dark:text-brand-primary">Skin quiz</span>
        <span class="w-11" />
      </div>

      <!-- Left on desktop: the intro and the actions -->
      <div class="contents lg:flex lg:flex-col">
        <div class="order-1 mt-7 lg:mt-0">
          <span class="hidden lg:block text-[13px] font-extrabold uppercase tracking-[0.14em] text-brand-primary-strong dark:text-brand-primary">Skin quiz</span>
          <h1 class="font-serif text-[34px] lg:text-[52px] leading-[1.15] lg:leading-[1.1] lg:mt-3.5 font-bold text-stone-800 dark:text-white">Find your skin type</h1>
          <p class="mt-3 lg:mt-[18px] text-[15px] lg:text-lg leading-relaxed text-stone-600 dark:text-stone-300 lg:max-w-[540px]">
            Four short parts about how your skin looks and behaves day to day. Answer from what you notice, not what you think you should.
          </p>

          <div class="flex flex-wrap gap-2 lg:gap-2.5 mt-4 lg:mt-[22px]">
            <span class="inline-flex items-center gap-1.5 lg:gap-2 px-2.5 py-1.5 lg:px-3.5 lg:py-2 rounded-full bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-600 text-xs lg:text-sm font-semibold">
              <svg class="w-3.5 h-3.5 lg:w-4 lg:h-4 text-brand-primary-strong dark:text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              About 3 minutes
            </span>
            <span class="inline-flex items-center px-2.5 py-1.5 lg:px-3.5 lg:py-2 rounded-full bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-600 text-xs lg:text-sm font-semibold">
              16 questions, plus up to {{ MAX_BACKUPS_PER_AXIS }} per part if needed
            </span>
          </div>
        </div>

        <div class="order-3 mt-auto pt-6 lg:mt-9 lg:pt-0 flex flex-col gap-2.5">
          <div class="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-3">
            <button
              type="button"
              class="h-[54px] lg:h-14 lg:px-8 inline-flex items-center justify-center gap-2.5 rounded-2xl bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white text-base lg:text-[17px] font-bold transition-colors active:scale-[0.98] motion-reduce:active:scale-100"
              @click="emit('start')"
            >
              Start the quiz
              <svg class="hidden lg:block w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
            <button
              type="button"
              class="h-12 lg:h-14 lg:px-[22px] rounded-2xl lg:border-[1.5px] lg:border-brand-surface-border lg:dark:border-stone-600 lg:bg-brand-surface-light lg:dark:bg-brand-surface-dark text-[15px] lg:text-base font-bold text-brand-primary-strong dark:text-brand-primary hover:text-brand-primary-strong-hover dark:hover:text-brand-primary-accent lg:hover:border-brand-primary-strong lg:dark:hover:border-brand-primary transition-colors"
              @click="emit('knowType')"
            >
              I already know my type
            </button>
          </div>
          <p class="text-center lg:text-left lg:mt-1.5 text-xs lg:text-[13px] text-stone-600 dark:text-stone-400">A starting point for your routine, not a diagnosis.</p>
        </div>
      </div>

      <!-- Right on desktop: the four parts and the note on skipping -->
      <section
        aria-labelledby="quiz-parts-heading"
        class="order-2 flex flex-col lg:gap-3 lg:rounded-[28px] lg:bg-brand-surface-light lg:dark:bg-brand-surface-dark lg:border lg:border-brand-surface-border lg:dark:border-stone-700 lg:p-7"
      >
        <h2 id="quiz-parts-heading" class="sr-only lg:not-sr-only text-[13px] font-extrabold text-brand-text dark:text-stone-100">The four parts</h2>
        <ol class="mt-6 lg:mt-0 flex flex-col gap-2.5">
          <li
            v-for="(axis, i) in AXIS_ORDER"
            :key="axis"
            class="quiz-rise flex items-center gap-3.5 rounded-[18px] lg:rounded-2xl px-4 py-3.5 lg:px-3.5 lg:py-3 bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 lg:bg-brand-bg-light lg:dark:bg-brand-bg-dark lg:border-0"
            :style="{ animationDelay: `${i * ROW_STAGGER_MS}ms` }"
            data-testid="start-part"
          >
            <span class="w-9 h-9 shrink-0 rounded-xl bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary-strong dark:text-brand-primary flex items-center justify-center text-sm font-extrabold">{{ i + 1 }}</span>
            <span class="flex flex-col gap-0.5">
              <span class="text-[15px] font-bold text-brand-text dark:text-stone-100">{{ AXIS_COPY[axis].part }}</span>
              <span class="text-[13px] text-stone-600 dark:text-stone-400">{{ AXIS_COPY[axis].pair }}</span>
            </span>
          </li>
        </ol>

        <div class="flex gap-2.5 items-start mt-4 lg:mt-1 px-3.5 py-3 rounded-[14px] bg-brand-surface-light dark:bg-brand-surface-dark lg:bg-transparent lg:dark:bg-transparent border border-dashed border-stone-300 dark:border-stone-600">
          <svg class="w-[18px] h-[18px] shrink-0 mt-px text-brand-primary-strong dark:text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
          <p class="text-[13px] leading-relaxed text-stone-600 dark:text-stone-300">
            Not sure, or a question doesn't fit you? Say so. Those answers are left out rather than guessed, and we ask an easier question if a part needs one.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>
