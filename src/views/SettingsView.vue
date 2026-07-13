<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/themeStore'
import { useToast } from '../composables/useToast'
import { updateUserSkinType } from '../api/authApi'
import SettingsRow from '../components/Auth/SettingsRow.vue'
import ExpressSkinSelectorModal from '../components/Quiz/ExpressSkinSelectorModal.vue'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const router = useRouter()
const { addToast } = useToast()

const notificationsEnabled = ref(true)
const showSelector = ref(false)
const isSaving = ref(false)

// Desktop Layout State
const activeTab = ref<'profile' | 'preferences' | 'support'>('profile')

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
  info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
}

const menuGroups = [
  {
    title: 'Account',
    items: [
      { id: 'profile', label: 'Skin Profile & Auth' }
    ]
  },
  {
    title: 'Application',
    items: [
      { id: 'preferences', label: 'Preferences' }
    ]
  },
  {
    title: 'Legal & Support',
    items: [
      { id: 'support', label: 'Support & Docs' }
    ]
  }
]
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text font-sans pb-28 pt-6 lg:pt-10 transition-colors duration-300">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col">

      <!-- Global Header -->
      <div class="flex justify-between items-center mb-6 lg:mb-8">
        <h1 class="text-3xl lg:text-4xl font-serif font-bold dark:text-white tracking-tight">Settings</h1>
        <button class="lg:hidden w-10 h-10 flex items-center justify-center text-brand-text-muted hover:text-brand-primary transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="icons.help"></path></svg>
        </button>
      </div>

      <!-- ========================================== -->
      <!-- 📱 MOBILE & TABLET LAYOUT                  -->
      <!-- ========================================== -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start lg:hidden">

        <div class="flex flex-col gap-6">
          <!-- Profile Badge -->
          <div class="bg-gradient-to-br from-brand-surface-light to-brand-bg-light dark:from-brand-surface-dark dark:to-brand-bg-dark rounded-3xl p-5 border border-brand-surface-border dark:border-stone-700 flex items-center gap-4 relative hover:scale-[1.015] hover:shadow-md transition-all duration-200">
            <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-brand-surface-border dark:border-stone-600 bg-brand-bg-light dark:bg-stone-800 flex-shrink-0 flex items-center justify-center">
              <img v-if="authStore.user?.picture" :src="authStore.user.picture" alt="Profile" class="w-full h-full object-cover" />
              <svg v-else class="w-8 h-8 text-brand-text-muted dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="icons.user"></path></svg>
            </div>
            <div class="flex-grow">
              <h2 class="text-xl font-serif font-bold leading-tight text-brand-text dark:text-white">
                {{ authStore.user?.name || 'Guest User' }}
              </h2>
              <div class="flex items-start gap-1.5 mt-1 text-brand-text-muted text-sm flex-col">
                <div class="flex items-center gap-1 bg-[#00C300]/10 text-[#00C300] px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider mb-1">
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738S0 4.935 0 10.304c0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.12.298.077.763.036 1.066l-.167 1.011c-.053.33-.243 1.189 1.042.646 1.284-.543 6.924-4.053 9.422-6.953A9.123 9.123 0 0024 10.304z"/>
                  </svg>
                  <span>LINE Connected</span>
                </div>
                <div class="flex items-start gap-1.5 font-medium">
                  <svg class="w-3.5 h-3.5 text-brand-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"></path></svg>
                  <span class="leading-tight dark:text-stone-200">Skin Type:<br>{{ authStore.user?.skin_type || 'Discover Type' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Diagnostic Hub Card (Mobile) -->
          <div class="bg-gradient-to-br from-brand-surface-light to-brand-bg-light dark:from-brand-surface-dark dark:to-brand-bg-dark rounded-3xl p-5 border border-brand-primary/30 flex flex-col gap-4 hover:scale-[1.015] hover:shadow-md transition-all duration-200">
            <button @click="router.push('/profile')" class="flex items-center gap-3 w-full text-left group hover:opacity-80 transition-all">
              <div class="w-10 h-10 rounded-full bg-brand-primary-light dark:bg-brand-primary/10 flex items-center justify-center text-brand-primary flex-shrink-0 group-hover:scale-105 transition-transform border border-brand-primary/20">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="icons.clipboard"></path></svg>
              </div>
              <div class="flex-1">
                <h4 class="text-sm font-bold text-brand-text dark:text-white group-hover:text-brand-primary transition-colors">Your Skin Profile</h4>
                <p class="text-[13px] text-brand-text-muted mt-0.5 leading-snug font-medium">View your Baumann diagnostic report.</p>
              </div>
              <svg class="w-5 h-5 text-brand-primary/60 group-hover:text-brand-primary flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>

            <div class="flex flex-col gap-2 mt-1">
              <button @click="showSelector = true" class="w-full py-3 bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 text-brand-text dark:text-stone-200 rounded-xl font-bold text-sm hover:border-brand-primary dark:hover:border-brand-primary hover:bg-brand-primary-light/50 dark:hover:bg-brand-primary/10 active:scale-[0.98] transition-all shadow-sm">
                Update Skin type
              </button>
              <button @click="router.push('/quiz')" class="w-full py-3 bg-gradient-to-r from-brand-primary to-brand-primary-hover text-brand-text rounded-xl font-bold text-sm hover:from-brand-primary-hover hover:to-brand-primary-accent hover:shadow-md active:scale-[0.98] transition-all shadow-sm">
                Retake Skin Quiz
              </button>
            </div>
          </div>

          <div class="hover:scale-[1.015] hover:shadow-md transition-all duration-200 rounded-3xl">
            <h3 class="text-[11px] font-bold text-brand-text-muted uppercase tracking-widest mb-2.5 px-1">Skin Health</h3>
            <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl shadow-sm border border-brand-surface-border dark:border-stone-800 overflow-hidden flex flex-col">
              <SettingsRow :iconPath="icons.history" label="Routine History" type="link" @click="router.push('/routine')" :isLast="true" class="hover:bg-brand-bg-light dark:hover:bg-stone-800/30 transition-colors" />
            </div>
          </div>
        </div>

        <!-- Right Mobile Column -->
        <div class="flex flex-col gap-6">
          <div class="hover:scale-[1.015] hover:shadow-md transition-all duration-200 rounded-3xl">
            <h3 class="text-[11px] font-bold text-brand-text-muted uppercase tracking-widest mb-2.5 px-1">App Preferences</h3>
            <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl shadow-sm border border-brand-surface-border dark:border-stone-800 overflow-hidden flex flex-col">
              <SettingsRow :iconPath="icons.moon" label="Dark Mode" type="toggle" :toggleState="themeStore.isDark" @toggle="themeStore.toggleTheme" class="hover:bg-brand-bg-light dark:hover:bg-stone-800/30 transition-colors" />
              <SettingsRow :iconPath="icons.bell" label="Notifications" type="toggle" :toggleState="notificationsEnabled" @toggle="notificationsEnabled = !notificationsEnabled" class="hover:bg-brand-bg-light dark:hover:bg-stone-800/30 transition-colors" />
              <SettingsRow :iconPath="icons.globe" label="Language" type="link" rightText="English" :isLast="true" class="hover:bg-brand-bg-light dark:hover:bg-stone-800/30 transition-colors" />
            </div>
          </div>

          <div class="hover:scale-[1.015] hover:shadow-md transition-all duration-200 rounded-3xl">
            <h3 class="text-[11px] font-bold text-brand-text-muted uppercase tracking-widest mb-2.5 px-1">Support</h3>
            <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl shadow-sm border border-brand-surface-border dark:border-stone-800 overflow-hidden flex flex-col">
              <SettingsRow :iconPath="icons.help" label="Help Center" type="link" class="hover:bg-brand-bg-light dark:hover:bg-stone-800/30 transition-colors" />
              <SettingsRow :iconPath="icons.shield" label="Privacy Policy" type="link" class="hover:bg-brand-bg-light dark:hover:bg-stone-800/30 transition-colors" />
              <SettingsRow :iconPath="icons.doc" label="Terms of Service" type="link" class="hover:bg-brand-bg-light dark:hover:bg-stone-800/30 transition-colors" />
              <SettingsRow :iconPath="icons.info" label="About SkinBuddy" type="text" rightText="v0.1.2" :isLast="true" />
            </div>
          </div>

          <div class="pt-2">
            <button @click="handleLogout" class="w-full py-3.5 bg-transparent text-semantic-error font-bold text-sm transition-all rounded-2xl border border-semantic-error/30 hover:bg-semantic-error/10 active:scale-[0.99] shadow-sm">
              Log Out
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 💻 DESKTOP LAYOUT (Sidebar + Content)      -->
      <!-- ========================================== -->
      <div class="hidden lg:grid grid-cols-12 gap-12 items-start">

        <!-- LEFT DESKTOP SIDEBAR -->
        <div class="col-span-3 flex flex-col gap-8 sticky top-24">
          <div v-for="group in menuGroups" :key="group.title" class="space-y-3">
            <h3 class="text-[11px] font-bold text-brand-text-muted uppercase tracking-widest px-3">{{ group.title }}</h3>
            <div class="flex flex-col gap-1">
              <button
                @click="activeTab = item.id as any"
                v-for="item in group.items"
                :key="item.id"
                class="text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all w-full"
                :class="activeTab === item.id ? 'bg-brand-primary-light dark:bg-brand-primary/10 text-brand-primary' : 'text-brand-text dark:text-stone-300 hover:bg-brand-surface-border/40 dark:hover:bg-stone-800'"
              >
                {{ item.label }}
              </button>
            </div>
          </div>

          <!-- Desktop Destructive Sign Out Container -->
          <div class="pt-6 border-t border-brand-surface-border dark:border-stone-800 space-y-3">
            <div class="p-4 rounded-2xl border border-semantic-error/20 dark:border-semantic-error/10 bg-semantic-error/[0.02] dark:bg-semantic-error/[0.01]">
              <p class="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-2">Session Control</p>
              <button
                @click="handleLogout"
                class="w-full px-4 py-3 text-center bg-transparent border border-semantic-error text-semantic-error font-bold text-xs rounded-xl transition-all duration-200 hover:bg-semantic-error hover:text-white dark:hover:bg-semantic-error dark:hover:text-white shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <!-- RIGHT DESKTOP CONTENT AREA -->
        <div class="col-span-9 flex flex-col gap-6">

          <!-- TAB 1: Profile & Account -->
          <div v-if="activeTab === 'profile'" class="space-y-6 animate-fade-in">

            <!-- Identity Showcase with Added Native Micro-Gradient -->
            <div class="bg-gradient-to-br from-brand-surface-light to-brand-bg-light dark:from-brand-surface-dark dark:to-brand-bg-dark rounded-3xl border border-brand-surface-border dark:border-stone-800 overflow-hidden shadow-sm">
              <div class="p-8 flex items-center gap-6">
                <div class="w-24 h-24 rounded-full overflow-hidden border-4 border-brand-bg-light dark:border-stone-900 bg-stone-100 dark:bg-stone-800 flex-shrink-0 flex items-center justify-center shadow-inner">
                  <img v-if="authStore.user?.picture" :src="authStore.user.picture" alt="Profile" class="w-full h-full object-cover" />
                  <svg v-else class="w-10 h-10 text-brand-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="icons.user"></path></svg>
                </div>
                <div class="flex-1">
                  <h2 class="text-2xl font-serif font-bold text-brand-text dark:text-white">{{ authStore.user?.name || 'Guest User' }}</h2>
                  <div class="mt-2 flex items-center gap-2 bg-[#00C300]/10 text-[#00C300] px-3 py-1.5 rounded-lg w-fit">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738S0 4.935 0 10.304c0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.12.298.077.763.036 1.066l-.167 1.011c-.053.33-.243 1.189 1.042.646 1.284-.543 6.924-4.053 9.422-6.953A9.123 9.123 0 0024 10.304z"/>
                    </svg>
                    <span class="text-xs font-bold">Authenticated via LINE</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Active Skin Diagnosis Card with Multi-Stop Native Gradient Sweeps -->
            <div class="bg-gradient-to-br from-brand-surface-light to-brand-bg-light dark:from-brand-surface-dark dark:to-brand-bg-dark rounded-3xl border border-brand-surface-border dark:border-stone-800 shadow-sm p-8">
              <h3 class="text-lg font-serif font-bold text-brand-text dark:text-white mb-6 border-b border-brand-surface-border dark:border-stone-700/60 pb-4">Baumann Skin Profile</h3>

              <div class="flex items-center justify-between gap-6 mb-6">
                <div class="flex items-center gap-4">
                  <div class="w-14 h-14 rounded-full bg-gradient-to-r from-brand-primary to-brand-primary-hover flex items-center justify-center text-brand-text shadow-sm flex-shrink-0">
                    <svg class="w-6 h-6 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" :d="icons.clipboard"></path></svg>
                  </div>
                  <div>
                    <p class="text-[11px] font-bold text-brand-text-muted uppercase tracking-widest">Active Diagnosis</p>
                    <p class="text-3xl font-serif font-bold text-brand-text dark:text-white tracking-tight">{{ authStore.user?.skin_type || 'Unknown' }}</p>
                  </div>
                </div>
                <button @click="router.push('/profile')" class="text-sm font-bold text-brand-primary hover:underline">
                  View Full Report &rarr;
                </button>
              </div>

              <!-- Fixed Desktop Button Implementations using Native CSS Gradients & Hover states -->
              <div class="flex gap-4 pt-2">
                <button @click="showSelector = true" class="flex-1 py-3.5 bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 hover:border-brand-primary dark:hover:border-brand-primary text-brand-text dark:text-stone-200 rounded-xl font-bold text-sm hover:bg-brand-primary-light/50 dark:hover:bg-brand-primary/10 active:scale-[0.98] transition-all shadow-sm">
                  Quick Update Type
                </button>
                <button @click="router.push('/quiz')" class="flex-1 py-3.5 bg-gradient-to-r from-brand-primary to-brand-primary-hover text-brand-text font-bold text-sm rounded-xl hover:from-brand-primary-hover hover:to-brand-primary-accent hover:shadow-md active:scale-[0.98] transition-all shadow-sm">
                  Retake Baumann Skin Quiz
                </button>
              </div>
            </div>

            <!-- Links block -->
            <div class="bg-gradient-to-br from-brand-surface-light to-brand-bg-light dark:from-brand-surface-dark dark:to-brand-bg-dark rounded-3xl shadow-sm border border-brand-surface-border dark:border-stone-800 overflow-hidden">
              <SettingsRow :iconPath="icons.history" label="View Routine History" type="link" @click="router.push('/routine')" :isLast="true" />
            </div>

          </div>

          <!-- TAB 2: App Preferences -->
          <div v-else-if="activeTab === 'preferences'" class="space-y-6 animate-fade-in">
            <h2 class="text-xl font-serif font-bold dark:text-white border-b border-brand-surface-border dark:border-stone-800 pb-4">Application Preferences</h2>
            <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl shadow-sm border border-brand-surface-border dark:border-stone-800 overflow-hidden flex flex-col">
              <SettingsRow :iconPath="icons.moon" label="Dark Mode" type="toggle" :toggleState="themeStore.isDark" @toggle="themeStore.toggleTheme" />
              <SettingsRow :iconPath="icons.bell" label="Push Notifications" type="toggle" :toggleState="notificationsEnabled" @toggle="notificationsEnabled = !notificationsEnabled" />
              <SettingsRow :iconPath="icons.globe" label="System Language" type="link" rightText="English" :isLast="true" />
            </div>
          </div>

          <!-- TAB 3: Legal & Support -->
          <div v-else-if="activeTab === 'support'" class="space-y-6 animate-fade-in">
            <h2 class="text-xl font-serif font-bold dark:text-white border-b border-brand-surface-border dark:border-stone-800 pb-4">Legal & Support</h2>
            <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl shadow-sm border border-brand-surface-border dark:border-stone-800 overflow-hidden flex flex-col">
              <SettingsRow :iconPath="icons.help" label="Help Center & FAQ" type="link" />
              <SettingsRow :iconPath="icons.shield" label="Privacy Policy" type="link" />
              <SettingsRow :iconPath="icons.doc" label="Terms of Service" type="link" />
              <SettingsRow :iconPath="icons.info" label="About SkinBuddy Application" type="text" rightText="Version 0.1.2" :isLast="true" />
            </div>
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

<style scoped>
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
.animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
