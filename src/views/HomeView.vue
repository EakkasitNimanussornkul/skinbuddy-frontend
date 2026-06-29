<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { updateUserSkinType } from '../api/authApi'
import ExpressSkinSelectorModal from '../components/Quiz/ExpressSkinSelectorModal.vue'
import { useToast } from '../composables/useToast'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const { addToast } = useToast()

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const greeting = getGreeting()
const firstName = authStore.user?.name?.split(' ')[0] || 'there'

const showSelector = ref(false)
const isSaving = ref(false)

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
    console.error("HomeView Update Error:", error)
    addToast('Failed to update skin profile. Please try again.', 'error')
  } finally {
    isSaving.value = false
  }
}

const quickActions = [
  {
    label: 'AI Chat',
    sublabel: 'Ask SkinBuddy anything',
    icon: 'chat',
    route: '/chat'
  },
  {
    label: 'Explore',
    sublabel: 'Find & Compare Products',
    icon: 'search',
    route: '/explore'
  },
  {
    label: 'My Skincare',
    sublabel: 'Your product stash',
    icon: 'storage',
    route: '/shelf'
  },
  {
    label: 'Routine',
    sublabel: 'Daily skin schedule',
    icon: 'routine',
    route: '/routine'
  },
]

const icons: Record<string, string> = {
  chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  storage: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12a1 1 0 102 0 1 1 0 00-2 0',
  routine: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  skin: 'M12 2.69l5.66 5.66a8 8 0 11-11.31 0z',
  bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
}

const tips = [
  { text: 'Apply SPF every morning — even on cloudy days, UV rays penetrate through clouds.' },
  { text: 'Double-cleanse at night to fully remove sunscreen and makeup before your routine.' },
  { text: 'Hydrate from within — drinking enough water supports your skin barrier.' },
  { text: 'Layer your serums thinnest to thickest for maximum absorption.' },
]
const tip = tips[new Date().getDay() % tips.length]
</script>

