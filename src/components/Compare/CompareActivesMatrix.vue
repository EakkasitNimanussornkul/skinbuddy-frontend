<script setup lang="ts">
import { computed } from 'vue'
import KeyActivesGrid from '../Shelf/KeyActivesGrid.vue'

const props = defineProps<{ data: any }>()

const cleanProductAActives = computed(() => props.data?.product_a?.product_ingredients || [])
const cleanProductBActives = computed(() => props.data?.product_b?.product_ingredients || [])

const formulaBreakdowns = computed(() => {
  const extractSkinTypeWarnings = (product: any) => {
    if (!product || !product.product_ingredients) return []
    const concernsList: Array<{ title: string; msg: string; severity: string }> = []

    product.product_ingredients.forEach((pi: any) => {
      const ing = pi.ingredients
      if (!ing || !ing.ingredient_concerns) return

      ing.ingredient_concerns.forEach((concern: any) => {
        concernsList.push({
          title: concern.concern_title,
          msg: concern.concern_description || `Contains ${ing.name} which holds profile alerts: ${concern.target_profile}`,
          severity: concern.severity || 'Moderate'
        })
      })
    })

    return concernsList.slice(0, 4)
  }

  return {
    a: { concerns: extractSkinTypeWarnings(props.data?.product_a) },
    b: { concerns: extractSkinTypeWarnings(props.data?.product_b) }
  }
})
</script>

<template>
  <div class="space-y-6 w-full">

    <!-- SECTION 1: Key Active Ingredients Matrix -->
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 p-6 sm:p-8 space-y-4 shadow-xl transition-colors duration-300">
      <div class="text-center font-serif font-bold text-sm text-brand-text-muted dark:text-stone-400 tracking-wider uppercase border-b border-brand-surface-border dark:border-stone-800 pb-3">
        Key Active Ingredients Matrix
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-brand-surface-border dark:divide-stone-800/60 items-start gap-6 md:gap-0">
        <div class="space-y-2 md:pr-6 w-full">
          <div class="text-xs px-2.5 py-1 font-bold tracking-wider text-brand-primary bg-brand-primary/10 rounded-md mb-4 w-max uppercase">
            {{ data.product_a?.brand || 'Formula A' }}
          </div>
          <KeyActivesGrid :ingredients="cleanProductAActives" />
        </div>

        <div class="space-y-2 md:pl-6 pt-6 md:pt-0 w-full">
          <div class="text-xs px-2.5 py-1 font-bold tracking-wider text-brand-primary bg-brand-primary/10 rounded-md mb-4 w-max uppercase">
            {{ data.product_b?.brand || 'Formula B' }}
          </div>
          <KeyActivesGrid :ingredients="cleanProductBActives" />
        </div>
      </div>
    </div>

    <!-- SECTION 2: Contraindications & Concerns Matrix -->
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 p-6 sm:p-8 space-y-4 shadow-xl transition-colors duration-300">
      <div class="text-center font-serif font-bold text-sm text-brand-text-muted dark:text-stone-400 tracking-wider uppercase border-b border-brand-surface-border dark:border-stone-800 pb-3">
        Contraindications & Concerns Matrix
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-brand-surface-border dark:divide-stone-800/60 items-start gap-6 md:gap-0">

        <!-- Left Concerns: Product A -->
        <div class="space-y-3 md:pr-4 w-full">
          <div v-for="(con, i) in formulaBreakdowns.a.concerns" :key="i" class="flex items-start gap-3 bg-semantic-error/5 border border-semantic-error/10 p-3.5 rounded-2xl animate-fade-in">
            <div class="w-7 h-7 rounded-full bg-semantic-error/10 border border-semantic-error/20 flex items-center justify-center text-semantic-error shrink-0 font-mono font-bold text-xs">!</div>
            <div>
              <h5 class="text-xs font-black text-brand-text dark:text-stone-200 uppercase tracking-wide">{{ con.title }}</h5>
              <p class="text-[11px] text-brand-text-muted dark:text-stone-400 mt-0.5 leading-relaxed">{{ con.msg }}</p>
            </div>
          </div>
          <p v-if="!formulaBreakdowns.a.concerns.length" class="text-xs font-medium text-brand-text-muted italic pl-1 py-2">
            No active profile contraindications detected for this formula.
          </p>
        </div>

        <!-- Right Concerns: Product B -->
        <div class="space-y-3 md:pl-6 pt-4 md:pt-0 w-full">
          <div v-for="(con, i) in formulaBreakdowns.b.concerns" :key="i" class="flex items-start gap-3 bg-semantic-error/5 border border-semantic-error/10 p-3.5 rounded-2xl animate-fade-in">
            <div class="w-7 h-7 rounded-full bg-semantic-error/10 border border-semantic-error/20 flex items-center justify-center text-semantic-error shrink-0 font-mono font-bold text-xs">!</div>
            <div>
              <h5 class="text-xs font-black text-brand-text dark:text-stone-200 uppercase tracking-wide">{{ con.title }}</h5>
              <p class="text-[11px] text-brand-text-muted dark:text-stone-400 mt-0.5 leading-relaxed">{{ con.msg }}</p>
            </div>
          </div>
          <p v-if="!formulaBreakdowns.b.concerns.length" class="text-xs font-medium text-brand-text-muted italic pl-1 py-2">
            No active profile contraindications detected for this formula.
          </p>
        </div>

      </div>
    </div>

  </div>
</template>
