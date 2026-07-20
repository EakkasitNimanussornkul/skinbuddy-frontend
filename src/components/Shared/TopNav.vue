<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import SearchAutocompleteInput from './SearchAutocompleteInput.vue'

const authStore = useAuthStore()
</script>

<template>
  <header class="hidden lg:flex sticky top-0 inset-x-0 z-40 h-20 bg-brand-surface-light/80 dark:bg-brand-surface-dark/80 backdrop-blur-md border-b border-brand-surface-border dark:border-stone-800 transition-colors duration-300">
    <div class="max-w-[1400px] mx-auto px-6 sm:px-8 w-full flex items-center justify-between gap-8 h-full relative">

      <!-- Brand Identity -->
      <RouterLink to="/" class="flex items-center gap-2.5 group flex-shrink-0">
        <div class="w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <img src="/images/jelly.png" alt="SkinBuddy Mascot" class="w-full h-full object-contain drop-shadow-sm" />
        </div>
        <span class="font-serif font-bold text-xl tracking-tight text-brand-text dark:text-white group-hover:text-brand-primary transition-colors">SkinBuddy</span>
      </RouterLink>

      <!-- Search Input -->
      <div class="flex-1 max-w-md">
        <SearchAutocompleteInput placeholder="Search catalog formulas, brands, or actives..." />
      </div>

      <!-- Navigation Links Frame with Hover Mega Menu Hook -->
      <nav class="flex items-center gap-6 h-full">

        <!-- Explore Mega Dropdown Trigger -->
        <div class="h-full flex items-center group/mega">
          <RouterLink
            to="/explore"
            class="text-xs font-bold text-brand-text-muted hover:text-brand-primary transition-colors flex items-center gap-1 py-4"
            active-class="text-brand-primary dark:text-brand-primary-accent"
          >
            <span>Explore</span>
            <svg class="w-3 h-3 transition-transform duration-200 group-hover/mega:rotate-180 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </RouterLink>

          <!-- Floating Mega Flyout Canvas -->
          <div class="absolute top-20 left-6 right-6 mx-auto max-w-[1352px] bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 rounded-3xl shadow-2xl p-6 grid grid-cols-12 gap-6 opacity-0 translate-y-2 pointer-events-none group-hover/mega:opacity-100 group-hover/mega:translate-y-0 group-hover/mega:pointer-events-auto transition-all duration-200 z-50 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md">

            <!-- Side Directory Track -->
            <div class="col-span-3 border-r border-brand-surface-border dark:border-stone-800/60 pr-6 flex flex-col justify-between">
              <div class="space-y-4">
                <div class="p-3.5 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                  <h4 class="text-xs font-bold text-brand-primary uppercase tracking-wider">Skincare Index</h4>
                  <p class="text-[11px] text-brand-text-muted mt-0.5">Browse all ingredient formulations by compatibility metrics.</p>
                </div>
                <div class="space-y-1">
                  <RouterLink to="/explore?category=All" class="flex items-center justify-between text-xs font-bold text-brand-text dark:text-stone-300 p-2 rounded-lg hover:bg-brand-bg-light dark:hover:bg-stone-900 transition-colors">
                    <span>Explore All Formulas</span>
                    <svg class="w-3 h-3 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
                  </RouterLink>
                </div>
              </div>
              <p class="text-[10px] text-brand-text-muted font-medium">Missing a profile? <span class="text-brand-primary font-bold underline cursor-pointer">Submit Item</span></p>
            </div>