<template>
  <div
    class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans pb-28 transition-colors duration-300">
    <div class="max-w-md lg:max-w-5xl mx-auto px-4 sm:px-6 flex flex-col">

      <div class="flex items-center justify-between pt-6 pb-5">
        <button @click="router.push('/settings')" class="flex items-center gap-3 group">
          <div
            class="w-11 h-11 rounded-full overflow-hidden border-2 border-brand-primary/30 dark:border-orange-600/40 bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0">
            <img v-if="authStore.user?.picture" :src="authStore.user.picture" alt="Profile"
              class="w-full h-full object-cover" />
            <svg v-else class="w-6 h-6 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor"
              viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div class="text-left">
            <p class="text-[11px] text-brand-text-muted dark:text-stone-500 leading-none mb-0.5">Welcome back</p>
            <p class="text-sm font-bold text-brand-text dark:text-stone-100 leading-tight">{{ authStore.user?.name ||
              'Guest' }}</p>
          </div>
        </button>

        <div class="flex items-center gap-2">
          <button
            class="w-10 h-10 rounded-full bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-700 flex items-center justify-center text-brand-text-muted dark:text-stone-400 hover:text-brand-primary dark:hover:text-orange-400 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" :d="icons.bell" />
            </svg>
          </button>
          <button @click="router.push('/settings')"
            class="w-10 h-10 rounded-full bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-700 flex items-center justify-center text-brand-text-muted dark:text-stone-400 hover:text-brand-primary dark:hover:text-orange-400 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" :d="icons.settings" />
            </svg>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

        <div class="lg:col-span-8 flex flex-col gap-6 w-full">

          <div class="relative rounded-3xl overflow-hidden bg-brand-primary shadow-md">
            <div class="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
            <div class="absolute -bottom-10 -right-4 w-28 h-28 rounded-full bg-white/5" />
            <div class="absolute top-4 right-16 w-8 h-8 rounded-full bg-white/10" />

            <div class="relative z-10 px-6 py-5 flex items-center justify-between">
              <div>
                <p class="text-orange-200 text-xs font-semibold tracking-widest uppercase mb-1">{{ greeting }}</p>
                <h2 class="text-white font-serif text-2xl font-bold leading-tight">{{ firstName }},</h2>
                <p class="text-orange-100/80 text-sm mt-1 leading-snug">Ready for your skin routine?</p>
              </div>

              <div class="w-16 h-16 flex-shrink-0">
                <img src="/images/jelly.png" alt="SkinBuddy" class="w-full h-full object-contain animate-jelly-float" />
              </div>
            </div>
          </div>

          <div
            class="lg:hidden bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-4 flex flex-col gap-3">
            <button @click="router.push('/profile')"
              class="flex items-center gap-4 px-1 text-left group hover:opacity-80 transition-all">
              <div
                class="w-10 h-10 rounded-full bg-brand-primary/10 dark:bg-orange-900/30 border border-brand-primary/20 dark:border-orange-700/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <svg class="w-5 h-5 text-brand-primary dark:text-orange-400" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" :d="icons.skin" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[11px] font-bold text-brand-text-muted dark:text-stone-500 uppercase tracking-widest">
                  Skin Type</p>
                <p
                  class="text-sm font-bold text-brand-text dark:text-stone-100 mt-0.5 group-hover:text-brand-primary transition-colors">
                  {{ authStore.user?.skin_type || 'Take the quiz to discover yours' }}
                </p>
              </div>
              <svg class="w-4 h-4 text-stone-400 group-hover:text-brand-primary transition-colors" fill="none"
                stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div class="flex gap-2">
              <button @click="showSelector = true"
                class="flex-1 text-[11px] sm:text-xs font-bold text-brand-primary dark:text-orange-400 bg-brand-primary/5 dark:bg-orange-900/10 hover:bg-brand-primary/10 dark:hover:bg-orange-900/30 py-3 rounded-xl transition-all border border-brand-primary/20 dark:border-orange-700/30">
                Update Skin Type
              </button>
              <button @click="router.push('/quiz')"
                class="flex-1 text-[11px] sm:text-xs font-bold text-white bg-brand-primary hover:bg-orange-800 py-3 rounded-xl transition-all shadow-sm">
                {{ authStore.user?.skin_type ? 'Retake Quiz' : 'Take Quiz' }}
              </button>
            </div>
          </div>

          <div>
            <h3 class="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3 px-1">
              Others Features</h3>
            <div class="grid grid-cols-2 gap-4">
              <button v-for="action in quickActions" :key="action.route" @click="router.push(action.route)"
                class="bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 rounded-3xl p-5 text-left hover:border-brand-primary/40 dark:hover:border-orange-600/40 hover:scale-[1.015] hover:shadow-md active:scale-[0.98] transition-all group flex flex-col justify-between min-h-[140px] md:min-h-[150px]">
                <div>
                  <div
                    class="w-11 h-11 rounded-2xl bg-brand-primary/10 dark:bg-orange-900/25 border border-brand-primary/15 dark:border-orange-700/25 flex items-center justify-center mb-3 group-hover:bg-brand-primary/20 dark:group-hover:bg-orange-900/40 transition-colors">
                    <svg class="w-5 h-5 text-brand-primary dark:text-orange-400" fill="none" stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" :d="icons[action.icon]" />
                    </svg>
                  </div>
                  <p class="text-sm font-bold text-brand-text dark:text-stone-100 leading-tight">{{ action.label }}</p>
                </div>
                <p class="text-[11px] text-brand-text-muted dark:text-stone-500 mt-2 leading-snug">{{ action.sublabel }}
                </p>
              </button>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-3 px-1">
              <h3 class="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">Today's
                Routine</h3>
              <button @click="router.push('/routine')"
                class="text-xs font-bold text-brand-primary dark:text-orange-400 hover:underline underline-offset-2 transition-all">See
                all</button>
            </div>

            <div
              class="bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
              <div class="flex items-center gap-4 px-5 py-4 border-b border-stone-100 dark:border-stone-800">
                <div
                  class="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-orange-400 dark:text-orange-300" fill="none" stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                </div>
                <div class="flex-1">
                  <p class="text-xs font-bold text-brand-text dark:text-stone-100">Morning Routine</p>
                  <p class="text-[11px] text-brand-text-muted dark:text-stone-500 mt-0.5">Cleanser · Toner · Moisturiser
                    · SPF</p>
                </div>
                <span
                  class="text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-800/40">Done</span>
              </div>

              <div class="flex items-center gap-4 px-5 py-4">
                <div
                  class="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-brand-text-muted dark:text-stone-400" fill="none" stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                </div>
                <div class="flex-1">
                  <p class="text-xs font-bold text-brand-text dark:text-stone-100">Evening Routine</p>
                  <p class="text-[11px] text-brand-text-muted dark:text-stone-500 mt-0.5">Double Cleanse · Serum · Night
                    Cream</p>
                </div>
                <span
                  class="text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-brand-text-muted dark:text-stone-400 px-2.5 py-1 rounded-full border border-stone-200 dark:border-stone-700">Pending</span>
              </div>
            </div>
          </div>

        </div>

        <div class="lg:col-span-4 flex flex-col gap-6 w-full lg:pt-0">
          <div class="hidden lg:block">
            <div
              class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-4 flex flex-col gap-3">
              <button @click="router.push('/profile')"
                class="flex items-center gap-4 px-1 text-left group hover:opacity-80 transition-all">
                <div
                  class="w-10 h-10 rounded-full bg-brand-primary/10 dark:bg-orange-900/30 border border-brand-primary/20 dark:border-orange-700/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <svg class="w-5 h-5 text-brand-primary dark:text-orange-400" fill="none" stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" :d="icons.skin" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-[11px] font-bold text-brand-text-muted dark:text-stone-500 uppercase tracking-widest">
                    Skin Type</p>
                  <p
                    class="text-sm font-bold text-brand-text dark:text-stone-100 mt-0.5 group-hover:text-brand-primary transition-colors">
                    {{ authStore.user?.skin_type || 'Take the quiz to discover yours' }}
                  </p>
                </div>
                <svg class="w-4 h-4 text-stone-400 group-hover:text-brand-primary transition-colors" fill="none"
                  stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <div class="flex flex-col gap-2">
                <button @click="showSelector = true"
                  class="w-full text-[11px] sm:text-xs font-bold text-brand-primary dark:text-orange-400 bg-brand-primary/5 dark:bg-orange-900/10 hover:bg-brand-primary/10 dark:hover:bg-orange-900/30 py-3 rounded-xl transition-all border border-brand-primary/20 dark:border-orange-700/30 shadow-sm">
                  Update Current Skin Type
                </button>
                <button @click="router.push('/quiz')"
                  class="w-full text-[11px] sm:text-xs font-bold text-white bg-brand-primary hover:bg-orange-800 py-3 rounded-xl transition-all shadow-sm">
                  {{ authStore.user?.skin_type ? 'Retake Quiz' : 'Take Quiz' }}
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3 px-1">Tip
              of the Day</h3>
            <div
              class="bg-brand-primary/8 dark:bg-orange-900/15 border border-brand-primary/20 dark:border-orange-700/25 rounded-3xl px-5 py-4 flex gap-4 items-start shadow-sm">
              <div
                class="w-9 h-9 rounded-xl bg-brand-primary/15 dark:bg-orange-900/35 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg class="w-5 h-5 text-brand-primary dark:text-orange-400" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m1.636-6.364l.707.707M12 21v-1M6.343 17.657l-.707-.707M17.657 17.657l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              </div>
              <p class="text-sm text-brand-text dark:text-stone-200 leading-relaxed">{{ tip.text }}</p>
            </div>
          </div>

        </div>
      </div>
    </div>

    <ExpressSkinSelectorModal :is-open="showSelector" :is-saving="isSaving" @close="showSelector = false"
      @confirm="handleExpressConfirm" />
  </div>
</template>

<style scoped>
/* ── Isolated Mascot Floating & Eye-Blinking Core Keyframes ── */
.animate-jelly-float {
  animation: jellyFloat 3s infinite ease-in-out;
}

@keyframes jellyFloat {

  0%,
  100% {
    transform: translateY(0) scale(1);
  }

  50% {
    transform: translateY(-4px) scale(1.02);
  }
}
</style>
