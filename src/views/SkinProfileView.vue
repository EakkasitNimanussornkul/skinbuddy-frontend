<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { skinProfiles } from '../data/skinprofiles'

const router = useRouter()
const authStore = useAuthStore()

const userSkinType = computed(() => authStore.user?.skin_type || 'ORNT')
const profileData = computed(() => skinProfiles[userSkinType.value] || skinProfiles['OSPW'])

// Helper to provide more detail to the typology breakdown
const getTypologyDetail = (letter: string) => {
  const details: Record<string, string> = {
    'O': 'High sebum production',
    'D': 'Lacks natural lipids',
    'S': 'Reactive to triggers',
    'R': 'Strong, intact barrier',
    'P': 'Prone to dark spots',
    'N': 'Even skin tone',
    'W': 'Prone to fine lines',
    'T': 'Structurally resilient'
  }
  return details[letter] || ''
}

const axes = computed(() => {
  const type = userSkinType.value
  return [
    { letter: type[0], name: type[0] === 'O' ? 'Oily' : 'Dry', opposite: type[0] === 'O' ? 'Dry' : 'Oily', detail: getTypologyDetail(type[0]) },
    { letter: type[1], name: type[1] === 'S' ? 'Sensitive' : 'Resistant', opposite: type[1] === 'S' ? 'Resistant' : 'Sensitive', detail: getTypologyDetail(type[1]) },
    { letter: type[2], name: type[2] === 'P' ? 'Pigmented' : 'Non-Pigmented', opposite: type[2] === 'P' ? 'Non-Pigmented' : 'Pigmented', detail: getTypologyDetail(type[2]) },
    { letter: type[3], name: type[3] === 'W' ? 'Wrinkle-Prone' : 'Tight', opposite: type[3] === 'W' ? 'Tight' : 'Wrinkle-Prone', detail: getTypologyDetail(type[3]) }
  ]
})
</script>

