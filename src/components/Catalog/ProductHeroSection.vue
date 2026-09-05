<script setup lang="ts">
import { ref, computed } from 'vue'
import { addToShelf, analyzeProduct } from '../../api/shelfapi'
import { resolveMatchBand } from '../../api/products'
import {
  resolveSafety,
  showsDuplicates,
  type DuplicateMatch,
  type SafetyOutcome,
} from '../../api/safety'
import { useToast } from '../../composables/useToast'
import { useAuthStore } from '../../stores/auth'
import SafetyCheckModal from '../Shared/SafetyCheckModal.vue'
import SafetyWarningModal from '../Shelf/SafetyWarningModal.vue'

const props = defineProps<{
  product: any
  mode?: 'explore' | 'shelf' | 'detail'
}>()

const emit = defineEmits(['open-compare-selector', 'shelf-updated', 'close'])
const { addToast } = useToast()
const authStore = useAuthStore()

// 🌟 Smart description with ingredient fallback
const productDescription = computed(() => {
  if (props.product?.description && props.product.description.trim().length > 0) {
    return props.product.description
  }
  const ingredients = props.product?.product_ingredients || []
  if (ingredients.length > 0) {
    const list = ingredients.map((pi: any) => pi.ingredients?.name).filter(Boolean).slice(0, 4)
    if (list.length > 0) {
      return `Targeted formulation featuring ${list.join(', ')}${ingredients.length > 4 ? ', and key barrier support actives' : ''}.`
    }
  }
  return 'Active daily skincare formulation.'
})

// FE-DEF-12: this card had no banding at all - background, border, heading,
// score ring, divider and reason text were emerald for any non-null score, so a
// 20% match read exactly as confidently as a 95% one. Thresholds come from
// resolveMatchBand so this cannot drift from ExploreProductCard and
// CompareIdentityHeader again.
const matchBand = computed(() => {
  const band = resolveMatchBand(props.product?.skin_match_score)

  if (band === 'strong') {
    return {
      card: 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/20 dark:border-emerald-800/40',
      heading: 'text-emerald-900 dark:text-emerald-200',
      body: 'text-emerald-700 dark:text-emerald-400',
      ring: 'border-emerald-500 text-emerald-800 dark:text-emerald-200',
      divider: 'border-emerald-500/20 dark:border-emerald-800/40',
      reason: 'text-emerald-900 dark:text-emerald-200',
      dot: 'bg-emerald-500',
    }
  }

  if (band === 'moderate') {
    return {
      card: 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/20 dark:border-amber-800/40',
      heading: 'text-amber-900 dark:text-amber-200',
      body: 'text-amber-700 dark:text-amber-400',
      ring: 'border-amber-500 text-amber-800 dark:text-amber-200',
      divider: 'border-amber-500/20 dark:border-amber-800/40',
      reason: 'text-amber-900 dark:text-amber-200',
      dot: 'bg-amber-500',
    }
  }

  if (band === 'weak') {
    return {
      card: 'bg-semantic-error/5 dark:bg-semantic-error/10 border-semantic-error/20',
      heading: 'text-semantic-error',
      body: 'text-semantic-error/80',
      ring: 'border-semantic-error text-semantic-error',
      divider: 'border-semantic-error/20',
      reason: 'text-brand-text dark:text-stone-200',
      dot: 'bg-semantic-error',
    }
  }

  // Unavailable. Neutral, because a score that was never computed must not be
  // painted as any verdict - good or bad.
  return {
    card: 'bg-brand-bg-light dark:bg-stone-900 border-brand-surface-border dark:border-stone-800',
    heading: 'text-brand-text dark:text-stone-200',
    body: 'text-brand-text-muted',
    ring: 'border-stone-300 dark:border-stone-700 text-brand-text-muted',
    divider: 'border-brand-surface-border dark:border-stone-800',
    reason: 'text-brand-text-muted dark:text-stone-400',
    dot: 'bg-brand-text-muted',
  }
})

const hasMatchScore = computed(() => resolveMatchBand(props.product?.skin_match_score) !== 'unavailable')

const isConfiguringAdd = ref(false)
const isSaving = ref(false)
const isOpened = ref(true)
const selectedPao = ref('12M')
const paoOptions = ['3M', '6M', '12M', '18M', '24M', '36M']
const customDate = ref(new Date().toISOString().split('T')[0])

const isSafetyModalOpen = ref(false)
const showWarningModal = ref(false)
const isAnalyzing = ref(false)
const hasCheckedSafety = ref(false)
const backendWarnings = ref<any[]>([])
const safetyUnavailable = ref(false)
// Already filtered through showsDuplicates() below, so anything in here is
// known to have come from a check that produced an answer. The modal can render
// it on length alone.
const backendDuplicates = ref<DuplicateMatch[]>([])

