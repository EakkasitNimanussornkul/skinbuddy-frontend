<script setup lang="ts">
import { ref, computed } from 'vue'
import ProductHeroSection from './ProductHeroSection.vue'
import IngredientAwarenessLegend from './IngredientAwarenessLegend.vue'
import IngredientsExplained from './IngredientsExplained.vue'

const props = defineProps<{
  product: any
  mode?: 'explore' | 'shelf' | 'detail'
}>()

const emit = defineEmits(['open-compare-selector', 'shelf-updated', 'close'])

const showAllIngredients = ref(false)
const showAllBenefits = ref(false)

const safetyChecks = [
  { label: 'Alcohol-free', status: true },
  { label: 'Fragrance-free', status: true },
  { label: 'Paraben-free', status: true },
  { label: 'Silicone-free', status: true },
  { label: 'Sulfate-free', status: true },
  { label: 'Fungal-acne safe', status: true },
]

// Define unified weight matrix for sorting stability
const tierWeight: Record<string, number> = { high: 1, medium: 2, low: 3 }

// --- Extract Real Ingredients from Database ---
const rawIngredients = computed(() => props.product?.product_ingredients || [])

// --- 🌟 Advanced Reactive Sorting Pipelines 🌟 ---

// 1. Sort the raw database join configurations for the main listing UI
const sortedRawIngredients = computed(() => {
  const items = [...rawIngredients.value]
  return items.sort((a, b) => {
    const weightA = tierWeight[a.ingredients?.awareness_tier] || 2
    const weightB = tierWeight[b.ingredients?.awareness_tier] || 2
    return weightA - weightB
  })
})

const displayedIngredients = computed(() => {
  if (showAllIngredients.value) return sortedRawIngredients.value
  return sortedRawIngredients.value.slice(0, 5)
})

// 2. Extract and fully sort the pure single ingredient objects for the explanation widget
const sortedIngredientsList = computed(() => {
  const extracted = rawIngredients.value.map((pi: any) => pi.ingredients).filter(Boolean)
  return extracted.sort((a: any, b: any) => {
    const weightA = tierWeight[a.awareness_tier] || 2
    const weightB = tierWeight[b.awareness_tier] || 2
    return weightA - weightB
  })
})

// --- Statistical Awareness Engine ---
const awarenessStats = computed(() => {
  const total = sortedIngredientsList.value.length
  if (total === 0) return { lowPct: 100, medPct: 0, highPct: 0, lowCount: 0, medCount: 0, highCount: 0 }

  const lowCount = sortedIngredientsList.value.filter((i: any) => i.awareness_tier === 'low').length
  const medCount = sortedIngredientsList.value.filter((i: any) => i.awareness_tier === 'medium').length
  const highCount = sortedIngredientsList.value.filter((i: any) => i.awareness_tier === 'high').length

  return {
    lowPct: (lowCount / total) * 100,
    medPct: (medCount / total) * 100,
    highPct: (highCount / total) * 100,
    lowCount,
    medCount,
    highCount
  }
})

// --- Smart Benefits Extraction ---
const activeBenefits = computed(() => {
  return sortedIngredientsList.value.filter((i: any) =>
    i.benefits &&
    i.functional_group !== 'Formulation Stabilizer' &&
    i.functional_group !== 'Solvent' &&
    i.functional_group !== 'Preservative'
  )
})

const displayedBenefits = computed(() => {
  if (showAllBenefits.value) return activeBenefits.value
  return activeBenefits.value.slice(0, 4)
})

const getTierBgColor = (tier: string) => {
  if (tier === 'low') return 'bg-emerald-500'
  if (tier === 'high') return 'bg-rose-500'
  return 'bg-stone-400 dark:bg-stone-500'
}
</script>

