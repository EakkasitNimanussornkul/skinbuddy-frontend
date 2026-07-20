<script setup lang="ts">
defineProps<{
  title: string
  message: string
  actionLabel?: string
}>()

const emit = defineEmits(['action'])
</script>

<template>
  <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl p-10 text-center border border-brand-surface-border dark:border-stone-800 shadow-sm max-w-sm w-full flex flex-col items-center mx-auto mt-4 animate-fade-in">

    <div class="w-20 h-20 bg-brand-bg-light dark:bg-stone-900 rounded-full flex items-center justify-center mb-6 shadow-inner border border-brand-surface-border dark:border-stone-800 text-brand-text-muted">
      <slot name="icon">
        <svg class="w-10 h-10 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
        </svg>
      </slot>
    </div>

    <h2 class="text-2xl font-serif font-bold mb-2 text-brand-text dark:text-white">{{ title }}</h2>
    <p class="text-sm text-brand-text-muted leading-relaxed mb-6">
      {{ message }}
    </p>

    <button
      v-if="actionLabel"
      @click="emit('action')"
      class="px-8 py-3.5 bg-brand-primary text-white font-bold rounded-xl shadow-md hover:bg-brand-primary-hover transition-all w-full active:scale-[0.98] cursor-pointer"
    >
      {{ actionLabel }}
    </button>
    <div v-else class="w-12 h-1 bg-brand-surface-border dark:bg-stone-800 rounded-full"></div>

  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
</style>
