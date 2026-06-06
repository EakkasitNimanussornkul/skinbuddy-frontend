<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: 'routine' | 'warning' | 'error' | 'unopened' | 'archived'
  text: string
}>()

const badgeConfig = computed(() => {
  switch (props.type) {
    case 'warning':
      return {
        classes: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900/50',
        showWarningIcon: true,
        showErrorIcon: false
      }
    case 'error': // Used for Expired and Conflicts
      return {
        classes: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30',
        showWarningIcon: false,
        showErrorIcon: true
      }
    case 'routine':
      return {
        classes: 'bg-stone-800 text-stone-200 border-stone-700/50 dark:bg-stone-200 dark:text-stone-900 dark:border-stone-300',
        showWarningIcon: false,
        showErrorIcon: false
      }
    case 'archived':
      return {
        classes: 'bg-stone-100 text-stone-400 border-stone-200 dark:bg-stone-800/50 dark:text-stone-500 dark:border-stone-700',
        showWarningIcon: false,
        showErrorIcon: false
      }
    case 'unopened':
    default:
      return {
        classes: 'bg-white text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700',
        showWarningIcon: false,
        showErrorIcon: false
      }
  }
})
</script>

<template>
  <div
    class="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest shadow-sm backdrop-blur-md border"
    :class="badgeConfig.classes"
  >
    <svg v-if="badgeConfig.showWarningIcon" class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
    </svg>

    <svg v-if="badgeConfig.showErrorIcon" class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>

    {{ text }}
  </div>
</template>
