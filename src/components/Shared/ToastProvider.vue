<script setup lang="ts">
import { useToast, type ToastType } from '../../composables/useToast'

const { toasts, removeToast } = useToast()

// Define colors based on the ToastType
const getIconColor = (type: ToastType) => {
  switch (type) {
    case 'success': return 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30'
    case 'error': return 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30'
    case 'warning': return 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30'
    case 'info':
    default: return 'text-brand-primary dark:text-orange-400 bg-brand-primary/10 dark:bg-orange-900/20 border-brand-primary/20 dark:border-orange-900/30'
  }
}
</script>

<template>
  <div class="fixed top-4 sm:top-8 inset-x-0 z-[100] flex flex-col items-center pointer-events-none px-4 gap-3">

    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-start justify-between gap-3 px-4 py-3.5 rounded-2xl shadow-lg border max-w-md w-full bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-stone-200 dark:border-stone-800"
      >
        <div class="flex items-start gap-3 overflow-hidden mt-0.5">

          <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border" :class="getIconColor(toast.type)">

            <svg v-if="toast.type === 'success'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
            </svg>

            <svg v-else-if="toast.type === 'error'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>

            <svg v-else-if="toast.type === 'warning'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>

            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>

          </div>

          <p class="text-sm font-semibold text-brand-text dark:text-stone-200 line-clamp-2 leading-relaxed break-words">
            {{ toast.message }}
          </p>
        </div>

        <button @click="removeToast(toast.id)" class="flex-shrink-0 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors p-1 mt-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

      </div>
    </TransitionGroup>

  </div>
</template>

<style scoped>
/* Vue TransitionGroup Classes */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

/* Ensures smooth movement of other toasts when one is removed */
.toast-move {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