<!-- Category Columns Grid inside Navbar.vue -->
<div class="col-span-9 grid grid-cols-4 gap-4">
  <!-- Cleansing -->
  <div class="space-y-2.5">
    <span class="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest px-2 py-0.5 bg-cyan-500/5 rounded-md border border-cyan-500/10 block w-max">Cleansers & Toners</span>
    <ul class="text-[11px] font-semibold text-brand-text-muted space-y-2 pl-1">
      <li><RouterLink to="/explore?category=Cleansers" class="hover:text-brand-primary transition-colors">Face Cleansers</RouterLink></li>
      <li><RouterLink to="/explore?category=Toners" class="hover:text-brand-primary transition-colors">Balancing Toners</RouterLink></li>
    </ul>
  </div>

  <!-- Treatments -->
  <div class="space-y-2.5">
    <span class="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest px-2 py-0.5 bg-purple-500/5 rounded-md border border-purple-500/10 block w-max">Treatments</span>
    <ul class="text-[11px] font-semibold text-brand-text-muted space-y-2 pl-1">
      <li><RouterLink to="/explore?category=Serums" class="hover:text-brand-primary transition-colors">Targeted Serums</RouterLink></li>
      <li><RouterLink to="/explore?category=Treatments" class="hover:text-brand-primary transition-colors">Active Treatments</RouterLink></li>
      <li><RouterLink to="/explore?category=Exfoliators" class="hover:text-brand-primary transition-colors">Chemical Exfoliators</RouterLink></li>
    </ul>
  </div>

  <!-- Hydration -->
  <div class="space-y-2.5">
    <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest px-2 py-0.5 bg-emerald-500/5 rounded-md border border-emerald-500/10 block w-max">Moisturizers</span>
    <ul class="text-[11px] font-semibold text-brand-text-muted space-y-2 pl-1">
      <li><RouterLink to="/explore?category=Moisturizers" class="hover:text-brand-primary transition-colors">Barrier Creams</RouterLink></li>
    </ul>
  </div>

  <!-- Defense -->
  <div class="space-y-2.5">
    <span class="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest px-2 py-0.5 bg-amber-500/5 rounded-md border border-amber-500/10 block w-max">Sun Care</span>
    <ul class="text-[11px] font-semibold text-brand-text-muted space-y-2 pl-1">
      <li><RouterLink to="/explore?category=Sun+Care" class="hover:text-brand-primary transition-colors">Sunshields (SPF)</RouterLink></li>
    </ul>
  </div>
</div>
          </div>
        </div>

        <RouterLink to="/routine" class="text-xs font-bold text-brand-text-muted hover:text-brand-primary transition-colors" active-class="text-brand-primary dark:text-brand-primary-accent">Routine</RouterLink>
        <RouterLink to="/shelf" class="text-xs font-bold text-brand-text-muted hover:text-brand-primary transition-colors" active-class="text-brand-primary dark:text-brand-primary-accent">Shelves</RouterLink>

        <!-- SkinBuddy AI Button -->
        <RouterLink to="/chat" class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-primary-light/50 dark:bg-brand-primary/10 text-brand-primary dark:text-brand-primary-accent font-bold text-xs border border-brand-primary/20 hover:bg-brand-primary hover:text-white transition-all shadow-sm" active-class="bg-brand-primary text-white">
          <img src="/images/jelly.png" alt="AI" class="w-4 h-4 object-contain" />
          <span>SkinBuddy AI</span>
        </RouterLink>
      </nav>

      <!-- Profile Section -->
      <div class="flex items-center gap-3 pl-4 border-l border-brand-surface-border dark:border-stone-800">
        <RouterLink to="/settings" class="flex items-center gap-2.5 group">
          <div class="w-8 h-8 rounded-full overflow-hidden border border-brand-surface-border dark:border-stone-700 bg-brand-bg-light dark:bg-stone-800 flex items-center justify-center">
            <img v-if="authStore.user?.picture" :src="authStore.user.picture" class="w-full h-full object-cover" />
            <svg v-else class="w-4 h-4 text-brand-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <span class="text-xs font-bold text-brand-text dark:text-stone-200 group-hover:text-brand-primary transition-colors">{{ authStore.user?.name || 'Account' }}</span>
        </RouterLink>
      </div>

    </div>
  </header>
</template>
