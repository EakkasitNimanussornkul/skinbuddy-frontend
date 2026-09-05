<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMyShelf, removeFromShelf } from '../api/shelfapi'
import { resolveCatalogState } from '../api/products'
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
// Tracked separately from myShelf, because an empty array cannot say whether
// the shelf is empty or was never received - FE-DEF-13.
const shelfFailed = ref(false)
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
  shelfFailed.value = false
  try {
    myShelf.value = await getMyShelf()
  } catch (error) {
    console.error("Failed to load inventory:", error)
    // Cleared, not kept. A failed reload would otherwise leave the previous
    // shelf on screen as though it were current - the same trade FE-DEF-09
    // settled for the catalogue.
    myShelf.value = []
    shelfFailed.value = true
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
    // FE-DEF-14. The edit itself already succeeded - this is the reload that
    // follows it - so the two facts are reported separately. Collapsing them
    // into "something went wrong" would be worse than the silence this
    // replaces, because it would suggest the change had not been saved.
    //
    // Reopening the modal does NOT recover: getMyShelf() threw, so myShelf
    // still holds the pre-edit rows and viewingItem is read back from it. Only
    // a fresh load does, which is what the copy asks for.
    addToast('Change saved, but the shelf could not be reloaded. Refresh to see it.', 'error')
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

// Same four-state decision the catalogue makes, and reused rather than
// reimplemented so the ordering cannot drift: `failed` is resolved before
// `empty`, because a request that never completed says nothing about how many
// items the shelf holds. The function's name is catalogue-flavoured for
// historical reasons; the logic is list-generic.
// Counts the whole shelf, not filteredProducts: this decides whether the user
// owns anything at all. "Nothing matches your filters" is a separate, inner
// state and is unaffected.
const shelfState = computed(() =>
  resolveCatalogState(isLoading.value, shelfFailed.value, myShelf.value.length),
)

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
      <div v-if="shelfState === 'loading'" class="flex flex-col items-center justify-center py-20 text-brand-text-muted animate-pulse">
        <div class="w-10 h-10 border-4 border-brand-surface-border border-t-brand-primary rounded-full animate-spin mb-3"></div>
        <p class="text-xs font-bold uppercase tracking-widest text-brand-primary">Running Safety Check...</p>
      </div>

      <!-- Retrieval failure. Reported before the empty state, because a request
           that never completed cannot tell us the shelf is empty - and telling
           a user with a full shelf that it is empty invites them to add the
           products again. FE-DEF-13. -->
      <div v-else-if="shelfState === 'failed'" class="py-20 flex flex-col items-center text-center gap-4">
        <div class="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center border border-amber-500/30">
          <svg class="w-7 h-7 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div class="space-y-1 max-w-sm">
          <h4 class="text-lg font-serif font-bold text-brand-text dark:text-white">Shelf Unavailable</h4>
          <p class="text-xs text-brand-text-muted leading-relaxed">
            We couldn't reach your storage records, so nothing is shown below. This does not mean your shelf is empty &mdash; try again in a moment.
          </p>
        </div>
        <button
          @click="fetchShelf()"
          class="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all active:scale-95"
        >
          Retry Retrieval
        </button>
      </div>

      <div v-else-if="shelfState === 'results'" class="flex flex-col gap-6 w-full">
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
