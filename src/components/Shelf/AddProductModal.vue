<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { searchProducts } from '../../api/products'
import { addToShelf, analyzeProduct } from '../../api/shelfapi'
import { resolveSafety, blocksAction } from '../../api/safety'
import { toLocalDateString } from '../../api/dates'
import { useToast } from '../../composables/useToast'

import CatalogSearchView from '../Catalog/CatalogSearchView.vue'
import ProductConfigurator from './ProductConfigurator.vue'
import SafetyWarningModal from './SafetyWarningModal.vue'

const emit = defineEmits(['close', 'refresh'])
const { addToast } = useToast()

const masterCatalog = ref<any[]>([])
const isLoading = ref(true)
const selectedProduct = ref<any>(null)

const isAnalyzing = ref(false)
const showWarningModal = ref(false)
const analysisWarnings = ref<any[]>([])
const pendingPayload = ref<any>(null)

onMounted(async () => {
  isLoading.value = true
  try {
    const data = await searchProducts('')
    masterCatalog.value = data || []
  } catch (error) {
    console.error("Failed to load catalog:", error)
  } finally {
    isLoading.value = false
  }
})

const handleSave = async (configPayload: any, forceSave = false) => {
  if (!forceSave) {
    isAnalyzing.value = true
    const outcome = await resolveSafety(() => analyzeProduct(selectedProduct.value.id))
    isAnalyzing.value = false

    if (blocksAction(outcome)) {
      // A check that could not run must not save. Previously the catch here
      // only logged, so control fell through to addToShelf and the product was
      // committed unchecked while the user was told it succeeded.
      if (outcome.status === 'unavailable') {
        addToast('Failed to analyze product. Please try again.', 'error')
        return
      }

      analysisWarnings.value = outcome.warnings
      pendingPayload.value = configPayload
      showWarningModal.value = true
      return
    }
  }

  const payloadToSave = forceSave ? pendingPayload.value : configPayload

  try {
    // Local calendar day. Under toISOString() this recorded the product as
    // opened yesterday for the whole local morning east of UTC.
    const today = toLocalDateString()
    await addToShelf({
      product_id: selectedProduct.value.id,
      usage_state: payloadToSave.isOpened ? 'active' : 'unopened',
      opened_date: payloadToSave.isOpened ? today : null,
      expiration_date: payloadToSave.isOpened ? (payloadToSave.expirationDate || null) : null,
      pao: payloadToSave.selectedPao
    })
    addToast('Successfully added to your shelf!', 'success')
    emit('refresh')
    emit('close')
  } catch (error) {
    addToast('Failed to save product. Please try again.', 'error')
  }
}
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in lg:p-6" @touchmove.stop>

    <!-- Modal Container: Strict h-full on mobile prevents body scroll bleeding -->
    <div class="w-full h-full lg:h-[85vh] lg:max-w-6xl bg-brand-surface-light dark:bg-brand-surface-dark lg:rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl relative animate-slide-up lg:animate-scale-in">

      <!-- Mobile Only Header -->
      <div class="lg:hidden shrink-0 border-b border-brand-surface-border dark:border-stone-800 px-5 py-4 flex justify-between items-center z-20 bg-brand-surface-light dark:bg-brand-surface-dark">
        <h2 class="text-lg font-serif font-bold text-brand-text dark:text-white">
          {{ selectedProduct ? 'Configure Product' : 'Add New Product' }}
        </h2>
        <button @click="emit('close')" class="w-8 h-8 flex items-center justify-center bg-brand-surface-border/40 dark:bg-stone-800 rounded-full text-brand-text-muted hover:bg-brand-surface-border/80 transition-colors">
          <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Desktop Only Absolute Close Button -->
      <button @click="emit('close')" class="hidden lg:flex absolute top-6 right-6 w-10 h-10 items-center justify-center bg-brand-surface-border/30 dark:bg-stone-800 rounded-full text-brand-text-muted hover:bg-brand-surface-border/80 hover:text-brand-text dark:hover:text-white transition-all z-50 backdrop-blur-md">
        <svg class="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>

      <!-- Flex Grid Split Layout (Crucial min-h-0 locks the scroll container) -->
      <div class="flex-1 min-h-0 flex flex-col lg:flex-row w-full h-full overflow-hidden">

        <!-- Left Panel: Search Catalog -->
        <div class="w-full lg:w-[45%] xl:w-[40%] h-full flex-col min-h-0 border-r border-brand-surface-border dark:border-stone-800 bg-brand-surface-light dark:bg-brand-surface-dark transition-all"
             :class="selectedProduct ? 'hidden lg:flex' : 'flex'">
          <CatalogSearchView
            :catalog="masterCatalog"
            :isLoading="isLoading"
            @select-product="selectedProduct = $event"
            class="flex-1 min-h-0 overflow-hidden"
          />
        </div>

        <!-- Right Panel: Configurator -->
        <div class="w-full lg:w-[55%] xl:w-[60%] h-full flex-col min-h-0 bg-brand-surface-light dark:bg-brand-surface-dark relative transition-all"
             :class="!selectedProduct ? 'hidden lg:flex' : 'flex'">

          <ProductConfigurator
            v-if="selectedProduct"
            :product="selectedProduct"
            :isAnalyzing="isAnalyzing"
            @cancel="selectedProduct = null"
            @save="handleSave($event, false)"
            class="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-10 hide-scrollbar overscroll-contain"
          />

          <!-- Desktop Empty State when nothing is selected -->
          <div v-else class="hidden lg:flex flex-1 min-h-0 flex-col items-center justify-center p-12 text-center bg-brand-bg-light dark:bg-brand-bg-dark">
            <div class="w-24 h-24 mb-6 rounded-full bg-brand-surface-light dark:bg-stone-900 border-2 border-brand-surface-border dark:border-stone-800 flex items-center justify-center shadow-sm">
              <svg class="w-10 h-10 text-brand-text-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <h3 class="text-xl font-serif font-bold text-brand-text dark:text-white mb-2">Configure Your Product</h3>
            <p class="text-sm text-brand-text-muted max-w-sm">Select an item from the catalog on the left to set its expiration timer and analyze ingredient safety.</p>
          </div>

        </div>
      </div>

    </div>
  </div>

  <Teleport to="body">
    <SafetyWarningModal
      v-if="showWarningModal"
      :warnings="analysisWarnings"
      @cancel="showWarningModal = false"
      @proceed="handleSave(null, true)"
    />
  </Teleport>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-scale-in { animation: scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.96) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }

@media (pointer: fine) {
  .hide-scrollbar::-webkit-scrollbar { width: 6px; }
  .hide-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .hide-scrollbar::-webkit-scrollbar-thumb { background-color: var(--color-brand-surface-border); border-radius: 20px; }
  .dark .hide-scrollbar::-webkit-scrollbar-thumb { background-color: var(--color-brand-text-muted); }
}
</style>
