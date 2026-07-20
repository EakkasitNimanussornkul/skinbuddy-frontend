<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { searchProducts } from '../api/products'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'

import SearchAutocompleteInput from '../components/Shared/SearchAutocompleteInput.vue'
import ExploreProductCard from '../components/Catalog/ExploreProductCard.vue'
import ExploreCategoryBar from '../components/Catalog/ExploreCategoryBar.vue'
import UniversalProductModal from '../components/Catalog/UniversalProductModal.vue'
import CompareSelectorModal from '../components/Catalog/CompareSelectorModal.vue'
import PriceRangeSlider from '../components/Catalog/PriceRangeSlider.vue'
import EmptyState from '../components/Shared/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { addToast } = useToast()

const catalog = ref<any[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('All')
const selectedBrand = ref('All')

const activeMinPrice = ref(0)
const activeMaxPrice = ref(1500)

const selectedForInspection = ref<any>(null)
const baseProductForCompare = ref<any | null>(null)
const comparisonSlugs = ref<string[]>([])

// Unified base normalization routine for absolute string security
const cleanString = (str: string) => {
  let res = (str || '').toLowerCase().trim()
  // Strip tailing pluralization vectors for comparisons
  if (res.endsWith('s') && res !== 'sunscreen') {
    res = res.slice(0, -1)
  }
  // Standardize spaces to easily handle "Sun Care" variations
  return res.replace('+', ' ').replace('%20', ' ')
}

const syncFiltersFromURL = () => {
  if (route.query.category) {
    selectedCategory.value = route.query.category as string
  } else {
    selectedCategory.value = 'All'
  }

  if (route.query.brand) {
    selectedBrand.value = route.query.brand as string
  } else {
    selectedBrand.value = 'All'
  }
}

const handleCompareToggle = (product: any) => {
  const index = comparisonSlugs.value.indexOf(product.slug)
  if (index > -1) {
    comparisonSlugs.value.splice(index, 1)
  } else {
    if (comparisonSlugs.value.length >= 3) {
      addToast('You can compare a maximum of 3 skin formulas at once.', 'warning')
      return
    }
    comparisonSlugs.value.push(product.slug)
  }
}

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

// Emits from clicking on the local category bar chips push to URL params
const handleCategoryUpdate = (newCategory: string) => {
  router.push({
    path: route.path,
    query: { ...route.query, category: newCategory === 'All' ? undefined : newCategory }
  })
}

onMounted(() => {
  fetchCatalog()
  syncFiltersFromURL()
})

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
  // Use precise database matches derived directly from your image parameters
  const core = ['Cleansers', 'Toners', 'Serums', 'Treatments', 'Exfoliators', 'Sun Care']
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

    // 🌟 Advanced dynamic normalization layer evaluating base equality values 🌟
    const cleanedFilter = cleanString(selectedCategory.value)
    const cleanedProductCat = cleanString(product.category || '')

    const matchesCategory = selectedCategory.value === 'All' || cleanedProductCat === cleanedFilter
    const matchesBrand = selectedBrand.value === 'All' || product.brand === selectedBrand.value

    return matchesSearch && matchesCategory && matchesBrand
  })
})

watch(
  () => route.query,
  () => {
    syncFiltersFromURL()
  },
  { deep: true }
)
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans pb-36 pt-6 transition-colors duration-300">
    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 flex flex-col gap-6">

      <!-- Header Dashboard Banner -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-surface-light dark:bg-brand-surface-dark p-6 rounded-[2rem] border border-brand-surface-border dark:border-stone-800 shadow-sm">
        <div>
          <span class="text-[10px] font-bold text-brand-primary uppercase tracking-widest">Global Formulation Registry</span>
          <h1 class="text-2xl sm:text-3xl font-serif font-bold mt-0.5">Explore Skincare Catalog</h1>
        </div>

        <button
          v-if="comparisonSlugs.length > 0"
          @click="router.push(`/compare?slugs=${comparisonSlugs.join(',')}`)"
          class="flex items-center gap-2 px-5 py-3 bg-brand-primary text-white rounded-xl text-xs font-bold transition-all shadow-md hover:bg-brand-primary-hover active:scale-95 cursor-pointer"
        >
          <span>Initialize Compare</span>
          <span class="bg-white/20 px-2 py-0.5 rounded-md text-[10px] font-mono">{{ comparisonSlugs.length }}</span>
        </button>
      </div>

      <!-- Mobile/Tablet Search Input -->
      <div class="w-full block lg:hidden">
        <SearchAutocompleteInput
          :initial-query="searchQuery"
          @search-submit="searchQuery = $event; fetchCatalog()"
        />
      </div>

      <!-- Filter Controls Deck Layout Split Row -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Left Side: Categorization Filters -->
        <div class="lg:col-span-7 space-y-4 bg-brand-surface-light dark:bg-brand-surface-dark p-6 rounded-[2rem] border border-brand-surface-border dark:border-stone-800 shadow-sm">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span class="text-xs font-bold uppercase tracking-wider text-brand-text-muted">Filter Formulation</span>

            <select
              v-model="selectedBrand"
              class="w-full sm:w-64 bg-brand-bg-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer transition-all text-brand-text dark:text-stone-200"
            >
              <option v-for="brand in uniqueBrands" :key="brand" :value="brand">
                {{ brand === 'All' ? 'All Curated Brands' : brand }}
              </option>
            </select>
          </div>

          <!-- Mapped category bar model updates -->
          <ExploreCategoryBar
            :categories="uniqueCategories"
            :selected-category="selectedCategory"
            @update:selected-category="handleCategoryUpdate"
          />
        </div>

        <!-- Right Side: Slider Filters -->
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

      <!-- Loading Tracker -->
      <div v-if="isLoading" class="py-32 text-center animate-pulse text-xs font-bold uppercase tracking-widest text-brand-text-muted">
        Refining Formula Matrix Viewport...
      </div>

      <!-- Product Grid -->
      <div v-else-if="filteredCatalog.length > 0" class="grid grid-cols-1 xl:grid-cols-2 gap-5 w-full items-start">
        <ExploreProductCard
          v-for="product in filteredCatalog"
          :key="product.id"
          :product="product"
          :is-selected-for-compare="comparisonSlugs.includes(product.slug)"
          @inspect="selectedForInspection = product"
          @toggle-compare="handleCompareToggle(product)"
        />
      </div>

      <div v-else class="py-12 flex justify-center w-full">
        <EmptyState
          title="No Formulation Matches"
          message="No curated cosmetic items align with your selected target pricing intervals or catalog filtering boundaries."
          action-label="Reset Filter Criteria"
          @action="handlePriceClear(); selectedCategory = 'All'; selectedBrand = 'All'; router.push('/explore')"
        />
      </div>

    </div>

    <!-- Modals Workspace Context -->
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
