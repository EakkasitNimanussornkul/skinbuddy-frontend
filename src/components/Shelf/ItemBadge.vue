<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: 'routine' | 'warning' | 'error' | 'unopened' | 'archived' | 'good'
  text: string
}>()

const badgeConfig = computed(() => {
  switch (props.type) {
    case 'warning':
      return {
        classes: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50',
        icon: 'warning'
      }
    case 'error': // Used for Expired and Conflicts
      return {
        classes: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50',
        icon: 'error'
      }
    case 'routine':
      return {
        classes: 'bg-brand-primary-light text-brand-primary border-brand-primary/20 dark:bg-brand-primary/10 dark:text-brand-primary dark:border-brand-primary/30',
        icon: 'none'
      }
    case 'good': // Active and healthy product life
      return {
        classes: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50',
        icon: 'none'
      }
    case 'archived':
      return {
        classes: 'bg-stone-200 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700',
        icon: 'none'
      }
    case 'unopened':
    default:
      return {
        classes: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50',
        icon: 'none'
      }
  }
})
</script>

<template>
  <div
    class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-sm border transition-colors"
    :class="badgeConfig.classes"
  >
    <svg v-if="badgeConfig.icon === 'warning'" class="w-3 h-3 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
    </svg>

    <svg v-if="badgeConfig.icon === 'error'" class="w-3 h-3 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>

    {{ text }}
  </div>
</template>
