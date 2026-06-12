<script setup lang="ts">
defineProps<{
  ingredients: Array<{
    ingredients: {
      id: string
      name: string
      benefits: string | null
    }
  }>
}>()
</script>

<template>
  <div v-if="ingredients?.length" class="mb-8">
    <h3 class="text-sm font-bold text-brand-text dark:text-stone-200 mb-4 flex items-center gap-2">
      <svg class="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
      </svg>
      Key Actives
    </h3>

    <!-- Responsive Grid: 1 column on mobile, 2 columns on larger screens -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div
        v-for="pi in ingredients"
        :key="pi.ingredients.id"
        class="bg-stone-50 dark:bg-[#1C1917] border border-stone-200 dark:border-stone-800 rounded-2xl p-4 transition-all hover:border-brand-primary/30"
      >
        <span class="block text-[15px] font-bold text-brand-primary dark:text-orange-300 mb-1">
          {{ pi.ingredients.name }}
        </span>
        <span v-if="pi.ingredients.benefits" class="block text-[13px] text-brand-text-muted dark:text-stone-400 leading-relaxed">
          {{ pi.ingredients.benefits }}
        </span>
      </div>
    </div>
  </div>
</template>
