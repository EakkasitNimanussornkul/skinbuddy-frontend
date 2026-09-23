<script setup lang="ts">
const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <Teleport to="body">
    <!-- Styled to match ConfirmDeleteModal: brand surfaces and the semantic-error
         token, rather than raw slate, raw red and two one-off hex blacks
         (#1A1F1C, #111412) that matched nothing else in the app. -->
    <div class="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div class="bg-brand-surface-light dark:bg-brand-surface-dark w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-semantic-error/30 dark:border-semantic-error/20">

        <!-- Warning Header -->
        <div class="bg-semantic-error/5 dark:bg-semantic-error/10 p-6 flex flex-col items-center text-center border-b border-semantic-error/20">
          <div class="w-16 h-16 bg-brand-surface-light dark:bg-brand-bg-dark text-semantic-error rounded-full flex items-center justify-center shadow-sm mb-4 border border-semantic-error/30 dark:border-semantic-error/40">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h2 class="text-xl font-bold text-brand-text dark:text-white">Cancel Quiz?</h2>
        </div>

        <!-- Content -->
        <div class="p-6 text-center">
          <p class="text-sm text-brand-text-muted dark:text-stone-400 leading-relaxed">
            Are you sure you want to exit? Your current progress will be lost and your skin profile will not be updated.
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="p-4 grid grid-cols-2 gap-3 bg-brand-surface-light dark:bg-brand-surface-dark border-t border-brand-surface-border dark:border-stone-800">
          <button
            @click="emit('cancel')"
            class="py-3 rounded-xl font-bold text-brand-text dark:text-stone-300 bg-brand-bg-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700 hover:bg-brand-surface-border/50 dark:hover:bg-stone-700 transition-colors"
          >
            No
          </button>
          <button
            @click="emit('confirm')"
            class="py-3 rounded-xl font-bold text-white bg-semantic-error hover:bg-semantic-error/90 shadow-md shadow-semantic-error/20 transition-all active:scale-[0.98]"
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
