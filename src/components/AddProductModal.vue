<script setup lang="ts">
import { ref } from 'vue'
import { searchProducts, addToShelf, analyzeProduct } from '../api/shelfapi'
import SearchResultCard from './SearchResultCard.vue'

const emit = defineEmits(['close', 'refresh'])

// --- Local State ---
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const isSearching = ref(false)
const searchTimeout = ref<any>(null)

const selectedProduct = ref<any>(null)
const selectedStatus = ref('Morning')
const expirationDate = ref('')
const selectedPAO = ref<number | null>(null)
const isOpened = ref(true)

// --- Warning Modal State ---
const isAnalyzing = ref(false)
const analysisWarnings = ref<any[]>([])
const showWarningModal = ref(false)

// --- Methods ---
const handleSearchInput = () => {
  if (searchTimeout.value) clearTimeout(searchTimeout.value)
  if (searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }
  isSearching.value = true
  searchTimeout.value = setTimeout(async () => {
    try {
      searchResults.value = await searchProducts(searchQuery.value)
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      isSearching.value = false
    }
  }, 300)
}

const selectProduct = (product: any) => {
  selectedProduct.value = product
  searchQuery.value = product.name
  searchResults.value = []
}

const setPAO = (months: number) => {
  selectedPAO.value = months
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  expirationDate.value = d.toISOString().split('T')[0]
}

