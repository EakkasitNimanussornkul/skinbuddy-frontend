<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getMyShelf, removeFromShelf } from '../api/shelfapi'
import ShelfCard from '../components/ShelfCard.vue'
import ItemDetailsModal from '../components/ItemDetailsModal.vue'
import AddProductModal from '../components/AddProductModal.vue'

// --- State ---
const myShelf = ref<any[]>([])
const isLoading = ref(true)
const isAddModalOpen = ref(false)
const viewingItem = ref<any>(null)

// --- Fetch Data ---
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
const handleDelete = async (itemId: string) => {
  if (!confirm("Remove this item from your shelf?")) return
  try {
    await removeFromShelf(itemId)
    myShelf.value = myShelf.value.filter(item => item.id !== itemId)
    viewingItem.value = null
  } catch (error) {
    console.error("Failed to delete:", error)
  }
}

const openAddModal = () => isAddModalOpen.value = true
const closeAddModal = () => isAddModalOpen.value = false

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
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">Start adding products to build your perfect skincare routine.</p>
        <button @click="openAddModal" class="px-8 py-3.5 bg-[#2E5BFF] text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-colors w-full">
          Add First Product
        </button>
      </div>

      <div v-else class="space-y-4">
        <ShelfCard
          v-for="item in myShelf"
          :key="item.id"
          :item="item"
          @click="openDetails(item)"
          @delete="handleDelete(item.id)"
        />
      </div>
    </div>

    <Teleport to="body">
      <AddProductModal
        v-if="isAddModalOpen"
        @close="closeAddModal"
        @refresh="fetchShelf"
      />

      <ItemDetailsModal
        v-if="viewingItem"
        :item="viewingItem"
        @close="closeDetails"
        @refresh="fetchShelf"
      />
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
