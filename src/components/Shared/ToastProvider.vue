<script setup lang="ts">
import { useToast, type ToastType } from '../../composables/useToast'

const { toasts, removeToast } = useToast()

// Theme-compliant colors using your custom CSS variables
const getIconColor = (type: ToastType) => {
  switch (type) {
    case 'success':
      return 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20'
    case 'error':
      return 'text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20'
    case 'warning':
      return 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20'
    case 'info':
    default:
      // Fully respects your brand-primary variable in both light and dark modes
      return 'text-brand-primary bg-brand-primary-light border-brand-primary/20 dark:bg-brand-primary/10 dark:border-brand-primary/30'
  }
}
</script>

<template>
  <div class="fixed top-4 sm:top-8 inset-x-0 z-[100] flex flex-col items-center pointer-events-none px-4 gap-3">

    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-start justify-between gap-3 px-4 py-3.5 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/40 border w-full max-w-[calc(100vw-2rem)] sm:max-w-md bg-white/95 dark:bg-brand-surface-dark/95 backdrop-blur-md border-stone-200 dark:border-stone-800 transition-all"
      >
        <div class="flex items-start gap-3 overflow-hidden mt-0.5">

          <!-- Dynamic Icon Container -->
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

          <!-- Toast Message -->
          <p class="text-sm font-semibold text-brand-text dark:text-stone-100 line-clamp-3 leading-relaxed break-words pr-2">
            {{ toast.message }}
          </p>
        </div>

        <!-- Close Button -->
        <button
          @click="removeToast(toast.id)"
          class="flex-shrink-0 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors p-1.5 -mr-1 -mt-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          aria-label="Close notification"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

      </div>
    </TransitionGroup>

  </div>
</template>

<style scoped>
/* Improved Vue TransitionGroup Curve */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.1); /* Slight spring effect */
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-24px) scale(0.92);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.95);
}

.toast-move {
  transition: transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1);
}
</style>
