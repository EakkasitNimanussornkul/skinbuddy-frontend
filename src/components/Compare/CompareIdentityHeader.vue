<script setup lang="ts">
import { computed } from 'vue'
import {
  MATCH_SCORE_BASIS,
  countProductIngredients,
  describeMatchAvailability,
  resolveComparisonSimilarity,
  resolveMatchAvailability,
  type CompareResponse,
} from '../../api/products'
import { describeMatchDisplay } from '../Catalog/matchBadge'
import { useAuthStore } from '../../stores/auth'

const props = defineProps<{ data: CompareResponse }>()

const authStore = useAuthStore()

// Badge styles per match band. Thresholds come from resolveMatchBand rather
// than being repeated here - three components render this score and each used
// to carry its own copy (FE-DEF-12).
// The palette is the Explore card's, so one score looks the same on every
// screen - this copy had amber for 60-84 after the owner moved it to teal.
//
// A score resting on fewer than three relevant ingredients reads "Not enough
// info" in the neutral palette, as on the Explore card and the product page
// (owner decision); the real figure is in the badge's hover text.
type MatchSource = { skin_match_score?: number | null; match_breakdown?: unknown } | null | undefined
const matchDisplay = (product: MatchSource) => describeMatchDisplay(product?.skin_match_score, product?.match_breakdown)
const getMatchBadgeStyles = (product: MatchSource) => matchDisplay(product).class

const matchBadgeTitle = (product: MatchSource) => {
  const display = matchDisplay(product)
  return display.kind === 'limited' ? `Not enough info to judge a match: ${display.hiddenLabel}.` : undefined
}

// FE-DEF-31: this read "Failed to calculate score" for every product without
// one. The backend returns null whenever it has no skin type to score against,
// which is the ordinary state for a signed-out visitor - and this is the one of
// the three screens rendering this field with no signed-out branch ahead of it,
// so an anonymous comparison reported two failures for a request that succeeded.
// The viewer's own session says which it is; the response never had to.
const matchAvailability = (score: number | null | undefined) =>
  resolveMatchAvailability(score, authStore.isAuthenticated, authStore.user?.skin_type)

const formatMatchScore = (product: any) => {
  const availability = matchAvailability(product?.skin_match_score)
  if (availability === 'scored' && matchDisplay(product).kind === 'limited') return matchDisplay(product).label
  if (availability === 'scored') return `${Math.round(product.skin_match_score)}% Match`
  if (availability === 'signed-out') return 'Sign in to score'
  if (availability === 'no-profile') return 'Take the skin quiz'
  return 'Not scored'
}

// The sentence naming the one asymmetry this line can encounter. Kept out of
// describeMatchAvailability because that helper answers about a single product
// and this is a statement about the pair.
const ONE_NOT_SCORED = 'One of these formulas could not be scored against your profile.'

/**
 * One line beneath the pair rather than one per product.
 *
 * The reason a score is missing is usually the viewer's profile rather than the
 * product, and 'signed-out' and 'no-profile' are properties of the session - so
 * whenever either applies it applies to both columns, and one sentence is
 * correct for both. That was the whole of the original reasoning, and it read
 * `product_a` alone on the strength of it.
 *
 * It is one case short. 'scored' and 'not-scored' are properties of the
 * individual product, so a pair can genuinely split between them, and reading
 * either column alone then describes the other one wrongly: with A scored and B
 * not, the line explained how to read a score B has not got; with the two
 * reversed, it announced a scoring failure directly above B's own percentage.
 * The unscored side had nothing on the page accounting for its empty badge.
 *
 * Both columns are read now, and the split is named rather than averaged - the
 * badges say which side it was.
 */
const matchExplanation = computed(() => {
  const a = matchAvailability(props.data?.product_a?.skin_match_score)
  const b = matchAvailability(props.data?.product_b?.skin_match_score)

  if (a === b) return a === 'scored' ? MATCH_SCORE_BASIS : describeMatchAvailability(a)

  // The only reachable disagreement, per the session argument above. The basis
  // still leads, because a score the viewer can read is on screen.
  return `${MATCH_SCORE_BASIS} ${ONE_NOT_SCORED}`
})

