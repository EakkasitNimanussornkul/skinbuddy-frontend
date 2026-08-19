<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  searchProducts,
  pickTopRecommendations,
  buildComparePath,
  MAX_COMPARE_PRODUCTS,
  type ScoredProduct,
} from '../api/products.ts'
import { useAuthStore } from '../stores/auth.ts'
import { useToast } from '../composables/useToast.ts'
import SearchAutocompleteInput from '../components/Shared/SearchAutocompleteInput.vue'
import SkinTypeRecommendationsWidget from '../components/Shared/SkinTypeRecommendationsWidget.vue'
import ExploreProductCard from '../components/Catalog/ExploreProductCard.vue'
import ExploreCategoryBar from '../components/Catalog/ExploreCategoryBar.vue'
import UniversalProductModal from '../components/Catalog/UniversalProductModal.vue'
import CompareSelectorModal from '../components/Compare/CompareSelectorModal.vue'
import PriceRangeSlider from '../components/Catalog/PriceRangeSlider.vue'
import EmptyState from '../components/Shared/EmptyState.vue'
import ProductShowcaseMarquee from '../components/Catalog/ProductShowcaseMarquee.vue'

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

const cleanString = (str: string) => {
  let res = (str || '').toLowerCase().trim()
  if (res.endsWith('s') && res !== 'sunscreen') {
    res = res.slice(0, -1)
  }
  return res.replace('+', ' ').replace('%20', ' ')
}

