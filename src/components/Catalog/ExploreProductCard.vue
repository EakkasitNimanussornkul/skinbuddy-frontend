<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  product: any
}>()

const emit = defineEmits(['inspect'])

// Semantic match info using your color palette
const matchInfo = computed(() => {
  const score = props.product?.skin_match_score
  if (score === null || score === undefined) {
    return {
      label: 'Score Unavailable',
      class: 'bg-stone-100 text-brand-text-muted dark:bg-stone-800 dark:text-stone-400 border-brand-surface-border dark:border-stone-700'
    }
  }
  if (score >= 85) return {
    label: `${Math.round(score)}% Match`,
    class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
  }
  if (score >= 60) return {
    label: `${Math.round(score)}% Match`,
    class: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'
  }
  return {
    label: `${Math.round(score)}% Caution`,
    class: 'bg-semantic-error/5 text-semantic-error dark:bg-semantic-error/10 border-semantic-error/20'
  }
})

// Build dynamic overview summary fallback string from components
const ingredientsSummary = computed(() => {
  if (!props.product.product_ingredients?.length) return 'Active formula composition.'
  const list = props.product.product_ingredients
    .map((pi: any) => pi.ingredients?.name)
    .filter(Boolean)
    .slice(0, 3)
  return `Formulated with ${list.join(', ')}${props.product.product_ingredients.length > 3 ? ', and more' : ''}.`
})
</script>

<template>
  <li class="list-none w-full">
    <!-- Clickable base framework triggering main detail inspection modal -->
    <div
      @click="emit('inspect', product)"
      class="w-full bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2rem] border border-brand-surface-border dark:border-stone-800 shadow-sm flex flex-col sm:flex-row gap-5 p-5 hover:-translate-y-1 hover:shadow-lg hover:border-brand-primary/40 transition-all duration-300 text-left group cursor-pointer relative"
    >

      <!-- Left Box: Large Scaled Premium Asset Frame -->
      <div class="w-full sm:w-44 md:w-48 aspect-[4/3] sm:aspect-square bg-brand-bg-light dark:bg-stone-900 rounded-2xl border border-brand-surface-border/60 dark:border-stone-800 flex items-center justify-center p-4 flex-shrink-0 group-hover:scale-[1.02] transition-transform overflow-hidden relative">
        <div class="absolute inset-0 bg-brand-primary/0 group-hover:bg-brand-primary/5 transition-colors pointer-events-none" />
        <img v-if="product.image_url" :src="product.image_url" class="max-w-full max-h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
        <svg v-else class="w-12 h-12 text-brand-text-muted/40 stroke-[1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>

      <!-- Right Box: Rich Dynamic Specifications Engine Context Columns -->
      <div class="flex-1 flex flex-col justify-between min-w-0 py-1 space-y-3">

        <!-- Row 1: Brand Identifier & Product Name -->
        <div class="flex items-start justify-between gap-4 w-full">
          <div class="min-w-0">
            <span class="text-[10px] font-bold text-brand-text-muted dark:text-stone-400 uppercase tracking-widest block truncate">
              {{ product.brand || 'Curated Formulation' }}
            </span>
            <h3 class="text-base font-serif font-bold text-brand-text dark:text-white leading-snug mt-0.5 group-hover:text-brand-primary transition-colors line-clamp-2">
              {{ product.name }}
            </h3>
          </div>
        </div>

        <!-- Row 2: Metadata Core Identifiers Matrix Row -->
        <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs font-semibold text-brand-text-muted">
          <span class="px-2.5 py-0.5 rounded-md bg-brand-bg-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800 font-medium text-[11px]">
            {{ product.category || 'Active Formula' }}
          </span>
          <div v-if="product.price_thb || product.price_usd" class="flex items-center gap-1 font-mono font-bold text-brand-text dark:text-stone-200">
            <span v-if="product.price_thb" class="text-brand-primary">฿{{ product.price_thb }}</span>
            <span v-if="product.price_thb && product.price_usd" class="text-brand-surface-border dark:text-stone-700 font-normal">/</span>
            <span v-if="product.price_usd" class="opacity-70">${{ product.price_usd }}</span>
          </div>
          <div v-else class="font-mono font-bold text-brand-text-muted opacity-70">
            Price unavailable
          </div>
        </div>

        <!-- Row 3: Live Bio-Compatibility Summary Blurbs Description -->
        <p class="text-xs text-brand-text-muted dark:text-stone-400 font-medium line-clamp-2 leading-relaxed flex-1">
          {{ product.description || ingredientsSummary }}
        </p>

        <!-- Row 4: Match Pill Footer Layer Badge anchor -->
        <div class="pt-1 flex items-center justify-between w-full">
          <span :class="['text-[10px] font-black px-2.5 py-0.5 rounded-full border font-mono tracking-wide shadow-2xs', matchInfo.class]">
            {{ matchInfo.label }}
          </span>
        </div>

      </div>

    </div>
  </li>
</template>
