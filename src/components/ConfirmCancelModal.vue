<script setup lang="ts">
const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div class="bg-white dark:bg-[#1A1F1C] w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-red-100 dark:border-red-900/30">

        <!-- Warning Header -->
        <div class="bg-red-50 dark:bg-red-900/10 p-6 flex flex-col items-center text-center border-b border-red-100 dark:border-red-900/30">
          <div class="w-16 h-16 bg-white dark:bg-slate-800 text-red-500 rounded-full flex items-center justify-center text-3xl shadow-sm mb-4 border border-red-100 dark:border-red-900/50">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h2 class="text-xl font-bold text-slate-900 dark:text-white">Cancel Quiz?</h2>
        </div>

        <!-- Content -->
        <div class="p-6 text-center">
          <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Are you sure you want to exit? Your current progress will be lost and your skin profile will not be updated.
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="p-4 grid grid-cols-2 gap-3 bg-slate-50 dark:bg-[#111412] border-t border-slate-100 dark:border-slate-800">
          <button
            @click="emit('cancel')"
            class="py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 transition-colors"
          >
            No
          </button>
          <button
            @click="emit('confirm')"
            class="py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20 transition-all active:scale-[0.98]"
          >
            Yes
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
