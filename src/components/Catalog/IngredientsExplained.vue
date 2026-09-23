<script setup lang="ts">
import { useId } from 'vue'
import { useStepList } from '../../composables/useStepList'
import ShowMoreControl from '../Shared/ShowMoreControl.vue'

const props = defineProps<{
  ingredientsList: any[]
}>()

// Five, then four more at a time. This used to jump from five straight to the
// whole list, which on a 30-ingredient formula was several screens of
// explanations for one click.
const explanations = useStepList(() => props.ingredientsList, { initial: 5, step: 4 })
const listId = useId()

// Dynamic Theme Mapper based on the Database Awareness Tier
const getThemeClasses = (tier?: string) => {
  const t = (tier || '').toLowerCase()
  if (t === 'low') {
    return {
      border: 'border-emerald-500 dark:border-emerald-400',
      dot: 'bg-emerald-500 dark:bg-emerald-400',
      text: 'text-emerald-600 dark:text-emerald-400'
    }
  }
  if (t === 'high') {
    return {
      border: 'border-rose-500 dark:border-rose-400',
      dot: 'bg-rose-500 dark:bg-rose-400',
      text: 'text-rose-600 dark:text-rose-400'
    }
  }
  // Default / Medium Tier maps to Neutral Stone
  return {
    border: 'border-stone-300 dark:border-stone-600',
    dot: 'bg-stone-300 dark:bg-stone-600',
    text: 'text-stone-500 dark:text-stone-400'
  }
}
</script>

<template>
  <div class="space-y-6 pt-8 border-t border-stone-200 dark:border-stone-800">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-serif font-bold text-brand-text dark:text-white">Ingredients Explained</h3>
      <span class="text-xs font-bold text-stone-400 font-mono bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-lg">
        {{ ingredientsList.length }} Total
      </span>
    </div>

    <div :id="listId" class="space-y-6 transition-all duration-300">
      <div
        v-for="(ing, idx) in explanations.visible.value"
        :key="idx"
        class="pl-5 border-l-4 space-y-2 animate-fade-in transition-colors duration-300"
        :class="getThemeClasses(ing.awareness_tier).border"
      >
        <div class="flex items-center gap-2">
          <span
            class="w-3 h-3 rounded-full shadow-sm transition-colors duration-300"
            :class="getThemeClasses(ing.awareness_tier).dot"
          ></span>
          <h4 class="text-base font-bold text-brand-text dark:text-white">{{ ing.name }}</h4>
        </div>

        <span
          class="text-[11px] font-mono font-bold uppercase block transition-colors duration-300"
          :class="getThemeClasses(ing.awareness_tier).text"
        >
          {{ ing.functional_group || 'Formulation Base' }}
        </span>

        <p class="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed max-w-3xl font-medium">
          {{ ing.benefits || 'Supports the overall formula by balancing pH, binding ingredients, or maintaining shelf life.' }}
        </p>
      </div>
    </div>

    <ShowMoreControl
      :next-count="explanations.nextCount.value"
      :remaining="explanations.remaining.value"
      :can-show-more="explanations.canShowMore.value"
      :can-show-less="explanations.canShowLess.value"
      noun="explanations"
      :controls="listId"
      @more="explanations.showMore"
      @less="explanations.showLess"
    />
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>
