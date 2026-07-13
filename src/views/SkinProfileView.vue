<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { skinProfiles } from '../data/skinprofiles'

const router = useRouter()
const authStore = useAuthStore()

const userSkinType = computed(() => authStore.user?.skin_type || 'ORNT')
const profileData = computed(() => skinProfiles[userSkinType.value] || skinProfiles['OSPW'])

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
  <div class="relative min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans pb-28 pt-4 lg:pt-8 transition-colors duration-300 overflow-hidden">

    <!-- Ambient Background Glow Gradients -->
    <div class="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-brand-primary/15 via-orange-500/10 to-transparent blur-3xl" />
    <div class="pointer-events-none absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-gradient-to-bl from-amber-500/10 via-brand-primary/5 to-transparent blur-3xl" />

    <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <button @click="router.back()" class="w-9 h-9 rounded-full bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-500 hover:text-brand-primary hover:scale-105 transition-all shadow-sm">
            <svg class="w-5 h-5 pr-0.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 class="text-lg lg:text-2xl font-serif font-bold text-brand-text dark:text-white leading-tight">Skin Profile Report</h1>
            <p class="text-[10px] lg:text-[11px] font-bold text-brand-text-muted uppercase tracking-widest">Diagnostic Breakdown</p>
          </div>
        </div>

        <button @click="router.push('/chat')" class="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-primary/10 hover:bg-brand-primary hover:text-white text-brand-primary rounded-full text-xs font-bold transition-all border border-brand-primary/20 shadow-sm hover:shadow-md">
          <svg class="w-4 h-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          <span>Result Inaccurate? Consult AI</span>
        </button>
      </div>

      <!-- Main Responsive Grid: Left (7 Cols) / Right (5 Cols) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        <!-- Left Column: Hero Diagnostic & Blueprint -->
        <div class="lg:col-span-7 flex flex-col gap-6">

          <!-- Hero Diagnostic Banner with Glow & Hover Lift -->
          <div class="group relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-brand-primary via-orange-600 to-amber-700 shadow-xl shadow-orange-950/10 p-6 lg:p-10 flex flex-col justify-between min-h-[260px] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-orange-900/20 border border-white/10">
            <div class="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
            <div class="absolute -bottom-16 -left-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

            <div class="relative z-10 w-full">
              <div class="flex items-center gap-2 mb-3">
                <span class="px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest border border-white/20 backdrop-blur-md">
                  Type {{ userSkinType }}
                </span>
                <span class="px-3 py-1 rounded-full bg-black/20 text-white text-[10px] font-bold uppercase tracking-widest border border-black/10 backdrop-blur-md">
                  {{ profileData.maintenanceLevel }} Maintenance
                </span>
              </div>
              <h2 class="text-white font-serif text-2xl lg:text-4xl font-bold leading-tight mb-3 drop-shadow-sm">
                {{ profileData.subtitle }}
              </h2>
              <p class="text-orange-50 text-xs sm:text-sm leading-relaxed max-w-xl">
                {{ profileData.desc }}
              </p>
            </div>

            <div class="relative z-10 mt-6 pt-4 border-t border-white/20">
              <p class="text-xs sm:text-sm text-orange-100 italic font-serif leading-relaxed">
                "{{ profileData.quote }}"
              </p>
            </div>
          </div>

          <!-- Suggested Routine Blueprint -->
          <div class="bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 rounded-[2rem] p-6 lg:p-8 shadow-sm hover:shadow-md transition-all duration-300">
            <h3 class="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-6">Suggested Routine Blueprint</h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div class="bg-stone-50 dark:bg-[#1C1917] p-5 rounded-2xl border border-stone-100 dark:border-stone-800 hover:border-orange-400/30 transition-colors">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 flex items-center justify-center shadow-sm">
                    <svg class="w-4 h-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
                  </div>
                  <h4 class="font-bold text-brand-text dark:text-stone-200 text-sm">Morning Routine</h4>
                </div>
                <ol class="space-y-3 relative before:absolute before:inset-y-2 before:left-[7px] before:w-[2px] before:bg-stone-200 dark:before:bg-stone-800">
                  <li v-for="(step, index) in profileData.routineBlueprint.am" :key="index" class="flex items-start gap-3 relative z-10">
                    <span class="w-4 h-4 mt-0.5 flex-shrink-0 rounded-full bg-white dark:bg-stone-900 border-2 border-orange-400 flex items-center justify-center shadow-sm"></span>
                    <span class="text-[13px] text-brand-text dark:text-stone-300 font-medium leading-snug">{{ step }}</span>
                  </li>
                </ol>
              </div>

              <div class="bg-stone-50 dark:bg-[#1C1917] p-5 rounded-2xl border border-stone-100 dark:border-stone-800 hover:border-indigo-400/30 transition-colors">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shadow-sm">
                    <svg class="w-4 h-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  </div>
                  <h4 class="font-bold text-brand-text dark:text-stone-200 text-sm">Evening Routine</h4>
                </div>
                <ol class="space-y-3 relative before:absolute before:inset-y-2 before:left-[7px] before:w-[2px] before:bg-stone-200 dark:before:bg-stone-800">
                  <li v-for="(step, index) in profileData.routineBlueprint.pm" :key="index" class="flex items-start gap-3 relative z-10">
                    <span class="w-4 h-4 mt-0.5 flex-shrink-0 rounded-full bg-white dark:bg-stone-900 border-2 border-indigo-400 flex items-center justify-center shadow-sm"></span>
                    <span class="text-[13px] text-brand-text dark:text-stone-300 font-medium leading-snug">{{ step }}</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

        </div>

        <!-- Right Column: Typology & Anchored Complete Barrier Shield -->
        <div class="lg:col-span-5 flex flex-col gap-6">

          <!-- Typology Breakdown -->
          <div class="bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all duration-300">
             <h3 class="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4 px-1">Typology Breakdown</h3>
             <div class="grid grid-cols-2 gap-3">
                <div v-for="axis in axes" :key="axis.letter" class="bg-stone-50 dark:bg-[#1C1917] border border-stone-100 dark:border-stone-800/60 rounded-2xl p-3 flex flex-col items-center text-center hover:-translate-y-0.5 hover:shadow-sm transition-all">
                  <div :class="`w-10 h-10 rounded-full ${axis.bg} ${axis.color} flex items-center justify-center text-lg font-black font-serif mb-2 border shadow-sm`">
                    {{ axis.letter }}
                  </div>
                  <p class="text-xs font-bold text-brand-text dark:text-stone-100">{{ axis.name }}</p>
                  <p class="text-[9px] text-stone-400 uppercase tracking-wider">vs. {{ axis.opposite }}</p>
                </div>
             </div>
          </div>

          <!-- Common Skin Concerns & Textures -->
          <div class="bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-6">
             <div>
               <h3 class="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3 px-1">Common Skin Concerns</h3>
               <div class="flex flex-wrap gap-2">
                 <span v-for="concern in profileData.commonConcerns" :key="concern"
                   class="px-3 py-1.5 bg-stone-100 dark:bg-[#1C1917] rounded-xl text-[11px] font-semibold text-brand-text dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-brand-primary/40 transition-colors">
                   {{ concern }}
                 </span>
               </div>
             </div>

             <div class="pt-4 border-t border-stone-100 dark:border-stone-800">
               <h3 class="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3 px-1">Target Product Textures</h3>
               <div class="space-y-2">
                 <div class="flex items-center justify-between bg-stone-50 dark:bg-[#1C1917] p-2.5 rounded-xl border border-stone-100 dark:border-stone-800/80 hover:border-stone-300 transition-colors">
                   <span class="text-[11px] font-bold text-stone-500 uppercase">Cleanser</span>
                   <span class="text-xs font-bold text-brand-primary dark:text-orange-400">{{ profileData.idealTextures.cleanser }}</span>
                 </div>
                 <div class="flex items-center justify-between bg-stone-50 dark:bg-[#1C1917] p-2.5 rounded-xl border border-stone-100 dark:border-stone-800/80 hover:border-stone-300 transition-colors">
                   <span class="text-[11px] font-bold text-stone-500 uppercase">Moisturizer</span>
                   <span class="text-xs font-bold text-brand-primary dark:text-orange-400">{{ profileData.idealTextures.moisturizer }}</span>
                 </div>
                 <div class="flex items-center justify-between bg-stone-50 dark:bg-[#1C1917] p-2.5 rounded-xl border border-stone-100 dark:border-stone-800/80 hover:border-stone-300 transition-colors">
                   <span class="text-[11px] font-bold text-stone-500 uppercase">Sunscreen</span>
                   <span class="text-xs font-bold text-brand-primary dark:text-orange-400">{{ profileData.idealTextures.sunscreen }}</span>
                 </div>
               </div>
             </div>
          </div>

          <!-- Anchored Complete Barrier Shield with Glow & Hover Lifts -->
          <div class="flex flex-col gap-4 pt-2">
            <h3 class="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest px-1">Complete Barrier Shield</h3>

            <!-- Treatment Focus -->
            <div class="group bg-gradient-to-r from-brand-primary to-orange-600 p-6 rounded-[2rem] text-white shadow-lg shadow-orange-950/10 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-orange-200 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <span class="text-[10px] font-bold uppercase tracking-wider text-orange-200">Treatment Focus</span>
              </div>
              <h4 class="font-serif font-bold text-base">{{ profileData.focusTitle }}</h4>
              <p class="text-xs text-orange-100 leading-relaxed">{{ profileData.focusDesc }}</p>
            </div>

            <!-- Hero Actives -->
            <div class="bg-gradient-to-br from-green-50/90 to-emerald-50/50 dark:from-green-950/40 dark:to-stone-900 border-2 border-green-200/80 dark:border-green-800/50 rounded-[2rem] p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shadow-md shadow-green-900/20">
                  <svg class="w-4 h-4 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-green-900 dark:text-green-300">Hero Actives</h3>
                  <p class="text-[10px] text-green-700 dark:text-green-400">Must-have barrier supporters</p>
                </div>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="item in profileData.dos" :key="item"
                  class="px-3 py-1.5 bg-white dark:bg-stone-900 rounded-xl text-[11px] font-bold text-green-800 dark:text-green-300 shadow-sm border border-green-200 dark:border-green-800/80 hover:border-green-400 transition-colors">
                  {{ item }}
                </span>
              </div>
            </div>

            <!-- Avoid Inside -->
            <div class="bg-gradient-to-br from-red-50/90 to-rose-50/50 dark:from-red-950/40 dark:to-stone-900 border-2 border-red-200/80 dark:border-red-800/50 rounded-[2rem] p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-900/20">
                  <svg class="w-4 h-4 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-red-900 dark:text-red-300">Avoid Inside</h3>
                  <p class="text-[10px] text-red-700 dark:text-red-400">High risk of causing irritation</p>
                </div>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="item in profileData.donts" :key="item"
                  class="px-3 py-1.5 bg-white dark:bg-stone-900 rounded-xl text-[11px] font-bold text-red-800 dark:text-red-300 shadow-sm border border-red-200 dark:border-red-800/80 hover:border-red-400 transition-colors">
                  {{ item }}
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  </div>
</template>
