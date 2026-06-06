<script setup lang="ts">
defineProps<{
  warnings: any[]
}>()

const emit = defineEmits(['cancel', 'proceed'])
</script>

<template>
  <div class="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/80 backdrop-blur-sm p-4 animate-fade-in" @click.self="emit('cancel')">
    <div class="bg-white dark:bg-stone-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-red-100 dark:border-red-900/30 animate-slide-up">

      <div class="bg-red-50 dark:bg-red-900/10 p-6 flex flex-col items-center text-center border-b border-red-100 dark:border-red-900/30">
        <div class="w-16 h-16 bg-white dark:bg-stone-800 text-red-500 rounded-full flex items-center justify-center shadow-sm mb-4 border border-red-100 dark:border-red-900/50">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h2 class="text-xl font-bold text-brand-text dark:text-white">Interaction Alert</h2>
        <p class="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">SkinBuddy detected a potential issue.</p>
      </div>

      <div class="p-6 max-h-60 overflow-y-auto space-y-3 hide-scrollbar">
        <div v-for="(warning, index) in warnings" :key="index" class="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-2xl border border-stone-100 dark:border-stone-700">
          <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
            {{ warning.alert_type }}
          </span>
          <p class="text-sm text-stone-700 dark:text-stone-300 mt-2">{{ warning.message }}</p>
        </div>
      </div>

      <div class="p-4 grid grid-cols-2 gap-3 bg-stone-50 dark:bg-stone-800/30 border-t border-stone-100 dark:border-stone-800 flex-shrink-0">
        <button @click="emit('cancel')" class="py-3 rounded-xl font-bold text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors">Cancel</button>
        <button @click="emit('proceed')" class="py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all shadow-md shadow-red-500/20">Proceed Anyway</button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(10%); } to { opacity: 1; transform: translateY(0); } }
</style>
