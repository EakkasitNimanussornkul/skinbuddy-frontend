<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  stats: {
    lowPct: number
    medPct: number
    highPct: number
    lowCount: number
    medCount: number
    highCount: number
  }
}>()

const showAwarenessGuide = ref(false)
</script>

<template>
  <div class="space-y-6">
    <!-- Dynamic Colored Progress Bar based on Database Tiers -->
    <div class="w-full h-3 bg-brand-surface-border dark:bg-stone-800 rounded-full overflow-hidden flex shadow-inner">
      <div v-if="stats.highPct > 0" class="bg-rose-500 h-full transition-all duration-500" :style="{ width: stats.highPct + '%' }" :title="`High Awareness (${stats.highCount})`"></div>
      <div v-if="stats.medPct > 0" class="bg-stone-400 dark:bg-stone-600 h-full transition-all duration-500 border-l border-white/20" :style="{ width: stats.medPct + '%' }" :title="`Normal / Medium Awareness (${stats.medCount})`"></div>
      <div v-if="stats.lowPct > 0" class="bg-emerald-500 h-full transition-all duration-500 border-l border-white/20" :style="{ width: stats.lowPct + '%' }" :title="`Safe / Low Awareness (${stats.lowCount})`"></div>
    </div>

    <!-- Interactive Safety / Awareness Legend Explainer Guide -->
    <div class="bg-brand-bg-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800 rounded-2xl p-4 sm:p-5">
      <button
        @click="showAwarenessGuide = !showAwarenessGuide"
        class="flex items-center justify-between w-full text-xs font-bold text-brand-text dark:text-stone-200 cursor-pointer group"
      >
        <span class="flex items-center gap-2">
          <svg class="w-4 h-4 text-brand-primary stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Understanding Safety & Awareness Tiers
        </span>
        <span class="text-brand-primary group-hover:underline text-[11px]">
          {{ showAwarenessGuide ? 'Hide Details' : 'Show Details' }}
        </span>
      </button>

      <div v-if="showAwarenessGuide" class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 mt-3 border-t border-brand-surface-border dark:border-stone-800/80 animate-fade-in">
        <div class="space-y-1">
          <div class="flex items-center gap-2 text-xs font-bold text-rose-500">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            High Awareness (Red)
          </div>
          <p class="text-[11px] font-medium text-brand-text-muted leading-relaxed">
            Active triggers (such as high-strength retinoids, strong chemical exfoliants, or volatile alcohols). Requires careful routine planning to avoid clashing.
          </p>
        </div>

        <div class="space-y-1">
          <div class="flex items-center gap-2 text-xs font-bold text-stone-500 dark:text-stone-300">
            <span class="w-2.5 h-2.5 rounded-full bg-stone-400 dark:bg-stone-600"></span>
            Medium Awareness (Grey)
          </div>
          <p class="text-[11px] font-medium text-brand-text-muted leading-relaxed">
            Formulation binders, mild surfactants, standard preservatives, and emulsifiers. Safe and necessary structural elements to stabilize the active formula.
          </p>
        </div>

        <div class="space-y-1">
          <div class="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Low Awareness (Green)
          </div>
          <p class="text-[11px] font-medium text-brand-text-muted leading-relaxed">
            Highly compatible ingredients (such as Ceramides, Panthenol, Glycerin, and Green Tea) that soothe the lipid barrier and deliver gentle nourishment.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
