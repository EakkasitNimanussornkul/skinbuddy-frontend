<script setup lang="ts">
import { useThemeStore } from '../stores/themeStore'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const router = useRouter()

// We can use the authStore's logout, and then double-check the router pushes to landing
const handleLogout = () => {
  authStore.logout()
  // The store already pushes to '/', but this is a safe fallback
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-clinical-bg pt-6 pb-28 font-sans transition-colors duration-300">
    <div class="max-w-md mx-auto px-4 sm:px-6">

      <div class="mb-8 pt-4">
        <h1 class="text-3xl font-serif font-bold text-slate-900 dark:text-white">Settings</h1>
      </div>

      <div class="bg-white dark:bg-clinical-surface rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-6 flex items-center gap-5">
        <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-100 flex-shrink-0">
          <img v-if="authStore.user?.picture" :src="authStore.user.picture" alt="Profile" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-slate-400 text-2xl">👤</div>
        </div>
        <div>
          <h2 class="text-xl font-bold text-slate-900 dark:text-white leading-tight">
            {{ authStore.user?.name || 'Guest User' }}
          </h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Logged in via LINE
          </p>
        </div>
      </div>

      <h3 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-2">App Preferences</h3>
      <div class="bg-white dark:bg-clinical-surface rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-8 overflow-hidden">

        <div class="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <span class="text-xl">{{ themeStore.isDark ? '🌙' : '☀️' }}</span>
            <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">Dark Mode</span>
          </div>
          <button
            @click="themeStore.toggleTheme"
            class="w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none"
            :class="themeStore.isDark ? 'bg-[#2E5BFF]' : 'bg-slate-300'"
          >
            <div
              class="absolute top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm"
              :class="themeStore.isDark ? 'translate-x-7 left-0' : 'translate-x-1 left-0'"
            ></div>
          </button>
        </div>

        <div class="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
          <div class="flex items-center gap-3">
            <span class="text-xl">🔔</span>
            <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">Notifications</span>
          </div>
          <span class="text-slate-400">›</span>
        </div>
      </div>

      <h3 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-2">Support</h3>
      <div class="bg-white dark:bg-clinical-surface rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-8 overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
          <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">Privacy Policy</span>
          <span class="text-slate-400">›</span>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
          <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">Terms of Service</span>
          <span class="text-slate-400">›</span>
        </div>
      </div>

      <button
        @click="handleLogout"
        class="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold py-4 rounded-2xl border border-red-100 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors shadow-sm"
      >
        Log Out
      </button>

    </div>
  </div>
</template>
