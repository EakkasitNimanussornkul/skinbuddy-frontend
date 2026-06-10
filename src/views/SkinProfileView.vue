<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { skinProfiles } from '../data/skinprofiles'

const router = useRouter()
const authStore = useAuthStore()

const userSkinType = computed(() => authStore.user?.skin_type || 'ORNT')
const profileData = computed(() => skinProfiles[userSkinType.value])

const axes = computed(() => {
  const type = userSkinType.value
  return [
    { letter: type[0], name: type[0] === 'O' ? 'Oily' : 'Dry', opposite: type[0] === 'O' ? 'Dry' : 'Oily', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
    { letter: type[1], name: type[1] === 'S' ? 'Sensitive' : 'Resistant', opposite: type[1] === 'S' ? 'Resistant' : 'Sensitive', color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' },
    { letter: type[2], name: type[2] === 'P' ? 'Pigmented' : 'Non-Pigmented', opposite: type[2] === 'P' ? 'Non-Pigmented' : 'Pigmented', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
    { letter: type[3], name: type[3] === 'W' ? 'Wrinkle' : 'Tight', opposite: type[3] === 'W' ? 'Tight' : 'Wrinkle', color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans pb-28 pt-4 lg:pt-8 transition-colors duration-300">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">

      <div class="flex items-center gap-3 mb-6">
        <button @click="router.back()" class="w-9 h-9 rounded-full bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-500 hover:text-brand-primary transition-colors">
          <svg class="w-5 h-5 pr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 class="text-lg lg:text-2xl font-serif font-bold text-brand-text dark:text-white leading-tight">Skin Profile</h1>
          <p class="text-[10px] lg:text-[11px] font-bold text-brand-text-muted uppercase tracking-widest">Diagnostic Report</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        <div class="lg:col-span-7 flex flex-col gap-6">

          <div class="relative rounded-[2rem] overflow-hidden bg-brand-primary shadow-lg p-6 lg:p-10 flex flex-col items-start text-left min-h-[220px] lg:min-h-[300px] justify-center">
            <div class="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10" />
            <div class="absolute -bottom-16 -left-8 w-40 h-40 rounded-full bg-white/5" />

            <div class="relative z-10 w-full">
              <div class="flex items-center gap-2 mb-3">
                <span class="px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest border border-white/20">
                  Type {{ userSkinType }}
                </span>
                <span class="px-3 py-1 rounded-full bg-black/20 text-white text-[10px] font-bold uppercase tracking-widest border border-black/10">
                  {{ profileData.maintenanceLevel }} Maintenance
                </span>
              </div>
              <h2 class="text-white font-serif text-2xl lg:text-4xl font-bold leading-tight mb-3">
                {{ profileData.subtitle }}
              </h2>
              <p class="text-orange-50 text-xs lg:text-base leading-relaxed max-w-xl">
                {{ profileData.desc }}
              </p>
            </div>
          </div>

          <div class="bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 rounded-[2rem] p-6 lg:p-8 shadow-sm flex flex-col gap-6">
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <h3 class="text-sm lg:text-lg font-bold text-brand-text dark:text-white">{{ profileData.focusTitle }}</h3>
                <p class="text-xs lg:text-sm text-brand-text-muted dark:text-stone-400 mt-1 leading-relaxed">{{ profileData.focusDesc }}</p>
              </div>
            </div>
            <div class="bg-stone-50 dark:bg-stone-900/50 rounded-2xl p-5 border border-stone-100 dark:border-stone-800/80">
              <p class="text-sm lg:text-base text-brand-text dark:text-stone-300 italic font-serif leading-relaxed text-center opacity-80">
                "{{ profileData.quote }}"
              </p>
            </div>
          </div>

          <div class="bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 rounded-[2rem] p-6 lg:p-8 shadow-sm">
            <h3 class="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-6">Suggested Routine Blueprint</h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="bg-stone-50 dark:bg-[#1C1917] p-5 rounded-2xl border border-stone-100 dark:border-stone-800">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 flex items-center justify-center">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
                  </div>
                  <h4 class="font-bold text-brand-text dark:text-stone-200">Morning</h4>
                </div>
                <ol class="space-y-3 relative before:absolute before:inset-y-2 before:left-[7px] before:w-[2px] before:bg-stone-200 dark:before:bg-stone-800">
                  <li v-for="(step, index) in profileData.routineBlueprint.am" :key="index" class="flex items-start gap-3 relative z-10">
                    <span class="w-4 h-4 mt-0.5 flex-shrink-0 rounded-full bg-white dark:bg-stone-900 border-2 border-orange-400 flex items-center justify-center"></span>
                    <span class="text-[13px] text-brand-text dark:text-stone-300 font-medium leading-snug">{{ step }}</span>
                  </li>
                </ol>
              </div>

              <div class="bg-stone-50 dark:bg-[#1C1917] p-5 rounded-2xl border border-stone-100 dark:border-stone-800">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 flex items-center justify-center">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  </div>
                  <h4 class="font-bold text-brand-text dark:text-stone-200">Evening</h4>
                </div>
                <ol class="space-y-3 relative before:absolute before:inset-y-2 before:left-[7px] before:w-[2px] before:bg-stone-200 dark:before:bg-stone-800">
                  <li v-for="(step, index) in profileData.routineBlueprint.pm" :key="index" class="flex items-start gap-3 relative z-10">
                    <span class="w-4 h-4 mt-0.5 flex-shrink-0 rounded-full bg-white dark:bg-stone-900 border-2 border-indigo-400 flex items-center justify-center"></span>
                    <span class="text-[13px] text-brand-text dark:text-stone-300 font-medium leading-snug">{{ step }}</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

        </div>

        <div class="lg:col-span-5 flex flex-col gap-6">

          <div class="bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 rounded-[2rem] p-6">
             <h3 class="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4 px-1">Typology Breakdown</h3>
             <div class="grid grid-cols-2 gap-3">
                <div v-for="axis in axes" :key="axis.letter" class="bg-stone-50 dark:bg-[#1C1917] border border-stone-100 dark:border-stone-800/60 rounded-2xl p-3 flex flex-col items-center text-center">
                  <div :class="`w-10 h-10 rounded-full ${axis.bg} ${axis.color} flex items-center justify-center text-lg font-black font-serif mb-2 border`">
                    {{ axis.letter }}
                  </div>
                  <p class="text-xs font-bold text-brand-text dark:text-stone-100">{{ axis.name }}</p>
                  <p class="text-[9px] text-stone-400 uppercase tracking-wider">vs. {{ axis.opposite }}</p>
                </div>
             </div>
          </div>

          <div class="bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 rounded-[2rem] p-6">
             <h3 class="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4 px-1">Common Skin Concerns</h3>
             <div class="flex flex-wrap gap-2">
               <span v-for="concern in profileData.commonConcerns" :key="concern"
                 class="px-3 py-1.5 bg-stone-100 dark:bg-[#1C1917] rounded-xl text-[11px] font-semibold text-brand-text dark:text-stone-300 border border-stone-200 dark:border-stone-800">
                 {{ concern }}
               </span>
             </div>
          </div>

          <div class="bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 rounded-[2rem] p-6">
             <h3 class="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4 px-1">Target Product Textures</h3>
             <div class="space-y-3">
               <div class="flex items-center justify-between bg-stone-50 dark:bg-[#1C1917] p-3 rounded-2xl border border-stone-100 dark:border-stone-800/80">
                 <span class="text-[11px] font-bold text-stone-500 uppercase">Cleanser</span>
                 <span class="text-xs font-bold text-brand-primary dark:text-orange-400">{{ profileData.idealTextures.cleanser }}</span>
               </div>
               <div class="flex items-center justify-between bg-stone-50 dark:bg-[#1C1917] p-3 rounded-2xl border border-stone-100 dark:border-stone-800/80">
                 <span class="text-[11px] font-bold text-stone-500 uppercase">Moisturizer</span>
                 <span class="text-xs font-bold text-brand-primary dark:text-orange-400">{{ profileData.idealTextures.moisturizer }}</span>
               </div>
               <div class="flex items-center justify-between bg-stone-50 dark:bg-[#1C1917] p-3 rounded-2xl border border-stone-100 dark:border-stone-800/80">
                 <span class="text-[11px] font-bold text-stone-500 uppercase">Sunscreen</span>
                 <span class="text-xs font-bold text-brand-primary dark:text-orange-400">{{ profileData.idealTextures.sunscreen }}</span>
               </div>
             </div>
          </div>

          <div class="bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-[2rem] p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-7 h-7 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 class="text-sm font-bold text-green-800 dark:text-green-400">Hero Ingredients</h3>
            </div>
            <div class="flex flex-wrap gap-2">
              <span v-for="item in profileData.dos" :key="item"
                class="px-3 py-1.5 bg-white dark:bg-stone-800/80 rounded-xl text-[11px] font-bold text-green-700 dark:text-green-300 shadow-sm border border-green-100 dark:border-green-800/50">
                {{ item }}
              </span>
            </div>
          </div>

          <div class="bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-[2rem] p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-7 h-7 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <h3 class="text-sm font-bold text-red-800 dark:text-red-400">Avoid These</h3>
            </div>
            <div class="flex flex-wrap gap-2">
              <span v-for="item in profileData.donts" :key="item"
                class="px-3 py-1.5 bg-white dark:bg-stone-800/80 rounded-xl text-[11px] font-bold text-red-700 dark:text-red-300 shadow-sm border border-red-100 dark:border-red-800/50">
                {{ item }}
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  </div>
</template>
