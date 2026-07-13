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
    // Standardized exclusion check
    return group && group.toLowerCase() !== 'formulation stabilizer' && group.toLowerCase() !== 'solvent'
  })
})

const visibleActives = computed(() => {
  return showAll.value ? keyActives.value : keyActives.value.slice(0, 4)
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-[11px] font-bold text-brand-text dark:text-stone-300 uppercase tracking-widest flex items-center gap-2">
        <svg class="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
        <span>Key Active Formulas</span>
      </h3>
      <span class="text-[10px] font-mono text-brand-text-muted">{{ keyActives.length }} Actives</span>
    </div>

    <!-- Active Cards Grid -->
    <div v-if="visibleActives.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div
        v-for="pi in visibleActives"
        :key="pi.ingredients?.id"
        class="group bg-white dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 rounded-2xl p-4 transition-all hover:border-brand-primary/50 hover:shadow-md dark:hover:border-brand-primary/50"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="block text-sm font-bold text-brand-text dark:text-stone-100 group-hover:text-brand-primary transition-colors">
            {{ pi.ingredients?.name }}
          </span>
          <span class="text-[9px] font-bold bg-brand-primary-light text-brand-primary dark:bg-brand-primary/10 dark:text-brand-primary px-2 py-0.5 rounded-lg uppercase tracking-wider">
            {{ pi.ingredients?.functional_group }}
          </span>
        </div>
        <p class="text-xs text-brand-text-muted dark:text-stone-400 leading-relaxed font-medium">
          {{ pi.ingredients?.benefits }}
        </p>
      </div>
    </div>

    <!-- Expand Button -->
    <button
      v-if="keyActives.length > 4"
      @click="showAll = !showAll"
      class="w-full py-2.5 bg-stone-50 dark:bg-brand-surface-dark hover:bg-stone-100 dark:hover:bg-pink-800 text-brand-text-muted hover:text-brand-text dark:text-stone-400 dark:hover:text-stone-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 border border-stone-200 dark:border-stone-800"
    >
      <span>{{ showAll ? 'Show less actives' : `View all ${keyActives.length} key actives` }}</span>
      <svg :class="['w-3.5 h-3.5 stroke-[2.5] transition-transform', showAll ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
    </button>
  </div>
</template>