// Returns the outcome rather than only setting warnings. Callers previously
// branched on backendWarnings.length, which is empty both when the product is
// clear and when the check never ran - so a failure opened the add flow as if
// the product had been cleared.
const runBackendAnalysis = async () => {
  if (!props.product?.id) {
    return { status: 'unavailable', warnings: [], duplicates: [] } as SafetyOutcome
  }

  isAnalyzing.value = true
  const outcome = await resolveSafety(() => analyzeProduct(props.product.id))
  isAnalyzing.value = false

  backendWarnings.value = outcome.warnings
  safetyUnavailable.value = outcome.status === 'unavailable'
  backendDuplicates.value = showsDuplicates(outcome) ? outcome.duplicates : []

  if (outcome.status === 'unavailable') {
    addToast('Could not complete safety diagnostic verification.', 'error')
  }

  return outcome
}

const handleTriggerSafetyCheck = async () => {
  if (!authStore.isAuthenticated) {
    authStore.triggerLoginPopup('Sign in to perform routine safety checks on your skin barrier.')
    return
  }
  isSafetyModalOpen.value = true
  hasCheckedSafety.value = false
  await runBackendAnalysis()
  hasCheckedSafety.value = true
}

const handleOpenConfigurator = async () => {
  if (!authStore.isAuthenticated) {
    authStore.triggerLoginPopup('Sign in to save this product to your digital skincare shelf.')
    return
  }
  const outcome = await runBackendAnalysis()

  // Only an explicit pass opens the configurator. An unavailable check stops
  // here - the toast above has already told the user why.
  if (outcome.status === 'warned') {
    showWarningModal.value = true
  } else if (outcome.status === 'cleared') {
    isConfiguringAdd.value = true
  }
}

const handleCompareClick = () => {
  if (!authStore.isAuthenticated) {
    authStore.triggerLoginPopup('Sign in to compare skin formulas side-by-side.')
    return
  }
  emit('open-compare-selector', props.product)
}

const handleBypassProceed = () => {
  showWarningModal.value = false
  isConfiguringAdd.value = true
}

