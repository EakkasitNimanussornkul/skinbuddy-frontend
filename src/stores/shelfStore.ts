import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ShelfItem {
  id: string;
  brand: string;
  name: string;
  category: string;
  status: 'active' | 'wishlist' | 'finished';
  opened_date: string | null;
  routine_step?: string;
  ingredients?: string[];
  description?: string;
}

export const useShelfStore = defineStore('shelf', () => {
  // 1. User's Current Shelf (Now fully populated for testing!)
  const items = ref<ShelfItem[]>([
    { id: '1', brand: 'CeraVe', name: 'Hydrating Facial Cleanser', category: 'Cleanser', status: 'active', opened_date: 'Oct 12', routine_step: 'AM/PM', ingredients: ['Ceramides', 'Hyaluronic Acid', 'Glycerin'], description: 'Cleanses and hydrates without disrupting the skin barrier.' },
    { id: '2', brand: 'Paula\'s Choice', name: '2% BHA Liquid Exfoliant', category: 'Toner', status: 'active', opened_date: 'Nov 01', routine_step: 'PM', ingredients: ['Salicylic Acid', 'Green Tea Extract'], description: 'A daily leave-on exfoliant that sweeps away dead skin cells and unclogs pores.' },
    { id: '3', brand: 'The Ordinary', name: 'Niacinamide 10% + Zinc', category: 'Serum', status: 'active', opened_date: 'Nov 15', routine_step: 'AM/PM', ingredients: ['Niacinamide', 'Zinc PCA'], description: 'A high-strength vitamin and blemish formula.' },
    // I added these to your shelf as "wishlist" items so you can test the warnings immediately!
    { id: '4', brand: 'Pixi', name: 'Glow Tonic', category: 'Toner', status: 'wishlist', opened_date: null, routine_step: 'PM', ingredients: ['Glycolic Acid', 'Fragrance', 'Hexyl Cinnamal'], description: 'A highly concentrated, invigorating facial toner that deeply cleans pores.' },
    { id: '6', brand: 'Laneige', name: 'Water Sleeping Mask', category: 'Moisturizer', status: 'wishlist', opened_date: null, routine_step: 'PM', ingredients: ['Water', 'Glycerin', 'Fragrance', 'Linalool'], description: 'An overnight moisture-recharging gel mask that quickly absorbs while you sleep.' }
  ])

  // 2. Master Database (What the "Compare" feature searches through)
  const productDatabase: ShelfItem[] = [
    { id: '1', brand: 'CeraVe', name: 'Hydrating Facial Cleanser', category: 'Cleanser', status: 'wishlist', opened_date: null, routine_step: 'AM/PM', ingredients: ['Ceramides', 'Hyaluronic Acid', 'Glycerin'], description: 'Cleanses and hydrates without disrupting the skin barrier.' },
    { id: '2', brand: 'Paula\'s Choice', name: '2% BHA Liquid Exfoliant', category: 'Toner', status: 'wishlist', opened_date: null, routine_step: 'PM', ingredients: ['Salicylic Acid', 'Green Tea Extract'], description: 'A daily leave-on exfoliant that sweeps away dead skin cells and unclogs pores.' },
    { id: '3', brand: 'The Ordinary', name: 'Niacinamide 10% + Zinc', category: 'Serum', status: 'wishlist', opened_date: null, routine_step: 'AM/PM', ingredients: ['Niacinamide', 'Zinc PCA'], description: 'A high-strength vitamin and blemish formula.' },
    { id: '4', brand: 'Pixi', name: 'Glow Tonic', category: 'Toner', status: 'wishlist', opened_date: null, routine_step: 'PM', ingredients: ['Glycolic Acid', 'Fragrance', 'Hexyl Cinnamal'], description: 'A highly concentrated, invigorating facial toner that deeply cleans pores.' },
    { id: '5', brand: 'Mario Badescu', name: 'Facial Spray', category: 'Toner', status: 'wishlist', opened_date: null, routine_step: 'Anytime', ingredients: ['Water', 'Alcohol Denat', 'Fragrance', 'Rose Extract'], description: 'A refreshing, hydrating mist to use anywhere anytime.' },
    { id: '6', brand: 'Laneige', name: 'Water Sleeping Mask', category: 'Moisturizer', status: 'wishlist', opened_date: null, routine_step: 'PM', ingredients: ['Water', 'Glycerin', 'Fragrance', 'Linalool'], description: 'An overnight moisture-recharging gel mask that quickly absorbs while you sleep.' }
  ]

  const addProduct = (product: Omit<ShelfItem, 'id' | 'opened_date'>) => {
    const newProduct: ShelfItem = {
      ...product,
      id: Math.random().toString(36).substr(2, 9),
      opened_date: product.status === 'active' ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
    }
    items.value.unshift(newProduct)
  }

  const removeProduct = (id: string) => {
    items.value = items.value.filter(item => item.id !== id)
  }

  const generateRoutine = (skinType: string) => {
    items.value = []

    if (skinType.includes('O')) {
      items.value.push({...productDatabase[0]!, status: 'active', opened_date: 'Today'})
    } else {
      items.value.push({...productDatabase[0]!, status: 'active', opened_date: 'Today'})
    }

    if (skinType.includes('P') || skinType.includes('O')) {
      items.value.push({...productDatabase[2]!, status: 'active', opened_date: 'Today'})
    }

    // Using the Laneige mask here just as a placeholder to ensure the array has length
    items.value.push({...productDatabase[5]!, status: 'active', opened_date: 'Today'})
  }

  return { items, productDatabase, addProduct, removeProduct, generateRoutine }
})
