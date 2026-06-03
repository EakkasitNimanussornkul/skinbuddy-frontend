<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getMyShelf, removeFromShelf } from '../api/shelfapi'
import { useToast } from '../composables/useToast'

import ShelfCard from '../components/ShelfCard.vue'
import ItemDetailsModal from '../components/ItemDetailsModal.vue'
import AddProductModal from '../components/AddProductModal.vue'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue'

// --- State ---
const myShelf = ref<any[]>([])
const isLoading = ref(true)
const isAddModalOpen = ref(false)
const viewingItem = ref<any>(null)
const itemToDelete = ref<any>(null)
const { addToast } = useToast()

// --- Filter State ---
const searchQuery = ref('')
const activeCategory = ref('All')
const activeStatus = ref('All')
const categories = ['All', 'Cleanser', 'Toner', 'Serum', 'Moisturizer', 'Sunscreen', 'Treatment']
const statuses = ['All', 'In Routine', 'Unopened', 'Expiring', 'Expired']

// --- Fetch & Filter Logic ---
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

onMounted(() => fetchShelf())

const filteredProducts = computed(() => {
  return myShelf.value.filter(item => {
    const name = (item.products?.name || '').toLowerCase()
    const brand = (item.products?.brand || '').toLowerCase()
    const category = (item.category || item.products?.category || '').toLowerCase()
    const status = item.status || 'Unopened'
    const query = searchQuery.value.toLowerCase()

    const matchesSearch = !query || name.includes(query) || brand.includes(query) || category.includes(query)
    const matchesCategory = activeCategory.value === 'All' || category === activeCategory.value.toLowerCase()
    const matchesStatus = activeStatus.value === 'All' || status === activeStatus.value

    return matchesSearch && matchesCategory && matchesStatus
  })
})

// --- Actions ---
const executeDelete = async () => {
  if (!itemToDelete.value) return
  try {
    await removeFromShelf(itemToDelete.value.id)
    myShelf.value = myShelf.value.filter(item => item.id !== itemToDelete.value.id)
    if (viewingItem.value?.id === itemToDelete.value.id) viewingItem.value = null
    itemToDelete.value = null
    addToast('Product removed from your shelf', 'info')
  } catch (error) {
    addToast('Failed to remove product', 'error')
  }
}
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans transition-colors duration-300 pb-28 pt-6">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col gap-5">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-serif font-bold">My Shelf</h1>
        <div v-if="!isLoading" class="text-sm font-semibold text-brand-text-muted dark:text-stone-400 bg-brand-surface-light dark:bg-brand-surface-dark px-3 py-1.5 rounded-full border border-stone-200 dark:border-stone-800 shadow-sm">
          {{ myShelf.length }} Items
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 text-brand-text-muted animate-pulse">
        <div class="w-12 h-12 border-4 border-stone-200 border-t-brand-primary rounded-full animate-spin mb-4"></div>
        <p class="text-sm font-bold tracking-widest uppercase">Loading Shelf...</p>
      </div>

      <!-- Main Content (Only renders if shelf has items) -->
      <template v-else-if="myShelf.length > 0">

        <!-- Search & Filters -->
        <div class="relative">
          <svg class="absolute inset-y-0 left-4 my-auto w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input v-model="searchQuery" type="text" class="w-full bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 text-sm rounded-2xl focus:ring-2 focus:ring-brand-primary block pl-11 p-4 shadow-sm outline-none" placeholder="Search products...">
          <button v-if="searchQuery" @click="searchQuery = ''" class="absolute inset-y-0 right-4 my-auto text-stone-400 hover:text-brand-primary"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>

        <div class="flex overflow-x-auto gap-2 pb-1 hide-scrollbar">
          <button v-for="cat in categories" :key="cat" @click="activeCategory = cat" class="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-colors border" :class="activeCategory === cat ? 'bg-brand-text text-brand-surface-light border-brand-text dark:bg-stone-200 dark:text-brand-bg-dark' : 'bg-brand-surface-light text-brand-text-muted border-stone-200 dark:bg-brand-surface-dark dark:border-stone-800'">{{ cat }}</button>
        </div>

        <div class="flex overflow-x-auto gap-2 pb-1 hide-scrollbar">
          <button v-for="stat in statuses" :key="stat" @click="activeStatus = stat" class="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-colors border" :class="activeStatus === stat ? 'bg-brand-primary-light text-brand-primary border-brand-primary-light dark:bg-orange-900/40 dark:text-orange-300' : 'text-brand-text-muted border-stone-200 dark:border-stone-800'">{{ stat }}</button>
        </div>

        <!-- Component Grid -->
        <div v-if="filteredProducts.length > 0" class="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-2">
          <ShelfCard v-for="item in filteredProducts" :key="item.id" :item="item" @click="viewingItem = item" @delete="itemToDelete = item" />
        </div>

        <!-- Empty Filter State -->
        <div v-else class="text-center py-12 bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl border border-stone-200 dark:border-stone-800 mt-2">
          <p class="text-stone-400 mb-4">No products match your filters.</p>
          <button @click="searchQuery = ''; activeCategory = 'All'; activeStatus = 'All'" class="text-brand-primary font-bold text-sm">Clear Filters</button>
        </div>
      </template>

      <!-- True Empty State (Zero items on shelf) -->
<!-- True Empty State (Zero items on shelf) -->
      <div v-else class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl p-10 text-center border border-brand-primary-light dark:border-orange-900/30 shadow-sm mt-4 flex flex-col items-center">
        <div class="w-20 h-20 bg-brand-bg-light dark:bg-stone-900 rounded-full flex items-center justify-center mb-6 shadow-inner border border-stone-200 dark:border-stone-800">
          <svg class="w-10 h-10 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        </div>
        <h3 class="text-xl font-serif font-bold mb-2">Your shelf is empty</h3>
        <p class="text-sm text-brand-text-muted mb-8">Start adding products to build your perfect skincare routine.</p>
        <button @click="isAddModalOpen = true" class="px-8 py-3.5 bg-brand-primary text-white font-bold rounded-xl shadow-md hover:bg-orange-800 transition-all w-full">Add First Product</button>
      </div>

    </div>

    <!-- Floating Add Button -->
    <div class="fixed bottom-24 right-4 sm:right-8 z-20">
      <button @click="isAddModalOpen = true" class="bg-brand-primary text-white w-14 h-14 rounded-full shadow-lg shadow-orange-900/20 flex items-center justify-center hover:bg-orange-800 active:scale-95 transition-all">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
      </button>
    </div>

    <Teleport to="body">
      <AddProductModal v-if="isAddModalOpen" @close="isAddModalOpen = false" @refresh="fetchShelf" />
      <ItemDetailsModal v-if="viewingItem" :item="viewingItem" @close="viewingItem = null" @refresh="fetchShelf" />
      <ConfirmDeleteModal v-if="itemToDelete" :item-name="itemToDelete.products?.name" @cancel="itemToDelete = null" @confirm="executeDelete" />
    </Teleport>
  </div>
</template>

<style scoped>
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
</style>
