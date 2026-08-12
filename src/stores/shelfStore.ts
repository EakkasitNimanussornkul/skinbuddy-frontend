import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getMyShelf, addToShelf } from '../api/shelfapi'

// Lifecycle states the backend writes to shelf_items.usage_state.
export type UsageState = 'unopened' | 'active' | 'archived'

// Recorded alongside 'archived' by PATCH /shelf/{item_id}/status.
export type ArchiveOutcome = 'empty' | 'discarded' | 'expired'

// One row of the product_ingredients -> ingredients join nested under products.
export interface ShelfProductIngredient {
  ingredients: {
    id: string
    name: string
    benefits: string | null
    functional_group: string | null
  }
}

// The catalog product joined onto each shelf row. Brand/name/category live
// here, not on the shelf item itself.
export interface ShelfProduct {
  id: string
  brand: string
  name: string
  category: string
  slug: string | null
  ingredients: string | null
  image_url: string | null
  description: string | null
  pao: number | null
  price_thb: number | null
  price_usd: number | null
  product_ingredients?: ShelfProductIngredient[]
}

// A row from GET /shelf/, which selects
// "*, products(*, product_ingredients(ingredients(*)))" off shelf_items.
export interface ShelfItem {
  id: string
  user_id: string
  product_id: string
  usage_state: UsageState
  opened_date: string | null
  expiration_date: string | null
  pao: number | null
  archive_outcome: ArchiveOutcome | null
  archive_notes: string | null
  archived_at: string | null
  products?: ShelfProduct | null
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
