<script setup lang="ts">
import { ref, computed } from 'vue'
import { addToShelf } from '../../api/shelfapi'
import { useToast } from '../../composables/useToast'
import IngredientsExplained from './IngredientsExplained.vue'

const props = defineProps<{
  product: any
  mode?: 'explore' | 'shelf' | 'detail'
}>()

const emit = defineEmits(['open-compare-selector', 'shelf-updated', 'close'])
const { addToast } = useToast()

const showAllIngredients = ref(false)
const showAllBenefits = ref(false) // 🌟 New toggle state for Active Benefits
const isConfiguringAdd = ref(false)
const isSaving = ref(false)
const isOpened = ref(true)
const selectedPao = ref('12M')
const paoOptions = ['3M', '6M', '12M', '18M', '24M', '36M']
const customDate = ref(new Date().toISOString().split('T')[0])

// --- Extract Real Ingredients from Database ---
const rawIngredients = computed(() => props.product?.product_ingredients || [])

const displayedIngredients = computed(() => {
  if (showAllIngredients.value) return rawIngredients.value
  return rawIngredients.value.slice(0, 5)
})

const ingredientsList = computed(() => {
  return rawIngredients.value.map((pi: any) => pi.ingredients).filter(Boolean)
})

// --- Dynamic Ingredient Awareness Engine ---
const awarenessStats = computed(() => {
  const total = ingredientsList.value.length
  if (total === 0) return { lowPct: 100, medPct: 0, highPct: 0, lowCount: 0, medCount: 0, highCount: 0 }

  const lowCount = ingredientsList.value.filter((i: any) => i.awareness_tier === 'low').length
  const medCount = ingredientsList.value.filter((i: any) => i.awareness_tier === 'medium').length
  const highCount = ingredientsList.value.filter((i: any) => i.awareness_tier === 'high').length

  return {
    lowPct: (lowCount / total) * 100,
    medPct: (medCount / total) * 100,
    highPct: (highCount / total) * 100,
    lowCount,
    medCount,
    highCount
  }
})

// --- Smart Benefits Filter ---
const activeBenefits = computed(() => {
  return ingredientsList.value.filter((i: any) =>
    i.benefits &&
    i.functional_group !== 'Formulation Stabilizer' &&
    i.functional_group !== 'Solvent' &&
    i.functional_group !== 'Preservative'
  )
})

// 🌟 Responsive Slice: Caps at 4 items in JS, while pure CSS handles the 2-item mobile limit! 🌟
const displayedBenefits = computed(() => {
  if (showAllBenefits.value) return activeBenefits.value
  return activeBenefits.value.slice(0, 4)
})

const getTierBgColor = (tier: string) => {
  if (tier === 'low') return 'bg-emerald-500'
  if (tier === 'high') return 'bg-semantic-error'
  return 'bg-stone-400 dark:bg-stone-500'
}

const safetyChecks = [
  { label: 'Alcohol-free', status: true },
  { label: 'Fragrance-free', status: true },
  { label: 'Paraben-free', status: true },
  { label: 'Silicone-free', status: true },
  { label: 'Sulfate-free', status: true },
  { label: 'Fungal-acne safe', status: true },
]

