import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getMyShelf, addToShelf } from '../api/shelfapi'

// 1. Export the interface so other files can use it
export interface ShelfItem {
  id: string;
  brand: string;
  name: string;
  category: string;
  status: 'active' | 'wishlist';
  opened_date: string | null;
  expiration_date?: string | null;
  routine_step?: string;
  ingredients?: string[];
  description?: string;
}

export const useShelfStore = defineStore('shelf', () => {
  const items = ref<ShelfItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // --- ACTIONS ---
  const loadShelf = async () => {
    isLoading.value = true
    try {
      const data = await getMyShelf()
      items.value = data
    } catch (err) {
      error.value = "Could not load shelf"
    } finally {
      isLoading.value = false
    }
  }

  const addProduct = async (newProduct: Parameters<typeof addToShelf>[0]) => {
    try {
      const savedProduct = await addToShelf(newProduct)
      items.value.unshift(savedProduct)
    } catch (err) {
      console.error("Failed to save product")
    }
  }

  const removeProduct = (id: string) => {
    items.value = items.value.filter(item => item.id !== id)
  }

  // CRITICAL: You must return EVERYTHING you want to use in your Vue files!
  return { items, isLoading, error, loadShelf, addProduct, removeProduct }
})
