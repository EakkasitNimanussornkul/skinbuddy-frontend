<script setup lang="ts">
defineProps<{
  letter: string
  name: string
  opposite: string
  detail: string
}>()
</script>

<template>
  <button class="w-[75vw] sm:w-auto shrink-0 snap-center bg-brand-surface-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between hover:border-brand-primary/40 hover:shadow-md transition-all shadow-2xs group text-left">
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-full bg-brand-primary-light/50 dark:bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xl font-black font-serif flex-shrink-0 border border-brand-primary/20 shadow-inner group-hover:scale-105 transition-transform">
        {{ letter }}
      </div>
      <div>
        <p class="text-sm font-bold text-brand-text dark:text-stone-100">{{ name }}</p>
        <p class="text-[10px] text-brand-text-muted font-bold uppercase tracking-wider mb-1">vs. {{ opposite }}</p>
        <p class="text-xs text-stone-500 dark:text-stone-400 leading-snug line-clamp-1">{{ detail }}</p>
      </div>
    </div>
    <div class="w-8 h-8 rounded-full flex items-center justify-center bg-brand-bg-light dark:bg-stone-800 group-hover:bg-brand-primary group-hover:text-white text-brand-text-muted transition-colors flex-shrink-0 ml-2">
      <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
    </div>
  </button>
</template>
