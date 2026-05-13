<script setup lang="ts">
import { useToast } from '../composables/useToast'

// Grab the global reactive array from our composable
const { toasts, removeToast } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-3 pointer-events-none w-full px-4 max-w-sm">

      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          @click="removeToast(toast.id)"
          class="pointer-events-auto w-full px-5 py-3.5 rounded-2xl shadow-xl shadow-slate-900/10 font-bold text-sm flex items-center gap-3 cursor-pointer border backdrop-blur-md"
          :class="{
            'bg-emerald-50/95 border-emerald-200 text-emerald-700 dark:bg-emerald-900/80 dark:border-emerald-800 dark:text-emerald-300': toast.type === 'success',
            'bg-red-50/95 border-red-200 text-red-700 dark:bg-red-900/80 dark:border-red-800 dark:text-red-300': toast.type === 'error',
            'bg-blue-50/95 border-blue-200 text-[#2E5BFF] dark:bg-blue-900/80 dark:border-blue-800 dark:text-blue-300': toast.type === 'info'
          }"
        >
          <span class="text-xl" v-if="toast.type === 'success'">✅</span>
          <span class="text-xl" v-else-if="toast.type === 'error'">🚨</span>
          <span class="text-xl" v-else>ℹ️</span>

          <span class="flex-grow">{{ toast.message }}</span>
        </div>
      </TransitionGroup>

    </div>
  </Teleport>
</template>

<style scoped>
/* The magic animations for sliding in and out */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}
</style>
