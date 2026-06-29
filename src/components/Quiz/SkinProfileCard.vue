<script setup lang="ts">
const props = defineProps<{
  typeCode: string
  profile: {
    subtitle: string
    desc: string
    quote: string
    focusTitle: string
    focusDesc: string
  }
}>()
</script>

<template>
  <div class="animate-fade-in space-y-4 pb-4">
    <div class="bg-stone-50 dark:bg-stone-900 rounded-2xl p-5 border border-stone-100 dark:border-stone-800">
      <div class="flex items-center gap-3 mb-3">
        <span class="font-mono font-black text-lg text-brand-text dark:text-white">{{ typeCode }}</span>
        <span class="inline-block px-3 py-1 bg-brand-primary/10 dark:bg-orange-900/30 text-brand-primary dark:text-orange-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
          {{ profile.subtitle }}
        </span>
      </div>
      <p class="text-sm text-brand-text dark:text-stone-300 leading-relaxed mb-4">
        {{ profile.desc }}
      </p>
      <blockquote class="border-l-2 border-brand-primary dark:border-orange-500 pl-3 italic text-xs text-stone-500 dark:text-stone-400">
        "{{ profile.quote }}"
      </blockquote>
    </div>

    <!-- Treatment Focus Block -->
    <div class="bg-brand-primary/5 dark:bg-orange-900/10 border border-brand-primary/20 dark:border-orange-900/30 rounded-2xl p-4 flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-brand-primary-light dark:bg-orange-900/50 text-brand-primary dark:text-orange-400 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
      </div>
      <div>
        <h4 class="text-xs font-bold text-brand-text dark:text-stone-200 uppercase tracking-wide mb-1">{{ profile.focusTitle }}</h4>
        <p class="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">{{ profile.focusDesc }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
