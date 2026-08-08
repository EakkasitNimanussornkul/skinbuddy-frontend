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

const currentProfile = computed(() => {
  return (skinProfiles[props.skinType] || skinProfiles['OSPW'])!
})

const axisDefs = [
  { key: 'hydration', lowLabel: 'Dry', highLabel: 'Oily' },
  { key: 'sensitivity', lowLabel: 'Resistant', highLabel: 'Sensitive' },
  { key: 'pigmentation', lowLabel: 'Non-Pigmented', highLabel: 'Pigmented' },
  { key: 'aging', lowLabel: 'Tight', highLabel: 'Wrinkle-Prone' }
] as const

// Scores range 4-16 (four questions, 1-4 points each); >=10 crosses into the "high" trait letter.
const axisPercent = (key: keyof typeof props.scores) => {
  const pct = ((props.scores[key] - 4) / 12) * 100
  return Math.min(100, Math.max(0, pct))
}

const isHighActive = (key: keyof typeof props.scores) => props.scores[key] >= 10
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

        <span class="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-semantic-warning/10 text-semantic-warning border border-semantic-warning/20">
          {{ currentProfile.maintenanceLevel }} Maintenance
        </span>
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

    <!-- Your Four Axes: continuous score visualization -->
    <div class="relative z-10 bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 rounded-[2rem] p-6 sm:p-8 shadow-sm mb-8 animate-slide-up-2b">
      <h3 class="text-lg font-serif font-bold text-brand-text dark:text-white mb-5">Your Four Axes</h3>
      <div class="space-y-5">
        <div v-for="axis in axisDefs" :key="axis.key">
          <div class="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide mb-1.5">
            <span :class="isHighActive(axis.key) ? 'text-brand-text-muted dark:text-stone-500' : 'text-brand-text dark:text-white'">{{ axis.lowLabel }}</span>
            <span :class="isHighActive(axis.key) ? 'text-brand-text dark:text-white' : 'text-brand-text-muted dark:text-stone-500'">{{ axis.highLabel }}</span>
          </div>
          <div class="relative h-2 rounded-full bg-stone-100 dark:bg-stone-800">
            <div
              class="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-primary-accent to-brand-primary transition-all duration-700 ease-out"
              :style="{ width: axisPercent(axis.key) + '%' }"
            />
            <div
              class="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-white dark:bg-brand-surface-dark border-[2.5px] border-brand-primary shadow-sm transition-all duration-700 ease-out"
              :style="{ left: axisPercent(axis.key) + '%', transform: 'translate(-50%, -50%)' }"
            />
          </div>
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
      <div class="bg-gradient-to-br from-brand-primary to-brand-primary-hover p-6 rounded-[2rem] text-white shadow-lg shadow-brand-primary/20 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 flex flex-col justify-between border border-white/10">
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

    <!-- Common Concerns & Routine Blueprint -->
    <div class="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 mb-8 animate-slide-up-4b">
      <div class="lg:col-span-5 bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 rounded-[2rem] p-6 shadow-sm">
        <h3 class="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-4">Common Concerns</h3>
        <div class="flex flex-wrap gap-2">
          <span v-for="concern in currentProfile.commonConcerns" :key="concern" class="px-3 py-1.5 bg-brand-bg-light dark:bg-stone-900 rounded-xl text-[11px] font-bold text-brand-text dark:text-stone-200 border border-brand-surface-border dark:border-stone-800 shadow-2xs">
            {{ concern }}
          </span>
        </div>
      </div>

      <div class="lg:col-span-7 bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 rounded-[2rem] p-6 shadow-sm">
        <h3 class="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-4">Routine Blueprint</h3>
        <div class="grid grid-cols-3 gap-2 mb-5">
          <div class="flex flex-col bg-brand-bg-light dark:bg-stone-900/50 p-2 rounded-xl border border-brand-surface-border dark:border-stone-800 text-center">
            <span class="text-[9px] font-bold text-brand-text-muted uppercase">Cleanse</span>
            <span class="text-[10px] font-bold text-brand-primary truncate mt-0.5">{{ currentProfile.idealTextures.cleanser }}</span>
          </div>
          <div class="flex flex-col bg-brand-bg-light dark:bg-stone-900/50 p-2 rounded-xl border border-brand-surface-border dark:border-stone-800 text-center">
            <span class="text-[9px] font-bold text-brand-text-muted uppercase">Moist</span>
            <span class="text-[10px] font-bold text-brand-primary truncate mt-0.5">{{ currentProfile.idealTextures.moisturizer }}</span>
          </div>
          <div class="flex flex-col bg-brand-bg-light dark:bg-stone-900/50 p-2 rounded-xl border border-brand-surface-border dark:border-stone-800 text-center">
            <span class="text-[9px] font-bold text-brand-text-muted uppercase">SPF</span>
            <span class="text-[10px] font-bold text-brand-primary truncate mt-0.5">{{ currentProfile.idealTextures.sunscreen }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="bg-brand-bg-light dark:bg-stone-900/50 p-4 rounded-2xl border border-brand-surface-border dark:border-stone-800/80">
            <div class="flex items-center gap-2 mb-3">
              <svg class="w-4 h-4 text-brand-primary stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
              <h4 class="font-bold text-brand-text dark:text-stone-200 text-xs">Morning Steps</h4>
            </div>
            <ol class="space-y-2 relative before:absolute before:inset-y-1.5 before:left-[5px] before:w-[1.5px] before:bg-brand-surface-border dark:before:bg-stone-700">
              <li v-for="(step, index) in currentProfile.routineBlueprint.am" :key="index" class="flex items-start gap-2.5 relative z-10">
                <span class="w-3 h-3 mt-0.5 flex-shrink-0 rounded-full bg-brand-surface-light dark:bg-stone-900 border-2 border-brand-primary" />
                <span class="text-[11px] text-brand-text dark:text-stone-300 font-medium leading-normal">{{ step }}</span>
              </li>
            </ol>
          </div>

          <div class="bg-brand-bg-light dark:bg-stone-900/50 p-4 rounded-2xl border border-brand-surface-border dark:border-stone-800/80">
            <div class="flex items-center gap-2 mb-3">
              <svg class="w-4 h-4 text-stone-400 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              <h4 class="font-bold text-brand-text dark:text-stone-200 text-xs">Evening Steps</h4>
            </div>
            <ol class="space-y-2 relative before:absolute before:inset-y-1.5 before:left-[5px] before:w-[1.5px] before:bg-brand-surface-border dark:before:bg-stone-700">
              <li v-for="(step, index) in currentProfile.routineBlueprint.pm" :key="index" class="flex items-start gap-2.5 relative z-10">
                <span class="w-3 h-3 mt-0.5 flex-shrink-0 rounded-full bg-brand-surface-light dark:bg-stone-900 border-2 border-stone-400 dark:border-stone-500" />
                <span class="text-[11px] text-brand-text dark:text-stone-300 font-medium leading-normal">{{ step }}</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <!-- Verification Prompt -->
    <div class="relative z-10 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-[2rem] p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 animate-slide-up-5 shadow-sm">
      <div class="text-center sm:text-left">
        <p class="text-sm font-bold text-amber-900 dark:text-amber-300">Does this result match your skin reality?</p>
        <p class="text-xs font-medium text-amber-700 dark:text-amber-400/80 mt-1">If your skin feels different, our AI can re-evaluate your concerns.</p>
      </div>
      <div class="w-full sm:w-auto shrink-0">
        <button @click="router.push('/chat')" class="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95">
          <span>No, Ask AI Consulter</span>
          <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </button>
      </div>
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
.animate-slide-up-2b { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.15s; opacity: 0; }
.animate-slide-up-3 { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.2s; opacity: 0; }
.animate-slide-up-4 { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.3s; opacity: 0; }
.animate-slide-up-4b { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.35s; opacity: 0; }
.animate-slide-up-5 { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.4s; opacity: 0; }
.animate-slide-up-6 { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.5s; opacity: 0; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
