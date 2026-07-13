<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  warnings: any[]
}>()

const emit = defineEmits(['cancel', 'proceed'])

// Track which warnings are currently expanded
const expandedWarnings = ref(new Set<number>())

const toggleExpand = (index: number) => {
  const newSet = new Set(expandedWarnings.value)
  if (newSet.has(index)) {
    newSet.delete(index)
  } else {
    newSet.add(index)
  }
  expandedWarnings.value = newSet
}

// Dynamically style the badge based on the backend severity level
const getSeverityBadge = (severity?: string) => {
  const s = (severity || '').toLowerCase()
  if (s === 'high') {
    return 'bg-rose-100 text-semantic-error dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800/50'
  }
  if (s === 'medium') {
    return 'bg-amber-100 text-semantic-warning dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'
  }
  return 'bg-brand-primary-light text-brand-primary dark:bg-brand-primary/10 dark:text-brand-primary-accent border-brand-primary/20 dark:border-brand-primary/30'
}
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/80 backdrop-blur-sm p-4 animate-fade-in" @click.self="emit('cancel')">
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-brand-surface-border dark:border-stone-800 animate-slide-up flex flex-col max-h-[90vh]">

      <div class="pt-8 pb-6 px-6 flex flex-col items-center text-center relative border-b border-brand-surface-border dark:border-stone-800">
        <div class="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-rose-50 dark:bg-rose-900/20 text-semantic-error border border-rose-100 dark:border-rose-800/30 ring-4 ring-rose-50/50 dark:ring-rose-900/10">
          <svg class="w-8 h-8 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <h2 class="text-xl font-serif font-bold text-brand-text dark:text-white">Interaction Alert</h2>
        <p class="text-xs font-bold text-semantic-error mt-1.5">SkinBuddy detected a potential issue.</p>
      </div>

      <div class="px-6 py-6 overflow-y-auto space-y-3 hide-scrollbar bg-brand-bg-light/50 dark:bg-brand-bg-dark/20">
        <div v-for="(warning, index) in warnings" :key="index" class="bg-brand-surface-light dark:bg-stone-800/60 p-4 rounded-2xl border border-brand-surface-border dark:border-stone-700 shadow-sm">

          <span
            class="text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-lg border inline-block mb-2.5"
            :class="getSeverityBadge(warning.severity)"
          >
            {{ warning.severity }} &bull; {{ warning.alert_type }}
          </span>

          <div>
            <p
              class="text-sm font-medium text-brand-text dark:text-stone-300 leading-relaxed transition-all duration-300"
              :class="{ 'line-clamp-2': !expandedWarnings.has(index) }"
            >
              {{ warning.message }}
            </p>

            <button
              v-if="warning.message?.length > 90"
              @click="toggleExpand(index)"
              class="text-xs font-bold text-brand-primary hover:text-brand-primary-hover mt-2 transition-colors flex items-center gap-1"
            >
              {{ expandedWarnings.has(index) ? 'Show less' : 'Read more' }}
              <svg :class="['w-3 h-3 transition-transform', expandedWarnings.has(index) ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>

        </div>
      </div>

      <div class="p-4 grid grid-cols-2 gap-3 bg-brand-surface-light dark:bg-brand-surface-dark border-t border-brand-surface-border dark:border-stone-800 shrink-0">
        <button
          @click="emit('cancel')"
          class="py-3.5 rounded-xl font-bold text-sm text-brand-text dark:text-stone-300 bg-brand-bg-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700 hover:bg-brand-surface-border/50 dark:hover:bg-stone-700 transition-colors active:scale-[0.98]"
        >
          Cancel
        </button>
        <button
          @click="emit('proceed')"
          class="py-3.5 rounded-xl font-bold text-sm text-white bg-semantic-error hover:bg-semantic-error/90 active:scale-[0.98] transition-all shadow-sm shadow-semantic-error/20"
        >
          Proceed Anyway
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
</style>
