<script setup lang="ts">
// Logic for fetching routines will go here in the next phase
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans transition-colors duration-300 pb-28 pt-6">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 h-[80vh] flex flex-col items-center justify-center">

      <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl p-10 text-center border border-stone-200 dark:border-stone-800 shadow-sm max-w-sm w-full flex flex-col items-center">
        <div class="w-20 h-20 bg-stone-50 dark:bg-stone-900 rounded-full flex items-center justify-center mb-6 shadow-inner border border-stone-200 dark:border-stone-800">
          <svg class="w-10 h-10 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-serif font-bold mb-2 text-brand-text dark:text-white">Daily Regimen</h2>
        <p class="text-sm text-brand-text-muted dark:text-stone-400 mb-6 leading-relaxed">
          Your personalized morning and evening routines are being formulated.
        </p>
        <div class="w-12 h-1 bg-stone-200 dark:bg-stone-800 rounded-full"></div>
      </div>

    </div>
  </div>
</template>
