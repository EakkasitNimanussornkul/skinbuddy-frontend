<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { searchProducts } from '../../api/products'
import { addToShelf, analyzeProduct } from '../../api/shelfapi'
import { useToast } from '../../composables/useToast'

// Import our new, decoupled child components
import CatalogSearchView from '../Catalog/CatalogSearchView.vue'
import ProductConfigurator from './ProductConfigurator.vue'
import SafetyWarningModal from './SafetyWarningModal.vue'

const emit = defineEmits(['close', 'refresh'])
const { addToast } = useToast()

// --- Core State ---
const masterCatalog = ref<any[]>([])
const isLoading = ref(true)
const selectedProduct = ref<any>(null)

// --- Safety Intercept State ---
const isAnalyzing = ref(false)
const showWarningModal = ref(false)
const analysisWarnings = ref<any[]>([])
const pendingPayload = ref<any>(null) // Caches the user's form choices if a warning pauses the save

// --- Initialization ---
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

// --- Transaction Controller ---
const handleSave = async (configPayload: any, forceSave = false) => {
  // 1. Check Safety Matrix (Unless Bypassed)
  if (!forceSave) {
    isAnalyzing.value = true
    try {
      const analysis = await analyzeProduct(selectedProduct.value.id)
      if (!analysis.is_safe) {
        analysisWarnings.value = analysis.warnings
        pendingPayload.value = configPayload // Preserve the configuration payload
        showWarningModal.value = true
        isAnalyzing.value = false
        return // Halt the save pipeline
      }
    } catch (error) {
      console.error("Analysis failed", error)
    }
    isAnalyzing.value = false
  }

  // 2. Commit to Database
  const payloadToSave = forceSave ? pendingPayload.value : configPayload

  try {
    const today = new Date().toISOString().split('T')[0]

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
    console.error("Failed to add:", error)
    addToast('Failed to save product. Please try again.', 'error')
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-brand-bg-light dark:bg-brand-bg-dark overflow-hidden animate-slide-up">

    <div class="bg-brand-surface-light dark:bg-brand-surface-dark border-b border-stone-200 dark:border-stone-800 px-4 py-4 flex justify-between items-center shadow-sm z-10">
      <h2 class="text-lg font-serif font-bold text-brand-text dark:text-white">Add New Product</h2>
      <button @click="emit('close')" class="w-8 h-8 flex items-center justify-center bg-stone-100 dark:bg-stone-800 rounded-full text-stone-500 dark:text-stone-300 font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 sm:p-6 hide-scrollbar">
      <div class="max-w-md sm:max-w-2xl lg:max-w-4xl w-full mx-auto h-full flex flex-col">

        <CatalogSearchView
          v-if="!selectedProduct"
          :catalog="masterCatalog"
          :isLoading="isLoading"
          @select-product="selectedProduct = $event"
        />

        <ProductConfigurator
          v-else
          :product="selectedProduct"
          :isAnalyzing="isAnalyzing"
          @cancel="selectedProduct = null"
          @save="handleSave($event, false)"
        />

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
/* Hide scrollbar on touch devices (mobile) but keep it visible and styled on desktop */

@media (pointer: fine) {
  .hide-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .hide-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .hide-scrollbar::-webkit-scrollbar-thumb {
    background-color: #d6d3d1;
    border-radius: 20px;
  }
  .dark .hide-scrollbar::-webkit-scrollbar-thumb {
    background-color: #44403c;
  }
}
.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
</style>
