<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import SearchAutocompleteInput from './SearchAutocompleteInput.vue'

const authStore = useAuthStore()
</script>

<template>
  <header class="hidden lg:flex sticky top-0 inset-x-0 z-40 h-20 bg-brand-surface-light/90 dark:bg-brand-surface-dark/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors duration-300">
    <div class="max-w-7xl mx-auto px-6 w-full flex items-center justify-between gap-8">

      <!-- Brand Identity -->
      <RouterLink to="/" class="flex items-center gap-2.5 group flex-shrink-0">
        <div class="w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <img src="/images/jelly.png" alt="SkinBuddy Mascot" class="w-full h-full object-contain drop-shadow-sm" />
        </div>
        <span class="font-serif font-bold text-xl tracking-tight text-brand-text dark:text-white group-hover:text-brand-primary transition-colors">SkinBuddy</span>
      </RouterLink>

      <!-- 🌟 INSTANT AUTOCOMPLETE SEARCH BAR 🌟 -->
      <div class="flex-1 max-w-md">
        <SearchAutocompleteInput placeholder="Search catalog formulas, brands, or actives..." />
      </div>

      <!-- Navigation Links -->
      <nav class="flex items-center gap-6">
        <RouterLink to="/explore" class="text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-brand-primary transition-colors" active-class="text-brand-primary dark:text-pink-400">Explore</RouterLink>
        <RouterLink to="/routine" class="text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-brand-primary transition-colors" active-class="text-brand-primary dark:text-pink-400">Routine</RouterLink>
        <RouterLink to="/shelf" class="text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-brand-primary transition-colors" active-class="text-brand-primary dark:text-pink-400">Check Shelves</RouterLink>
        <RouterLink to="/chat" class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-primary/10 dark:bg-pink-950/40 text-brand-primary dark:text-pink-300 font-bold text-xs border border-brand-primary/20 hover:bg-brand-primary hover:text-white transition-all shadow-2xs" active-class="bg-brand-primary text-white">
          <img src="/images/jelly.png" alt="AI" class="w-4 h-4 object-contain" />
          <span>SkinBuddy AI</span>
        </RouterLink>
      </nav>

      <!-- Profile Section -->
      <div class="flex items-center gap-3 pl-4 border-l border-stone-200 dark:border-stone-800">
        <RouterLink to="/settings" class="flex items-center gap-2.5 group">
          <div class="w-8 h-8 rounded-full overflow-hidden border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
            <img v-if="authStore.user?.picture" :src="authStore.user.picture" class="w-full h-full object-cover" />
            <svg v-else class="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <span class="text-xs font-bold text-brand-text dark:text-stone-200 group-hover:text-brand-primary transition-colors">{{ authStore.user?.name || 'Account' }}</span>
        </RouterLink>
      </div>

    </div>
  </header>
</template>
