<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  ingredients?: Array<{
    ingredients: {
      id: string
      name: string
      benefits: string | null
      functional_group: string | null
    }
  }>
}>()

const showAll = ref(false)

const keyActives = computed(() => {
  if (!props.ingredients) return []
  return props.ingredients.filter(item => {
    const group = item.ingredients?.functional_group
    if (!group) return false
    const normalized = group.toLowerCase().trim()
    return normalized !== 'formulation stabilizer' && normalized !== 'solvent' && normalized !== 'vehicle'
  })
})

const visibleActives = computed(() => {
  return showAll.value ? keyActives.value : keyActives.value.slice(0, 4)
})
</script>

<template>
  <div class="space-y-4 w-full">
    <!-- Component Section Label Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-[11px] font-bold text-brand-text dark:text-stone-300 uppercase tracking-widest flex items-center gap-2">
        <svg class="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
        </svg>
        <span>Key Active Formulas</span>
      </h3>
      <span class="text-[10px] font-mono font-bold text-brand-primary dark:text-brand-primary-accent bg-brand-primary/10 px-2 py-0.5 rounded-md border border-brand-primary/20">
        {{ keyActives.length }} Actives
      </span>
    </div>

    <!-- 🌟 FIXED: Swapped grid-cols-2 to grid-cols-1 for vertical list consistency across both views -->
    <div v-if="visibleActives.length > 0" class="grid grid-cols-1 gap-3 w-full">
      <div
        v-for="pi in visibleActives"
        :key="pi.ingredients?.id"
        class="group bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 rounded-2xl p-4 transition-all hover:border-brand-primary/40 dark:hover:border-brand-primary/40 hover:shadow-md"
      >
        <div class="flex items-start justify-between gap-4 mb-2">
          <span class="block text-sm font-bold text-brand-text dark:text-stone-100 group-hover:text-brand-primary dark:group-hover:text-brand-primary-accent transition-colors leading-tight truncate">
            {{ pi.ingredients?.name }}
          </span>
          <span class="text-[9px] font-black bg-brand-primary-light text-brand-primary dark:bg-brand-primary/10 dark:text-brand-primary-accent px-2 py-0.5 rounded-lg uppercase tracking-wider shrink-0 border border-brand-primary/10 max-w-[150px] truncate">
            {{ pi.ingredients?.functional_group || 'Active' }}
          </span>
        </div>
        <p class="text-xs text-brand-text-muted dark:text-stone-400 leading-relaxed font-medium">
          {{ pi.ingredients?.benefits || 'No target physiological benefit descriptions logged for this active component compound.' }}
        </p>
      </div>
    </div>

    <!-- Fallback Empty State Indicator -->
    <div v-else class="text-center py-6 border border-dashed border-brand-surface-border dark:border-stone-800 rounded-2xl text-xs font-semibold text-brand-text-muted">
      No therapeutic chemical groups found inside this product classification layer.
    </div>

    <!-- Adaptive Expand / Collapse Button -->
    <button
      v-if="keyActives.length > 4"
      @click="showAll = !showAll"
      class="w-full py-2.5 bg-brand-bg-light dark:bg-stone-800 hover:bg-brand-surface-border dark:hover:bg-stone-700 text-brand-text-muted dark:text-stone-300 hover:text-brand-text dark:hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 border border-brand-surface-border dark:border-stone-700 cursor-pointer focus:outline-none"
    >
      <span>{{ showAll ? 'Show less actives' : `View all ${keyActives.length} key actives` }}</span>
      <svg :class="['w-3.5 h-3.5 stroke-[2.5] transition-transform duration-300', showAll ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  </div>
</template>
