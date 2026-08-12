<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMyShelf, removeFromShelf } from '../api/shelfapi'
import { useToast } from '../composables/useToast'

import ShelfCard from '../components/Shelf/ShelfCard.vue'
import ShelfQuickAddBanner from '../components/Shelf/ShelfQuickAddBanner.vue'
import AddProductModal from '../components/Shelf/AddProductModal.vue'
import ItemDetailsModal from '../components/Shelf/ItemDetailsModal.vue'
import ConfirmDeleteModal from '../components/Shared/ConfirmDeleteModal.vue'
import EmptyState from '../components/Shared/EmptyState.vue'
import FilterPills from '../components/Catalog/FilterPills.vue'
import type { ShelfItem } from '../stores/shelfStore'

const router = useRouter()
const myShelf = ref<ShelfItem[]>([])
const isLoading = ref(true)
const isAddModalOpen = ref(false)
const viewingItem = ref<ShelfItem | null>(null)
const itemToDelete = ref<ShelfItem | null>(null)
const { addToast } = useToast()

const searchQuery = ref('')
const activeCategory = ref('All')
const activeStatus = ref('All')

const statuses = ['All', 'Unopened', 'In Routine', 'Expiring Soon', 'Expired', 'Archived']

const dynamicCategories = computed(() => {
  const uniqueCats = new Set<string>()
  myShelf.value.forEach(item => {
    const cat = item.products?.category
    if (cat) uniqueCats.add(cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase())
  })
  return ['All', ...Array.from(uniqueCats).sort()]
})

const fetchShelf = async () => {
  isLoading.value = true
  try {
    myShelf.value = await getMyShelf()
  } catch (error) {
    console.error("Failed to load inventory:", error)
    addToast('Failed to load checked inventory', 'error')
  } finally {
    isLoading.value = false
  }
}

// 🌟 SAFE REFRESH: Re-syncs viewingItem to match the fresh DB object to prevent VNode crashes
const handleModalRefresh = async () => {
  try {
    const freshData = await getMyShelf()
    myShelf.value = freshData
    const viewingId = viewingItem.value?.id
    if (viewingId) {
      const updatedMatch = freshData.find((item) => item.id === viewingId)
      if (updatedMatch) {
        viewingItem.value = updatedMatch
      }
    }
  } catch (error) {
    console.error("Failed to refresh modal state:", error)
  }
}

onMounted(() => fetchShelf())

const filteredProducts = computed(() => {
  return myShelf.value.filter(item => {
    const name = (item.products?.name || '').toLowerCase()
    const brand = (item.products?.brand || '').toLowerCase()
    const itemCategory = (item.products?.category || '').toLowerCase()

    let computedStatus = 'Unopened'
    const state = item.usage_state || 'unopened'
    const expDate = item.expiration_date

    if (state === 'archived') {
      computedStatus = 'Archived'
    } else if (expDate) {
      const today = new Date()
      const expiration = new Date(expDate)
      const daysLeft = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 3600 * 24))

      if (daysLeft < 0) computedStatus = 'Expired'
      else if (daysLeft <= 30) computedStatus = 'Expiring Soon'
      else computedStatus = state === 'active' ? 'In Routine' : 'Unopened'
    } else {
      computedStatus = state === 'active' ? 'In Routine' : 'Unopened'
    }

    const query = searchQuery.value.toLowerCase()
    const matchesSearch = !query || name.includes(query) || brand.includes(query) || itemCategory.includes(query)
    const matchesCategory = activeCategory.value === 'All' || itemCategory === activeCategory.value.toLowerCase()
    const matchesStatus = activeStatus.value === 'All' ? computedStatus !== 'Archived' : computedStatus === activeStatus.value

    return matchesSearch && matchesCategory && matchesStatus
  })
})

