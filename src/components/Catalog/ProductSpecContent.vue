<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import ProductHeroSection from './ProductHeroSection.vue'
import IngredientAwarenessLegend from './IngredientAwarenessLegend.vue'
import IngredientsExplained from './IngredientsExplained.vue'

const props = defineProps<{
  product: any
  mode?: 'explore' | 'shelf' | 'detail'
}>()

const emit = defineEmits(['open-compare-selector', 'shelf-updated', 'close'])
const authStore = useAuthStore()

const showAllIngredients = ref(false)
const showAllBenefits = ref(false)

// 🌟 Dynamically compute flags from product payload
const safetyChecks = computed(() => {
  const flags = props.product?.safety_flags || {}
  return [
    { label: 'Alcohol-free', status: flags.alcohol_free ?? null },
    { label: 'Fragrance-free', status: flags.fragrance_free ?? null },
    { label: 'Paraben-free', status: flags.paraben_free ?? null },
    { label: 'Silicone-free', status: flags.silicone_free ?? null },
    { label: 'Sulfate-free', status: flags.sulfate_free ?? null },
    { label: 'Vegan', status: flags.vegan ?? null },
  ]
})

const tierWeight: Record<string, number> = { high: 1, medium: 2, low: 3 }

// --- Extract Real Ingredients ---
const rawIngredients = computed<any[]>(() => props.product?.product_ingredients || [])

// --- Extract Relational Concerns ---
const productConcerns = computed(() => {
  if (!rawIngredients.value.length) return []
  const concernsList: Array<{ title: string; msg: string; severity: string; ingredientName: string }> = []

  rawIngredients.value.forEach((pi: any) => {
    const ing = pi.ingredients
    if (!ing || !ing.ingredient_concerns) return

    ing.ingredient_concerns.forEach((concern: any) => {
      concernsList.push({
        title: concern.concern_title,
        msg: concern.concern_description || `Contains ${ing.name} which holds profile alerts: ${concern.target_profile || 'Sensitivity'}`,
        severity: concern.severity || 'Moderate',
        ingredientName: ing.name
      })
    })
  })

  return concernsList
})

// --- Sorted Pipelines ---
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

const sortedIngredientsList = computed(() => {
  const extracted = rawIngredients.value.map((pi: any) => pi.ingredients).filter(Boolean)
  return extracted.sort((a: any, b: any) => {
    const weightA = tierWeight[a.awareness_tier] || 2
    const weightB = tierWeight[b.awareness_tier] || 2
    return weightA - weightB
  })
})

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

const handleGuestTrigger = () => {
  authStore.triggerLoginPopup('Want to know more about this product? Log in to view full active diagnostic details.')
}
</script>

