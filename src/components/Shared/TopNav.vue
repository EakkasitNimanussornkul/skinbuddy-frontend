<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import SearchAutocompleteInput from './SearchAutocompleteInput.vue'

const authStore = useAuthStore()

const isUserMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

const toggleUserMenu = () => {
  if (!authStore.isAuthenticated) {
    authStore.triggerLoginPopup('Sign in to access your account settings and routine.')
    return
  }
  isUserMenuOpen.value = !isUserMenuOpen.value
}

const handleLogoutClick = () => {
  isUserMenuOpen.value = false
  authStore.logout()
}

const handleClickOutside = (event: MouseEvent) => {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    isUserMenuOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <header class="hidden lg:flex sticky top-0 inset-x-0 z-50 h-20 bg-brand-surface-light/80 dark:bg-brand-surface-dark/80 backdrop-blur-md border-b border-brand-surface-border dark:border-stone-800 transition-colors duration-300">
    <div class="max-w-[1720px] mx-auto px-4 sm:px-6 w-full flex items-center justify-between gap-6 sm:gap-10 h-full relative">

      <!-- Brand Identity -->
      <RouterLink to="/" class="flex items-center gap-2.5 group flex-shrink-0">
        <div class="w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <img src="/images/jelly.png" alt="SkinBuddy Mascot" class="w-full h-full object-contain drop-shadow-sm" />
        </div>
        <span class="font-serif font-bold text-xl tracking-tight text-brand-text dark:text-white group-hover:text-brand-primary transition-colors">SkinBuddy</span>
      </RouterLink>

      <!-- Search Input -->
      <div class="flex-1 max-w-2xl">
        <SearchAutocompleteInput placeholder="Search catalog formulas, brands, or active ingredients..." />
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
          <div class="absolute top-20 left-4 right-4 mx-auto max-w-[1680px] bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 rounded-3xl shadow-2xl p-6 grid grid-cols-12 gap-6 opacity-0 translate-y-2 pointer-events-none group-hover/mega:opacity-100 group-hover/mega:translate-y-0 group-hover/mega:pointer-events-auto transition-all duration-200 z-50 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md">

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
            </div>

            <!-- Category Columns Grid -->
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
          <img src="/images/jelly.png" alt="AI Mascot" class="w-4 h-4 object-contain" />
          <span>SkinBuddy AI</span>
        </RouterLink>
      </nav>

      <!-- Profile Section -->
      <div ref="userMenuRef" class="relative pl-4 border-l border-brand-surface-border dark:border-stone-800">
        <button
          @click.stop="toggleUserMenu"
          class="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-brand-bg-light dark:hover:bg-stone-800/60 transition-all cursor-pointer group border border-transparent hover:border-brand-surface-border dark:hover:border-stone-700"
        >
          <div class="w-11 h-11 rounded-full overflow-hidden border-2 border-brand-primary/20 group-hover:border-brand-primary transition-colors bg-brand-bg-light dark:bg-stone-800 flex items-center justify-center shrink-0 shadow-sm">
            <img v-if="authStore.user?.picture" :src="authStore.user.picture" class="w-full h-full object-cover" />
            <svg v-else class="w-5 h-5 text-brand-text-muted group-hover:text-brand-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>

          <div class="text-left hidden xl:block">
            <span class="text-xs font-bold text-brand-text dark:text-stone-200 group-hover:text-brand-primary transition-colors block leading-tight">
              {{ authStore.user?.name || 'Account' }}
            </span>
            <span class="text-[10px] text-brand-text-muted font-medium block mt-0.5">
              <!-- 'Profile Active' here told a user with no skin type that their
                   profile was active. Wording matches MobileTopBar's 'SET TYPE'. -->
              {{ authStore.isAuthenticated ? (authStore.user?.skin_type || 'Set Type') : 'Log in / Register' }}
            </span>
          </div>

          <svg :class="['w-3.5 h-3.5 text-brand-text-muted transition-transform duration-200 stroke-[2.5]', isUserMenuOpen ? 'rotate-180 text-brand-primary' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Dropdown Canvas -->
<!-- Dropdown Canvas -->
<Transition name="dropdown">
  <div
    v-if="isUserMenuOpen"
    class="absolute right-0 top-16 w-64 bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 rounded-3xl shadow-2xl p-2.5 z-50 space-y-1.5 backdrop-blur-md"
  >
    <!-- 🌟 ENHANCED USER HEADER INFO BLOCK 🌟 -->
    <div class="p-3 border-b border-brand-surface-border dark:border-stone-800/80 mb-1 space-y-1.5">
      <p class="text-xs font-bold text-brand-text dark:text-stone-100 truncate">
        {{ authStore.user?.name || 'User Account' }}
      </p>

      <!-- High-Visibility Skin Type Badge (Stands out in Light & Dark Mode) -->
      <div class="flex items-center gap-1.5">
        <span class="text-[10px] font-semibold text-brand-text-muted">Skin Type:</span>
        <span class="inline-block text-[10px] font-bold font-mono uppercase tracking-wider text-brand-primary dark:text-brand-primary-accent bg-brand-primary/10 dark:bg-brand-primary/20 px-2 py-0.5 rounded-md border border-brand-primary/20 shadow-2xs">
          {{ authStore.user?.skin_type || 'Not Analyzed' }}
        </span>
      </div>
    </div>

    <!-- 🌟 ITEM 1: SETTINGS (Larger Icon & Container) 🌟 -->
    <RouterLink
      to="/settings"
      @click="isUserMenuOpen = false"
      class="flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-brand-text dark:text-stone-200 hover:bg-brand-bg-light dark:hover:bg-stone-800/80 hover:text-brand-primary transition-all group"
    >
      <div class="w-9 h-9 rounded-xl bg-brand-bg-light dark:bg-stone-800 flex items-center justify-center text-brand-text-muted group-hover:text-brand-primary group-hover:bg-brand-primary/10 transition-colors shrink-0 shadow-2xs">
        <svg class="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <span>Settings</span>
    </RouterLink>

    <!-- Item 2: SkinBuddy AI Assistant -->
    <RouterLink
      to="/chat"
      @click="isUserMenuOpen = false"
      class="flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-brand-text dark:text-stone-200 hover:bg-brand-bg-light dark:hover:bg-stone-800/80 hover:text-brand-primary transition-all group"
    >
      <div class="w-9 h-9 rounded-xl bg-brand-bg-light dark:bg-stone-800 p-1.5 flex items-center justify-center group-hover:bg-brand-primary/10 transition-colors shrink-0 shadow-2xs">
        <img src="/images/jelly.png" alt="SkinBuddy Mascot" class="w-full h-full object-contain" />
      </div>
      <span>SkinBuddy AI Assistant</span>
    </RouterLink>

    <!-- Item 3: Support & FAQs -->
    <button
      type="button"
      @click="isUserMenuOpen = false"
      class="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-brand-text dark:text-stone-200 hover:bg-brand-bg-light dark:hover:bg-stone-800/80 hover:text-brand-primary transition-all group cursor-pointer text-left"
    >
      <div class="w-9 h-9 rounded-xl bg-brand-bg-light dark:bg-stone-800 flex items-center justify-center text-brand-text-muted group-hover:text-brand-primary group-hover:bg-brand-primary/10 transition-colors shrink-0 p-1.5 shadow-2xs">
        <svg class="w-full h-full stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" stroke-linecap="round" stroke-width="2.5" />
        </svg>
      </div>
      <span>Support & FAQs</span>
    </button>

    <div class="h-px bg-brand-surface-border dark:bg-stone-800 my-1" />

    <!-- Item 4: Logout -->
    <button
      @click="handleLogoutClick"
      class="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-semantic-error hover:bg-semantic-error/10 transition-all cursor-pointer group"
    >
      <div class="w-9 h-9 rounded-xl bg-semantic-error/10 flex items-center justify-center text-semantic-error group-hover:scale-105 transition-transform shrink-0 shadow-2xs">
        <svg class="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </div>
      <span>Log out</span>
    </button>

  </div>
</Transition>

      </div>

    </div>
  </header>
</template>

<style scoped>
.dropdown-enter-active, .dropdown-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-8px) scale(0.97); }
</style>