<template>
  <div class="relative min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans pb-28 pt-4 lg:pt-8 transition-colors duration-300 overflow-hidden">

    <!-- Ambient Background Glow Gradients -->
    <div class="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-brand-primary/10 blur-3xl" />
    <div class="pointer-events-none absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-brand-primary/5 blur-3xl" />

    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-6 lg:gap-8">

      <!-- Header Navigation -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button @click="router.back()" class="w-10 h-10 rounded-full bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 flex items-center justify-center text-brand-text-muted hover:text-brand-primary hover:border-brand-primary/40 transition-all shadow-sm active:scale-95">
            <svg class="w-5 h-5 pr-0.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 class="text-xl lg:text-2xl font-serif font-bold text-brand-text dark:text-white leading-tight">Skin Profile Report</h1>
            <p class="text-[10px] lg:text-xs font-bold text-brand-text-muted uppercase tracking-widest mt-0.5">Diagnostic Breakdown</p>
          </div>
        </div>

        <button @click="router.push('/chat')" class="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-primary-light/50 dark:bg-brand-primary/10 hover:bg-brand-primary hover:text-white text-brand-primary rounded-xl text-xs font-bold transition-all border border-brand-primary/20 shadow-sm">
          <svg class="w-4 h-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          <span>Result Inaccurate? Consult AI</span>
        </button>
      </div>

      <!-- 1. Hero Diagnostic Banner (Full Width) -->
      <div class="relative rounded-[2.5rem] overflow-hidden bg-brand-primary shadow-lg border border-brand-primary-light/20 p-8 lg:p-12 flex flex-col justify-between min-h-[260px]">
        <div class="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div class="absolute -bottom-16 left-10 w-48 h-48 rounded-full bg-brand-surface-dark/10 blur-2xl pointer-events-none" />

        <div class="relative z-10 w-full lg:w-2/3">
          <div class="flex flex-wrap items-center gap-2 mb-4">
            <span class="px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest border border-white/20 backdrop-blur-md shadow-sm">
              Type {{ userSkinType }}
            </span>
            <span class="px-3 py-1 rounded-full bg-black/20 text-white text-[10px] font-bold uppercase tracking-widest border border-black/10 backdrop-blur-md shadow-sm">
              {{ profileData.maintenanceLevel }} Maintenance
            </span>
          </div>
          <h2 class="text-white font-serif text-3xl lg:text-5xl font-bold leading-tight mb-4 drop-shadow-sm">
            {{ profileData.subtitle }}
          </h2>
          <p class="text-white/90 text-sm sm:text-base leading-relaxed font-medium max-w-2xl mb-6">
            {{ profileData.desc }}
          </p>
          <div class="pl-4 border-l-2 border-brand-primary-light/50">
            <p class="text-xs sm:text-sm text-brand-primary-light italic font-serif leading-relaxed">
              "{{ profileData.quote }}"
            </p>
          </div>
        </div>
      </div>

      <!-- Main Desktop Split Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

        <!-- Left Column: Typology & Nourishment/Actives -->
        <div class="lg:col-span-7 flex flex-col gap-6 lg:gap-8">

          <!-- 2. Detailed Skin Typology Breakdown -->
          <div class="bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 rounded-[2.5rem] p-6 lg:p-8 shadow-sm">
            <h3 class="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-6">Typology Breakdown</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div v-for="axis in axes" :key="axis.letter" class="bg-brand-bg-light dark:bg-stone-900/50 border border-brand-surface-border dark:border-stone-800/80 rounded-2xl p-4 flex items-center gap-4 hover:border-brand-primary/40 transition-colors shadow-2xs">
                <div class="w-12 h-12 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xl font-black font-serif flex-shrink-0 border border-brand-primary/20">
                  {{ axis.letter }}
                </div>
                <div>
                  <p class="text-sm font-bold text-brand-text dark:text-stone-100 leading-tight">{{ axis.name }}</p>
                  <p class="text-[10px] text-brand-text-muted font-bold tracking-wider uppercase mb-1">vs. {{ axis.opposite }}</p>
                  <p class="text-xs text-stone-500 dark:text-stone-400 font-medium leading-snug">{{ axis.detail }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 3 & 4. Deep Nourishment & Actives -->
          <div class="bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 rounded-[2.5rem] p-6 lg:p-8 shadow-sm flex flex-col gap-8">

            <!-- Deep Nourishment Header & Focus -->
            <div>
              <h3 class="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-2">Deep Nourishment Strategy</h3>
              <h4 class="text-xl font-serif font-bold text-brand-text dark:text-white mb-2">{{ profileData.focusTitle }}</h4>
              <p class="text-sm font-medium text-brand-text-muted leading-relaxed">{{ profileData.focusDesc }}</p>
            </div>

            <!-- Ideal Textures -->
            <div>
              <h5 class="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3">Target Product Textures</h5>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="flex flex-col bg-brand-bg-light dark:bg-stone-900/50 p-3 rounded-xl border border-brand-surface-border dark:border-stone-800/80">
                  <span class="text-[10px] font-bold text-brand-text-muted uppercase mb-1">Cleanser</span>
                  <span class="text-xs font-bold text-brand-primary">{{ profileData.idealTextures.cleanser }}</span>
                </div>
                <div class="flex flex-col bg-brand-bg-light dark:bg-stone-900/50 p-3 rounded-xl border border-brand-surface-border dark:border-stone-800/80">
                  <span class="text-[10px] font-bold text-brand-text-muted uppercase mb-1">Moisturizer</span>
                  <span class="text-xs font-bold text-brand-primary">{{ profileData.idealTextures.moisturizer }}</span>
                </div>
                <div class="flex flex-col bg-brand-bg-light dark:bg-stone-900/50 p-3 rounded-xl border border-brand-surface-border dark:border-stone-800/80">
                  <span class="text-[10px] font-bold text-brand-text-muted uppercase mb-1">Sunscreen</span>
                  <span class="text-xs font-bold text-brand-primary">{{ profileData.idealTextures.sunscreen }}</span>
                </div>
              </div>
            </div>

            <!-- Hero Actives & Avoid Inside -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-brand-surface-border dark:border-stone-800 pt-6">

              <!-- Dos -->
              <div class="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-5 shadow-sm">
                <div class="flex items-center gap-2.5 mb-4">
                  <div class="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                    <svg class="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <div>
                    <h3 class="text-sm font-bold text-emerald-900 dark:text-emerald-300">Hero Actives</h3>
                    <p class="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">Barrier Supporters</p>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <span v-for="item in profileData.dos" :key="item" class="px-2.5 py-1 bg-white dark:bg-stone-900 rounded-lg text-[10px] font-bold text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 shadow-2xs">
                    {{ item }}
                  </span>
                </div>
              </div>

              <!-- Donts -->
              <div class="bg-semantic-error/5 dark:bg-semantic-error/10 border border-semantic-error/20 rounded-2xl p-5 shadow-sm">
                <div class="flex items-center gap-2.5 mb-4">
                  <div class="w-7 h-7 rounded-full bg-semantic-error text-white flex items-center justify-center shadow-sm flex-shrink-0">
                    <svg class="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </div>
                  <div>
                    <h3 class="text-sm font-bold text-semantic-error dark:text-rose-300">Avoid Inside</h3>
                    <p class="text-[9px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-500">Irritation Triggers</p>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <span v-for="item in profileData.donts" :key="item" class="px-2.5 py-1 bg-white dark:bg-stone-900 rounded-lg text-[10px] font-bold text-semantic-error dark:text-rose-400 border border-semantic-error/10 shadow-2xs">
                    {{ item }}
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>

        <!-- Right Column: Concerns & Routine Blueprint -->
        <div class="lg:col-span-5 flex flex-col gap-6 lg:gap-8">

          <!-- 5. Common Skin Concerns -->
          <div class="bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 rounded-[2.5rem] p-6 lg:p-8 shadow-sm">
            <h3 class="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-4">Common Skin Concerns</h3>
            <div class="flex flex-wrap gap-2.5">
              <span v-for="concern in profileData.commonConcerns" :key="concern"
                class="px-3.5 py-2 bg-brand-bg-light dark:bg-stone-900 rounded-xl text-[11px] font-bold text-brand-text dark:text-stone-200 border border-brand-surface-border dark:border-stone-800 shadow-2xs">
                {{ concern }}
              </span>
            </div>
          </div>

          <!-- 6. Suggested Routine Blueprint -->
          <div class="bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 rounded-[2.5rem] p-6 lg:p-8 shadow-sm">
            <h3 class="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-6">Suggested Routine Blueprint</h3>

            <div class="flex flex-col gap-6">
              <!-- AM Routine -->
              <div class="bg-brand-bg-light dark:bg-stone-900/50 p-5 rounded-2xl border border-brand-surface-border dark:border-stone-800/80">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center border border-brand-primary/20 shadow-sm">
                    <svg class="w-4 h-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
                  </div>
                  <h4 class="font-bold text-brand-text dark:text-stone-200 text-sm">Morning Routine</h4>
                </div>
                <ol class="space-y-3 relative before:absolute before:inset-y-2 before:left-[7px] before:w-[2px] before:bg-brand-surface-border dark:before:bg-stone-700">
                  <li v-for="(step, index) in profileData.routineBlueprint.am" :key="index" class="flex items-start gap-3 relative z-10">
                    <span class="w-4 h-4 mt-0.5 flex-shrink-0 rounded-full bg-brand-surface-light dark:bg-stone-900 border-2 border-brand-primary flex items-center justify-center shadow-sm"></span>
                    <span class="text-[13px] text-brand-text dark:text-stone-300 font-medium leading-snug">{{ step }}</span>
                  </li>
                </ol>
              </div>

              <!-- PM Routine -->
              <div class="bg-brand-bg-light dark:bg-stone-900/50 p-5 rounded-2xl border border-brand-surface-border dark:border-stone-800/80">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center border border-stone-300 dark:border-stone-600 shadow-sm">
                    <svg class="w-4 h-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  </div>
                  <h4 class="font-bold text-brand-text dark:text-stone-200 text-sm">Evening Routine</h4>
                </div>
                <ol class="space-y-3 relative before:absolute before:inset-y-2 before:left-[7px] before:w-[2px] before:bg-brand-surface-border dark:before:bg-stone-700">
                  <li v-for="(step, index) in profileData.routineBlueprint.pm" :key="index" class="flex items-start gap-3 relative z-10">
                    <span class="w-4 h-4 mt-0.5 flex-shrink-0 rounded-full bg-brand-surface-light dark:bg-stone-900 border-2 border-stone-400 dark:border-stone-500 flex items-center justify-center shadow-sm"></span>
                    <span class="text-[13px] text-brand-text dark:text-stone-300 font-medium leading-snug">{{ step }}</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  </div>
</template>
