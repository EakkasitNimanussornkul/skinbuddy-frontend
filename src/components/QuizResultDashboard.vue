<script setup lang="ts">
import { computed } from 'vue'
import { skinProfiles } from '../data/skinprofiles'

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
  return skinProfiles[props.skinType] || skinProfiles['OSPW']
})
</script>

<template>
  <div class="max-w-md mx-auto px-4 pb-8 pt-4 font-sans text-brand-text dark:text-stone-100">

    <div class="text-center mb-6 animate-slide-up-1">
      <span class="bg-brand-primary-light dark:bg-orange-900/40 text-brand-primary dark:text-orange-300 text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
        YOUR ANALYSIS IS COMPLETE
      </span>
    </div>

    <div class="bg-brand-surface-light dark:bg-brand-surface-dark p-6 sm:p-8 rounded-3xl border border-brand-primary-light dark:border-orange-900/30 shadow-sm mb-5 text-center animate-slide-up-2">
      <h1 class="text-xl font-serif mb-2 text-brand-text-muted dark:text-stone-400">Your Skin Type</h1>
      <h2 class="text-5xl font-serif text-brand-primary dark:text-orange-300 tracking-tight mb-2">{{ skinType }}</h2>
      <p class="text-sm italic text-stone-600 dark:text-stone-300 font-serif">{{ currentProfile.subtitle }}</p>
    </div>

    <div class="flex flex-wrap justify-center gap-2 mb-8 animate-slide-up-3">
      <span v-for="(trait, idx) in traits" :key="idx"
        class="px-3 py-1.5 rounded-full text-[11px] font-bold italic tracking-wide"
        :class="[
          /* Oily/Dry */
          idx === 0 ? 'bg-brand-primary-light text-brand-primary dark:bg-orange-900/40 dark:text-orange-300' : '',
          /* Sensitive/Resistant (Keeping this slightly red/rose for semantic meaning) */
          idx === 1 ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400' : '',
          /* Pigmented/Clear */
          idx === 2 ? 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300' : '',
          /* Wrinkle-Prone/Tight */
          idx === 3 ? 'bg-orange-50 text-brand-primary dark:bg-orange-900/30 dark:text-orange-300' : ''
        ]">
        {{ trait }}
      </span>
    </div>

    <div class="bg-brand-surface-light dark:bg-brand-surface-dark p-6 rounded-3xl border border-brand-primary-light dark:border-orange-900/30 shadow-sm mb-8 animate-slide-up-4">
      <h3 class="text-xl font-serif mb-3 border-b border-stone-100 dark:border-stone-700 pb-3">What this means</h3>
      <p class="text-xs text-brand-text-muted dark:text-stone-400 leading-relaxed mb-4">
        {{ currentProfile.desc }}
      </p>

      <div class="bg-brand-bg-light dark:bg-brand-bg-dark p-4 rounded-2xl border-l-4 border-brand-primary dark:border-orange-400">
        <p class="text-xs italic text-brand-primary dark:text-orange-300 leading-relaxed">
          "{{ currentProfile.quote }}"
        </p>
      </div>
    </div>

    <div class="mb-4 px-2 animate-slide-up-5">
      <h2 class="text-2xl font-serif text-brand-text dark:text-white">Priority Focus</h2>
    </div>

    <div class="space-y-3 mb-4 animate-slide-up-6">

      <div class="bg-brand-primary p-6 rounded-3xl text-white shadow-md">
        <h4 class="text-lg font-serif mb-1">{{ currentProfile.focusTitle }}</h4>
        <p class="text-xs text-orange-200 leading-relaxed">{{ currentProfile.focusDesc }}</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="bg-brand-primary-light dark:bg-orange-900/30 p-5 rounded-3xl">
          <h4 class="text-xs font-semibold text-brand-primary dark:text-orange-300 mb-1">AM Routine</h4>
          <p class="text-[11px] text-brand-text-muted dark:text-stone-400 leading-relaxed">Protection & Defense</p>
        </div>

        <div class="bg-stone-100 dark:bg-stone-800 p-5 rounded-3xl">
          <h4 class="text-xs font-semibold text-brand-text dark:text-stone-200 mb-1">PM Routine</h4>
          <p class="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">Repair & Recovery</p>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Keep your existing animation CSS down here! */
.animate-slide-up-1 { animation: slideUp 0.4s ease-out 0.1s both; }
.animate-slide-up-2 { animation: slideUp 0.4s ease-out 0.2s both; }
.animate-slide-up-3 { animation: slideUp 0.4s ease-out 0.3s both; }
.animate-slide-up-4 { animation: slideUp 0.4s ease-out 0.4s both; }
.animate-slide-up-5 { animation: slideUp 0.4s ease-out 0.5s both; }
.animate-slide-up-6 { animation: slideUp 0.4s ease-out 0.6s both; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
