<script setup lang="ts">
import { ref, computed } from 'vue'
import { addToShelf, analyzeProduct } from '../../api/shelfapi'
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

const runBackendAnalysis = async () => {
  if (!props.product?.id) return
  isAnalyzing.value = true
  backendWarnings.value = []
  try {
    const analysis = await analyzeProduct(props.product.id)
    if (analysis && analysis.warnings) {
      backendWarnings.value = analysis.warnings
    }
  } catch (error) {
    console.error('Safety evaluation client request failed:', error)
    addToast('Could not complete safety diagnostic verification.', 'error')
  } finally {
    isAnalyzing.value = false
  }
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
  await runBackendAnalysis()

  if (backendWarnings.value.length > 0) {
    showWarningModal.value = true
  } else {
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
      <div v-if="authStore.isAuthenticated" class="bg-emerald-500/10 dark:bg-emerald-950/20 border-2 border-emerald-500/20 dark:border-emerald-800/40 rounded-3xl p-6 space-y-4 shadow-2xs">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h4 class="text-base font-black text-emerald-900 dark:text-emerald-200">
              {{ product.skin_match_score !== null && product.skin_match_score !== undefined ? 'Skin Match Compatibility' : 'Compatibility Status' }}
            </h4>
            <p class="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              {{ product.skin_match_score !== null && product.skin_match_score !== undefined ? 'Compatibility evaluation for your active Baumann skin profile.' : 'Unable to determine personalized compatibility for this item.' }}
            </p>
          </div>

          <!-- Dynamic Score vs Failure Circle -->
          <div class="flex-shrink-0">
            <div
              v-if="product.skin_match_score !== null && product.skin_match_score !== undefined"
              class="w-14 h-14 rounded-full border-4 border-emerald-500 flex items-center justify-center font-mono font-black text-lg text-emerald-800 dark:text-emerald-200 bg-white dark:bg-stone-900 shadow-sm"
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
        <div class="space-y-2 pt-3 border-t border-emerald-500/20 dark:border-emerald-800/40 text-xs">
          <template v-if="product.skin_match_score !== null && product.skin_match_score !== undefined">
            <div v-for="(reason, i) in (product.match_reasons || [])" :key="i" class="flex items-start gap-2.5 text-emerald-900 dark:text-emerald-200">
              <span class="w-2.5 h-2.5 rounded-full bg-brand-primary mt-1 flex-shrink-0"></span>
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
      :has-checked="hasCheckedSafety"
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