const executeDelete = async () => {
  if (!itemToDelete.value) return
  const deletedId = itemToDelete.value.id
  try {
    await removeFromShelf(deletedId)
    myShelf.value = myShelf.value.filter(item => item.id !== deletedId)
    if (viewingItem.value?.id === deletedId) viewingItem.value = null
    itemToDelete.value = null
    addToast('Product removed from active check', 'info')
  } catch (error) {
    console.error(error)
    addToast('Failed to remove product', 'error')
  }
}
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans transition-colors duration-300 pb-28 pt-6">
    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 flex flex-col gap-6 w-full">

      <!-- Header Title -->
      <div class="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <h1 class="text-2xl sm:text-3xl font-serif font-bold dark:text-white">Skincare Check</h1>
          <p class="text-xs text-brand-text-muted mt-0.5">Active routine ingredient monitoring and PAO expiration tracking.</p>
        </div>
      </div>

      <!-- Prominent Hero Guidance Banner -->
      <ShelfQuickAddBanner
        :item-count="myShelf.length"
        @open-add-modal="isAddModalOpen = true"
      />

      <!-- Custom Loading Overlay -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 text-brand-text-muted animate-pulse">
        <div class="w-10 h-10 border-4 border-brand-surface-border border-t-brand-primary rounded-full animate-spin mb-3"></div>
        <p class="text-xs font-bold uppercase tracking-widest text-brand-primary">Running Safety Check...</p>
      </div>

      <div v-else-if="myShelf.length > 0" class="flex flex-col gap-6 w-full">
        <!-- Interactive Search Input -->
        <div class="relative">
          <svg class="absolute inset-y-0 left-4 my-auto w-5 h-5 text-brand-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input
            v-model="searchQuery"
            type="text"
            class="w-full bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 text-sm rounded-2xl block pl-11 p-4 shadow-sm outline-none focus:ring-2 focus:ring-brand-primary/50 dark:focus:ring-brand-primary/30 transition-all text-brand-text dark:text-white"
            placeholder="Search your checked routine products..."
          >
          <button v-if="searchQuery" @click="searchQuery = ''" class="absolute inset-y-0 right-4 my-auto text-brand-text-muted hover:text-brand-primary cursor-pointer">✕</button>
        </div>

        <!-- Filter Pill Components -->
        <div class="space-y-2.5">
          <FilterPills v-model="activeCategory" :options="dynamicCategories" variant="neutral" />
          <FilterPills v-model="activeStatus" :options="statuses" variant="brand" />
        </div>

        <!-- Grid Container -->
        <div v-if="filteredProducts.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pt-2">
          <ShelfCard
            v-for="item in filteredProducts"
            :key="item.id"
            :item="item"
            @open-details="viewingItem = item"
            @delete="itemToDelete = item"
          />
        </div>

        <!-- Filter Empty State -->
        <div v-else class="text-center py-12 bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl border border-brand-surface-border dark:border-stone-800 mt-2 shadow-sm">
          <p class="text-brand-text-muted mb-3 text-sm font-medium">No items match your current search or status filters.</p>
          <button @click="searchQuery = ''; activeCategory = 'All'; activeStatus = 'All'" class="text-brand-primary font-bold text-xs underline hover:text-brand-primary-hover transition-colors cursor-pointer">Reset Filters</button>
        </div>
      </div>

      <!-- True Application Empty State -->
      <EmptyState
        v-else
        title="Your Routine Shield is Empty"
        message="Add your daily skincare routine above to unlock real-time ingredient conflict detection and custom shelf-life reminders."
        action-label="Open Product Catalog"
        @action="router.push('/explore')"
      >
        <template #icon>
          <img src="/images/jelly.png" alt="SkinBuddy Mascot" class="w-16 h-16 object-contain animate-float drop-shadow-md" />
        </template>
      </EmptyState>

    </div>

    <!-- Teleported Flow Overlays -->
    <Teleport to="body">
      <AddProductModal v-if="isAddModalOpen" @close="isAddModalOpen = false" @refresh="fetchShelf" />
      <ItemDetailsModal v-if="viewingItem" :item="viewingItem" @close="viewingItem = null" @refresh="handleModalRefresh" />
      <ConfirmDeleteModal v-if="itemToDelete" :item="itemToDelete" @cancel="itemToDelete = null" @confirm="executeDelete" />
    </Teleport>
  </div>
</template>

<style scoped>
.animate-float { animation: float 4s ease-in-out infinite; }
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
</style>
