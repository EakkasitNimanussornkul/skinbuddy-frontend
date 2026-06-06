<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { searchProducts } from '../api/products'
import { addToShelf, analyzeProduct } from '../api/shelfapi'
import SearchResultCard from './SearchResultCard.vue'
import { useToast } from '../composables/useToast'
import SafetyWarningModal from './SafetyWarningModal.vue'
const emit = defineEmits(['close', 'refresh'])
const { addToast } = useToast()

// --- State ---
const masterCatalog = ref<any[]>([]) // Holds ALL products permanently
const isLoading = ref(true)

// --- Filter State ---
const searchQuery = ref('')
const selectedCategory = ref('All')
const selectedBrand = ref('All')

// --- Configuration State ---
const selectedProduct = ref<any>(null)
const expirationDate = ref('')
const selectedPAO = ref<number | null>(null)
const isOpened = ref(true)

// --- Warning Modal State ---
const isAnalyzing = ref(false)
const analysisWarnings = ref<any[]>([])
const showWarningModal = ref(false)

// --- Initial Fetch (Get EVERYTHING on open) ---
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

// --- Fully Dynamic Filters ---
const uniqueCategories = computed(() => {
  const coreCategories = ['Cleanser', 'Toner', 'Serum', 'Moisturizer', 'Sunscreen', 'Treatment', 'Mask', 'Face Oil', 'Eye Cream']
  const dbCategories = masterCatalog.value.map(p => p.category).filter(Boolean)
  return ['All', ...new Set([...coreCategories, ...dbCategories])]
})

const uniqueBrands = computed(() => {
  const brands = masterCatalog.value.map(p => p.brand).filter(Boolean)
  const sortedBrands = [...new Set(brands)].sort((a, b) => a.localeCompare(b))
  return ['All', ...sortedBrands]
})

// --- Instant Local Filtering ---
const filteredProducts = computed(() => {
  return masterCatalog.value.filter(product => {
    const safeQuery = searchQuery.value.toLowerCase().trim()
    const matchesSearch = !safeQuery ||
      (product.name && product.name.toLowerCase().includes(safeQuery)) ||
      (product.brand && product.brand.toLowerCase().includes(safeQuery))

    const matchesCategory = selectedCategory.value === 'All' || product.category === selectedCategory.value
    const matchesBrand = selectedBrand.value === 'All' || product.brand === selectedBrand.value

    return matchesSearch && matchesCategory && matchesBrand
  })
})

// --- Actions ---
const selectProduct = (product: any) => {
  selectedProduct.value = product
}

const clearSelection = () => {
  selectedProduct.value = null
  isOpened.value = true
  selectedPAO.value = null
  expirationDate.value = ''
}

const setPAO = (months: number) => {
  selectedPAO.value = months
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  expirationDate.value = d.toISOString().split('T')[0]
}

