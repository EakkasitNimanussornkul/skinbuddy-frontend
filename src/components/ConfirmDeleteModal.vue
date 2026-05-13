<script setup lang="ts">
defineProps<{
  itemName: string
}>()

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
    <div class="bg-white dark:bg-clinical-surface w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-red-100 dark:border-red-900/30">

      <div class="bg-red-50 dark:bg-red-900/10 p-6 flex flex-col items-center text-center border-b border-red-100 dark:border-red-900/30">
        <div class="w-16 h-16 bg-white dark:bg-slate-800 text-red-500 rounded-full flex items-center justify-center text-3xl shadow-sm mb-4 border border-red-100 dark:border-red-900/50">
          🗑️
        </div>
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">Remove Product?</h2>
      </div>

      <div class="p-6 text-center">
        <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Are you sure you want to remove <br>
          <strong class="text-slate-900 dark:text-white text-base mt-1 block">{{ itemName }}</strong>
          from your shelf?
        </p>
        <p class="text-xs text-red-500 mt-3 font-semibold">This action cannot be undone.</p>
      </div>

      <div class="p-4 grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
        <button
          @click="emit('cancel')"
          class="py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          @click="emit('confirm')"
          class="py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20 transition-all active:scale-[0.98]"
        >
          Yes, Remove
        </button>
      </div>

    </div>
  </div>
</template>
