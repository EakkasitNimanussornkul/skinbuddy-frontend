<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { searchProducts, getMyShelf, addToShelf, removeFromShelf, analyzeProduct, markItemOpened } from '../api/shelfapi'
const myShelf = ref<any[]>([])
const isAddModalOpen = ref(false)
const viewingItem = ref<any>(null) // NEW: Tracks which product details are open
const isLoading = ref(true)

// Modal Form State
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const isSearching = ref(false)
const searchTimeout = ref<any>(null)

const selectedProduct = ref<any>(null)
const selectedStatus = ref('Morning')
const expirationDate = ref('')
const selectedPAO = ref<number | null>(null)
const isOpened = ref(true)
const isAnalyzing = ref(false)
const analysisWarnings = ref<any[]>([])
const showWarningModal = ref(false)

// --- Fetch Initial Data ---
const fetchShelf = async () => {
  isLoading.value = true
  try {
    myShelf.value = await getMyShelf()
  } catch (error) {
    console.error("Failed to load shelf:", error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchShelf()
})

// --- Smart Search Logic ---
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

// --- PAO Calculator ---
const setPAO = (months: number) => {
  selectedPAO.value = months
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  // Format as YYYY-MM-DD for the HTML date input
  expirationDate.value = d.toISOString().split('T')[0] || ''
}

const handleAddToShelf = async (forceSave = false) => {
  if (!selectedProduct.value) return

  // 1. SAFETY CHECK: If we haven't forced a save, run the safety analysis first
  if (!forceSave) {
    isAnalyzing.value = true
    try {
      const analysis = await analyzeProduct(selectedProduct.value.id)

      // If it's not safe, stop the save and show the warning modal!
      if (!analysis.is_safe) {
        analysisWarnings.value = analysis.warnings
        showWarningModal.value = true
        isAnalyzing.value = false
        return
      }
    } catch (error) {
      console.error("Analysis failed, proceeding with caution.", error)
    }
    isAnalyzing.value = false
  }

  // 2. SAVING: If it IS safe, or if the user clicked "Proceed Anyway", save it!
  try {
    // Grab today's date formatted perfectly for the database (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];

    await addToShelf({
      product_id: selectedProduct.value.id,
      status: selectedStatus.value,

      opened_date: isOpened.value ? today : null,

      expiration_date: isOpened.value ? (expirationDate.value || null) : null,

      pao: selectedPAO.value
    })

    closeAddModal()
    showWarningModal.value = false
    fetchShelf()
  } catch (error) {
    console.error("Failed to add to shelf:", error)
    alert("Could not add product.")
  }
}
// --- Start PAO Clock ---
const handleStartPAO = async () => {
  if (!viewingItem.value || !viewingItem.value.pao) return;

  // Get today's date
  const today = new Date();
  const openedDateStr = today.toISOString().split('T')[0];

  // Calculate the future expiration date by adding the PAO months
  const expDate = new Date();
  expDate.setMonth(expDate.getMonth() + viewingItem.value.pao);
  const expDateStr = expDate.toISOString().split('T')[0];

  try {
    // Send to database
    await markItemOpened(viewingItem.value.id, openedDateStr, expDateStr);

    // Update the UI instantly without needing a full reload
    viewingItem.value.opened_date = openedDateStr;
    viewingItem.value.expiration_date = expDateStr;

    // Refresh the background shelf so the main list updates too
    fetchShelf();
  } catch (error) {
    console.error("Failed to start PAO", error);
    alert("Could not update product status.");
  }
};

const handleDelete = async (itemId: string) => {
  if (!confirm("Remove this item from your shelf?")) return
  try {
    await removeFromShelf(itemId)
    myShelf.value = myShelf.value.filter(item => item.id !== itemId)
    viewingItem.value = null // Close details if open
  } catch (error) {
    console.error("Failed to delete:", error)
  }
}

// --- Modal Controls ---
const openAddModal = () => isAddModalOpen.value = true
const closeAddModal = () => {
  isAddModalOpen.value = false
  searchQuery.value = ''
  searchResults.value = []
  selectedProduct.value = null
  selectedStatus.value = 'Morning'
  expirationDate.value = ''
  selectedPAO.value = null
  isOpened.value = true
}

const openDetails = (item: any) => viewingItem.value = item
const closeDetails = () => viewingItem.value = null
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-clinical-bg pt-6 pb-28 font-sans transition-colors duration-300">
    <div class="max-w-md mx-auto px-4 sm:px-6">

      <div class="flex justify-between items-center mb-8 pt-4">
        <h1 class="text-3xl font-serif font-bold text-slate-900 dark:text-white">My Shelf</h1>
        <button @click="openAddModal" class="w-12 h-12 bg-[#2E5BFF] text-white rounded-full flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors">
          +
        </button>
      </div>

      <div v-if="isLoading" class="text-center py-10 text-slate-500 animate-pulse">
        Loading your skincare shelf...
      </div>

      <div v-else-if="myShelf.length === 0" class="bg-white dark:bg-clinical-surface rounded-3xl p-10 text-center border border-slate-100 dark:border-slate-800 shadow-sm mt-10">
        <div class="text-5xl mb-6">🧴</div>
        <h3 class="text-xl font-bold text-slate-800 dark:text-white mb-2">Your shelf is empty</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">Start adding products to build your perfect skincare routine and track expirations.</p>
        <button @click="openAddModal" class="px-8 py-3.5 bg-[#2E5BFF] text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-colors w-full">
          Add First Product
        </button>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="item in myShelf"
          :key="item.id"
          @click="openDetails(item)"
          class="bg-white dark:bg-clinical-surface rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
        >

          <div class="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-100 dark:border-slate-700 p-1">
            <img v-if="item.products?.image_url" :src="item.products.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
            <span v-else class="text-2xl">🧴</span>
          </div>

          <div class="flex-grow pr-8">
            <p class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
              {{ item.products?.brand || 'Unknown Brand' }}
            </p>
            <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight mb-2 line-clamp-1">
              {{ item.products?.name || 'Unknown Product' }}
            </h4>
           <div class="flex gap-2 items-center mt-1 flex-wrap">
              <span class="text-[10px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1"
                :class="item.status === 'Morning' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : (item.status === 'Evening' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')"
              >
                {{ item.status === 'Morning' ? '☀️' : (item.status === 'Evening' ? '🌙' : '☀️/🌙') }} {{ item.status }}
              </span>

              <span v-if="item.opened_date && item.expiration_date" class="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-md font-semibold border border-red-100 dark:border-red-900/30">
                Exp: {{ item.expiration_date }}
              </span>

              <span v-else-if="!item.opened_date" class="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md font-semibold border border-slate-200 dark:border-slate-700">
                🔒 Unopened
              </span>

              <span v-if="item.pao && !item.opened_date" class="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-[#2E5BFF] dark:text-blue-400 px-2 py-0.5 rounded-md font-bold border border-blue-100 dark:border-blue-900/30 flex items-center gap-1 shadow-sm">
                ⏳ {{ item.pao }}M PAO
              </span>
            </div>
          </div>

          <button @click.stop="handleDelete(item.id)" class="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
            ✕
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="isAddModalOpen" class="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-clinical-bg overflow-hidden animate-slide-up">

        <div class="bg-white dark:bg-clinical-surface border-b border-slate-100 dark:border-slate-800 px-4 py-4 flex justify-between items-center shadow-sm z-10">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white">Add New Product</h2>
          <button @click="closeAddModal" class="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-300 font-bold">✕</button>
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
                <li
                  v-for="product in searchResults"
                  :key="product.id"
                  @click="selectProduct(product)"
                  class="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-4"
                >
                  <div class="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-lg p-1 flex-shrink-0">
                    <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"/>
                    <div v-else class="w-full h-full flex items-center justify-center text-xl">🧴</div>
                  </div>
                  <div>
                    <div class="text-[10px] font-bold text-[#2E5BFF] uppercase mb-0.5">{{ product.brand }}</div>
                    <div class="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">{{ product.name }}</div>
                  </div>
                </li>
              </ul>
            </div>

            <div v-if="selectedProduct" class="space-y-6 animate-fade-in">

              <div class="bg-white dark:bg-clinical-surface rounded-2xl border border-blue-100 dark:border-[#2E5BFF]/30 p-4 shadow-sm relative overflow-hidden">
                <div class="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-[#2E5BFF]/10 rounded-bl-full -z-10"></div>

                <div class="flex items-start gap-4 mb-4">
                  <div class="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-slate-100 dark:border-slate-700">
                    <img v-if="selectedProduct.image_url" :src="selectedProduct.image_url" class="w-full h-full object-contain" />
                    <div v-else class="w-full h-full flex items-center justify-center text-2xl">✨</div>
                  </div>
                  <div>
                    <p class="text-xs text-[#2E5BFF] font-bold uppercase tracking-wider">{{ selectedProduct.brand }}</p>
                    <p class="text-base font-bold text-slate-900 dark:text-white leading-tight mb-1">{{ selectedProduct.name }}</p>
                    <span class="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">{{ selectedProduct.category }}</span>
                  </div>
                </div>

                <div v-if="selectedProduct.ingredients" class="mt-4">
                  <p class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Ingredients Formula</p>
                  <div class="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl max-h-24 overflow-y-auto text-xs text-slate-600 dark:text-slate-400 leading-relaxed border border-slate-100 dark:border-slate-800">
                    {{ selectedProduct.ingredients }}
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Routine Placement</label>
                <div class="grid grid-cols-3 gap-3">
                  <button @click="selectedStatus = 'Morning'" :class="selectedStatus === 'Morning' ? 'bg-[#2E5BFF] text-white border-[#2E5BFF]' : 'bg-white dark:bg-clinical-surface text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'" class="py-3 px-2 rounded-xl border font-semibold text-sm transition-colors flex flex-col items-center gap-1">
                    <span class="text-lg">☀️</span> AM
                  </button>
                  <button @click="selectedStatus = 'Evening'" :class="selectedStatus === 'Evening' ? 'bg-[#2E5BFF] text-white border-[#2E5BFF]' : 'bg-white dark:bg-clinical-surface text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'" class="py-3 px-2 rounded-xl border font-semibold text-sm transition-colors flex flex-col items-center gap-1">
                    <span class="text-lg">🌙</span> PM
                  </button>
                  <button @click="selectedStatus = 'Both'" :class="selectedStatus === 'Both' ? 'bg-[#2E5BFF] text-white border-[#2E5BFF]' : 'bg-white dark:bg-clinical-surface text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'" class="py-3 px-2 rounded-xl border font-semibold text-sm transition-colors flex flex-col items-center gap-1">
                    <span class="text-lg">☀️🌙</span> Both
                  </button>
                </div>
              </div>
              <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 bg-slate-50 dark:bg-slate-800/50 transition-all duration-300">
                <div class="flex items-center justify-between">
                  <h4 class="text-sm font-bold text-slate-900 dark:text-white">Have you opened this product?</h4>

                  <div class="flex items-center gap-3">
                    <span class="text-xs font-bold w-6 text-right transition-colors"
                          :class="isOpened ? 'text-[#2E5BFF]' : 'text-slate-400 dark:text-slate-500'">
                      {{ isOpened ? 'YES' : 'NO' }}
                    </span>

                    <button
                      @click="isOpened = !isOpened"
                      class="w-12 h-6 rounded-full relative transition-colors duration-300 shrink-0"
                      :class="isOpened ? 'bg-[#2E5BFF]' : 'bg-slate-300 dark:bg-slate-600'"
                    >
                      <div
                        class="w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-300 shadow-sm"
                        :class="isOpened ? 'right-1 translate-x-0' : 'left-1 translate-x-0'"
                      ></div>
                    </button>
                  </div>
                </div>

                <p v-if="!isOpened" class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 animate-fade-in">
                  We will keep it in your shelf. You can change this later once you start using your skincare to begin tracking its PAO(Period after Opening).
                </p>
              </div>
              <div>
                <div class="flex justify-between items-end mb-2">
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expiration Tracking</label>
                  <span class="text-[10px] text-slate-400">Optional</span>
                </div>

                <div class="flex gap-2 mb-3">
                  <button @click="setPAO(3)" :class="selectedPAO === 3 ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'" class="flex-1 py-2 rounded-lg text-xs font-bold transition-colors">3M</button>
                  <button @click="setPAO(6)" :class="selectedPAO === 6 ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'" class="flex-1 py-2 rounded-lg text-xs font-bold transition-colors">6M</button>
                  <button @click="setPAO(12)" :class="selectedPAO === 12 ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'" class="flex-1 py-2 rounded-lg text-xs font-bold transition-colors">12M</button>
                </div>

                <input
                  v-model="expirationDate"
                  @input="selectedPAO = null"
                  type="date"
                  class="w-full bg-white dark:bg-clinical-surface border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#2E5BFF] transition-colors"
                />
              </div>

              <div class="pt-4 pb-10">
                <button @click="handleAddToShelf()" class="w-full bg-[#2E5BFF] text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors text-lg">
                  Save to My Shelf
                </button>
                <Teleport to="body">
      <div v-if="showWarningModal" class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
        <div class="bg-white dark:bg-clinical-surface w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-red-100 dark:border-red-900/30">

          <div class="bg-red-50 dark:bg-red-900/20 p-6 flex flex-col items-center text-center border-b border-red-100 dark:border-red-900/30">
            <div class="w-16 h-16 bg-white dark:bg-red-900/50 text-red-500 rounded-full flex items-center justify-center text-3xl shadow-sm mb-4 border border-red-100 dark:border-red-800">
              ⚠️
            </div>
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">Interaction Alert</h2>
            <p class="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">SkinBuddy detected a potential issue.</p>
          </div>

          <div class="p-6 max-h-60 overflow-y-auto space-y-3">
            <div
              v-for="(warning, index) in analysisWarnings"
              :key="index"
              class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700"
            >
              <div class="flex items-center gap-2 mb-2">
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md"
                  :class="warning.alert_type === 'Chemical' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'"
                >
                  {{ warning.alert_type }}
                </span>
                <span v-if="warning.severity === 'High'" class="text-[10px] uppercase font-bold text-red-600 dark:text-red-400">High Risk</span>
              </div>
              <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{{ warning.message }}</p>
            </div>
          </div>

          <div class="p-4 grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
            <button @click="showWarningModal = false" class="py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button @click="handleAddToShelf(true)" class="py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20 transition-colors">
              Proceed Anyway
            </button>
          </div>

        </div>
      </div>
    </Teleport>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="viewingItem" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-0 animate-fade-in">
        <div class="bg-white dark:bg-clinical-surface w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up relative">

          <button @click="closeDetails" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-300 z-10">✕</button>

          <div class="bg-slate-50 dark:bg-slate-800/50 h-48 flex items-center justify-center p-6 border-b border-slate-100 dark:border-slate-700">
            <img v-if="viewingItem.products?.image_url" :src="viewingItem.products.image_url" class="h-full object-contain mix-blend-multiply dark:mix-blend-normal drop-shadow-xl" />
            <span v-else class="text-6xl">🧴</span>
          </div>

         <div class="p-6">
            <p class="text-xs text-[#2E5BFF] font-bold uppercase tracking-widest mb-1">{{ viewingItem.products?.brand }}</p>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white leading-tight mb-4">{{ viewingItem.products?.name }}</h2>

            <div class="flex gap-2 mb-6">
              <span class="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-lg font-semibold">{{ viewingItem.products?.category }}</span>
              <span class="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg font-semibold">{{ viewingItem.status }} Routine</span>
            </div>

            <div v-if="viewingItem.products?.product_ingredients?.length" class="mb-5">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-3">Key Actives</h3>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="pi in viewingItem.products.product_ingredients"
                  :key="pi.ingredients.id"
                  class="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 flex-1 min-w-[140px]"
                >
                  <span class="block text-sm font-bold text-[#2E5BFF] dark:text-blue-400">{{ pi.ingredients.name }}</span>
                  <span v-if="pi.ingredients.benefits" class="block text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{{ pi.ingredients.benefits }}</span>
                </div>
              </div>
            </div>

            <div v-if="viewingItem.products?.ingredients" class="mb-6">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-2">Full Ingredient List</h3>
              <div class="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl max-h-24 overflow-y-auto text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed border border-slate-100 dark:border-slate-800">
                {{ viewingItem.products.ingredients }}
              </div>
            </div>

            <div class="mt-6 space-y-2">
              <div v-if="viewingItem.opened_date" class="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl flex justify-between items-center transition-all">
                <span class="text-sm font-bold text-red-600 dark:text-red-400">Expiration Date</span>
                <span class="text-sm font-bold text-red-700 dark:text-red-300">{{ viewingItem.expiration_date || 'Not set' }}</span>
              </div>

              <div v-else class="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex flex-col gap-4">
                <div class="flex justify-between items-center">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">🔒</span>
                    <span class="text-sm font-bold text-slate-700 dark:text-slate-300">Status: Unopened</span>
                  </div>
                  <span v-if="viewingItem.pao" class="text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-3 py-1 rounded-lg">
                    {{ viewingItem.pao }}M PAO
                  </span>
                </div>

                <button
                  v-if="viewingItem.pao"
                  @click="handleStartPAO"
                  class="w-full py-3.5 bg-[#2E5BFF] hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>🔓</span> Open Today & Start Clock
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}
.animate-slide-up {
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