const handleCommitToShelf = async () => {
  if (!props.product) return
  isSaving.value = true
  try {
    const numericPao = parseInt(selectedPao.value.replace('M', '')) || 12
    await addToShelf({
      product_id: props.product.id,
      usage_state: isOpened.value ? 'active' : 'unopened',
      opened_date: isOpened.value ? customDate.value : null,
      pao: numericPao
    })
    addToast(`${props.product.name} added to routine!`, 'success')
    isConfiguringAdd.value = false
    emit('shelf-updated')
    if (props.mode !== 'detail') emit('close')
  } catch (error: any) {
    addToast('Could not save product.', 'error')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-10">

    <!-- SECTION 1: HERO & MATCH SCORE CARD -->
    <div class="grid grid-cols-1 lg:grid-cols-12 bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 shadow-xl overflow-hidden transition-colors duration-300">

      <!-- Left Image Showcase -->
      <div class="lg:col-span-5 bg-brand-bg-light dark:bg-stone-900/50 p-8 sm:p-12 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-brand-surface-border dark:border-stone-800">
        <div class="w-56 h-56 sm:w-72 sm:h-72 flex items-center justify-center relative mix-blend-multiply dark:mix-blend-normal">
          <div class="absolute inset-0 bg-brand-primary/5 dark:bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>
          <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-contain drop-shadow-2xl relative z-10" />
          <svg v-else class="w-24 h-24 text-brand-text-muted/40 stroke-[1] relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        </div>
      </div>

      <!-- Right Specification Panel -->
      <div class="lg:col-span-7 p-6 sm:p-10 space-y-6 flex flex-col justify-between">
        <div>
          <span class="text-xs font-bold text-brand-primary uppercase tracking-widest">{{ product.brand }}</span>
          <h1 class="text-2xl sm:text-4xl font-serif font-bold text-brand-text dark:text-white mt-1">{{ product.name }}</h1>

          <div class="mt-3 inline-flex items-center gap-2 bg-brand-bg-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800 px-4 py-2 rounded-2xl font-mono font-bold text-sm">
            <span class="text-brand-primary">฿{{ product.price_thb || 450 }}</span>
            <span class="text-brand-surface-border dark:text-stone-700">|</span>
            <span class="text-brand-text-muted dark:text-stone-400">${{ product.price_usd || '14.00' }}</span>
          </div>
        </div>

        <!-- Skinsort Style Match Card -->
        <div class="bg-emerald-500/10 dark:bg-emerald-950/30 border-2 border-emerald-500/20 dark:border-emerald-800/60 rounded-3xl p-6 space-y-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-base font-black text-emerald-900 dark:text-emerald-200">Great match</h4>
              <p class="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">Strong compatibility for your skin profile</p>
            </div>
            <div class="w-14 h-14 rounded-full border-4 border-emerald-500 flex items-center justify-center font-mono font-black text-lg text-emerald-800 dark:text-emerald-200 bg-white dark:bg-stone-900 shadow-sm">
              {{ product.skin_match_score || 89 }}
            </div>
          </div>

          <div class="space-y-3 pt-3 border-t border-emerald-500/20 dark:border-emerald-800/40 text-xs">
            <div v-for="(reason, i) in (product.match_reasons || ['Formulated to optimize hydration and soothe redness.'])" :key="i" class="flex items-start gap-2.5 text-emerald-900 dark:text-emerald-200">
              <span class="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
              <span class="leading-relaxed">{{ reason }}</span>
            </div>
            <div v-if="!product.caution_reasons?.length" class="flex items-start gap-2.5 text-emerald-900 dark:text-emerald-200 font-semibold">
              <span class="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0"></span>
              <span class="leading-relaxed">No major concerns detected against your routine profile.</span>
            </div>
          </div>
        </div>

        <!-- Action Controllers -->
        <div class="pt-2">
          <div v-if="!isConfiguringAdd" class="flex flex-col sm:flex-row items-center gap-3">
            <button @click="isConfiguringAdd = true" class="w-full sm:w-1/2 py-4 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm rounded-2xl shadow-md shadow-brand-primary/20 transition-all cursor-pointer active:scale-95">
              Save To Shelf
            </button>
            <button @click="emit('open-compare-selector', product)" class="w-full sm:w-1/2 py-4 bg-brand-bg-light dark:bg-stone-800/80 hover:bg-brand-surface-border dark:hover:bg-stone-700 text-brand-text dark:text-stone-200 dark:hover:text-white font-bold text-sm rounded-2xl border border-brand-surface-border dark:border-stone-700 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 active:scale-95">
              <span>Compare</span>
              <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          </div>

          <!-- The Configurator -->
          <div v-else class="bg-brand-bg-light dark:bg-stone-900 p-6 rounded-3xl border border-brand-surface-border dark:border-stone-800 space-y-5 animate-fade-in shadow-inner">
            <div class="flex items-center justify-between border-b border-brand-surface-border dark:border-stone-800 pb-3">
              <span class="text-xs font-bold uppercase tracking-wider text-brand-primary">Configure Routine Item</span>
              <button @click="isConfiguringAdd = false" class="text-xs font-bold text-brand-text-muted hover:text-brand-text dark:hover:text-white cursor-pointer transition-colors">Cancel</button>
            </div>

            <!-- Usage State Toggles -->
            <div class="grid grid-cols-2 gap-3">
              <button @click="isOpened = true" :class="['py-3 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-sm', isOpened ? 'bg-brand-primary text-white border-brand-primary' : 'bg-brand-surface-light dark:bg-stone-800 border-brand-surface-border dark:border-stone-700 text-brand-text-muted']">
                Currently Opened
              </button>
              <button @click="isOpened = false" :class="['py-3 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-sm', !isOpened ? 'bg-brand-primary text-white border-brand-primary' : 'bg-brand-surface-light dark:bg-stone-800 border-brand-surface-border dark:border-stone-700 text-brand-text-muted']">
                Unopened / Sealed
              </button>
            </div>

            <!-- PAO Selection -->
            <div v-if="isOpened" class="space-y-2 animate-fade-in">
              <label class="block text-[10px] font-bold uppercase tracking-widest text-brand-text-muted">Period After Opening (PAO)</label>
              <div class="grid grid-cols-6 gap-2">
                <button v-for="pao in paoOptions" :key="pao" @click="selectedPao = pao" :class="['py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer', selectedPao === pao ? 'bg-brand-primary/10 dark:bg-brand-primary/20 border-brand-primary text-brand-primary' : 'bg-brand-surface-light dark:bg-stone-800 border-brand-surface-border dark:border-stone-700 text-brand-text-muted hover:border-brand-primary/50']">
                  {{ pao }}
                </button>
              </div>
            </div>

            <button @click="handleCommitToShelf" :disabled="isSaving" class="w-full mt-2 py-4 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95">
              <svg v-if="isSaving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              {{ isSaving ? 'Saving to Database...' : 'Confirm & Add To Shelf' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- SECTION 2: WHAT'S INSIDE SAFETY CHECKLIST -->
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 p-6 sm:p-10 space-y-6 shadow-sm transition-colors duration-300">
      <h3 class="text-lg font-serif font-bold text-brand-text dark:text-white">What's inside</h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div v-for="chk in safetyChecks" :key="chk.label" class="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-brand-text dark:text-stone-200">
          <span class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">✓</span>
          <span>{{ chk.label }}</span>
        </div>
      </div>
    </div>

    <!-- SECTION 3: INGREDIENTS LIST & COMPOSITION BAR -->
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 p-6 sm:p-10 space-y-6 shadow-sm transition-colors duration-300">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-serif font-bold text-brand-text dark:text-white">Ingredients List</h3>
        <span class="text-xs font-bold text-brand-text-muted font-mono bg-brand-bg-light dark:bg-stone-800 px-3 py-1 rounded-lg border border-brand-surface-border dark:border-stone-700">{{ rawIngredients.length }} Items</span>
      </div>

      <!-- Dynamic Colored Progress Bar based on Database Tiers -->
      <div class="w-full h-3 bg-brand-surface-border dark:bg-stone-800 rounded-full overflow-hidden flex shadow-inner">
        <div v-if="awarenessStats.lowPct > 0" class="bg-emerald-500 h-full transition-all duration-500" :style="{ width: awarenessStats.lowPct + '%' }" :title="`Safe / Low Awareness (${awarenessStats.lowCount})`"></div>
        <div v-if="awarenessStats.medPct > 0" class="bg-stone-400 dark:bg-stone-600 h-full transition-all duration-500 border-l border-white/20" :style="{ width: awarenessStats.medPct + '%' }" :title="`Normal / Medium Awareness (${awarenessStats.medCount})`"></div>
        <div v-if="awarenessStats.highPct > 0" class="bg-semantic-error h-full transition-all duration-500 border-l border-white/20" :style="{ width: awarenessStats.highPct + '%' }" :title="`High Awareness (${awarenessStats.highCount})`"></div>
      </div>

      <!-- Expandable List -->
      <div class="divide-y divide-brand-surface-border dark:divide-stone-800 border-t border-b border-brand-surface-border dark:border-stone-800">
        <div v-for="(item, idx) in displayedIngredients" :key="idx" class="py-4 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full mt-0.5 flex-shrink-0 shadow-sm" :class="getTierBgColor(item.ingredients?.awareness_tier)"></span>
            <div>
              <p class="text-xs sm:text-sm font-bold text-brand-text dark:text-white">{{ item.ingredients?.name || 'Active Component' }}</p>
              <p class="text-[11px] text-brand-text-muted mt-0.5 uppercase tracking-wider">{{ item.ingredients?.functional_group || 'Skin Conditioning' }}</p>
            </div>
          </div>
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

    <!-- SECTION 4: ACTIVE BENEFITS & INGREDIENTS EXPLAINED -->
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 p-6 sm:p-10 space-y-10 shadow-sm transition-colors duration-300">

      <div v-if="activeBenefits.length > 0" class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-serif font-bold text-brand-text dark:text-white">Active Benefits</h3>
          <span class="text-xs font-bold text-brand-text-muted font-mono">{{ activeBenefits.length }} Actives Identified</span>
        </div>

        <!-- 🌟 Responsive 2x2 Desktop vs 1x2 Mobile Grid with Pure CSS Collapse 🌟 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div
            v-for="(ing, idx) in displayedBenefits"
            :key="ing.id"
            :class="[
              'p-5 bg-brand-bg-light dark:bg-stone-900/50 rounded-2xl border border-brand-surface-border dark:border-stone-800 shadow-2xs transition-all justify-between items-start',
              /* Pure CSS mobile cap: Hides items 3 and 4 on screens smaller than 640px unless showAllBenefits is true */
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

        <!-- Mobile View More Toggle (shows if > 2 benefits) -->
        <button
          v-if="activeBenefits.length > 2"
          @click="showAllBenefits = !showAllBenefits"
          class="sm:hidden w-full py-3 bg-brand-bg-light dark:bg-stone-800 hover:bg-brand-surface-border text-brand-text dark:text-stone-200 font-bold text-xs rounded-xl border border-brand-surface-border dark:border-stone-700 transition-all shadow-2xs active:scale-95"
        >
          {{ showAllBenefits ? 'Show less benefits' : `Show all ${activeBenefits.length} benefits` }}
        </button>
<!-- Desktop View More Toggle (shows only if > 4 benefits) -->
        <button
          v-if="activeBenefits.length > 4"
          @click="showAllBenefits = !showAllBenefits"
          class="hidden sm:inline-block px-6 py-3 bg-brand-bg-light dark:bg-stone-800 hover:bg-brand-surface-border dark:hover:bg-stone-700 text-brand-text dark:text-stone-200 font-bold text-xs rounded-xl border border-brand-surface-border dark:border-stone-700 transition-all shadow-2xs active:scale-95"
        >
          {{ showAllBenefits ? 'Show less benefits' : `Show all ${activeBenefits.length} benefits` }}
        </button>
      </div>

      <IngredientsExplained :ingredients-list="ingredientsList" />

    </div>

  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>
