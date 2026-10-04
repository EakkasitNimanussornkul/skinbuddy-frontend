<script setup lang="ts">
import { RouterLink } from 'vue-router'

// Placeholder for the review queue, so the admin-only "Review submissions"
// menu item has somewhere to go. The queue and review screens replace this
// (feat/22, part B). The route is requiresAdmin; the backend enforces it.
</script>

<template>
  <div class="admin-submissions min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-200 pb-32 lg:pb-16">
    <div class="w-full max-w-2xl mx-auto px-5 pt-10">
      <section class="rounded-3xl border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark px-6 py-8 text-center">
        <h1 class="font-serif text-2xl font-bold text-stone-800 dark:text-white">Review submissions</h1>
        <p class="mt-2.5 text-[15px] leading-relaxed text-stone-500 dark:text-stone-400">
          The review screens aren't ready yet. Submissions are kept safely until they are.
        </p>
        <RouterLink
          to="/explore"
          class="mt-5 min-h-12 px-6 rounded-2xl border-[1.5px] border-brand-primary-strong dark:border-brand-primary text-brand-primary-strong-hover dark:text-brand-primary-accent font-bold inline-flex items-center"
        >
          Back to Explore
        </RouterLink>
      </section>
    </div>
  </div>
</template>
