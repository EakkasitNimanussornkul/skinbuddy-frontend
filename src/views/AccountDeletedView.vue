<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

/**
 * After an account was deleted (/account/deleted). Public, since the session
 * has already ended. `line=0` means the backend could not tell LINE to end
 * the link (LINE Login's Deauthorize), so the user is asked to remove
 * SkinBuddy in LINE themselves; their data is deleted either way.
 */
const route = useRoute()
const lineStillLinked = computed(() => route.query.line === '0')
</script>

<template>
  <div class="account-deleted min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-200 transition-colors duration-300 motion-reduce:transition-none">
    <main class="w-full max-w-md mx-auto min-h-screen px-5 pt-10 pb-6 flex flex-col gap-4">
      <!-- The blocks fade up in order as the screen opens (rise-in in style.css). -->
      <span class="rise-in w-[52px] h-[52px] rounded-2xl bg-brand-primary-light dark:bg-brand-primary/15 flex items-center justify-center">
        <svg class="w-[26px] h-[26px] text-brand-primary-strong dark:text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
      </span>
      <h1 class="rise-in m-0 font-serif text-[28px] font-bold text-stone-800 dark:text-white" style="--rise-delay: 50ms">Your account was deleted.</h1>
      <p v-if="lineStillLinked" class="line-hint rise-in m-0 rounded-[14px] px-3.5 py-3 text-[15px] leading-relaxed bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-800" style="--rise-delay: 100ms">
        Also remove SkinBuddy in LINE: Settings › Account › Authorized apps.
      </p>
      <RouterLink
        to="/explore"
        style="--rise-delay: 150ms"
        class="deleted-explore rise-in min-h-[52px] rounded-2xl flex items-center justify-center bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white dark:bg-brand-primary dark:hover:bg-brand-primary-hover dark:text-stone-900 text-base font-extrabold transition-colors motion-reduce:transition-none"
      >
        Go to Explore
      </RouterLink>
    </main>
  </div>
</template>
