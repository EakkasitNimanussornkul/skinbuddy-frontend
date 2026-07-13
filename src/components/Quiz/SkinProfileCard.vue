<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

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

const emit = defineEmits<{
  (e: 'verify-incorrect'): void
}>()
</script>

<template>
  <div class="animate-fade-in space-y-4 pb-4">
    <div class="bg-white dark:bg-brand-surface-dark rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <span class="font-mono font-black text-2xl text-brand-text dark:text-white tracking-tight">{{ typeCode }}</span>
          <span class="inline-block px-3 py-1.5 bg-brand-primary-light dark:bg-brand-primary/10 border border-brand-primary/20 text-brand-primary dark:text-brand-primary rounded-xl text-[10px] font-bold uppercase tracking-widest w-fit">
            {{ profile.subtitle }}
          </span>
        </div>
      </div>

      <p class="text-sm font-medium text-stone-700 dark:text-stone-300 leading-relaxed mb-5">
        {{ profile.desc }}
      </p>

      <blockquote class="border-l-4 border-brand-primary pl-4 py-1 italic font-medium text-xs text-stone-500 dark:text-stone-400">
        "{{ profile.quote }}"
      </blockquote>
    </div>

    <div class="bg-brand-primary-light/50 dark:bg-brand-primary/5 border border-brand-primary/20 rounded-3xl p-5 flex items-start gap-4 shadow-sm">
      <div class="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-brand-primary/20">
        <svg class="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
      </div>
      <div class="pt-0.5">
        <h4 class="text-xs font-bold text-brand-text dark:text-stone-100 uppercase tracking-widest mb-1.5">{{ profile.focusTitle }}</h4>
        <p class="text-xs font-medium text-stone-600 dark:text-stone-300 leading-relaxed">{{ profile.focusDesc }}</p>
      </div>
    </div>

    <div class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
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
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
