<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { searchProducts, getProductById } from '../api/products'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'

import SearchAutocompleteInput from '../components/Shared/SearchAutocompleteInput.vue'
import ExploreProductCard from '../components/Catalog/ExploreProductCard.vue'
import ExploreCategoryBar from '../components/Catalog/ExploreCategoryBar.vue'
import UniversalProductModal from '../components/Catalog/UniversalProductModal.vue'
import CompareSelectorModal from '../components/Catalog/CompareSelectorModal.vue'
import PriceRangeSlider from '../components/Catalog/PriceRangeSlider.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { addToast } = useToast()

const catalog = ref<any[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('All')
const selectedBrand = ref('All')

// Active Price Filter State
const activeMinPrice = ref(0)
const activeMaxPrice = ref(1500)

const selectedForInspection = ref<any>(null)
const baseProductForCompare = ref<any | null>(null)

const fetchCatalog = async () => {
  isLoading.value = true
  try {
    const data = await searchProducts(searchQuery.value, activeMinPrice.value, activeMaxPrice.value)
    catalog.value = data || []
  } catch (error) {
    addToast('Failed to load product catalog.', 'error')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchCatalog())

const handlePriceApply = (range: { min: number; max: number }) => {
  activeMinPrice.value = range.min
  activeMaxPrice.value = range.max
  fetchCatalog()
}

const handlePriceClear = () => {
  activeMinPrice.value = 0
  activeMaxPrice.value = 1500
  fetchCatalog()
}

const uniqueCategories = computed(() => {
  const core = ['Cleanser', 'Toner', 'Serum', 'Moisturizer', 'Sunscreen', 'Treatment']
  const dbCats = catalog.value.map(p => p.category).filter(Boolean)
  return ['All', ...new Set([...core, ...dbCats])]
})

const uniqueBrands = computed(() => {
  const brands = catalog.value.map(p => p.brand).filter(Boolean)
  return ['All', ...[...new Set(brands)].sort((a, b) => a.localeCompare(b))]
})

const filteredCatalog = computed(() => {
  return catalog.value.filter(product => {
    const query = searchQuery.value.toLowerCase().trim()
    const matchesSearch = !query ||
      (product.name && product.name.toLowerCase().includes(query)) ||
      (product.brand && product.brand.toLowerCase().includes(query)) ||
      (product.category && product.category.toLowerCase().includes(query))

    const matchesCategory = selectedCategory.value === 'All' || product.category === selectedCategory.value
    const matchesBrand = selectedBrand.value === 'All' || product.brand === selectedBrand.value

    return matchesSearch && matchesCategory && matchesBrand
  })
})
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans pb-36 pt-6 transition-colors duration-300">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col gap-6">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-surface-light dark:bg-brand-surface-dark p-6 rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-sm">
  <div>
    <span class="text-[10px] font-bold text-brand-primary uppercase tracking-widest">Global Database</span>
    <h1 class="text-2xl sm:text-3xl font-serif font-bold mt-0.5">Explore Skincare</h1>
  </div>
</div>

<!-- 🌟 ROW 1: Mobile/Tablet Only Search Bar (Hidden on Desktop via block lg:hidden) 🌟 -->
<div class="w-full block lg:hidden">
  <SearchAutocompleteInput
    :initial-query="searchQuery"
    @search-submit="searchQuery = $event; fetchCatalog()"
  />
</div>

<!-- ROW 2: Structured 2-Column Filter Deck -->
<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

  <!-- Left Side (7 Cols): Brand Dropdown & Category Chips -->
  <div class="lg:col-span-7 space-y-4 bg-brand-surface-light dark:bg-brand-surface-dark p-6 rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-sm">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span class="text-xs font-bold uppercase tracking-wider text-stone-400">Filter Formulation</span>

            <!-- Aligned Brand Selector -->
            <select
              v-model="selectedBrand"
              class="w-full sm:w-64 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer transition-all"
            >
              <option v-for="brand in uniqueBrands" :key="brand" :value="brand">
                {{ brand === 'All' ? 'All Curated Brands' : brand }}
              </option>
            </select>
          </div>

          <ExploreCategoryBar
            :categories="uniqueCategories"
            v-model:selectedCategory="selectedCategory"
          />
        </div>

        <!-- Right Side (4 Cols anchored outside): Dual Price Slider -->
      <div class="lg:col-span-5 w-full">
          <PriceRangeSlider
            :min-price="activeMinPrice"
            :max-price="activeMaxPrice"
            :default-max-limit="1500"
            @apply="handlePriceApply"
            @clear="handlePriceClear"
          />
        </div>

      </div>

      <!-- Loading Spinner -->
      <div v-if="isLoading" class="py-20 text-center animate-pulse text-xs font-bold uppercase tracking-widest text-stone-400">
        Refining Formula Matrix...
      </div>

      <!-- Product Grid -->
      <div v-else-if="filteredCatalog.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <ExploreProductCard
          v-for="product in filteredCatalog"
          :key="product.id"
          :product="product"
          @inspect="selectedForInspection = product"
          @toggle-compare="baseProductForCompare = product"
        />
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16 bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2rem] border border-stone-200 dark:border-stone-800">
        <p class="text-sm font-bold text-stone-400 mb-2">No products match your active price range or brand filters.</p>
        <button @click="handlePriceClear(); selectedCategory = 'All'; selectedBrand = 'All'" class="text-brand-primary text-xs font-bold underline cursor-pointer">Reset All Filters</button>
      </div>

    </div>

    <!-- Modals -->
    <Teleport to="body">
      <UniversalProductModal
        v-if="selectedForInspection"
        :product="selectedForInspection"
        mode="explore"
        @close="selectedForInspection = null"
        @refresh="fetchCatalog"
        @open-compare-selector="baseProductForCompare = $event"
      />
      <CompareSelectorModal
        v-if="baseProductForCompare"
        :base-product="baseProductForCompare"
        @close="baseProductForCompare = null"
      />
    </Teleport>
  </div>
</template>
