<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/themeStore'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const router = useRouter()

// Local state for UI toggles
const notificationsEnabled = ref(true)

const handleLogout = () => {
  authStore.logout()
  router.push('/explore')
}
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans pb-28 pt-6 transition-colors duration-300">
    <div class="max-w-md mx-auto px-4 sm:px-6 flex flex-col">

      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-serif font-bold">SkinBuddy</h1>
        <button class="w-10 h-10 flex items-center justify-center text-stone-400 hover:text-brand-primary dark:hover:text-orange-300 transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </button>
      </div>

      <!-- User Profile Card -->
      <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl p-5 shadow-sm border border-stone-200 dark:border-stone-800 mb-8 flex items-center gap-4 relative">

        <!-- Avatar -->
        <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-stone-100 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 flex-shrink-0 flex items-center justify-center">
          <img v-if="authStore.user?.picture" :src="authStore.user.picture" alt="Profile" class="w-full h-full object-cover" />
          <svg v-else class="w-8 h-8 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        </div>

        <!-- User Details -->
        <div class="flex-grow">
          <h2 class="text-xl font-serif font-bold leading-tight text-brand-text dark:text-white">
            {{ authStore.user?.name || 'Guest User' }}
          </h2>
          <div class="flex items-start gap-1.5 mt-1 text-brand-text-muted dark:text-stone-400 text-sm">
            <svg class="w-3.5 h-3.5 text-brand-primary dark:text-orange-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"></path></svg>
            <span class="leading-tight">Skin Type:<br>{{ authStore.user?.skin_type || 'Take Quiz to discover' }}</span>
          </div>
        </div>

        <!-- Edit Button -->
        <button class="absolute right-5 w-8 h-8 rounded-full bg-stone-50 dark:bg-stone-800 flex items-center justify-center text-stone-400 hover:text-brand-primary dark:hover:text-orange-300 border border-stone-200 dark:border-stone-700 transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
        </button>
      </div>

      <!-- App Preferences -->
      <h3 class="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3 px-1">App Preferences</h3>
      <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 mb-8 overflow-hidden flex flex-col">

        <!-- Dark Mode Toggle -->
        <div class="flex items-center justify-between p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800/50">
          <div class="flex items-center gap-4">
            <div class="w-8 h-8 rounded-full bg-brand-bg-light dark:bg-stone-800/50 flex items-center justify-center text-stone-500 dark:text-stone-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
            </div>
            <span class="text-sm font-semibold text-brand-text dark:text-stone-200">Dark Mode</span>
          </div>
          <button @click="themeStore.toggleTheme" class="w-12 h-7 rounded-full relative transition-colors duration-300 focus:outline-none" :class="themeStore.isDark ? 'bg-brand-primary dark:bg-brand-primary-light' : 'bg-stone-200 dark:bg-stone-700'">
            <div class="absolute top-1 bg-white dark:bg-brand-surface-dark w-5 h-5 rounded-full transition-transform duration-300 shadow-sm" :class="themeStore.isDark ? 'translate-x-6' : 'translate-x-1'"></div>
          </button>
        </div>

        <!-- Notifications Toggle -->
        <div class="flex items-center justify-between p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800/50">
          <div class="flex items-center gap-4">
            <div class="w-8 h-8 rounded-full bg-brand-bg-light dark:bg-stone-800/50 flex items-center justify-center text-stone-500 dark:text-stone-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
            </div>
            <span class="text-sm font-semibold text-brand-text dark:text-stone-200">Notifications</span>
          </div>
          <button @click="notificationsEnabled = !notificationsEnabled" class="w-12 h-7 rounded-full relative transition-colors duration-300 focus:outline-none" :class="notificationsEnabled ? 'bg-brand-primary dark:bg-brand-primary-light' : 'bg-stone-200 dark:bg-stone-700'">
            <div class="absolute top-1 bg-white dark:bg-brand-surface-dark w-5 h-5 rounded-full transition-transform duration-300 shadow-sm" :class="notificationsEnabled ? 'translate-x-6' : 'translate-x-1'"></div>
          </button>
        </div>

        <!-- Language Settings -->
        <button class="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors text-left">
          <div class="flex items-center gap-4">
            <div class="w-8 h-8 rounded-full bg-brand-bg-light dark:bg-stone-800/50 flex items-center justify-center text-stone-500 dark:text-stone-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
            </div>
            <span class="text-sm font-semibold text-brand-text dark:text-stone-200">Language</span>
          </div>
          <div class="flex items-center gap-2 text-stone-400">
            <span class="text-sm">English</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </div>
        </button>
      </div>

      <!-- Skin Health -->
      <h3 class="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3 px-1">Skin Health</h3>
      <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 mb-8 overflow-hidden flex flex-col">

        <!-- Retake Quiz -->
        <button @click="router.push('/quiz')" class="w-full flex items-center justify-between p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800/50 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors text-left">
          <div class="flex items-center gap-4">
            <div class="w-8 h-8 rounded-full bg-brand-bg-light dark:bg-stone-800/50 flex items-center justify-center text-stone-500 dark:text-stone-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
            </div>
            <div>
              <span class="block text-sm font-semibold text-brand-text dark:text-stone-200">Retake Skin Quiz</span>
              <span class="block text-[11px] text-brand-text-muted dark:text-stone-500 mt-0.5">Update your profile for better recommendations</span>
            </div>
          </div>
          <svg class="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </button>

        <!-- Routine History -->
        <button @click="router.push('/routine')" class="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors text-left">
          <div class="flex items-center gap-4">
            <div class="w-8 h-8 rounded-full bg-brand-bg-light dark:bg-stone-800/50 flex items-center justify-center text-stone-500 dark:text-stone-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <span class="text-sm font-semibold text-brand-text dark:text-stone-200">Routine History</span>
          </div>
          <svg class="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </button>

      </div>

      <!-- Support -->
      <h3 class="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3 px-1">Support</h3>
      <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 mb-8 overflow-hidden flex flex-col">

        <!-- Help Center -->
        <button class="w-full flex items-center justify-between p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800/50 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors text-left">
          <div class="flex items-center gap-4">
            <div class="w-8 h-8 rounded-full bg-brand-bg-light dark:bg-stone-800/50 flex items-center justify-center text-stone-500 dark:text-stone-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <span class="text-sm font-semibold text-brand-text dark:text-stone-200">Help Center</span>
          </div>
          <svg class="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </button>

        <!-- Privacy Policy -->
        <button class="w-full flex items-center justify-between p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800/50 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors text-left">
          <div class="flex items-center gap-4">
            <div class="w-8 h-8 rounded-full bg-brand-bg-light dark:bg-stone-800/50 flex items-center justify-center text-stone-500 dark:text-stone-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            </div>
            <span class="text-sm font-semibold text-brand-text dark:text-stone-200">Privacy Policy</span>
          </div>
          <svg class="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </button>

        <!-- Terms of Service -->
        <button class="w-full flex items-center justify-between p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800/50 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors text-left">
          <div class="flex items-center gap-4">
            <div class="w-8 h-8 rounded-full bg-brand-bg-light dark:bg-stone-800/50 flex items-center justify-center text-stone-500 dark:text-stone-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <span class="text-sm font-semibold text-brand-text dark:text-stone-200">Terms of Service</span>
          </div>
          <svg class="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </button>

        <!-- About -->
        <div class="w-full flex items-center justify-between p-4 sm:p-5 text-left">
          <div class="flex items-center gap-4">
            <div class="w-8 h-8 rounded-full bg-brand-bg-light dark:bg-stone-800/50 flex items-center justify-center text-stone-500 dark:text-stone-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <span class="text-sm font-semibold text-brand-text dark:text-stone-200">About SkinBuddy</span>
          </div>
          <span class="text-xs text-stone-500 dark:text-stone-400 font-mono">v1.4.2</span>
        </div>

      </div>

      <!-- Log Out Button -->
      <button @click="handleLogout" class="w-full py-4 bg-transparent text-red-500 dark:text-red-400 font-bold text-sm transition-all rounded-3xl hover:bg-red-50 dark:hover:bg-red-900/10 mb-6">
        Log Out
      </button>

    </div>
  </div>
</template>