<template>
  <div class="space-y-10 animate-fade-in">

    <!-- SECTION 1: HERO CONTAINER -->
    <ProductHeroSection
      :product="product"
      :mode="mode"
      @open-compare-selector="emit('open-compare-selector', $event)"
      @shelf-updated="emit('shelf-updated')"
      @close="emit('close')"
    />

    <!-- SECTION 2: SAFETY EXCLUSION CHECKLIST -->
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 p-6 sm:p-10 space-y-6 shadow-sm transition-colors duration-300">
      <h3 class="text-lg font-serif font-bold text-brand-text dark:text-white">What's inside</h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div v-for="chk in safetyChecks" :key="chk.label" class="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-brand-text dark:text-stone-200">
          <span class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">✓</span>
          <span>{{ chk.label }}</span>
        </div>
      </div>
    </div>

    <!-- SECTION 3: SORTED INGREDIENTS LIST & COMPOSITION BAR -->
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 p-6 sm:p-10 space-y-6 shadow-sm transition-colors duration-300">
      <div class="flex items-center justify-between">
        <div class="space-y-0.5">
          <h3 class="text-lg font-serif font-bold text-brand-text dark:text-white">Ingredients List</h3>
          <p class="text-xs text-brand-text-muted">Sorted by sensitivity awareness indicators (triggers listed first).</p>
        </div>
        <span class="text-xs font-bold text-brand-text-muted font-mono bg-brand-bg-light dark:bg-stone-800 px-3 py-1 rounded-lg border border-brand-surface-border dark:border-stone-700 flex-shrink-0">{{ rawIngredients.length }} Items</span>
      </div>

      <!-- Embedded Clean Analytics Scale Guide -->
      <IngredientAwarenessLegend :stats="awarenessStats" />

      <!-- Priority Sorted Structural List Container -->
      <div class="divide-y divide-brand-surface-border dark:divide-stone-800 border-t border-b border-brand-surface-border dark:border-stone-800">
        <div v-for="(item, idx) in displayedIngredients" :key="idx" class="py-4 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full mt-0.5 flex-shrink-0 shadow-sm" :class="getTierBgColor(item.ingredients?.awareness_tier)"></span>
            <div>
              <p class="text-xs sm:text-sm font-bold text-brand-text dark:text-white">{{ item.ingredients?.name || 'Active Component' }}</p>
              <p class="text-[11px] text-brand-text-muted mt-0.5 uppercase tracking-wider">{{ item.ingredients?.functional_group || 'Skin Conditioning' }}</p>
            </div>
          </div>

          <span
            class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
            :class="[
              item.ingredients?.awareness_tier === 'high' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : '',
              item.ingredients?.awareness_tier === 'medium' ? 'bg-stone-100 dark:bg-stone-800 text-brand-text-muted border-brand-surface-border dark:border-stone-700' : '',
              item.ingredients?.awareness_tier === 'low' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : ''
            ]"
          >
            {{ item.ingredients?.awareness_tier || 'medium' }}
          </span>
        </div>
      </div>

      <button
        v-if="rawIngredients.length > 5"
        @click="showAllIngredients = !showAllIngredients"
        class="w-full sm:w-auto px-6 py-3 bg-brand-bg-light dark:bg-stone-800/80 hover:bg-brand-surface-border dark:hover:bg-stone-700 text-brand-text dark:text-stone-200 dark:hover:text-white font-bold text-xs rounded-xl border border-brand-surface-border dark:border-stone-700 transition-all cursor-pointer shadow-2xs active:scale-95"
      >
        {{ showAllIngredients ? 'Show less' : `Show all ${rawIngredients.length} ingredients` }}
      </button>
    </div>

    <!-- SECTION 4: ACTIVE BENEFITS & FULLY SORTED EXPLAINER -->
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 p-6 sm:p-10 space-y-10 shadow-sm transition-colors duration-300">
      <div v-if="activeBenefits.length > 0" class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-serif font-bold text-brand-text dark:text-white">Active Benefits</h3>
          <span class="text-xs font-bold text-brand-text-muted font-mono">{{ activeBenefits.length }} Actives Identified</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div
            v-for="(ing, idx) in displayedBenefits"
            :key="ing.id"
            :class="[
              'p-5 bg-brand-bg-light dark:bg-stone-900/50 rounded-2xl border border-brand-surface-border dark:border-stone-800 shadow-2xs transition-all justify-between items-start flex',
              (!showAllBenefits && idx >= 2) ? 'hidden sm:flex' : 'flex'
            ]"
          >
            <div class="flex items-start gap-3.5">
              <span class="w-8 h-8 rounded-full bg-emerald-500/10 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 shadow-2xs border border-emerald-500/20 dark:border-emerald-800/50">✓</span>
              <div>
                <h5 class="text-sm font-bold text-brand-text dark:text-white">{{ ing.name }}</h5>
                <p class="text-xs text-brand-text-muted mt-1 leading-relaxed font-medium">{{ ing.benefits }}</p>
              </div>
            </div>
          </div>
        </div>

        <button
          @click="showAllBenefits = !showAllBenefits"
          v-if="activeBenefits.length > 2"
          class="sm:hidden w-full py-3 bg-brand-bg-light dark:bg-stone-800 hover:bg-brand-surface-border text-brand-text dark:text-stone-200 font-bold text-xs rounded-xl border border-brand-surface-border dark:border-stone-700 transition-all shadow-2xs active:scale-95"
        >
          {{ showAllBenefits ? 'Show less benefits' : `Show all ${activeBenefits.length} benefits` }}
        </button>
        <button
          @click="showAllBenefits = !showAllBenefits"
          v-if="activeBenefits.length > 4"
          class="hidden sm:inline-block px-6 py-3 bg-brand-bg-light dark:bg-stone-800 hover:bg-brand-surface-border dark:hover:bg-stone-700 text-brand-text dark:text-stone-200 font-bold text-xs rounded-xl border border-brand-surface-border dark:border-stone-700 transition-all shadow-2xs active:scale-95"
        >
          {{ showAllBenefits ? 'Show less benefits' : `Show all ${activeBenefits.length} benefits` }}
        </button>
      </div>

      <!-- 🌟 Now passing the cleanly prioritized, sorted array! -->
      <IngredientsExplained :ingredients-list="sortedIngredientsList" />
    </div>

  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>
