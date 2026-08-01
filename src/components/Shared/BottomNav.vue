<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <nav class="lg:hidden fixed bottom-0 inset-x-0 bg-brand-surface-light/95 dark:bg-brand-surface-dark/95 backdrop-blur-md border-t border-brand-surface-border dark:border-stone-800 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-40 pb-safe transition-colors duration-300">
    <!-- Responsive Container for both Mobile & Tablet viewports -->
    <div class="flex justify-between items-center h-16 sm:h-20 max-w-2xl mx-auto px-4 sm:px-10 relative">

      <!-- 1. Home -->
      <RouterLink to="/" class="flex flex-col items-center gap-1 group flex-1" active-class="is-active" exact-active-class="is-active">
        <div class="text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors">
          <svg class="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
        <span class="text-[9px] sm:text-[10px] font-bold tracking-widest text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors mt-0.5">HOME</span>
      </RouterLink>

      <!-- 2. Routine -->
      <RouterLink to="/routine" class="flex flex-col items-center gap-1 group flex-1" active-class="is-active">
        <div class="text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors">
          <svg class="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <span class="text-[9px] sm:text-[10px] font-bold tracking-widest text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors mt-0.5">ROUTINE</span>
      </RouterLink>

      <!-- 3. CENTER SPOTLIGHT: SkinBuddy AI -->
      <RouterLink to="/chat" class="flex flex-col items-center group flex-1 -mt-4 sm:-mt-5 relative" active-class="is-active">
        <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand-primary text-white flex items-center justify-center p-2.5 sm:p-3 shadow-lg shadow-brand-primary/30 group-[.is-active]:scale-110 group-[.is-active]:ring-4 ring-brand-primary/30 transition-all">
          <img src="/images/jelly.png" alt="SkinBuddy AI Mascot" class="w-full h-full object-contain animate-jelly-bounce" />
        </div>
        <span class="text-[9px] sm:text-[10px] font-black tracking-wider text-brand-primary dark:text-brand-primary-accent group-[.is-active]:text-brand-primary transition-colors mt-1">SkinBuddy AI</span>
      </RouterLink>

      <!-- 4. Skincare Check -->
      <RouterLink to="/shelf" class="flex flex-col items-center gap-1 group flex-1" active-class="is-active">
        <div class="text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors">
          <svg class="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        </div>
        <span class="text-[9px] sm:text-[10px] font-bold tracking-widest text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors mt-0.5">CHECK</span>
      </RouterLink>

      <!-- 5. Explore -->
      <RouterLink to="/explore" class="flex flex-col items-center gap-1 group flex-1" active-class="is-active">
        <div class="text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors">
          <svg class="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <span class="text-[9px] sm:text-[10px] font-bold tracking-widest text-brand-text-muted dark:text-stone-500 group-[.is-active]:text-brand-primary transition-colors mt-0.5">EXPLORE</span>
      </RouterLink>

    </div>
  </nav>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 12px);
}
@keyframes jellyBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
.animate-jelly-bounce {
  animation: jellyBounce 2.5s ease-in-out infinite;
}
</style>