const handleAddToShelf = async (forceSave = false) => {
  if (!selectedProduct.value) return

  // 1. Run Safety Analysis if not forcing
  if (!forceSave) {
    isAnalyzing.value = true
    try {
      const analysis = await analyzeProduct(selectedProduct.value.id)
      if (!analysis.is_safe) {
        analysisWarnings.value = analysis.warnings
        showWarningModal.value = true
        isAnalyzing.value = false
        return // Stop the save process and wait for user input
      }
    } catch (error) {
      console.error("Analysis failed", error)
    }
    isAnalyzing.value = false
  }

  // 2. Save to Shelf
  try {
    const today = new Date().toISOString().split('T')[0]

    await addToShelf({
      product_id: selectedProduct.value.id,
      status: '', // We leave legacy status empty
      usage_state: isOpened.value ? 'active' : 'unopened', //  The dynamic state
      opened_date: isOpened.value ? today : null,
      expiration_date: isOpened.value ? (expirationDate.value || null) : null,
      pao: selectedPAO.value
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

    <!-- Header -->
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark border-b border-stone-200 dark:border-stone-800 px-4 py-4 flex justify-between items-center shadow-sm z-10">
      <h2 class="text-lg font-serif font-bold text-brand-text dark:text-white">Add New Product</h2>
      <button @click="emit('close')" class="w-8 h-8 flex items-center justify-center bg-stone-100 dark:bg-stone-800 rounded-full text-stone-500 dark:text-stone-300 font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 sm:p-6 hide-scrollbar">
      <div class="max-w-md mx-auto h-full flex flex-col">

        <!-- Step 1: Search Catalog (Restored!) -->
        <template v-if="!selectedProduct">
          <div class="mb-6 relative">
            <label class="block text-xs font-bold text-brand-primary dark:text-orange-400 uppercase tracking-wider mb-2">Search Catalog</label>

            <!-- Search Bar -->
            <div class="relative mb-4">
              <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Type a brand or product name..."
                class="w-full bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-700 text-brand-text dark:text-white pl-11 pr-12 py-3.5 rounded-2xl focus:outline-none focus:border-brand-primary transition-colors shadow-sm text-base"
              />
              <button v-if="searchQuery" @click="searchQuery = ''" class="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-brand-primary">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <!-- Category & Brand Dropdowns -->
            <div class="grid grid-cols-2 gap-3 mb-6">
              <div class="relative">
                <select v-model="selectedCategory" class="w-full appearance-none bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-sm rounded-xl px-4 py-2.5 pr-10 outline-none shadow-sm cursor-pointer focus:ring-2 focus:ring-brand-primary transition-all">
                  <option v-for="cat in uniqueCategories" :key="cat" :value="cat">{{ cat === 'All' ? 'Category' : cat }}</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-stone-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              <div class="relative">
                <select v-model="selectedBrand" class="w-full appearance-none bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-sm rounded-xl px-4 py-2.5 pr-10 outline-none shadow-sm cursor-pointer focus:ring-2 focus:ring-brand-primary transition-all">
                  <option v-for="brand in uniqueBrands" :key="brand" :value="brand">{{ brand === 'All' ? 'Brand' : brand }}</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-stone-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <!-- Loading & Empty States -->
            <div v-if="isLoading" class="flex flex-col items-center justify-center py-12 text-stone-400 animate-pulse">
              <div class="w-8 h-8 border-4 border-stone-200 border-t-brand-primary rounded-full animate-spin mb-4"></div>
              <p class="text-xs font-bold uppercase tracking-widest">Loading Catalog...</p>
            </div>

            <ul v-else-if="filteredProducts.length > 0" class="space-y-3">
              <SearchResultCard
                v-for="product in filteredProducts"
                :key="product.id"
                :product="product"
                @select="selectProduct(product)"
              />
            </ul>

            <div v-else class="p-8 text-center flex flex-col items-center justify-center animate-fade-in mt-10">
              <svg class="w-12 h-12 mb-4 text-stone-300 dark:text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
              <p class="text-sm font-bold text-brand-text dark:text-stone-200 mb-1">No products found</p>
              <p class="text-xs text-stone-500 dark:text-stone-400 max-w-[200px] leading-relaxed">
                Adjust your filters or try a different search term.
              </p>
              <button v-if="searchQuery || selectedCategory !== 'All' || selectedBrand !== 'All'" @click="searchQuery = ''; selectedCategory = 'All'; selectedBrand = 'All'" class="mt-4 text-brand-primary font-bold text-sm">Clear Filters</button>
            </div>
          </div>
        </template>

        <!-- Step 2: Configure Product -->
        <div v-else class="space-y-6 animate-fade-in pb-10">
          <div class="flex items-center gap-3 mb-2">
             <button @click="clearSelection" class="p-2 -ml-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h3 class="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Configure Product</h3>
          </div>

          <div class="bg-white dark:bg-stone-900 rounded-2xl border border-brand-primary-light dark:border-stone-800 p-4 shadow-sm flex items-start gap-4">
            <div class="w-16 h-16 bg-stone-50 dark:bg-stone-800 rounded-xl p-1 border border-stone-200 dark:border-stone-700 flex items-center justify-center flex-shrink-0">
              <img v-if="selectedProduct.image_url" :src="selectedProduct.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal p-1" />
              <svg v-else class="w-8 h-8 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <div>
              <p class="text-xs text-brand-primary dark:text-orange-400 font-bold uppercase tracking-wider">{{ selectedProduct.brand }}</p>
              <p class="text-base font-bold text-brand-text dark:text-white leading-tight mb-1">{{ selectedProduct.name }}</p>
              <span class="text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-md">{{ selectedProduct.category }}</span>
            </div>
          </div>

          <!-- Note: The Routine Placement (AM/PM) block has been permanently removed here as per Option C! -->

          <div class="p-4 rounded-xl border border-stone-200 dark:border-stone-700 mb-4 bg-brand-bg-light dark:bg-stone-800/50 transition-all">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-bold text-brand-text dark:text-white">Have you opened this product?</h4>
              <div class="flex items-center gap-3">
                <span class="text-xs font-bold w-6 text-right" :class="isOpened ? 'text-brand-primary dark:text-orange-400' : 'text-stone-400'">{{ isOpened ? 'YES' : 'NO' }}</span>
                <button @click="isOpened = !isOpened" class="w-12 h-6 rounded-full relative transition-colors" :class="isOpened ? 'bg-brand-primary' : 'bg-stone-300 dark:bg-stone-600'">
                  <div class="w-4 h-4 bg-white rounded-full absolute top-1 transition-transform" :class="isOpened ? 'right-1' : 'left-1'"></div>
                </button>
              </div>
            </div>
            <div v-if="!isOpened" class="mt-3 border-t border-stone-200 dark:border-stone-700 pt-3 flex items-start gap-2 animate-fade-in">
              <svg class="w-4 h-4 text-stone-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              <p class="text-xs text-stone-500 dark:text-stone-400 leading-relaxed"><strong class="text-stone-700 dark:text-stone-300">Keep it sealed!</strong> Select the PAO below. We will save it as "Unopened" and you can start the countdown later.</p>
            </div>
          </div>

          <div class="mb-4 transition-all">
            <label class="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Expiration Tracking</label>
            <div class="flex gap-2 mb-3">
              <button @click="setPAO(3)" :class="selectedPAO === 3 ? 'bg-stone-800 text-white border-stone-800' : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'" class="flex-1 py-2 rounded-lg text-xs font-bold border hover:border-stone-400 transition-colors shadow-sm">3M</button>
              <button @click="setPAO(6)" :class="selectedPAO === 6 ? 'bg-stone-800 text-white border-stone-800' : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'" class="flex-1 py-2 rounded-lg text-xs font-bold border hover:border-stone-400 transition-colors shadow-sm">6M</button>
              <button @click="setPAO(12)" :class="selectedPAO === 12 ? 'bg-stone-800 text-white border-stone-800' : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'" class="flex-1 py-2 rounded-lg text-xs font-bold border hover:border-stone-400 transition-colors shadow-sm">12M</button>
            </div>
            <div v-if="isOpened" class="animate-fade-in">
              <input v-model="expirationDate" type="date" class="w-full bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-700 text-brand-text dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:border-brand-primary transition-colors shadow-sm" />
            </div>
          </div>

          <div class="pt-4 pb-10">
            <button @click="handleAddToShelf(false)" class="w-full bg-brand-primary text-white font-bold py-4 rounded-xl shadow-lg hover:bg-orange-800 active:scale-[0.98] transition-all text-lg flex items-center justify-center gap-2">
              <svg v-if="isAnalyzing" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              {{ isAnalyzing ? 'Analyzing Safety...' : 'Save to My Shelf' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 3: Safety Warning Modal (Restored!) -->
<Teleport to="body">
    <SafetyWarningModal
      v-if="showWarningModal"
      :warnings="analysisWarnings"
      @cancel="showWarningModal = false"
      @proceed="handleAddToShelf(true)"
    />
  </Teleport>
</template>


<style scoped>
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
</style>
