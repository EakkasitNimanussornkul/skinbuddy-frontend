<script setup lang="ts">
import { computed } from 'vue'
import { describeMatchDisplay } from './matchBadge'
import { MATCH_SCORE_BASIS } from '../../api/products'

const props = defineProps<{
  product: any
}>()

const emit = defineEmits(['inspect'])

// The skin match badge. Thresholds are resolveMatchBand's (FE-DEF-12), and the
// look is shared with the recommendation cards on the same page.
//
// A score resting on fewer than three ingredients reads "Not enough info"
// rather than a percentage (owner decision: a 100% built on one ingredient is
// not trustworthy, flagged or not). The real figure stays one hover away, and
// the product page offers it in full.
const matchInfo = computed(() => describeMatchDisplay(props.product?.skin_match_score, props.product?.match_breakdown))

const badgeTitle = computed(() => {
  if (matchInfo.value.kind === 'limited') return `Not enough info to judge a match: ${matchInfo.value.hiddenLabel}.`
  if (matchInfo.value.kind === 'scored') return MATCH_SCORE_BASIS
  return undefined
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

      <!-- Skin match badge, top right of the card. It was a 10px pill in the
           card's footer, easy to miss (owner feedback); it is the one figure on
           the card that is about the viewer rather than the product. On narrow
           screens it sits over the image's corner. -->
      <div class="absolute top-4 right-4 z-10 flex flex-col items-end gap-1">
        <span
          :title="badgeTitle"
          :class="[
            'match-badge inline-flex items-center gap-1.5 font-black rounded-full border font-mono tracking-wide shadow-sm backdrop-blur-sm',
            // A score nobody computed (a guest, or no skin type) stays small: it
            // is a note, not a result to draw the eye to.
            matchInfo.kind === 'unavailable' ? 'text-[10px] px-2.5 py-1' : 'text-xs sm:text-sm px-3 py-1.5',
            matchInfo.class,
          ]"
        >
          <svg v-if="matchInfo.kind === 'scored'" class="w-3.5 h-3.5 stroke-[2.5] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else-if="matchInfo.kind === 'limited'" class="w-3.5 h-3.5 stroke-[2.5] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ matchInfo.label }}
        </span>
        <!-- What the percentage is built on, beside it (owner request). -->
        <span
          v-if="matchInfo.kind === 'scored' && matchInfo.fraction"
          class="match-fraction text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-surface-light/90 dark:bg-stone-900/90 border border-brand-surface-border dark:border-stone-700 text-brand-text-muted shadow-sm backdrop-blur-sm"
        >
          {{ matchInfo.fraction }}
        </span>
      </div>

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

        <!-- Row 1: Brand Identifier & Product Name. Padded on the right from sm
             up, where the match badge sits above this row, so a long name wraps
             before it reaches the badge. -->
        <div class="flex items-start justify-between gap-4 w-full sm:pr-32">
          <div class="min-w-0">
            <span class="text-[11px] font-bold text-brand-text-muted dark:text-stone-400 uppercase tracking-widest block truncate">
              {{ product.brand || 'Curated Formulation' }}
            </span>
            <h3 class="text-lg font-serif font-bold text-brand-text dark:text-white leading-snug mt-0.5 group-hover:text-brand-primary transition-colors line-clamp-2">
              {{ product.name }}
            </h3>
          </div>
        </div>

        <!-- Row 2: category and price. Enlarged on owner feedback, with the
             description below, to fill a card that read as mostly blank beside
             its image. -->
        <div class="card-tags flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold text-brand-text-muted">
          <span class="px-3 py-1 rounded-lg bg-brand-bg-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800 font-semibold text-xs sm:text-[13px] text-brand-text dark:text-stone-200">
            {{ product.category || 'Active Formula' }}
          </span>
          <div v-if="product.price_thb || product.price_usd" class="flex items-center gap-1.5 font-mono font-bold text-sm sm:text-base text-brand-text dark:text-stone-200">
            <span v-if="product.price_thb" class="text-brand-primary">฿{{ product.price_thb }}</span>
            <span v-if="product.price_thb && product.price_usd" class="text-brand-surface-border dark:text-stone-700 font-normal">/</span>
            <span v-if="product.price_usd" class="opacity-70">${{ product.price_usd }}</span>
          </div>
          <div v-else class="font-mono font-bold text-brand-text-muted opacity-70">
            Price unavailable
          </div>
        </div>

        <!-- Row 3: description, or the leading ingredients when there is none -->
        <p class="card-description text-sm text-brand-text-muted dark:text-stone-400 font-medium line-clamp-3 leading-relaxed flex-1">
          {{ product.description || ingredientsSummary }}
        </p>
      </div>

    </div>
  </li>
</template>