const handleAddToShelf = async (forceSave = false) => {
  if (!selectedProduct.value) return

  if (!forceSave) {
    isAnalyzing.value = true
    try {
      const analysis = await analyzeProduct(selectedProduct.value.id)
      if (!analysis.is_safe) {
        analysisWarnings.value = analysis.warnings
        showWarningModal.value = true
        isAnalyzing.value = false
        return
      }
    } catch (error) {
      console.error("Analysis failed", error)
    }
    isAnalyzing.value = false
  }

  try {
    const today = new Date().toISOString().split('T')[0]
    await addToShelf({
      product_id: selectedProduct.value.id,
      status: selectedStatus.value,
      opened_date: isOpened.value ? today : null,
      expiration_date: isOpened.value ? (expirationDate.value || null) : null,
      pao: selectedPAO.value
    })

    // Success! Tell parent to refresh the list and close the modal
    emit('refresh')
    emit('close')
  } catch (error) {
    console.error("Failed to add:", error)
    alert("Could not add product.")
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-clinical-bg overflow-hidden animate-slide-up">
    <div class="bg-white dark:bg-clinical-surface border-b border-slate-100 dark:border-slate-800 px-4 py-4 flex justify-between items-center shadow-sm z-10">
      <h2 class="text-lg font-bold text-slate-900 dark:text-white">Add New Product</h2>
      <button @click="emit('close')" class="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-300 font-bold hover:bg-slate-200 transition-colors">✕</button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 sm:p-6">
      <div class="max-w-md mx-auto">

        <div class="mb-6 relative">
          <label class="block text-xs font-bold text-[#2E5BFF] uppercase tracking-wider mb-2">Search Master Catalog</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
            <input
              v-model="searchQuery"
              @input="handleSearchInput"
              type="text"
              placeholder="Type a brand or product name..."
              class="w-full bg-white dark:bg-clinical-surface border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-[#2E5BFF] transition-colors shadow-sm text-lg"
            />
          </div>

          <ul v-if="searchResults.length > 0 && !selectedProduct" class="absolute z-20 w-full mt-2 bg-white dark:bg-clinical-surface border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            <SearchResultCard
              v-for="product in searchResults"
              :key="product.id"
              :product="product"
              @select="selectProduct(product)"
            />
          </ul>
        </div>

        <div v-if="selectedProduct" class="space-y-6 animate-fade-in">

          <div class="bg-white dark:bg-clinical-surface rounded-2xl border border-blue-100 dark:border-[#2E5BFF]/30 p-4 shadow-sm relative overflow-hidden">
            <div class="flex items-start gap-4">
              <div class="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-slate-100 dark:border-slate-700">
                <img v-if="selectedProduct.image_url" :src="selectedProduct.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                <div v-else class="w-full h-full flex items-center justify-center text-2xl">✨</div>
              </div>
              <div>
                <p class="text-xs text-[#2E5BFF] font-bold uppercase tracking-wider">{{ selectedProduct.brand }}</p>
                <p class="text-base font-bold text-slate-900 dark:text-white leading-tight mb-1">{{ selectedProduct.name }}</p>
                <span class="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">{{ selectedProduct.category }}</span>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Routine Placement</label>
            <div class="grid grid-cols-3 gap-3">
              <button @click="selectedStatus = 'Morning'" :class="selectedStatus === 'Morning' ? 'bg-[#2E5BFF] text-white' : 'bg-white text-slate-600'" class="py-3 px-2 rounded-xl border font-semibold text-sm transition-colors flex flex-col items-center gap-1">☀️ AM</button>
              <button @click="selectedStatus = 'Evening'" :class="selectedStatus === 'Evening' ? 'bg-[#2E5BFF] text-white' : 'bg-white text-slate-600'" class="py-3 px-2 rounded-xl border font-semibold text-sm transition-colors flex flex-col items-center gap-1">🌙 PM</button>
              <button @click="selectedStatus = 'Both'" :class="selectedStatus === 'Both' ? 'bg-[#2E5BFF] text-white' : 'bg-white text-slate-600'" class="py-3 px-2 rounded-xl border font-semibold text-sm transition-colors flex flex-col items-center gap-1">☀️🌙 Both</button>
            </div>
          </div>

          <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 bg-slate-50 dark:bg-slate-800/50">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-bold text-slate-900 dark:text-white">Have you opened this product?</h4>
              <div class="flex items-center gap-3">
                <span class="text-xs font-bold w-6 text-right" :class="isOpened ? 'text-[#2E5BFF]' : 'text-slate-400'">{{ isOpened ? 'YES' : 'NO' }}</span>
                <button @click="isOpened = !isOpened" class="w-12 h-6 rounded-full relative transition-colors" :class="isOpened ? 'bg-[#2E5BFF]' : 'bg-slate-300'">
                  <div class="w-4 h-4 bg-white rounded-full absolute top-1 transition-transform" :class="isOpened ? 'right-1' : 'left-1'"></div>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Expiration Tracking</label>
            <div class="flex gap-2 mb-3">
              <button @click="setPAO(3)" :class="selectedPAO === 3 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'" class="flex-1 py-2 rounded-lg text-xs font-bold">3M</button>
              <button @click="setPAO(6)" :class="selectedPAO === 6 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'" class="flex-1 py-2 rounded-lg text-xs font-bold">6M</button>
              <button @click="setPAO(12)" :class="selectedPAO === 12 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'" class="flex-1 py-2 rounded-lg text-xs font-bold">12M</button>
            </div>
            <input v-model="expirationDate" type="date" class="w-full bg-white border-2 border-slate-200 px-4 py-3 rounded-xl focus:border-[#2E5BFF]" />
          </div>

          <div class="pt-4 pb-10">
            <button @click="handleAddToShelf(false)" class="w-full bg-[#2E5BFF] text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-colors text-lg">
              {{ isAnalyzing ? 'Analyzing Safety...' : 'Save to My Shelf' }}
            </button>
          </div>

        </div>
      </div>
    </div>
  </div>

  <div v-if="showWarningModal" class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
    <div class="bg-white dark:bg-clinical-surface w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-red-100">
      <div class="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
        <div class="w-16 h-16 bg-white text-red-500 rounded-full flex items-center justify-center text-3xl shadow-sm mb-4 border border-red-100">⚠️</div>
        <h2 class="text-xl font-bold text-slate-900">Interaction Alert</h2>
        <p class="text-xs font-semibold text-red-600 mt-1">SkinBuddy detected a potential issue.</p>
      </div>
      <div class="p-6 max-h-60 overflow-y-auto space-y-3">
        <div v-for="(warning, index) in analysisWarnings" :key="index" class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-orange-100 text-orange-700">{{ warning.alert_type }}</span>
          <p class="text-sm text-slate-700 mt-2">{{ warning.message }}</p>
        </div>
      </div>
      <div class="p-4 grid grid-cols-2 gap-3 bg-slate-50 border-t border-slate-100">
        <button @click="showWarningModal = false" class="py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200">Cancel</button>
        <button @click="handleAddToShelf(true)" class="py-3 rounded-xl font-bold text-white bg-red-600">Proceed Anyway</button>
      </div>
    </div>
  </div>
</template>
