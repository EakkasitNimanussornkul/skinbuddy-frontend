<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getMyShelf, removeFromShelf } from '../api/shelfapi'
import { useToast } from '../composables/useToast'

import ShelfCard from '../components/ShelfCard.vue'
import ItemDetailsModal from '../components/ItemDetailsModal.vue'
import AddProductModal from '../components/AddProductModal.vue'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue'
import EmptyState from '../components/EmptyState.vue'
import FilterPills from '../components/FilterPills.vue'
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
// The Statuses array matching our new dynamic time-states
const statuses = ['All', 'Unopened', 'In Routine', 'Expiring Soon', 'Expired', 'Archived']
// Dynamically generate categories based on what is actually on the shelf
const dynamicCategories = computed(() => {
  const uniqueCats = new Set<string>()

  myShelf.value.forEach(item => {
    const cat = item.category || item.products?.category
    if (cat) {
      const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()
      uniqueCats.add(formattedCat)
    }
  })

  return ['All', ...Array.from(uniqueCats).sort()]
})

// --- Fetch & Filter Logic ---
const fetchShelf = async () => {
  isLoading.value = true
  try {
    myShelf.value = await getMyShelf()
  } catch (error) {
    console.error("Failed to load shelf:", error)
    addToast('Failed to load your shelf', 'error')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchShelf())

const filteredProducts = computed(() => {
  return myShelf.value.filter(item => {
    const name = (item.products?.name || '').toLowerCase()
    const brand = (item.products?.brand || '').toLowerCase()
    const itemCategory = (item.category || item.products?.category || '').toLowerCase()

    // --- Calculate the real-time status for the filter ---
    let computedStatus = 'Unopened'
    const state = item.usage_state || 'unopened'
    const expDate = item.expiration_date

    // 1. Archived items are ignored by the expiration clock
    if (state === 'archived') {
      computedStatus = 'Archived'
    }
    // 2. Check the clock if an expiration date exists (even if unopened!)
    else if (expDate) {
      const today = new Date()
      const expiration = new Date(expDate)
      const daysLeft = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 3600 * 24))

      if (daysLeft < 0) {
        computedStatus = 'Expired'
      } else if (daysLeft <= 30) {
        computedStatus = 'Expiring Soon'
      } else {
        // If the date is fine, fall back to its inventory state
        computedStatus = state === 'active' ? 'In Routine' : 'Unopened'
      }
    }
    // 3. If no expiration date exists, rely purely on inventory state
    else {
      computedStatus = state === 'active' ? 'In Routine' : 'Unopened'
    }

    const query = searchQuery.value.toLowerCase()

    const matchesSearch = !query || name.includes(query) || brand.includes(query) || itemCategory.includes(query)
    const matchesCategory = activeCategory.value === 'All' || itemCategory === activeCategory.value.toLowerCase()
    const matchesStatus = activeStatus.value === 'All'
    ? computedStatus !== 'Archived'
    : computedStatus === activeStatus.value

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
    console.error(error)
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

        <!-- Search Bar -->
        <div class="relative">
          <svg class="absolute inset-y-0 left-4 my-auto w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input v-model="searchQuery" type="text" class="w-full bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 text-sm rounded-2xl focus:ring-2 focus:ring-brand-primary block pl-11 p-4 shadow-sm outline-none" placeholder="Search products...">
          <button v-if="searchQuery" @click="searchQuery = ''" class="absolute inset-y-0 right-4 my-auto text-stone-400 hover:text-brand-primary"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>

        <!-- 🌟 THE NEW CLEAN FILTERS 🌟 -->
        <FilterPills v-model="activeCategory" :options="dynamicCategories" variant="neutral" />
        <FilterPills v-model="activeStatus" :options="statuses" variant="brand" />

        <!-- Component Grid -->
        <div v-if="filteredProducts.length > 0" class="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-2">
          <ShelfCard
            v-for="item in filteredProducts"
            :key="item.id"
            :item="item"
            @open-details="viewingItem = item"
            @delete="itemToDelete = item"
          />
        </div>

        <!-- Empty Filter State (When a search/filter yields 0 results) -->
        <div v-else class="text-center py-12 bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl border border-stone-200 dark:border-stone-800 mt-2">
          <p class="text-stone-400 mb-4">
          {{ activeStatus === 'Archived' ? 'No archived products yet.' : 'No products match your filters.' }}
          </p>

              <p v-if="activeStatus === 'Archived'" class="text-[10px] text-stone-500 max-w-[200px] mx-auto mb-4">
            Tip: You can archive products from the Item Details screen when you're finished with them.
          </p>
            <button @click="searchQuery = ''; activeCategory = 'All'; activeStatus = 'All'" class="text-brand-primary font-bold text-sm">
              Clear Filters
            </button>
          </div>
      </template>

      <!-- True Empty State (Zero items on shelf entirely) -->
      <EmptyState
        v-else
        title="Your shelf is empty"
        message="Start adding products to build your perfect skincare routine."
        action-label="Add First Product"
        @action="isAddModalOpen = true"
      >
        <template #icon>
          <svg class="w-10 h-10 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        </template>
      </EmptyState>

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
      <ConfirmDeleteModal v-if="itemToDelete" :item="itemToDelete" @cancel="itemToDelete = null" @confirm="executeDelete" />
    </Teleport>
  </div>
</template>

<style scoped>
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
</style>
