<script setup lang="ts">
import { ref, computed } from 'vue'
import SearchResultCard from './SearchResultCard.vue'

const props = defineProps<{
  catalog: any[]
  isLoading: boolean
}>()

const emit = defineEmits(['select-product'])

const searchQuery = ref('')
const selectedCategory = ref('All')
const selectedBrand = ref('All')

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
  <div class="flex flex-col w-full h-full overflow-hidden bg-transparent min-h-0">
    <!-- Sticky Search Header -->
    <div class="shrink-0 p-4 sm:p-5 border-b border-brand-surface-border dark:border-stone-800 z-10">
      <label class="block text-xs font-bold text-brand-primary uppercase tracking-wider mb-2.5">Search Catalog</label>

      <div class="relative mb-3.5">
        <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Brand or product name..."
          class="w-full bg-brand-bg-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-700 text-brand-text dark:text-white pl-10 pr-10 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-shadow text-sm shadow-sm"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-brand-text-muted hover:text-brand-primary">
          <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="relative">
          <select v-model="selectedCategory" class="w-full appearance-none bg-brand-bg-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-700 text-brand-text dark:text-stone-300 text-xs font-bold rounded-xl px-3 py-2.5 pr-8 outline-none shadow-sm cursor-pointer focus:ring-2 focus:ring-brand-primary transition-all">
            <option v-for="cat in uniqueCategories" :key="cat" :value="cat">{{ cat === 'All' ? 'Category' : cat }}</option>
          </select>
          <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-brand-text-muted">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
        <div class="relative">
          <select v-model="selectedBrand" class="w-full appearance-none bg-brand-bg-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-700 text-brand-text dark:text-stone-300 text-xs font-bold rounded-xl px-3 py-2.5 pr-8 outline-none shadow-sm cursor-pointer focus:ring-2 focus:ring-brand-primary transition-all">
            <option v-for="brand in uniqueBrands" :key="brand" :value="brand">{{ brand === 'All' ? 'Brand' : brand }}</option>
          </select>
          <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-brand-text-muted">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Scrollable Results Body (min-h-0 and overscroll-contain fixes mobile bug) -->
    <div class="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 hide-scrollbar">
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-12 text-brand-text-muted animate-pulse">
        <div class="w-8 h-8 border-4 border-brand-surface-border border-t-brand-primary rounded-full animate-spin mb-4"></div>
        <p class="text-xs font-bold uppercase tracking-widest text-brand-primary">Loading Catalog...</p>
      </div>

      <ul v-else-if="filteredProducts.length > 0" class="flex flex-col gap-3 pb-12 w-full m-0 p-0">
        <SearchResultCard
          v-for="product in filteredProducts"
          :key="product.id"
          :product="product"
          @select="emit('select-product', product)"
        />
      </ul>

      <div v-else class="p-8 text-center flex flex-col items-center justify-center animate-fade-in mt-6">
        <svg class="w-12 h-12 mb-4 text-brand-surface-border dark:text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
        <p class="text-sm font-bold text-brand-text dark:text-white mb-1">No products found</p>
        <p class="text-xs text-brand-text-muted max-w-[200px] leading-relaxed">Adjust your filters or try a different search term.</p>
        <button v-if="searchQuery || selectedCategory !== 'All' || selectedBrand !== 'All'" @click="searchQuery = ''; selectedCategory = 'All'; selectedBrand = 'All'" class="mt-4 text-brand-primary font-bold text-sm hover:text-brand-primary-hover transition-colors">Clear Filters</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (pointer: fine) {
  .hide-scrollbar::-webkit-scrollbar { width: 6px; }
  .hide-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .hide-scrollbar::-webkit-scrollbar-thumb { background-color: var(--color-brand-surface-border); border-radius: 20px; }
  .dark .hide-scrollbar::-webkit-scrollbar-thumb { background-color: var(--color-brand-text-muted); }
}
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