// The share of the two full ingredient lists that appears in both - a Jaccard
// index over ingredient ids, computed and rounded by the backend, so it is
// rendered rather than recomputed. Resolved through the shared helper because
// the ingredients matrix shows the same figure, and this is exactly the shape
// that produced FE-DEF-12: one number, several screens, a private copy each.
const similarity = computed(() => resolveComparisonSimilarity(props.data))

const SIMILARITY_STYLES: Record<string, string> = {
  high: 'bg-brand-primary/10 text-brand-primary dark:text-brand-primary-accent border-brand-primary/20',
  moderate: 'bg-semantic-warning/10 text-semantic-warning border-semantic-warning/20',
  low: 'bg-stone-100 dark:bg-stone-800 text-brand-text-muted border-brand-surface-border dark:border-stone-700',
  unavailable: 'bg-stone-100 dark:bg-stone-800 text-brand-text-muted border-brand-surface-border dark:border-stone-700',
}

// 🌟 Added missing helper to prevent ReferenceError
const getProductDescription = (product: any) => {
  if (!product) return 'No description available.'
  if (product.description && product.description.trim().length > 0) {
    return product.description
  }

  const ingredients = product.product_ingredients || []
  if (ingredients.length > 0) {
    const list = ingredients
      .map((pi: any) => pi.ingredients?.name)
      .filter(Boolean)
      .slice(0, 4)
    if (list.length > 0) {
      return `Targeted formulation featuring ${list.join(', ')}${ingredients.length > 4 ? ', and key barrier support actives' : ''}.`
    }
  }

  return 'Active daily skincare formulation.'
}
</script>

