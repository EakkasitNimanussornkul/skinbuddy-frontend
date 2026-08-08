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

  // Keep your product database array here for the "Compare Alternatives" feature
  const productDatabase = ref<ShelfItem[]>([
    { id: '1', brand: 'CeraVe', name: 'Hydrating Facial Cleanser', category: 'Cleanser', status: 'wishlist', opened_date: null, expiration_date: null, routine_step: 'AM/PM', ingredients: ['Ceramides', 'Hyaluronic Acid', 'Glycerin'], description: 'Cleanses and hydrates without disrupting the skin barrier.' },
    { id: '2', brand: 'Paula\'s Choice', name: '2% BHA Liquid Exfoliant', category: 'Toner', status: 'wishlist', opened_date: null, expiration_date: null, routine_step: 'PM', ingredients: ['Salicylic Acid', 'Green Tea Extract'], description: 'A daily leave-on exfoliant that sweeps away dead skin cells and unclogs pores.' },
    { id: '3', brand: 'The Ordinary', name: 'Niacinamide 10% + Zinc', category: 'Serum', status: 'wishlist', opened_date: null, expiration_date: null, routine_step: 'AM/PM', ingredients: ['Niacinamide', 'Zinc PCA'], description: 'A high-strength vitamin and blemish formula.' },
    { id: '4', brand: 'Pixi', name: 'Glow Tonic', category: 'Toner', status: 'wishlist', opened_date: null, expiration_date: null, routine_step: 'PM', ingredients: ['Glycolic Acid', 'Fragrance', 'Hexyl Cinnamal'], description: 'A highly concentrated, invigorating facial toner that deeply cleans pores.' },
    { id: '5', brand: 'Mario Badescu', name: 'Facial Spray', category: 'Toner', status: 'wishlist', opened_date: null, expiration_date: null, routine_step: 'Anytime', ingredients: ['Water', 'Alcohol Denat', 'Fragrance', 'Rose Extract'], description: 'A refreshing, hydrating mist to use anywhere anytime.' },
    { id: '6', brand: 'Laneige', name: 'Water Sleeping Mask', category: 'Moisturizer', status: 'wishlist', opened_date: null, expiration_date: null, routine_step: 'PM', ingredients: ['Water', 'Glycerin', 'Fragrance', 'Linalool'], description: 'An overnight moisture-recharging gel mask that quickly absorbs while you sleep.' }
  ]
  )

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
  return { items, isLoading, error, productDatabase, loadShelf, addProduct, removeProduct }
})
