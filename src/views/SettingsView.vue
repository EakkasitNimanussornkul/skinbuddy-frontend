<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/themeStore'
import { useToast } from '../composables/useToast'
import { updateUserSkinType } from '../api/authApi'
import SettingsRow from '../components/SettingsRow.vue'
import ExpressSkinSelectorModal from '../components/ExpressSkinSelectorModal.vue'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const router = useRouter()
const { addToast } = useToast()

const notificationsEnabled = ref(true)
const showSelector = ref(false)
const isSaving = ref(false)

const handleLogout = () => {
  authStore.logout()
  router.push('/explore')
}

const handleExpressConfirm = async (selectedType: string) => {
  isSaving.value = true
  try {
    if (!authStore.isAuthenticated() || !authStore.user) {
      throw new Error("No user logged in locally.")
    }

    await updateUserSkinType(selectedType)
    authStore.updateSkinType(selectedType)

    addToast(`Skin profile successfully updated to ${selectedType}.`, 'success')
    showSelector.value = false
  } catch (error) {
    console.error("Settings Update Error:", error)
    addToast('Failed to update skin profile. Please try again.', 'error')
  } finally {
    isSaving.value = false
  }
}

const icons = {
  moon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
  bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  globe: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
  clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  history: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  help: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  doc: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
}
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans pb-28 pt-6 transition-colors duration-300">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col">

      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-serif font-bold">Settings</h1>
        <button class="w-10 h-10 flex items-center justify-center text-stone-400 hover:text-brand-primary dark:hover:text-orange-300 transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="icons.help"></path></svg>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">

        <div class="flex flex-col gap-6">

          <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl p-5 border border-stone-200 dark:border-stone-800 flex items-center gap-4 relative hover:scale-[1.015] hover:shadow-md transition-all duration-200">
            <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-stone-100 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 flex-shrink-0 flex items-center justify-center">
              <img v-if="authStore.user?.picture" :src="authStore.user.picture" alt="Profile" class="w-full h-full object-cover" />
              <svg v-else class="w-8 h-8 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            </div>
            <div class="flex-grow">
              <h2 class="text-xl font-serif font-bold leading-tight text-brand-text dark:text-white">
                {{ authStore.user?.name || 'Guest User' }}
              </h2>
              <div class="flex items-start gap-1.5 mt-1 text-brand-text-muted dark:text-stone-400 text-sm">
                <svg class="w-3.5 h-3.5 text-brand-primary dark:text-orange-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"></path></svg>
                <span class="leading-tight">Skin Type:<br>{{ authStore.user?.skin_type || 'Take Quiz to discover' }}</span>
              </div>
            </div>
          </div>

          <div class="bg-brand-primary/10 dark:bg-orange-900/20 rounded-3xl p-5 border border-brand-primary/20 flex flex-col gap-4 hover:scale-[1.015] hover:shadow-md transition-all duration-200">

            <button @click="router.push('/profile')" class="flex items-center gap-3 w-full text-left group hover:opacity-80 transition-all">
              <div class="w-10 h-10 rounded-full bg-brand-primary/20 dark:bg-orange-900/40 flex items-center justify-center text-brand-primary dark:text-orange-400 flex-shrink-0 group-hover:scale-105 transition-transform">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="icons.clipboard"></path></svg>
              </div>
              <div class="flex-1">
                <h4 class="text-sm font-bold text-brand-text dark:text-stone-100 group-hover:text-brand-primary transition-colors">Your Skin Profile</h4>
                <p class="text-[13px] text-brand-text-muted dark:text-stone-400 mt-0.5 leading-snug">View your Baumann diagnostic report.</p>
              </div>
              <svg class="w-5 h-5 text-brand-primary/60 group-hover:text-brand-primary flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>

            <div class="flex flex-col gap-2 mt-1">
              <button @click="showSelector = true" class="w-full py-3 bg-white dark:bg-[#1C1917] text-brand-primary dark:text-orange-400 border border-brand-primary/30 dark:border-orange-900/50 rounded-xl font-bold text-sm hover:bg-brand-primary/5 dark:hover:bg-orange-900/40 active:scale-[0.98] transition-all shadow-sm">
                Update Skin type
              </button>
              <button @click="router.push('/quiz')" class="w-full py-3 bg-brand-primary text-white rounded-xl font-bold text-sm hover:bg-orange-800 active:scale-[0.98] transition-all shadow-sm">
                Retake Skin Quiz
              </button>
            </div>
          </div>

          <div class="hover:scale-[1.015] hover:shadow-md transition-all duration-200 rounded-3xl">
            <h3 class="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-2.5 px-1">Skin Health</h3>
            <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col">
              <SettingsRow :iconPath="icons.history" label="Routine History" type="link" @click="router.push('/routine')" :isLast="true" class="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors" />
            </div>
          </div>

        </div>

        <div class="flex flex-col gap-6">

          <div class="hover:scale-[1.015] hover:shadow-md transition-all duration-200 rounded-3xl">
            <h3 class="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-2.5 px-1">App Preferences</h3>
            <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col">
              <SettingsRow :iconPath="icons.moon" label="Dark Mode" type="toggle" :toggleState="themeStore.isDark" @toggle="themeStore.toggleTheme" class="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors" />
              <SettingsRow :iconPath="icons.bell" label="Notifications" type="toggle" :toggleState="notificationsEnabled" @toggle="notificationsEnabled = !notificationsEnabled" class="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors" />
              <SettingsRow :iconPath="icons.globe" label="Language" type="link" rightText="English" :isLast="true" class="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors" />
            </div>
          </div>

          <div class="hover:scale-[1.015] hover:shadow-md transition-all duration-200 rounded-3xl">
            <h3 class="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-2.5 px-1">Support</h3>
            <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col">
              <SettingsRow :iconPath="icons.help" label="Help Center" type="link" class="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors" />
              <SettingsRow :iconPath="icons.shield" label="Privacy Policy" type="link" class="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors" />
              <SettingsRow :iconPath="icons.doc" label="Terms of Service" type="link" class="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors" />
              <SettingsRow :iconPath="icons.info" label="About SkinBuddy" type="text" rightText="v0.1.2" :isLast="true" />
            </div>
          </div>

          <div class="pt-2">
            <button @click="handleLogout" class="w-full py-3.5 bg-transparent text-red-500 dark:text-red-400 font-bold text-sm transition-all rounded-2xl border border-red-100 dark:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/10 active:scale-[0.99]">
              Log Out
            </button>
          </div>

        </div>
      </div>
    </div>

    <ExpressSkinSelectorModal
      :is-open="showSelector"
      :is-saving="isSaving"
      @close="showSelector = false"
      @confirm="handleExpressConfirm"
    />
  </div>
</template>