const handleCommitToShelf = async () => {
  if (!props.product) return
  isSaving.value = true
  try {
    const numericPao = parseInt(selectedPao.value.replace('M', '')) || 12
    await addToShelf({
      product_id: props.product.id,
      usage_state: isOpened.value ? 'active' : 'unopened',
      opened_date: isOpened.value ? customDate.value : null,
      expiration_date: null,
      pao: numericPao
    })
    addToast(`${props.product.name} added to routine!`, 'success')
    isConfiguringAdd.value = false
    emit('shelf-updated')
    if (props.mode !== 'detail') emit('close')
  } catch {
    addToast('Could not save product.', 'error')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
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
    <div class="lg:col-span-7 p-6 sm:p-10 space-y-5 flex flex-col justify-between">
      <div class="space-y-3">
        <span class="text-xs font-bold text-brand-primary uppercase tracking-widest">{{ product.brand }}</span>
        <h1 class="text-2xl sm:text-4xl font-serif font-bold text-brand-text dark:text-white mt-1">{{ product.name }}</h1>

        <div v-if="product.price_thb || product.price_usd" class="inline-flex items-center gap-2 bg-brand-bg-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800 px-4 py-2 rounded-2xl font-mono font-bold text-sm">
          <span v-if="product.price_thb" class="text-brand-primary">฿{{ product.price_thb }}</span>
          <span v-if="product.price_thb && product.price_usd" class="text-brand-surface-border dark:text-stone-700">|</span>
          <span v-if="product.price_usd" class="text-brand-text-muted dark:text-stone-400">${{ product.price_usd }}</span>
        </div>
        <div v-else class="inline-flex items-center gap-2 bg-brand-bg-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800 px-4 py-2 rounded-2xl font-mono font-bold text-sm text-brand-text-muted opacity-70">
          Price unavailable
        </div>

        <!-- Description Paragraph -->
        <p class="text-xs sm:text-sm text-brand-text-muted dark:text-stone-400 leading-relaxed font-medium pt-1">
          {{ productDescription }}
        </p>
      </div>

      <!-- Match Card: Authenticated User -->
      <div v-if="authStore.isAuthenticated" :class="['border-2 rounded-3xl p-6 space-y-4 shadow-2xs transition-colors', matchBand.card]">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h4 :class="['text-base font-black', matchBand.heading]">
              {{ hasMatchScore ? 'Skin Match Compatibility' : 'Compatibility Status' }}
            </h4>
            <p :class="['text-xs mt-0.5', matchBand.body]">
              {{ hasMatchScore ? 'Compatibility evaluation for your active Baumann skin profile.' : 'Unable to determine personalized compatibility for this item.' }}
            </p>
          </div>

          <!-- Dynamic Score vs Failure Circle -->
          <div class="flex-shrink-0">
            <div
              v-if="hasMatchScore"
              :class="['w-14 h-14 rounded-full border-4 flex items-center justify-center font-mono font-black text-lg bg-white dark:bg-stone-900 shadow-sm', matchBand.ring]"
            >
              {{ Math.round(product.skin_match_score) }}%
            </div>

            <div
              v-else
              class="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-brand-surface-light dark:bg-stone-800 text-[10px] font-bold font-mono text-brand-text-muted uppercase tracking-wider text-center"
            >
              Failed to calculate score
            </div>
          </div>
        </div>

        <!-- Match Reasons or Failure Explanation -->
        <div :class="['space-y-2 pt-3 border-t text-xs', matchBand.divider]">
          <template v-if="hasMatchScore">
            <div v-for="(reason, i) in (product.match_reasons || [])" :key="i" :class="['flex items-start gap-2.5', matchBand.reason]">
              <span :class="['w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0', matchBand.dot]"></span>
              <span class="leading-relaxed">{{ reason }}</span>
            </div>
          </template>

          <div v-else class="text-brand-text-muted dark:text-stone-400 italic text-[11px]">
            Failed to calculate matching score. This product may have incomplete ingredient metadata in the catalog.
          </div>
        </div>
      </div>

      <!-- Match Card: Unregistered Visitor Preview -->
      <div v-else class="bg-brand-bg-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800 rounded-3xl p-6 flex items-center justify-between gap-4">
        <div>
          <h4 class="text-sm font-bold text-brand-text dark:text-stone-200">Skin Compatibility Score</h4>
          <p class="text-xs text-brand-text-muted mt-0.5">Log in to analyze this formula against your Baumann skin profile.</p>
        </div>
        <button
          @click="authStore.triggerLoginPopup('Sign in to view your personalized skin compatibility score.')"
          class="px-4 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer whitespace-nowrap transition-all active:scale-95"
        >
          Check Match
        </button>
      </div>

      <!-- Action Controllers -->
      <div class="pt-2">
        <div v-if="!isConfiguringAdd" class="flex flex-col sm:flex-row items-center gap-3">
          <button @click="handleOpenConfigurator" class="w-full sm:w-1/3 py-4 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95">
            <svg v-if="isAnalyzing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>Save To Shelf</span>
          </button>

          <button @click="handleTriggerSafetyCheck" class="w-full sm:w-1/3 py-4 bg-brand-primary-light dark:bg-stone-800 text-brand-primary dark:text-brand-primary-accent font-bold text-sm rounded-2xl border border-brand-primary/20 dark:border-stone-700 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 hover:bg-brand-primary dark:hover:bg-stone-700 hover:text-white">
            <span class="w-2 h-2 rounded-full bg-brand-primary" :class="isAnalyzing ? 'animate-ping' : 'animate-pulse'"></span>
            <span>Safety Check</span>
          </button>

          <button @click="handleCompareClick" class="w-full sm:w-1/3 py-4 bg-brand-bg-light dark:bg-stone-800/80 hover:bg-brand-surface-border dark:hover:bg-stone-700 text-brand-text dark:text-stone-200 dark:hover:text-white font-bold text-sm rounded-2xl border border-brand-surface-border dark:border-stone-700 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 active:scale-95">
            <span>Compare</span>
            <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </button>
        </div>

        <!-- Shelf Configurator Accordion -->
        <div v-else class="bg-brand-bg-light dark:bg-stone-900 p-6 rounded-3xl border border-brand-surface-border dark:border-stone-800 space-y-4 shadow-inner animate-fade-in">
          <div class="flex items-center justify-between border-b border-brand-surface-border dark:border-stone-800 pb-3">
            <span class="text-xs font-bold uppercase tracking-wider text-brand-primary">Configure Routine Item</span>
            <button @click="isConfiguringAdd = false" class="text-xs font-bold text-brand-text-muted hover:text-brand-text dark:hover:text-white cursor-pointer transition-colors">Cancel</button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <button @click="isOpened = true" :class="['py-3 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-sm', isOpened ? 'bg-brand-primary text-white border-brand-primary' : 'bg-brand-surface-light dark:bg-stone-800 border-brand-surface-border dark:border-stone-700 text-brand-text-muted']">
              Currently Opened
            </button>
            <button @click="isOpened = false" :class="['py-3 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-sm', !isOpened ? 'bg-brand-primary text-white border-brand-primary' : 'bg-brand-surface-light dark:bg-stone-800 border-brand-surface-border dark:border-stone-700 text-brand-text-muted']">
              Unopened / Sealed
            </button>
          </div>

          <div v-if="isOpened" class="space-y-2">
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

    <!-- Modals -->
    <SafetyCheckModal
      :is-open="isSafetyModalOpen"
      :product="product"
      :is-loading="isAnalyzing"
      :warnings="backendWarnings"
      :duplicates="backendDuplicates"
      :has-checked="hasCheckedSafety"
      :scan-failed="safetyUnavailable"
      @close="isSafetyModalOpen = false"
    />

    <Teleport to="body">
      <SafetyWarningModal
        v-if="showWarningModal"
        :warnings="backendWarnings"
        @cancel="showWarningModal = false"
        @proceed="handleBypassProceed"
      />
    </Teleport>
  </div>
</template>
