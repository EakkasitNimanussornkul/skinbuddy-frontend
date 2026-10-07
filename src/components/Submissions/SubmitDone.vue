<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

// Shown once a submission has been sent. Nothing is published yet - the copy
// says it waits for the team, and where to follow it.
defineProps<{ brand: string; name: string }>()
const emit = defineEmits<{ another: [] }>()

const heading = ref<HTMLElement | null>(null)
onMounted(() => heading.value?.focus())
</script>

<template>
  <div class="submit-done flex-grow w-full max-w-md mx-auto px-5 pt-5 pb-6 flex flex-col lg:max-w-lg lg:pt-16">
    <!-- The blocks fade up in order as the screen opens (rise-in in style.css). -->
    <div class="rise-in mt-16 lg:mt-0 flex flex-col items-center text-center">
      <span class="w-[72px] h-[72px] rounded-full bg-brand-primary-light dark:bg-brand-primary/20 flex items-center justify-center">
        <svg class="w-[34px] h-[34px] text-brand-primary-strong dark:text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
      </span>
      <h1 ref="heading" tabindex="-1" class="mt-5 font-serif text-[28px] font-bold text-stone-800 dark:text-white outline-none">Sent for review</h1>
      <p class="mt-2.5 text-[15px] leading-relaxed text-stone-500 dark:text-stone-400 max-w-[300px]">
        Thank you. Our team will check it, and you'll see the result in My submissions.
      </p>
    </div>

    <div style="--rise-delay: 50ms" class="sent-summary rise-in mt-7 rounded-[18px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark p-4 flex gap-3.5 items-center">
      <span class="w-14 h-14 rounded-[14px] bg-brand-bg-light dark:bg-stone-800 flex items-center justify-center shrink-0">
        <svg class="w-6 h-6 text-stone-500 dark:text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6v4l2 3v10a1 1 0 01-1 1H8a1 1 0 01-1-1V10l2-3z" /></svg>
      </span>
      <span class="flex flex-col gap-1 min-w-0">
        <span class="text-xs font-extrabold uppercase tracking-[0.08em] text-brand-primary-strong-hover dark:text-brand-primary-accent truncate">{{ brand }}</span>
        <span class="text-[15px] font-extrabold text-stone-800 dark:text-white break-words">{{ name }}</span>
        <span class="self-start px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 text-xs font-extrabold">Waiting for review</span>
      </span>
    </div>

    <div style="--rise-delay: 100ms" class="rise-in mt-auto pt-8 flex flex-col gap-2.5">
      <RouterLink
        to="/submissions"
        class="h-[54px] rounded-2xl bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white text-base font-bold flex items-center justify-center transition-colors"
      >
        See my submissions
      </RouterLink>
      <button
        type="button"
        class="submit-another h-12 rounded-2xl text-[15px] font-bold text-brand-primary-strong-hover dark:text-brand-primary-accent"
        @click="emit('another')"
      >
        Submit another product
      </button>
    </div>
  </div>
</template>
