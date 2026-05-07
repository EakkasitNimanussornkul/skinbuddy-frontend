<script setup lang="ts">
import { useQuizStore } from '../stores/quizStore'
import { useThemeStore } from '../stores/themeStore'
import { useRouter } from 'vue-router'

const quizStore = useQuizStore()
const themeStore = useThemeStore()
const router = useRouter()

const handleRetakeQuiz = () => {
  if (confirm('Are you sure? This will reset your current skin type analysis.')) {
    quizStore.resetQuiz()
    router.push('/quiz')
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-clinical-bg pt-8 pb-28 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
    <div class="max-w-md mx-auto px-6">

      <div class="flex items-center gap-4 mb-8">
        <div class="w-16 h-16 bg-[#2E5BFF] rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-white dark:border-slate-800 shadow-sm">
          JD
        </div>
        <div>
          <h1 class="text-xl font-bold text-slate-900 dark:text-white">Jane Doe</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400">LINE Connected • Premium Member</p>
        </div>
      </div>

      <div class="bg-white dark:bg-clinical-surface p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mb-6 flex justify-between items-center transition-colors">
        <div>
          <h2 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Current Skin Type</h2>
          <p class="text-2xl font-serif font-bold text-[#2E5BFF]">{{ quizStore.finalSkinType || 'Not Analyzed' }}</p>
        </div>
        <button @click="handleRetakeQuiz" class="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          Retake Quiz
        </button>
      </div>

      <div class="space-y-6">

        <div>
          <h3 class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-3 px-1">Preferences</h3>
          <div class="bg-white dark:bg-clinical-surface rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">

            <div class="flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800/50">
              <div class="flex items-center gap-3">
                <span class="text-lg">🔔</span>
                <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">Notifications</span>
              </div>
              <div class="w-10 h-5 bg-emerald-500 rounded-full relative">
                <div class="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>

            <div @click="themeStore.toggleTheme" class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div class="flex items-center gap-3">
                <span class="text-lg">{{ themeStore.isDark ? '🌙' : '☀️' }}</span>
                <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">Dark Mode</span>
              </div>
              <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{{ themeStore.isDark ? 'On' : 'Off' }}</span>
            </div>

          </div>
        </div>

        <div>
          <h3 class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-3 px-1">Account & Data</h3>
          <div class="bg-white dark:bg-clinical-surface rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">

            <div class="flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div class="flex items-center gap-3">
                <span class="text-lg">📦</span>
                <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">Export Shelf Data</span>
              </div>
              <span class="text-slate-300 dark:text-slate-600">→</span>
            </div>

            <div class="flex items-center justify-between p-4 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 group transition-colors">
              <div class="flex items-center gap-3">
                <span class="text-lg opacity-80 group-hover:opacity-100">🗑️</span>
                <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-red-600 dark:group-hover:text-red-400">Clear Local Cache</span>
              </div>
            </div>

          </div>
        </div>

        <div>
          <h3 class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-3 px-1">About SkinBuddy</h3>
          <div class="bg-white dark:bg-clinical-surface rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden text-sm transition-colors">
            <div class="p-4 border-b border-slate-50 dark:border-slate-800/50 text-slate-600 dark:text-slate-300 flex justify-between">
              <span>Version</span>
              <span class="font-mono text-xs text-slate-400 dark:text-slate-500">1.0.4-beta</span>
            </div>
            <div class="p-4 border-b border-slate-50 dark:border-slate-800/50 text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">Privacy Policy</div>
            <div class="p-4 text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">Terms of Service</div>
          </div>
        </div>

      </div>

      <button class="w-full mt-10 py-4 bg-white dark:bg-clinical-surface border border-red-100 dark:border-red-900/30 text-red-500 font-bold rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm">
        Log Out
      </button>

      <p class="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-8 uppercase tracking-widest">Powered by LINE LIFF</p>

    </div>
  </div>
</template>

<style scoped>
/* Smooth slide in for the settings list items */
.bg-white > div {
  transition: background-color 0.2s ease;
}
</style>
