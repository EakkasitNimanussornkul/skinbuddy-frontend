<script setup lang="ts">
defineProps<{
  title: string
  message: string
  actionLabel?: string
}>()

const emit = defineEmits(['action'])
</script>

<template>
  <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl p-10 text-center border border-stone-200 dark:border-stone-800 shadow-sm max-w-sm w-full flex flex-col items-center mx-auto mt-4">

    <div class="w-20 h-20 bg-stone-50 dark:bg-stone-900 rounded-full flex items-center justify-center mb-6 shadow-inner border border-stone-200 dark:border-stone-800">
      <slot name="icon">
        <svg class="w-10 h-10 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
        </svg>
      </slot>
    </div>

    <h2 class="text-2xl font-serif font-bold mb-2 text-brand-text dark:text-white">{{ title }}</h2>
    <p class="text-sm text-brand-text-muted dark:text-stone-400 mb-6 leading-relaxed">
      {{ message }}
    </p>

    <button
      v-if="actionLabel"
      @click="emit('action')"
      class="px-8 py-3.5 bg-brand-primary text-white font-bold rounded-xl shadow-md hover:bg-pink-800 transition-all w-full active:scale-[0.98]"
    >
      {{ actionLabel }}
    </button>
    <div v-else class="w-12 h-1 bg-stone-200 dark:bg-stone-800 rounded-full"></div>

  </div>
</template>
