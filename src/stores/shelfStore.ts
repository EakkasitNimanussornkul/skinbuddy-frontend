import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ShelfItem {
  id: string;
  brand: string;
  name: string;
  category: string;
  status: 'active' | 'wishlist' | 'finished';
  opened_date: string | null;
  expiration_date?: string | null;
  routine_step?: string;
  ingredients?: string[];
  description?: string;
}

export const useShelfStore = defineStore('shelf', () => {
  // --- DYNAMIC MOCK DATES FOR TESTING ---
  const today = new Date()

  // Safe: Expires in 6 months
  const safeDate = new Date(today)
  safeDate.setMonth(today.getMonth() + 6)

  // Warning: Expires in 14 days
  const warningDate = new Date(today)
  warningDate.setDate(today.getDate() + 14)

  // Expired: Expired 2 months ago
  const expiredDate = new Date(today)
  expiredDate.setMonth(today.getMonth() - 2)

  const toStr = (d: Date) => d.toISOString().split('T')[0]

  // 1. User's Current Shelf (Now equipped with Expiration Test Data)
  const items = ref<ShelfItem[]>([
    { id: '1', brand: 'CeraVe', name: 'Hydrating Facial Cleanser', category: 'Cleanser', status: 'active', opened_date: '2023-10-12', expiration_date: toStr(safeDate), routine_step: 'AM/PM', ingredients: ['Ceramides', 'Hyaluronic Acid', 'Glycerin'], description: 'Cleanses and hydrates without disrupting the skin barrier.' },
    { id: '2', brand: 'The Ordinary', name: 'Vitamin C Suspension 23%', category: 'Serum', status: 'active', opened_date: '2023-11-01', expiration_date: toStr(warningDate), routine_step: 'PM', ingredients: ['L-Ascorbic Acid', 'Squalane'], description: 'A water-free, silicone-free stable suspension.' },
    { id: '3', brand: 'Paula\'s Choice', name: '2% BHA Liquid Exfoliant', category: 'Toner', status: 'active', opened_date: '2023-01-15', expiration_date: toStr(expiredDate), routine_step: 'PM', ingredients: ['Salicylic Acid', 'Green Tea Extract'], description: 'A daily leave-on exfoliant.' },
    { id: '4', brand: 'Pixi', name: 'Glow Tonic', category: 'Toner', status: 'wishlist', opened_date: null, expiration_date: null, routine_step: 'PM', ingredients: ['Glycolic Acid', 'Fragrance'], description: 'Invigorating facial toner.' },
    { id: '5', brand: 'Laneige', name: 'Water Sleeping Mask', category: 'Moisturizer', status: 'wishlist', opened_date: null, expiration_date: null, routine_step: 'PM', ingredients: ['Water', 'Glycerin', 'Fragrance'], description: 'Overnight moisture mask.' }
  ])

  // 2. Master Database (For comparisons/recommendations)
  const productDatabase: ShelfItem[] = [
    { id: '1', brand: 'CeraVe', name: 'Hydrating Facial Cleanser', category: 'Cleanser', status: 'wishlist', opened_date: null, expiration_date: null, routine_step: 'AM/PM', ingredients: ['Ceramides', 'Hyaluronic Acid', 'Glycerin'], description: 'Cleanses and hydrates without disrupting the skin barrier.' },
    { id: '2', brand: 'Paula\'s Choice', name: '2% BHA Liquid Exfoliant', category: 'Toner', status: 'wishlist', opened_date: null, expiration_date: null, routine_step: 'PM', ingredients: ['Salicylic Acid', 'Green Tea Extract'], description: 'A daily leave-on exfoliant that sweeps away dead skin cells and unclogs pores.' },
    { id: '3', brand: 'The Ordinary', name: 'Niacinamide 10% + Zinc', category: 'Serum', status: 'wishlist', opened_date: null, expiration_date: null, routine_step: 'AM/PM', ingredients: ['Niacinamide', 'Zinc PCA'], description: 'A high-strength vitamin and blemish formula.' },
    { id: '4', brand: 'Pixi', name: 'Glow Tonic', category: 'Toner', status: 'wishlist', opened_date: null, expiration_date: null, routine_step: 'PM', ingredients: ['Glycolic Acid', 'Fragrance', 'Hexyl Cinnamal'], description: 'A highly concentrated, invigorating facial toner that deeply cleans pores.' },
    { id: '5', brand: 'Mario Badescu', name: 'Facial Spray', category: 'Toner', status: 'wishlist', opened_date: null, expiration_date: null, routine_step: 'Anytime', ingredients: ['Water', 'Alcohol Denat', 'Fragrance', 'Rose Extract'], description: 'A refreshing, hydrating mist to use anywhere anytime.' },
    { id: '6', brand: 'Laneige', name: 'Water Sleeping Mask', category: 'Moisturizer', status: 'wishlist', opened_date: null, expiration_date: null, routine_step: 'PM', ingredients: ['Water', 'Glycerin', 'Fragrance', 'Linalool'], description: 'An overnight moisture-recharging gel mask that quickly absorbs while you sleep.' }
  ]

  const addProduct = (product: Omit<ShelfItem, 'id'>) => {
    const newProduct: ShelfItem = {
      ...product,
      id: Math.random().toString(36).substr(2, 9)
    }
    items.value.unshift(newProduct)
  }

  const removeProduct = (id: string) => {
    items.value = items.value.filter(item => item.id !== id)
  }

  const recommendProducts = (skinType: string) => {
    items.value = []
    if (skinType.includes('O')) items.value.push({...productDatabase[0]!, status: 'wishlist', opened_date: null})
    else items.value.push({...productDatabase[0]!, status: 'wishlist', opened_date: null})
    if (skinType.includes('P') || skinType.includes('O')) items.value.push({...productDatabase[2]!, status: 'wishlist', opened_date: null})
    items.value.push({...productDatabase[5]!, status: 'wishlist', opened_date: null})
  }

  return { items, productDatabase, addProduct, removeProduct, recommendProducts }
})
