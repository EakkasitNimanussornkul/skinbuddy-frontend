<script setup lang="ts">
import { RouterLink } from 'vue-router'

// Shown when an admin route answers 403. The backend is the real gate: the
// menu item and the route guard only decide what is offered, so a user whose
// role changed, or whose role could not be read, lands here rather than on a
// broken page.
</script>

<template>
  <section
    class="admin-forbidden mt-10 rounded-3xl border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark px-6 py-8 flex flex-col items-center text-center"
    role="alert"
  >
    <span class="w-[72px] h-[72px] rounded-full bg-brand-bg-light dark:bg-stone-800 flex items-center justify-center">
      <svg class="w-8 h-8 text-brand-primary-strong dark:text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9.5 12.5l5-5M9.5 7.5l5 5" /></svg>
    </span>
    <h1 class="mt-4 font-serif text-2xl font-bold text-stone-800 dark:text-white">For the SkinBuddy team</h1>
    <p class="mt-2.5 text-[15px] leading-relaxed text-stone-500 dark:text-stone-400">
      This page is for the people who review products. Your account can't open it. You can follow your own submissions in My submissions.
    </p>
    <RouterLink
      to="/submissions"
      class="mt-5 min-h-12 px-6 rounded-2xl border-[1.5px] border-brand-primary-strong dark:border-brand-primary text-brand-primary-strong-hover dark:text-brand-primary-accent font-bold inline-flex items-center"
    >
      Go to My submissions
    </RouterLink>
  </section>
</template>
