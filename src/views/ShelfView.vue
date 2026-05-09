<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { searchProducts, getMyShelf, addToShelf, removeFromShelf } from '../api/shelfapi'

const myShelf = ref<any[]>([])
const isModalOpen = ref(false)
const isLoading = ref(true)

// Modal Form State
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const isSearching = ref(false)
const searchTimeout = ref<any>(null)

const selectedProduct = ref<any>(null)
const selectedStatus = ref('Morning')
const expirationDate = ref('')

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

// --- Smart Search Logic (Debounced) ---
const handleSearchInput = () => {
  // Clear the previous timeout if they are still typing
  if (searchTimeout.value) clearTimeout(searchTimeout.value)

  if (searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }

  isSearching.value = true
  // Wait 300ms after they stop typing to hit the backend
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
  searchQuery.value = product.name // Fill the input box
  searchResults.value = [] // Hide the dropdown
}

// --- Saving and Deleting ---
const handleAddToShelf = async () => {
  if (!selectedProduct.value) return

  try {
    await addToShelf({
      product_id: selectedProduct.value.id,
      status: selectedStatus.value,
      expiration_date: expirationDate.value || null
    })

    // Close modal, reset form, and refresh the shelf!
    closeModal()
    fetchShelf()
  } catch (error) {
    console.error("Failed to add to shelf:", error)
    alert("Could not add product.")
  }
}

const handleDelete = async (itemId: string) => {
  if (!confirm("Remove this item from your shelf?")) return
  try {
    await removeFromShelf(itemId)
    myShelf.value = myShelf.value.filter(item => item.id !== itemId)
  } catch (error) {
    console.error("Failed to delete:", error)
  }
}

// --- Modal Controls ---
const openModal = () => isModalOpen.value = true
const closeModal = () => {
  isModalOpen.value = false
  searchQuery.value = ''
  searchResults.value = []
  selectedProduct.value = null
  selectedStatus.value = 'Morning'
  expirationDate.value = ''
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-clinical-bg pt-6 pb-28 font-sans transition-colors duration-300">
    <div class="max-w-md mx-auto px-4 sm:px-6">

      <div class="flex justify-between items-center mb-8 pt-4">
        <h1 class="text-3xl font-serif font-bold text-slate-900 dark:text-white">My Shelf</h1>
        <button @click="openModal" class="w-10 h-10 bg-[#2E5BFF] text-white rounded-full flex items-center justify-center text-xl shadow-md hover:bg-blue-700 transition-colors">
          +
        </button>
      </div>

      <div v-if="isLoading" class="text-center py-10 text-slate-500">
        Loading your routine...
      </div>

      <div v-else-if="myShelf.length === 0" class="bg-white dark:bg-clinical-surface rounded-2xl p-8 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
        <div class="text-4xl mb-4">🧴</div>
        <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-2">Your shelf is empty</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Start adding products to build your perfect routine.</p>
        <button @click="openModal" class="px-6 py-3 bg-[#2E5BFF] text-white text-sm font-bold rounded-xl shadow-sm hover:bg-blue-700 transition-colors">
          Add First Product
        </button>
      </div>

      <div v-else class="space-y-4">
        <div v-for="item in myShelf" :key="item.id" class="bg-white dark:bg-clinical-surface rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 relative overflow-hidden">

          <div class="w-14 h-14 bg-blue-50 dark:bg-[#2E5BFF]/10 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
            ✨
          </div>

          <div class="flex-grow">
            <p class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
              {{ item.products?.brand || 'Unknown Brand' }}
            </p>
            <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight mb-1">
              {{ item.products?.name || 'Unknown Product' }}
            </h4>
            <div class="flex gap-2">
              <span class="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold">
                {{ item.status }}
              </span>
              <span v-if="item.expiration_date" class="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-md font-semibold">
                Exp: {{ item.expiration_date }}
              </span>
            </div>
          </div>

          <button @click="handleDelete(item.id)" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
            ✕
          </button>
        </div>
      </div>

    </div>

    <Teleport to="body">
      <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-0">
        <div class="bg-white dark:bg-clinical-bg w-full max-w-md rounded-3xl p-6 shadow-2xl transform transition-all border border-slate-100 dark:border-slate-800">

          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">Add Product</h2>
            <button @click="closeModal" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
          </div>

          <div class="mb-6 relative">
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Search Catalog</label>
            <input
              v-model="searchQuery"
              @input="handleSearchInput"
              type="text"
              placeholder="e.g., CeraVe Hydrating Cleanser"
              class="w-full bg-slate-50 dark:bg-clinical-surface border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E5BFF]"
            />

            <ul v-if="searchResults.length > 0 && !selectedProduct" class="absolute z-10 w-full mt-2 bg-white dark:bg-clinical-surface border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              <li
                v-for="product in searchResults"
                :key="product.id"
                @click="selectProduct(product)"
                class="px-4 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{{ product.brand }}</div>
                <div class="text-sm font-semibold text-slate-800 dark:text-slate-200">{{ product.name }}</div>
              </li>
            </ul>
            <div v-if="isSearching" class="absolute right-4 top-10 text-xs text-slate-400">Searching...</div>
          </div>

          <div v-if="selectedProduct" class="space-y-4 animate-fade-in-up">

            <div class="p-3 bg-blue-50 dark:bg-[#2E5BFF]/10 rounded-xl border border-blue-100 dark:border-[#2E5BFF]/30 flex items-center gap-3">
              <div class="text-2xl">✅</div>
              <div>
                <p class="text-xs text-blue-600 dark:text-[#2E5BFF] font-bold uppercase">{{ selectedProduct.brand }}</p>
                <p class="text-sm font-semibold text-slate-800 dark:text-white">{{ selectedProduct.name }}</p>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">When do you use it?</label>
              <select v-model="selectedStatus" class="w-full bg-slate-50 dark:bg-clinical-surface border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E5BFF]">
                <option value="Morning">Morning Routine</option>
                <option value="Evening">Evening Routine</option>
                <option value="Both">Both (AM & PM)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Expiration Date (Optional)</label>
              <input
                v-model="expirationDate"
                type="date"
                class="w-full bg-slate-50 dark:bg-clinical-surface border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E5BFF]"
              />
            </div>

            <button
              @click="handleAddToShelf"
              class="w-full mt-4 bg-[#2E5BFF] text-white font-bold py-4 rounded-xl shadow-md hover:bg-blue-700 transition-colors"
            >
              Add to My Shelf
            </button>
          </div>

        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.3s ease-out forwards;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
