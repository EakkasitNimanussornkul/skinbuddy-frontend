<script setup lang="ts">
import { ref, computed } from 'vue'
import SearchResultCard from './SearchResultCard.vue'

const props = defineProps<{
  catalog: any[]
  isLoading: boolean
}>()

const emit = defineEmits(['select-product'])

// --- Local Filter State ---
const searchQuery = ref('')
const selectedCategory = ref('All')
const selectedBrand = ref('All')

// --- Fully Dynamic Filters ---
const uniqueCategories = computed(() => {
  const coreCategories = ['Cleanser', 'Toner', 'Serum', 'Moisturizer', 'Sunscreen', 'Treatment', 'Mask', 'Face Oil', 'Eye Cream']
  const dbCategories = props.catalog.map(p => p.category).filter(Boolean)
  return ['All', ...new Set([...coreCategories, ...dbCategories])]
})

const uniqueBrands = computed(() => {
  const brands = props.catalog.map(p => p.brand).filter(Boolean)
  const sortedBrands = [...new Set(brands)].sort((a, b) => a.localeCompare(b))
  return ['All', ...sortedBrands]
})

// --- Instant Local Filtering ---
const filteredProducts = computed(() => {
  return props.catalog.filter(product => {
    const safeQuery = searchQuery.value.toLowerCase().trim()
    const matchesSearch = !safeQuery ||
      (product.name && product.name.toLowerCase().includes(safeQuery)) ||
      (product.brand && product.brand.toLowerCase().includes(safeQuery))

    const matchesCategory = selectedCategory.value === 'All' || product.category === selectedCategory.value
    const matchesBrand = selectedBrand.value === 'All' || product.brand === selectedBrand.value

    return matchesSearch && matchesCategory && matchesBrand
  })
})
</script>

<template>
  <div class="mb-6 relative max-w-2xl mx-auto w-full">
    <label class="block text-xs font-bold text-brand-primary dark:text-orange-400 uppercase tracking-wider mb-2">Search Catalog</label>

    <div class="relative mb-4">
      <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Type a brand or product name..."
        class="w-full bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-700 text-brand-text dark:text-white pl-11 pr-12 py-3.5 rounded-2xl focus:outline-none focus:border-brand-primary transition-colors shadow-sm text-base"
      />
      <button v-if="searchQuery" @click="searchQuery = ''" class="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-brand-primary">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>

    <div class="grid grid-cols-2 gap-3 mb-8">
      <div class="relative">
        <select v-model="selectedCategory" class="w-full appearance-none bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-sm rounded-xl px-4 py-2.5 pr-10 outline-none shadow-sm cursor-pointer focus:ring-2 focus:ring-brand-primary transition-all">
          <option v-for="cat in uniqueCategories" :key="cat" :value="cat">{{ cat === 'All' ? 'Category' : cat }}</option>
        </select>
        <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-stone-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
      <div class="relative">
        <select v-model="selectedBrand" class="w-full appearance-none bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-sm rounded-xl px-4 py-2.5 pr-10 outline-none shadow-sm cursor-pointer focus:ring-2 focus:ring-brand-primary transition-all">
          <option v-for="brand in uniqueBrands" :key="brand" :value="brand">{{ brand === 'All' ? 'Brand' : brand }}</option>
        </select>
        <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-stone-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
    </div>
  </div>

  <div v-if="isLoading" class="flex flex-col items-center justify-center py-12 text-stone-400 animate-pulse">
    <div class="w-8 h-8 border-4 border-stone-200 border-t-brand-primary rounded-full animate-spin mb-4"></div>
    <p class="text-xs font-bold uppercase tracking-widest">Loading Catalog...</p>
  </div>

  <ul v-else-if="filteredProducts.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
    <SearchResultCard
      v-for="product in filteredProducts"
      :key="product.id"
      :product="product"
      @select="emit('select-product', product)"
    />
  </ul>

  <div v-else class="p-8 text-center flex flex-col items-center justify-center animate-fade-in mt-10">
    <svg class="w-12 h-12 mb-4 text-stone-300 dark:text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
    <p class="text-sm font-bold text-brand-text dark:text-stone-200 mb-1">No products found</p>
    <p class="text-xs text-stone-500 dark:text-stone-400 max-w-[200px] leading-relaxed">Adjust your filters or try a different search term.</p>
    <button v-if="searchQuery || selectedCategory !== 'All' || selectedBrand !== 'All'" @click="searchQuery = ''; selectedCategory = 'All'; selectedBrand = 'All'" class="mt-4 text-brand-primary font-bold text-sm">Clear Filters</button>
  </div>
</template>
