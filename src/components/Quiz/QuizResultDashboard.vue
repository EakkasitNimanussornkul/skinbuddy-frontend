<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { skinProfiles } from '../../data/skinprofiles'

const router = useRouter()

const props = defineProps<{
  skinType: string
  scores: {
    hydration: number
    sensitivity: number
    pigmentation: number
    aging: number
  }
}>()

const traits = computed(() => {
  return [
    props.scores.hydration >= 10 ? 'Oily' : 'Dry',
    props.scores.sensitivity >= 10 ? 'Sensitive' : 'Resistant',
    props.scores.pigmentation >= 10 ? 'Pigmented' : 'Clear',
    props.scores.aging >= 10 ? 'Wrinkle-Prone' : 'Tight'
  ]
})

const currentProfile = computed(() => {
  return (skinProfiles[props.skinType] || skinProfiles['OSPW'])!
})
</script>

<template>
  <div class="relative max-w-5xl mx-auto px-4 sm:px-6 pb-12 pt-4 font-sans text-brand-text dark:text-stone-100">

    <!-- Ambient Glow Circle -->
    <div class="pointer-events-none absolute top-10 left-1/3 h-72 w-72 rounded-full bg-brand-primary/10 blur-3xl" />

    <!-- Top Status Badge -->
    <div class="relative z-10 text-center mb-6 animate-slide-up-1">
      <span class="bg-brand-primary-light dark:bg-brand-primary/10 text-brand-primary text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm border border-brand-primary/20">
        DIAGNOSIS COMPLETE
      </span>
    </div>

    <!-- Desktop 2-Column Core Summary Grid with Hover Lifts -->
    <div class="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 animate-slide-up-2">

      <!-- Left Box: Diagnosis Spotlight -->
      <div class="lg:col-span-5 bg-gradient-to-br from-brand-surface-light via-brand-surface-light to-brand-primary-light/50 dark:from-brand-surface-dark dark:via-brand-surface-dark dark:to-stone-900 p-6 sm:p-8 rounded-[2rem] border border-brand-primary/20 dark:border-brand-primary/30 shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col justify-center items-center text-center min-h-[220px]">
        <h1 class="text-sm font-serif mb-1 text-brand-text-muted dark:text-stone-400 uppercase tracking-widest font-bold">Your Skin Type</h1>
        <h2 class="text-5xl sm:text-6xl font-serif text-brand-primary dark:text-brand-primary tracking-tight mb-3 drop-shadow-sm">{{ skinType }}</h2>
        <p class="text-sm italic font-medium text-stone-600 dark:text-stone-300 font-serif mb-5">{{ currentProfile.subtitle }}</p>

        <!-- Trait Pills -->
        <div class="flex flex-wrap justify-center gap-2">
          <span v-for="(trait, idx) in traits" :key="idx"
            class="px-3 py-1 rounded-full text-[10px] font-bold tracking-wide shadow-sm border"
            :class="[
              idx === 0 ? 'bg-brand-primary-light border-brand-primary/20 text-brand-primary dark:bg-brand-primary/10 dark:text-brand-primary' : '',
              idx === 1 ? 'bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400' : '',
              idx === 2 ? 'bg-stone-100 border-stone-200 text-stone-700 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300' : '',
              idx === 3 ? 'bg-brand-primary-light border-brand-primary/20 text-brand-primary dark:bg-brand-primary/10 dark:text-brand-primary' : ''
            ]">
            {{ trait }}
          </span>
        </div>
      </div>

      <!-- Right Box: What This Means -->
      <div class="lg:col-span-7 bg-brand-surface-light dark:bg-brand-surface-dark p-6 sm:p-8 rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
        <div>
          <h3 class="text-lg font-serif font-bold mb-3 border-b border-stone-100 dark:border-stone-700/60 pb-3 text-brand-text dark:text-white">What This Means</h3>
          <p class="text-xs sm:text-sm font-medium text-stone-600 dark:text-stone-300 leading-relaxed">
            {{ currentProfile.desc }}
          </p>
        </div>

        <div class="mt-6 bg-stone-50 dark:bg-stone-900/50 p-5 rounded-2xl border-l-4 border-brand-primary dark:border-brand-primary shadow-sm">
          <p class="text-xs sm:text-sm italic font-medium text-brand-primary dark:text-brand-primary leading-relaxed font-serif">
            "{{ currentProfile.quote }}"
          </p>
        </div>
      </div>

    </div>

    <!-- Complete Barrier Shield Matrix with Gradients & Hover Lifts -->
    <div class="relative z-10 mb-4 px-1 animate-slide-up-3">
      <h2 class="text-xl sm:text-2xl font-serif font-bold text-brand-text dark:text-white">Complete Barrier Shield</h2>
      <p class="text-xs font-medium text-brand-text-muted dark:text-stone-400 mt-1">Your deep nourishment requirements matched with safe and unsafe actives.</p>
    </div>

    <div class="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-8 animate-slide-up-4">

      <!-- Treatment Focus -->
      <div class="bg-gradient-to-br from-brand-primary to-rose-500 p-6 rounded-[2rem] text-white shadow-lg shadow-brand-primary/20 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 flex flex-col justify-between border border-white/10">
        <div>
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <span class="text-[10px] font-bold uppercase tracking-widest text-white/90">Treatment Focus</span>
          </div>
          <h4 class="text-lg font-serif font-bold mb-2">{{ currentProfile.focusTitle }}</h4>
          <p class="text-xs sm:text-sm font-medium text-white/90 leading-relaxed">{{ currentProfile.focusDesc }}</p>
        </div>
      </div>

      <!-- Hero Actives -->
      <div class="bg-emerald-50/50 dark:bg-emerald-900/10 border-2 border-emerald-200 dark:border-emerald-800/40 p-6 rounded-[2rem] shadow-sm hover:-translate-y-1.5 hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-3 mb-4">
            <div class="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
              <svg class="w-4 h-4 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>
            <div>
              <h4 class="text-sm font-bold text-emerald-900 dark:text-emerald-400">Hero Actives</h4>
              <p class="text-[10px] font-bold text-emerald-600 dark:text-emerald-500/80 uppercase tracking-wider">Must-have supporters</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 mt-4">
            <span v-for="item in currentProfile.dos" :key="item"
              class="px-3 py-1.5 bg-white dark:bg-brand-surface-dark rounded-xl text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-800/50">
              {{ item }}
            </span>
          </div>
        </div>
      </div>

      <!-- Avoid Inside -->
      <div class="bg-rose-50/50 dark:bg-rose-900/10 border-2 border-rose-200 dark:border-rose-800/40 p-6 rounded-[2rem] shadow-sm hover:-translate-y-1.5 hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-3 mb-4">
            <div class="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-rose-500/20">
              <svg class="w-4 h-4 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </div>
            <div>
              <h4 class="text-sm font-bold text-rose-900 dark:text-rose-400">Avoid Inside</h4>
              <p class="text-[10px] font-bold text-rose-600 dark:text-rose-500/80 uppercase tracking-wider">High risk of clash</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 mt-4">
            <span v-for="item in currentProfile.donts" :key="item"
              class="px-3 py-1.5 bg-white dark:bg-brand-surface-dark rounded-xl text-[11px] font-bold text-rose-700 dark:text-rose-400 shadow-sm border border-rose-100 dark:border-rose-800/50">
              {{ item }}
            </span>
          </div>
        </div>
      </div>

    </div>

    <!-- Verification Prompt -->
    <div class="relative z-10 bg-brand-primary-light/50 dark:bg-brand-primary/5 border border-brand-primary/20 rounded-[2rem] p-6 mb-8 text-center animate-slide-up-5 transition-colors shadow-sm">
      <h4 class="font-bold text-sm text-brand-text dark:text-stone-100">Does this diagnostic match your reality?</h4>
      <p class="text-xs font-medium text-stone-500 dark:text-stone-400 mt-1.5 mb-5 max-w-md mx-auto">
        If you suspect recent breakouts or weather shifts skewed your score, let our AI Consulter review your barrier history.
      </p>
      <button @click="router.push('/chat')" class="w-full sm:w-auto px-6 py-3 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-primary/20 active:scale-95">
        Consult AI Assistant About Result
      </button>
    </div>

    <!-- Next Steps Roadmap -->
    <div class="relative z-10 bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 rounded-[2rem] p-6 animate-slide-up-6 shadow-sm">
      <p class="text-[10px] font-bold text-stone-400 uppercase tracking-widest text-center mb-6">Your Next Steps Roadmap</p>
      <div class="grid grid-cols-3 gap-3 text-center max-w-lg mx-auto relative">
        <!-- Connecting Line -->
        <div class="absolute top-4 left-[15%] right-[15%] h-[2px] bg-stone-200 dark:bg-stone-800 -z-0"></div>

        <div class="flex flex-col items-center relative z-10">
          <div class="w-8 h-8 rounded-full bg-brand-primary text-white text-xs font-bold flex items-center justify-center mb-2 shadow-md shadow-brand-primary/30 border-2 border-white dark:border-brand-surface-dark">
            <svg class="w-4 h-4 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <span class="text-xs font-bold text-brand-text dark:text-stone-200">Diagnosed</span>
        </div>

        <div @click="router.push('/shelf')" class="flex flex-col items-center cursor-pointer group relative z-10">
          <div class="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 group-hover:bg-brand-primary group-hover:text-white text-stone-600 dark:text-stone-400 text-xs font-bold flex items-center justify-center mb-2 transition-all group-hover:scale-110 shadow-sm border-2 border-white dark:border-brand-surface-dark">2</div>
          <span class="text-xs font-bold text-stone-500 group-hover:text-brand-primary transition-colors">Check Shelf</span>
        </div>

        <div @click="router.push('/routine')" class="flex flex-col items-center cursor-pointer group relative z-10">
          <div class="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 group-hover:bg-brand-primary group-hover:text-white text-stone-600 dark:text-stone-400 text-xs font-bold flex items-center justify-center mb-2 transition-all group-hover:scale-110 shadow-sm border-2 border-white dark:border-brand-surface-dark">3</div>
          <span class="text-xs font-bold text-stone-500 group-hover:text-brand-primary transition-colors">Build Routine</span>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.animate-slide-up-1 { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-slide-up-2 { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.1s; opacity: 0; }
.animate-slide-up-3 { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.2s; opacity: 0; }
.animate-slide-up-4 { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.3s; opacity: 0; }
.animate-slide-up-5 { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.4s; opacity: 0; }
.animate-slide-up-6 { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.5s; opacity: 0; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