<template>
  <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 shadow-xl overflow-hidden">
    <!-- Visual Image Grid Row Block Split layout -->
    <div class="grid grid-cols-2 relative divide-x divide-brand-surface-border dark:divide-stone-800/60 text-center items-stretch border-b border-brand-surface-border dark:border-stone-800/60">
      <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-brand-bg-light dark:bg-stone-900 text-brand-text dark:text-stone-200 font-serif font-bold text-xs px-5 py-2 rounded-full border border-brand-surface-border dark:border-stone-800 shadow-md uppercase tracking-wider select-none">
        Versus
      </div>

      <!-- Product A -->
      <div class="p-6 sm:p-10 flex flex-col items-center justify-between space-y-4">
        <div class="w-40 h-44 sm:w-48 sm:h-52 p-4 bg-brand-bg-light/50 dark:bg-stone-900/40 rounded-3xl border border-brand-surface-border dark:border-stone-800/50 flex items-center justify-center mix-blend-multiply dark:mix-blend-normal">
          <img v-if="data.product_a?.image_url" :src="data.product_a.image_url" class="max-h-full object-contain" />
        </div>
        <div>
          <span class="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{{ data.product_a?.brand }}</span>
          <h3 class="text-base sm:text-xl font-serif font-bold text-brand-text dark:text-white mt-1 leading-tight">{{ data.product_a?.name }}</h3>
        </div>
      </div>

      <!-- Product B -->
      <div class="p-6 sm:p-10 flex flex-col items-center justify-between space-y-4">
        <div class="w-40 h-44 sm:w-48 sm:h-52 p-4 bg-brand-bg-light/50 dark:bg-stone-900/40 rounded-3xl border border-brand-surface-border dark:border-stone-800/50 flex items-center justify-center mix-blend-multiply dark:mix-blend-normal">
          <img v-if="data.product_b?.image_url" :src="data.product_b.image_url" class="max-h-full object-contain" />
        </div>
        <div>
          <span class="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{{ data.product_b?.brand }}</span>
          <h3 class="text-base sm:text-xl font-serif font-bold text-brand-text dark:text-white mt-1 leading-tight">{{ data.product_b?.name }}</h3>
        </div>
      </div>
    </div>

    <!-- Specifications Table Grid -->
    <div class="divide-y divide-brand-surface-border dark:divide-stone-800/60 text-center font-medium text-xs sm:text-sm">
      <!-- Description Section -->
      <div class="grid grid-cols-2 divide-x divide-brand-surface-border dark:divide-stone-800/60 bg-brand-bg-light/30 dark:bg-stone-900/10">
        <div class="p-4 sm:p-6 text-brand-text-muted dark:text-stone-400 leading-relaxed px-4 sm:px-8 text-xs font-medium">
          {{ getProductDescription(data.product_a) }}
        </div>
        <div class="p-4 sm:p-6 text-brand-text-muted dark:text-stone-400 leading-relaxed px-4 sm:px-8 text-xs font-medium">
          {{ getProductDescription(data.product_b) }}
        </div>
      </div>

      <!-- Match Score Matrix Layer -->
      <div class="bg-white dark:bg-brand-surface-dark">
        <div class="grid grid-cols-2 divide-x divide-brand-surface-border dark:divide-stone-800/60 py-4.5">
          <div class="flex flex-col justify-center items-center gap-1 px-2">
            <span
              :title="matchBadgeTitle(data.product_a)"
              :class="['text-xs font-black px-4 py-1.5 rounded-full border font-mono tracking-wide shadow-2xs text-center', getMatchBadgeStyles(data.product_a)]"
            >
              {{ formatMatchScore(data.product_a) }}
            </span>
            <!-- What the percentage is built on (owner request). -->
            <span v-if="matchDisplay(data.product_a).kind === 'scored' && matchDisplay(data.product_a).fraction" class="match-fraction text-[10px] font-bold text-brand-text-muted">
              {{ matchDisplay(data.product_a).fraction }}
            </span>
          </div>
          <div class="flex flex-col justify-center items-center gap-1 px-2">
            <span
              :title="matchBadgeTitle(data.product_b)"
              :class="['text-xs font-black px-4 py-1.5 rounded-full border font-mono tracking-wide shadow-2xs text-center', getMatchBadgeStyles(data.product_b)]"
            >
              {{ formatMatchScore(data.product_b) }}
            </span>
            <!-- What the percentage is built on (owner request). -->
            <span v-if="matchDisplay(data.product_b).kind === 'scored' && matchDisplay(data.product_b).fraction" class="match-fraction text-[10px] font-bold text-brand-text-muted">
              {{ matchDisplay(data.product_b).fraction }}
            </span>
          </div>
        </div>

        <!-- What the two badges above are a score of. Spans the pair rather than
             sitting in either column: the figure is personal to the viewer, so
             the sentence is the same on both sides. -->
        <div class="px-5 sm:px-8 pb-5 -mt-1">
          <p class="text-[11px] leading-relaxed text-brand-text-muted dark:text-stone-400 font-medium max-w-xl mx-auto">
            <span class="font-bold uppercase tracking-widest text-brand-text dark:text-stone-300">Skin Match</span>
            &mdash; {{ matchExplanation }}
          </p>
        </div>
      </div>

      <!-- Category Chips -->
      <div class="grid grid-cols-2 divide-x divide-brand-surface-border dark:divide-stone-800/60 py-4 bg-brand-bg-light/10 dark:bg-stone-900/10 text-brand-text dark:text-stone-300 font-bold uppercase tracking-wider text-[11px]">
        <div>{{ data.product_a?.category || 'General Skincare' }}</div>
        <div>{{ data.product_b?.category || 'General Skincare' }}</div>
      </div>

      <!-- Ingredient Counts -->
      <div class="grid grid-cols-2 divide-x divide-brand-surface-border dark:divide-stone-800/60 py-4 text-xs font-bold text-brand-text-muted dark:text-stone-400">
        <div><span class="font-mono text-brand-primary text-sm font-black">{{ countProductIngredients(data.product_a) }}</span> ingredients</div>
        <div><span class="font-mono text-brand-primary text-sm font-black">{{ countProductIngredients(data.product_b) }}</span> ingredients</div>
      </div>

      <!-- Ingredient Overlap. A property of the pair, not of either column, so
           it spans both and is read after the two counts it is derived from.
           The backend has returned this figure since the compare endpoint was
           written and no screen has ever shown it. -->
      <div class="py-5 px-5 sm:px-8 bg-brand-bg-light/30 dark:bg-stone-900/20 space-y-2">
        <span :class="['inline-block text-xs font-black px-4 py-1.5 rounded-full border font-mono tracking-wide shadow-2xs', SIMILARITY_STYLES[similarity.band]]">
          {{ similarity.label }}
        </span>
        <p class="text-[11px] leading-relaxed text-brand-text-muted dark:text-stone-400 font-medium max-w-xl mx-auto">
          <span class="font-bold uppercase tracking-widest text-brand-text dark:text-stone-300">Ingredient Overlap</span>
          &mdash; {{ similarity.description }}
        </p>
      </div>
    </div>
  </div>
</template>
