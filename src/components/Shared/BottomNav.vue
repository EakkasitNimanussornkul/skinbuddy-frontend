<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <nav class="lg:hidden fixed bottom-0 w-full bg-brand-surface-light dark:bg-brand-surface-dark border-t border-stone-200 dark:border-stone-800 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:shadow-none z-40 pb-safe transition-colors duration-300">
    <div class="flex justify-between items-center h-16 max-w-md mx-auto px-3 sm:px-6">

      <!-- Home -->
      <RouterLink to="/" class="flex flex-col items-center gap-1 group flex-1" active-class="is-active" exact-active-class="is-active">
        <div class="text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
        <span class="text-[9px] font-bold tracking-widest text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors mt-0.5">HOME</span>
      </RouterLink>

      <!-- Routine -->
      <RouterLink to="/routine" class="flex flex-col items-center gap-1 group flex-1" active-class="is-active">
        <div class="text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <span class="text-[9px] font-bold tracking-widest text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors mt-0.5">ROUTINE</span>
      </RouterLink>

      <!-- Skincare Check (Formerly Shelf) -->
      <RouterLink to="/shelf" class="flex flex-col items-center gap-1 group flex-1" active-class="is-active">
        <div class="text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        </div>
        <span class="text-[9px] font-bold tracking-widest text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors mt-0.5">CHECK</span>
      </RouterLink>

      <!-- Explore -->
      <RouterLink to="/explore" class="flex flex-col items-center gap-1 group flex-1" active-class="is-active">
        <div class="text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <span class="text-[9px] font-bold tracking-widest text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors mt-0.5">EXPLORE</span>
      </RouterLink>

      <!-- AI Consulter (Formerly Chat) -->
      <RouterLink to="/chat" class="flex flex-col items-center gap-1 group flex-1" active-class="is-active">
        <div class="text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors">
          <!-- AI Sparkles Icon -->
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
          </svg>
        </div>
        <span class="text-[9px] font-bold tracking-widest text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors mt-0.5">AI CONSULT</span>
      </RouterLink>

      <!-- Settings -->
      <RouterLink to="/settings" class="flex flex-col items-center gap-1 group flex-1" active-class="is-active">
        <div class="text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </div>
        <span class="text-[9px] font-bold tracking-widest text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors mt-0.5">SETTINGS</span>
      </RouterLink>

    </div>
  </nav>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
</style>