<template>
  <div class="space-y-10 animate-fade-in relative">

    <!-- SECTION 1: HERO CONTAINER -->
    <ProductHeroSection
      :product="product"
      :mode="mode"
      @open-compare-selector="emit('open-compare-selector', $event)"
      @shelf-updated="emit('shelf-updated')"
      @close="emit('close')"
    />

    <!-- SECTION 2: DYNAMIC SAFETY EXCLUSION CHECKLIST -->
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 p-6 sm:p-10 space-y-6 shadow-sm transition-colors duration-300">
      <h3 class="text-lg font-serif font-bold text-brand-text dark:text-white">What's inside</h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div v-for="chk in safetyChecks" :key="chk.label" class="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
          <!-- Green Tick if confirmed true -->
          <span v-if="chk.status === true" class="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-emerald-500/20 shadow-2xs">✓</span>
          <!-- Red Cross if confirmed false -->
          <span v-else-if="chk.status === false" class="w-6 h-6 rounded-full bg-rose-500/10 text-semantic-error flex items-center justify-center font-bold text-xs flex-shrink-0 border border-rose-500/20 shadow-2xs">✕</span>
          <!-- Neutral marker if not verified by the backend -->
          <span v-else class="w-6 h-6 rounded-full bg-stone-400/10 text-stone-400 dark:text-stone-500 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-stone-400/20 shadow-2xs">?</span>

          <span :class="chk.status === true ? 'text-brand-text dark:text-stone-200' : chk.status === false ? 'text-semantic-error line-through' : 'text-brand-text-muted italic'">
            {{ chk.label }}{{ chk.status === null ? ' (not verified)' : '' }}
          </span>
        </div>
      </div>
    </div>

    <!-- SECTION 3: INGREDIENTS LIST & DEEP ANALYSIS (Gated for Anonymous Guests) -->
    <div class="relative">

      <!-- Wrap lower analytical sections in conditional blur for anonymous guests -->
      <div :class="[!authStore.isAuthenticated ? 'filter blur-sm select-none pointer-events-none max-h-[380px] overflow-hidden' : '']" class="space-y-10">

        <!-- Ingredients List Section -->
        <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 p-6 sm:p-10 space-y-6 shadow-sm transition-colors duration-300">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <h3 class="text-lg font-serif font-bold text-brand-text dark:text-white">Ingredients List</h3>
              <p class="text-xs text-brand-text-muted">Sorted by sensitivity awareness indicators (triggers listed first).</p>
            </div>
            <span class="text-xs font-bold text-brand-text-muted font-mono bg-brand-bg-light dark:bg-stone-800 px-3 py-1 rounded-lg border border-brand-surface-border dark:border-stone-700 flex-shrink-0">{{ rawIngredients.length }} Items</span>
          </div>

          <IngredientAwarenessLegend :stats="awarenessStats" />

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

        <!-- Section 4: Active Benefits & Dynamic Concerns -->
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
          </div>

          <!-- Formula Concerns -->
          <div v-if="productConcerns.length > 0" class="space-y-6 pt-6 border-t border-brand-surface-border dark:border-stone-800">
            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <h3 class="text-lg font-serif font-bold text-brand-text dark:text-white flex items-center gap-2">
                  <svg class="w-5 h-5 text-semantic-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                  <span>Formula Concerns & Sensitivity Profile</span>
                </h3>
                <p class="text-xs text-brand-text-muted">Targeted profile contraindications associated with this formulation.</p>
              </div>
              <span class="text-xs font-bold text-semantic-error font-mono bg-semantic-error/10 px-3 py-1 rounded-lg border border-semantic-error/20 flex-shrink-0">
                {{ productConcerns.length }} {{ productConcerns.length === 1 ? 'Alert' : 'Alerts' }}
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                v-for="(con, idx) in productConcerns"
                :key="idx"
                class="p-5 bg-semantic-error/5 dark:bg-semantic-error/10 rounded-2xl border border-semantic-error/15 shadow-2xs transition-all flex items-start gap-3.5"
              >
                <div class="w-8 h-8 rounded-full bg-semantic-error/10 border border-semantic-error/20 flex items-center justify-center text-semantic-error shrink-0 font-mono font-bold text-xs mt-0.5">
                  !
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <h5 class="text-xs font-black text-brand-text dark:text-stone-200 uppercase tracking-wide truncate">
                      {{ con.title }}
                    </h5>
                    <span class="text-[9px] font-bold uppercase tracking-wider text-brand-text-muted px-2 py-0.5 bg-brand-surface-light dark:bg-stone-800 rounded border border-brand-surface-border dark:border-stone-700 shrink-0">
                      {{ con.ingredientName }}
                    </span>
                  </div>
                  <p class="text-xs text-brand-text-muted dark:text-stone-400 leading-relaxed font-medium">
                    {{ con.msg }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <IngredientsExplained :ingredients-list="sortedIngredientsList" />
        </div>

      </div>

      <!-- 🌟 Overlay Banner for Unregistered Guests (Overlaying Lower Section Only) -->
      <div
        v-if="!authStore.isAuthenticated"
        @click="handleGuestTrigger"
        class="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-brand-bg-light via-brand-bg-light/95 dark:from-brand-bg-dark dark:via-brand-bg-dark/95 to-transparent flex flex-col items-center justify-end pb-10 cursor-pointer z-20 rounded-[2.5rem]"
      >
        <div class="bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 p-8 rounded-[2.5rem] shadow-2xl text-center max-w-md w-[90%] space-y-4 active:scale-95 transition-all">
          <div class="w-12 h-12 mx-auto rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
            <svg class="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <div>
            <h3 class="font-serif font-bold text-lg text-brand-text dark:text-stone-100">
              Want to know more about this product?
            </h3>
            <p class="text-xs text-brand-text-muted dark:text-stone-400 mt-1.5 leading-relaxed font-medium">
              Log in to unlock complete active breakdowns, sensitivity contraindications, and personalized skin compatibility diagnostics.
            </p>
          </div>

          <button class="w-full py-3.5 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer">
            Log in with LINE
          </button>
        </div>
      </div>

    </div>

  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>
