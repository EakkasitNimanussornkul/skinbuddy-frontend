<script setup lang="ts">
import type { FramePart } from './axisCopy'

// The frame around every in-quiz screen: "About you", each question and each
// part-complete screen. On a phone it is one column with a back / title / close
// row. From lg it becomes a top bar, a list of the four parts on the left and
// the screen in a card on the right, with "Previous question" at its foot.

withDefaults(
  defineProps<{
    label: string
    labelDetail?: string
    showBack: boolean
    backLabel?: string
    showCancel: boolean
    parts: FramePart[]
    hint?: string
  }>(),
  { labelDetail: '', backLabel: 'Previous question', hint: '' },
)

const emit = defineEmits<{ back: []; cancel: [] }>()
</script>

<template>
  <div class="flex flex-col flex-grow min-h-screen">
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

    <div class="flex-grow w-full max-w-md mx-auto px-5 pt-5 pb-6 flex flex-col lg:max-w-[1280px] lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-12 lg:px-16 lg:py-10">
      <!-- Desktop list of parts -->
      <nav aria-label="Quiz parts" class="hidden lg:flex flex-col gap-2.5">
        <span class="mb-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-brand-primary-strong dark:text-brand-primary">Skin quiz</span>
        <div
          v-for="part in parts"
          :key="part.number"
          class="flex gap-3.5 items-center rounded-[18px]"
          :class="part.state === 'current'
            ? 'bg-brand-primary-light dark:bg-brand-primary/15 border-2 border-brand-primary-strong dark:border-brand-primary px-[15px] py-[13px]'
            : part.state === 'done'
              ? 'bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 px-4 py-3.5'
              : 'border border-brand-surface-border dark:border-stone-700 px-4 py-3.5'"
          :aria-current="part.state === 'current' ? 'step' : undefined"
        >
          <span
            v-if="part.state === 'done'"
            class="w-[34px] h-[34px] shrink-0 rounded-full bg-brand-primary-strong flex items-center justify-center"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
          </span>
          <span
            v-else
            class="w-[34px] h-[34px] shrink-0 rounded-full flex items-center justify-center text-sm font-extrabold"
            :class="part.state === 'current'
              ? 'bg-white dark:bg-brand-surface-dark text-brand-primary-strong dark:text-brand-primary border-2 border-brand-primary-strong dark:border-brand-primary'
              : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-300'"
          >{{ part.number }}</span>
          <span class="flex flex-col gap-0.5 min-w-0">
            <span
              class="text-[15px]"
              :class="part.state === 'current'
                ? 'font-extrabold text-brand-primary-strong-hover dark:text-white'
                : part.state === 'done' ? 'font-bold text-brand-text dark:text-stone-100' : 'font-bold text-stone-500 dark:text-stone-400'"
            >{{ part.name }}</span>
            <span
              v-if="part.detail"
              class="text-[13px] font-semibold"
              :class="part.state === 'current'
                ? 'text-brand-primary-strong-hover dark:text-brand-primary'
                : part.closeCall ? 'text-[#6B4600] dark:text-amber-200' : 'text-[#1F6B4A] dark:text-emerald-300'"
            >{{ part.detail }}</span>
          </span>
        </div>
        <p class="mt-2.5 text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">"Not sure" and "doesn't apply" answers are left out, never guessed.</p>
      </nav>

      <main class="flex flex-col flex-grow lg:bg-brand-surface-light lg:dark:bg-brand-surface-dark lg:border lg:border-brand-surface-border lg:dark:border-stone-700 lg:rounded-[28px] lg:px-12 lg:py-10">
        <!-- Phone header row -->
        <div class="flex items-center justify-between h-11 lg:hidden">
          <button
            v-if="showBack"
            type="button"
            :aria-label="backLabel"
            class="w-11 h-11 -ml-2 flex items-center justify-center text-brand-text dark:text-stone-200 hover:text-brand-primary-strong dark:hover:text-brand-primary transition-colors"
            @click="emit('back')"
          >
            <svg class="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span v-else class="w-11" />
          <span class="text-[13px] font-bold text-brand-text dark:text-stone-100 text-center">
            {{ label }}<span v-if="labelDetail" class="font-semibold text-stone-600 dark:text-stone-400"> · {{ labelDetail }}</span>
          </span>
          <button
            v-if="showCancel"
            type="button"
            aria-label="Leave the quiz"
            class="w-11 h-11 -mr-2 flex items-center justify-center text-stone-600 dark:text-stone-400 hover:text-semantic-error transition-colors"
            @click="emit('cancel')"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <span v-else class="w-11" />
        </div>

        <div class="mt-2 lg:hidden">
          <slot name="progress" />
        </div>

        <slot />

        <div class="mt-auto pt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <button
            v-if="showBack"
            type="button"
            class="hidden lg:inline-flex items-center gap-2 h-12 px-5 rounded-[14px] border-[1.5px] border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-[15px] font-bold text-brand-text dark:text-stone-200 hover:border-brand-primary-strong dark:hover:border-brand-primary transition-colors"
            @click="emit('back')"
          >
            <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            {{ backLabel }}
          </button>
          <slot name="footer">
            <p v-if="hint" class="flex items-center justify-center gap-2 text-xs leading-relaxed text-center text-stone-600 dark:text-stone-400 lg:text-[13px]">
              {{ hint }}
            </p>
          </slot>
        </div>
      </main>
    </div>
  </div>
</template>