const syncFiltersFromURL = () => {
  // `q` is what the global search bar in TopNav sends. It was read nowhere, so
  // the primary search affordance navigated here and silently dropped the term.
  searchQuery.value = (route.query.q as string) || ''

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

// Gated feature interceptor for unregistered guests
const handleCompareToggle = (product: any) => {
  if (!authStore.isAuthenticated) {
    authStore.triggerLoginPopup('Sign in to compare skin formulas side-by-side.')
    return
  }

  const index = comparisonSlugs.value.indexOf(product.slug)
  if (index > -1) {
    comparisonSlugs.value.splice(index, 1)
  } else {
    // The engine compares exactly two. Offering three here promised a
    // capability GET /products/compare does not have.
    if (comparisonSlugs.value.length >= MAX_COMPARE_PRODUCTS) {
      addToast(`You can compare ${MAX_COMPARE_PRODUCTS} skin formulas at a time.`, 'warning')
      return
    }
    comparisonSlugs.value.push(product.slug)
  }
}

const handleInitializeCompare = () => {
  if (!authStore.isAuthenticated) {
    authStore.triggerLoginPopup('Sign in to run side-by-side formula comparisons.')
    return
  }
  // CompareView reads `a` and `b`. This used to send `slugs=a,b,c`, which it
  // reads nowhere, so the comparison landed on its own "select two products"
  // prompt - telling the user to do what they had just done.
  const path = buildComparePath(comparisonSlugs.value)
  if (!path) {
    addToast(`Select ${MAX_COMPARE_PRODUCTS} formulas to compare.`, 'warning')
    return
  }
  router.push(path)
}

const fetchCatalog = async () => {
  isLoading.value = true
  try {
    const data = await searchProducts(searchQuery.value, activeMinPrice.value, activeMaxPrice.value)
    catalog.value = data || []
  } catch {
    addToast('Failed to load product catalog.', 'error')
  } finally {
    isLoading.value = false
  }
}

const handleCategoryUpdate = (newCategory: string) => {
  router.push({
    path: route.path,
    query: { ...route.query, category: newCategory === 'All' ? undefined : newCategory }
  })
}

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

// --- Recommended products for you ---
//
// Fetched separately from the catalogue rather than derived from it. fetchCatalog
// passes the active search term and price bounds to the backend, so deriving
// recommendations from its result would make them shift as the user filters.
// "Recommended for you" should not depend on what is currently on screen.
//
// The skin type comes from the signed-in user's record, not from the address.
// A guest sees the plain catalogue with no recommendations section at all -
// anonymous responses carry no match score, so there is nothing to rank.
const recommendedProducts = ref<ScoredProduct[]>([])
const recommendationsLoading = ref(false)
const recommendationsFailed = ref(false)

const showRecommendations = computed(
  () => authStore.isAuthenticated && !!authStore.user?.skin_type,
)

const loadRecommendations = async () => {
  if (!showRecommendations.value) return

  recommendationsLoading.value = true
  recommendationsFailed.value = false

  try {
    const results = await searchProducts()
    recommendedProducts.value = pickTopRecommendations(results)
  } catch (error) {
    console.error('Failed to load recommended products:', error)
    recommendedProducts.value = []
    recommendationsFailed.value = true
  } finally {
    recommendationsLoading.value = false
  }
}

onMounted(() => {
  fetchCatalog()
  syncFiltersFromURL()
  loadRecommendations()
})

const uniqueCategories = computed(() => {
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
    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6">

 <!-- Header Dashboard Banner (Full-Width / Borderless Desktop Variant) -->
<div class="w-full py-4 sm:py-6 border-b border-brand-surface-border dark:border-stone-800/80 transition-colors duration-300 space-y-6">

  <!-- 2-Column Responsive Layout: Content Left, Marquee Right -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">

    <!-- Left Column: Title & Text (7 cols) -->
    <div class="lg:col-span-7 space-y-3">
      <span class="text-[10px] font-bold text-brand-primary uppercase tracking-widest">
        Global Formulation Registry
      </span>
      <h1 class="text-3xl sm:text-5xl font-serif font-bold text-brand-text dark:text-stone-100 tracking-tight">
        Explore Skincare Catalog
      </h1>
      <p class="text-xs sm:text-sm text-brand-text-muted dark:text-stone-400 leading-relaxed font-medium max-w-2xl">
        Discover curated formulations with complete active ingredient breakdowns, sensitivity risk factors, and personalized Baumann skin compatibility scores.
      </p>
    </div>

    <!-- Right Column: Sliding Marquee (5 cols) -->
    <div class="lg:col-span-5 flex flex-col items-end justify-center w-full min-w-0">
      <button
        v-if="comparisonSlugs.length > 0"
        @click="handleInitializeCompare"
        class="mb-3 flex items-center gap-2.5 px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold transition-all shadow-md hover:bg-brand-primary-hover active:scale-95 cursor-pointer"
      >
        <span>Initialize Compare</span>
        <span class="bg-white/20 px-2 py-0.5 rounded-lg text-[10px] font-mono">
          {{ comparisonSlugs.length }}
        </span>
      </button>

      <ProductShowcaseMarquee :products="catalog" />
    </div>

  </div>

  <!-- Feature Highlights Grid (0 Emojis, Clean SVG Checkmarks) -->
  <div class="pt-4 border-t border-brand-surface-border dark:border-stone-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="flex items-center gap-3">
      <div class="w-6 h-6 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
        <svg class="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span class="text-xs font-bold text-brand-text dark:text-stone-200">Detailed ingredient breakdowns</span>
    </div>

    <div class="flex items-center gap-3">
      <div class="w-6 h-6 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
        <svg class="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span class="text-xs font-bold text-brand-text dark:text-stone-200">Safety & compatibility ratings</span>
    </div>

    <div class="flex items-center gap-3">
      <div class="w-6 h-6 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
        <svg class="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span class="text-xs font-bold text-brand-text dark:text-stone-200">Personalized Baumann matching</span>
    </div>

    <div class="flex items-center gap-3">
      <div class="w-6 h-6 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
        <svg class="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span class="text-xs font-bold text-brand-text dark:text-stone-200">100% Independent analysis</span>
    </div>
  </div>

</div>

      <!-- Mobile/Tablet Search Input -->
      <div class="w-full block lg:hidden">
        <SearchAutocompleteInput
          :initial-query="searchQuery"
          @search-submit="searchQuery = $event"
        />
      </div>

      <!-- Control Deck Container -->
      <div class="bg-brand-surface-light dark:bg-brand-surface-dark p-6 rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

        <!-- LEFT PANEL: Formulation Filters -->
        <div class="lg:col-span-7 flex flex-col gap-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="space-y-0.5">
              <span class="text-xs font-bold uppercase tracking-wider text-brand-text-muted">Filter Formulation</span>
              <p class="text-[11px] text-brand-text-muted">Isolate target skincare categories and curated brands.</p>
            </div>

            <select
              v-model="selectedBrand"
              class="w-full sm:w-56 bg-brand-bg-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer transition-all text-brand-text dark:text-stone-200"
            >
              <option v-for="brand in uniqueBrands" :key="brand" :value="brand">
                {{ brand === 'All' ? 'All Curated Brands' : brand }}
              </option>
            </select>
          </div>

          <div class="w-full pt-1">
            <ExploreCategoryBar
              :categories="uniqueCategories"
              :selected-category="selectedCategory"
              @update:selected-category="handleCategoryUpdate"
            />
          </div>
        </div>

        <!-- MIDDLE: Splitter Line -->
        <div class="hidden lg:block lg:col-span-1 h-16 border-r border-brand-surface-border dark:border-stone-800 justify-self-center"></div>

        <!-- RIGHT PANEL: Price Slider -->
        <div class="lg:col-span-4 w-full">
          <PriceRangeSlider
            :min-price="activeMinPrice"
            :max-price="activeMaxPrice"
            :default-max-limit="1500"
            @apply="handlePriceApply"
            @clear="handlePriceClear"
          />
        </div>

      </div>

      <!-- 2. Recommended products for you.
           Hidden entirely for guests and for users with no skin type: an
           anonymous catalogue response carries no match score, so there would
           be nothing to rank and an empty state would say nothing useful. -->
      <div
        v-if="showRecommendations"
        class="bg-brand-surface-light dark:bg-brand-surface-dark p-6 sm:p-8 rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 shadow-sm"
      >
        <SkinTypeRecommendationsWidget
          :user-skin-type="authStore.user?.skin_type || ''"
          :products="recommendedProducts"
          :loading="recommendationsLoading"
          :failed="recommendationsFailed"
          hide-catalog-link
          subheading="Ranked against your Baumann profile. Browse the full registry below."
          @retry="loadRecommendations"
        />
      </div>

      <!-- 3. The full catalogue -->
      <div class="space-y-6">
        <div>
          <span class="text-[11px] font-bold uppercase tracking-widest text-brand-primary">Complete Registry</span>
          <h3 class="text-xl sm:text-2xl font-serif font-bold text-brand-text dark:text-white mt-1">
            All Formulations
          </h3>
          <p class="text-xs sm:text-sm text-brand-text-muted mt-1">
            Every product in the catalog, filtered by your selections above.
          </p>
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
