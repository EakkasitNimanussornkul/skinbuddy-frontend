<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import SearchAutocompleteInput from './SearchAutocompleteInput.vue'

const router = useRouter()
const authStore = useAuthStore()

const userName = computed(() => authStore.user?.name?.split(' ')[0] || 'User')

// 🌟 Routes directly to /profile when clicking user section
const handleProfileClick = () => {
  router.push('/profile')
}
</script>

<template>
  <header class="lg:hidden sticky top-0 inset-x-0 z-40 bg-brand-surface-light/95 dark:bg-brand-surface-dark/95 backdrop-blur-md border-b border-brand-surface-border dark:border-stone-800 transition-colors duration-300 px-3 py-2.5">
    <div class="flex items-center justify-between gap-2.5 w-full">

      <!-- Left Side: Avatar + Name + Skin Type Badge (Pushes to /profile) -->
      <button
        @click="handleProfileClick"
        class="flex items-center gap-2 text-left group shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
        title="View Profile"
      >
        <div class="w-10 h-10 rounded-full overflow-hidden border border-brand-primary/30 bg-brand-bg-light dark:bg-stone-800 flex items-center justify-center shrink-0 shadow-2xs">
          <img v-if="authStore.user?.picture" :src="authStore.user.picture" alt="Profile" class="w-full h-full object-cover" />
          <svg v-else class="w-4 h-4 text-brand-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>

        <div class="flex flex-col justify-center min-w-0">
          <span class="text-xs font-serif font-bold text-brand-text dark:text-white truncate max-w-[70px] sm:max-w-[100px] leading-tight">
            {{ userName }}
          </span>
          <span class="inline-block text-[9px] font-bold font-mono uppercase tracking-wider text-brand-primary dark:text-brand-primary-accent bg-brand-primary/10 px-1.5 py-0.2 rounded border border-brand-primary/20 mt-0.5 w-max">
            {{ authStore.user?.skin_type || 'SET TYPE' }}
          </span>
        </div>
      </button>

      <!-- Center: Search Input in between -->
      <div class="flex-1 min-w-0">
        <SearchAutocompleteInput placeholder="Search..." />
      </div>

      <!-- Right Side: Symmetrical Circular Cog Settings Button -->
      <button
        @click="router.push('/settings')"
        class="w-10 h-10 rounded-full bg-brand-surface-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700 flex items-center justify-center text-brand-text-muted hover:text-brand-primary transition-colors shrink-0 cursor-pointer shadow-2xs"
        aria-label="Account Settings"
      >
        <svg class="w-5 h-5 stroke-[1.8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

    </div>
  </header>
</template>
