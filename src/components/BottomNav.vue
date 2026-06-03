<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <nav
    class="fixed bottom-0 w-full bg-brand-surface-light dark:bg-brand-surface-dark border-t border-stone-200 dark:border-stone-800 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] dark:shadow-none z-40 pb-safe pt-2.5 transition-colors duration-300">
    <div class="flex justify-between items-center h-16 max-w-md mx-auto px-4 sm:px-6">

      <RouterLink to="/" class="flex flex-col items-center gap-1 group w-14" active-class="is-active" exact-active-class="is-active">
        <div class="text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
        <span class="text-[9px] font-bold tracking-widest text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors mt-0.5">HOME</span>
      </RouterLink>

      <RouterLink to="/routine" class="flex flex-col items-center gap-1 group w-14" active-class="is-active">
        <div class="text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <span class="text-[9px] font-bold tracking-widest text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors mt-0.5">ROUTINE</span>
      </RouterLink>

      <RouterLink to="/shelf" class="flex flex-col items-center gap-1 group w-14" active-class="is-active">
        <div class="text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="21 8 21 21 3 21 3 8"></polyline>
            <rect x="1" y="3" width="22" height="5"></rect>
            <line x1="10" y1="12" x2="14" y2="12"></line>
          </svg>
        </div>
        <span class="text-[9px] font-bold tracking-widest text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors mt-0.5">SHELF</span>
      </RouterLink>

      <RouterLink to="/explore" class="flex flex-col items-center gap-1 group w-14" active-class="is-active">
        <div class="text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <span class="text-[9px] font-bold tracking-widest text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors mt-0.5">EXPLORE</span>
      </RouterLink>

      <RouterLink to="/chat" class="flex flex-col items-center gap-1 group w-14" active-class="is-active">
        <div class="text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <span class="text-[9px] font-bold tracking-widest text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors mt-0.5">CHAT</span>
      </RouterLink>

      <RouterLink to="/settings" class="flex flex-col items-center gap-1 group w-14" active-class="is-active">
        <div class="text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
