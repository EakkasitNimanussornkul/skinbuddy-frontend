<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  searchProducts,
  pickTopRecommendations,
  resolveCatalogState,
  MATCH_SCORE_BASIS,
  MATCH_METHOD_PATH,
  MATCH_SCORE_DISCLAIMER,
  type ScoredProduct,
} from '../api/products.ts'
import { useAuthStore } from '../stores/auth.ts'
import { useToast } from '../composables/useToast.ts'
import SkinTypeRecommendationsWidget from '../components/Shared/SkinTypeRecommendationsWidget.vue'
import ExploreProductCard from '../components/Catalog/ExploreProductCard.vue'
import ExploreCategoryBar from '../components/Catalog/ExploreCategoryBar.vue'
import UniversalProductModal from '../components/Catalog/UniversalProductModal.vue'
import CompareSelectorModal from '../components/Compare/CompareSelectorModal.vue'
import PriceRangeSlider from '../components/Catalog/PriceRangeSlider.vue'
import EmptyState from '../components/Shared/EmptyState.vue'
import ProductShowcaseMarquee from '../components/Catalog/ProductShowcaseMarquee.vue'
import BottomSheet from '../components/Shared/BottomSheet.vue'
import MatchInfoDisclosure from '../components/Shared/MatchInfoDisclosure.vue'
import { cardFlowDelay, pinLeavingCard } from '../components/Shared/cardFlow'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { addToast } = useToast()

const catalog = ref<any[]>([])
const isLoading = ref(true)
// Tracked separately from `catalog` because the array alone cannot say whether
// it is empty by result or empty by failure - FE-DEF-09.
const catalogFailed = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('All')
const selectedBrand = ref('All')

// The price bounds when no price filter is set.
const PRICE_FLOOR = 0
const PRICE_CEILING = 1500
const activeMinPrice = ref(PRICE_FLOOR)
const activeMaxPrice = ref(PRICE_CEILING)

const selectedForInspection = ref<any>(null)
const baseProductForCompare = ref<any | null>(null)

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

  // The brand changes from the address only when the address carries one.
  // Otherwise choosing a category - which rewrites the address - put a brand
  // picked on the page back to All (owner report, feat/23).
  if (typeof route.query.brand === 'string' && route.query.brand) {
    selectedBrand.value = route.query.brand
  }
}

// The multi-select comparison flow that lived here has been removed - FE-DEF-11.
// ExploreProductCard lost its compare control in 769a4ba, so nothing could emit
// toggle-compare and nothing could populate the selection. The handler, the
// selection array and the "Initialize Compare" button were all unreachable.
//
// Comparison is still available from the product card's own modal
// (CompareSelectorModal) and from the similar-products widget, both of which
// pick exactly two products and route through buildComparePath.

// The term the catalogue on screen was actually requested with. Compared
// against `searchQuery` to decide whether an address change needs a new
// request; see the watcher at the bottom of this file. Held rather than derived
// from the watcher's own previous value, which depends on vue-router replacing
// the query object rather than mutating it - true today, and not something this
// file should quietly rely on.
let fetchedQuery = ''

// The results area's height while a re-request is in flight. The grid gives way
// to a short loading line, so without this the page shrank under the user, the
// browser clamped the scroll position, and a price change threw them upward -
// owner report. Held at the grid's last height until the new results land.
const resultsRegion = ref<HTMLElement | null>(null)
const heldHeight = ref<number | null>(null)

const fetchCatalog = async () => {
  heldHeight.value = resultsRegion.value?.offsetHeight || null
  isLoading.value = true
  catalogFailed.value = false
  // Recorded before the await, not after. A failure leaves the failed state on
  // screen for this term rather than re-requesting it on the next unrelated
  // address change.
  fetchedQuery = searchQuery.value
  try {
    const data = await searchProducts(searchQuery.value, activeMinPrice.value, activeMaxPrice.value)
    catalog.value = data || []
  } catch {
    // Clear rather than keep. A failed re-request from the price controls would
    // otherwise leave the previous bounds' results on screen while the controls
    // show the new ones, presenting stale data as current with only a
    // self-dismissing toast to say otherwise.
    catalog.value = []
    catalogFailed.value = true
    addToast('Failed to load product catalog.', 'error')
  } finally {
    isLoading.value = false
    // Released once the new results are drawn, so the region then takes their
    // own height - shorter or longer - rather than the old one.
    nextTick(() => { heldHeight.value = null })
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
  activeMinPrice.value = PRICE_FLOOR
  activeMaxPrice.value = PRICE_CEILING
  fetchCatalog()
}

// --- Phone filters (below lg) ------------------------------------------------
// A Filters button with a count, the category chips, the active filters as
// removable chips, and a sheet with every filter. The sheet works on a copy:
// "Show products" applies it through the handlers above, and closing it any
// other way drops it. The big filter panel is for lg and up only.
const priceFiltered = computed(() => activeMinPrice.value !== PRICE_FLOOR || activeMaxPrice.value !== PRICE_CEILING)
const activeFilterCount = computed(() => (selectedBrand.value !== 'All' ? 1 : 0) + (priceFiltered.value ? 1 : 0))

const baht = (amount: number) => `฿${amount.toLocaleString('en-US')}`
const priceChipLabel = computed(() =>
  activeMinPrice.value === PRICE_FLOOR
    ? `Up to ${baht(activeMaxPrice.value)}`
    : `${baht(activeMinPrice.value)} to ${baht(activeMaxPrice.value)}`,
)

const filtersOpen = ref(false)
const filtersButton = ref<HTMLButtonElement | null>(null)
const filterDraft = reactive({ category: 'All', brand: 'All', min: PRICE_FLOOR, max: PRICE_CEILING })

const openFilters = () => {
  Object.assign(filterDraft, {
    category: selectedCategory.value,
    brand: selectedBrand.value,
    min: activeMinPrice.value,
    max: activeMaxPrice.value,
  })
  filtersOpen.value = true
}

const clearFilterDraft = () => {
  Object.assign(filterDraft, { category: 'All', brand: 'All', min: PRICE_FLOOR, max: PRICE_CEILING })
}

// The sheet's price slider writes the draft as it moves (feat/26; it replaced
// the typed From and Up to boxes).
const setDraftPrice = (range: { min: number; max: number }) => {
  filterDraft.min = range.min
  filterDraft.max = range.max
}

// A price as a whole number of baht; anything that is not a number of zero or
// more keeps the default, so a bad value can never reach the request.
const readBaht = (value: number, fallback: number) => (Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback)

const applyFilters = () => {
  filtersOpen.value = false
  let min = readBaht(filterDraft.min, PRICE_FLOOR)
  let max = readBaht(filterDraft.max, PRICE_CEILING)
  if (min > max) [min, max] = [max, min]
  if (min !== activeMinPrice.value || max !== activeMaxPrice.value) {
    if (min === PRICE_FLOOR && max === PRICE_CEILING) handlePriceClear()
    else handlePriceApply({ min, max })
  }
  selectedBrand.value = filterDraft.brand
  if (filterDraft.category !== selectedCategory.value) handleCategoryUpdate(filterDraft.category)
}

const removeBrandFilter = () => {
  selectedBrand.value = 'All'
}

// --- What % Match is, on a phone: a sheet --------------------------------------
const matchSheetOpen = ref(false)
const matchInfoButton = ref<HTMLButtonElement | null>(null)

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
// Owned here so the frame around the widget can shrink with it. Open by
// default; the user folds it to get to the filtered grid faster.
const recommendationsCollapsed = ref(false)

const showRecommendations = computed(
  () => authStore.isAuthenticated && !!authStore.user?.skin_type,
)

// What the % Match on every card is based on, in plain words (owner request:
// be open about how the score works). A viewer with no score yet is told how
// to get one rather than left looking at "Score Unavailable".
const matchExplainer = computed(() => {
  if (showRecommendations.value) return MATCH_SCORE_BASIS
  const next = authStore.isAuthenticated
    ? 'Take the skin quiz to see yours.'
    : 'Sign in and take the skin quiz to see yours.'
  return `${MATCH_SCORE_BASIS} ${next}`
})

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
  // FE-DEF-30: syncFiltersFromURL first. It is what sets `searchQuery` from the
  // address's `q`, and fetchCatalog sends `searchQuery` to the backend - so in
  // the other order the first request of every Explore load carried an empty
  // term no matter what the user searched for. Both are synchronous reads of
  // route.query, so the ordering costs nothing.
  //
  // The term then filtered the response in memory instead (`filteredCatalog`),
  // over the at-most-100 products the unfiltered request returned, so a product
  // outside that first page was invisible to an exact search and the page said
  // "No Formulation Matches" about a product the catalogue holds.
  syncFiltersFromURL()
  fetchCatalog()
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

const catalogState = computed(() =>
  resolveCatalogState(isLoading.value, catalogFailed.value, filteredCatalog.value.length),
)

watch(
  () => route.query,
  () => {
    syncFiltersFromURL()

    // The second half of FE-DEF-30, and the half the entry's ordering fix does
    // not reach. `SearchAutocompleteInput` pushes /explore?q=... - so for a user
    // already on Explore, searching again changes only the address, and this
    // watcher used to update `searchQuery` and stop there. The catalogue was
    // never re-requested, leaving the new term to filter the previous term's
    // results in memory. The first search of a session reached the server after
    // the fix above; every one after it still would not have.
    //
    // Guarded on the term rather than firing on any query change, because `q`
    // and the price bounds are the only parameters fetchCatalog sends. Category
    // and brand are applied client-side over the same response, so re-fetching
    // for them would put a network request behind every filter chip and change
    // nothing on screen.
    if (searchQuery.value !== fetchedQuery) {
      fetchCatalog()
    }
  },
  { deep: true }
)
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans pb-36 pt-6 transition-colors duration-300">
    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6">

      <!-- Phone and tablet (below lg): a short title. The banner below, with
           its product carousel and four ticks, is for lg and up, and the
           search is in the top bar. -->
      <div class="explore-phone-intro lg:hidden flex flex-col gap-0.5">
        <h1 class="m-0 font-serif text-[28px] font-bold text-stone-800 dark:text-stone-100">Explore</h1>
        <p class="m-0 text-sm text-stone-600 dark:text-stone-300">Every product in our catalogue.</p>
      </div>

 <!-- Header Dashboard Banner (Full-Width / Borderless Desktop Variant) -->
<div class="explore-hero hidden lg:block w-full py-4 sm:py-6 border-b border-brand-surface-border dark:border-stone-800/80 transition-colors duration-300 space-y-6">

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

      <!-- 1. Recommended products for you, above the search and the filter
           panel. Owner decision: the filters sit directly over the grid they
           filter, so what a user narrows is what they see next, and the
           shortlist - ranked, with each match shown - comes first on its own.

           Hidden entirely for guests and for users with no skin type: an
           anonymous catalogue response carries no match score, so there would
           be nothing to rank and an empty state would say nothing useful.

           Compact, without the rule, and collapsible - open by default, folded
           on request. `hide-divider` because this host already draws its own
           bordered card. Folded, the frame shrinks to a slim bar: most of a
           folded section's height was this card's padding and large radius. -->
      <div
        v-if="showRecommendations"
        :class="[
          'bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 shadow-sm transition-all duration-200',
          recommendationsCollapsed ? 'px-4 sm:px-5 py-2.5 rounded-2xl' : 'p-5 sm:p-6 rounded-[2.5rem]',
        ]"
      >
        <SkinTypeRecommendationsWidget
          v-model:collapsed="recommendationsCollapsed"
          :user-skin-type="authStore.user?.skin_type || ''"
          :products="recommendedProducts"
          :loading="recommendationsLoading"
          :failed="recommendationsFailed"
          hide-catalog-link
          compact
          hide-divider
          collapsible
          subheading="Ranked by % Match, best first: how well each product's ingredients suit your skin type."
          @retry="loadRecommendations"
        />
      </div>

      <!-- No search box of its own (feat/23): the phone top bar and TopNav
           both have one. Neither binds to this page: submitting pushes
           /explore?q=..., which the watcher at the bottom of this file turns
           into a real request. (A keystroke binding here was the third
           occurrence of FE-DEF-30: it filtered the products already in memory.) -->

      <!-- Phone filter bar (below lg): Filters, with a count of the active
           brand and price filters, then the category chips. -->
      <div class="explore-phone-filters lg:hidden flex flex-col gap-2.5">
        <div class="flex items-center gap-2">
          <button
            ref="filtersButton"
            type="button"
            class="filters-button min-h-11 px-3.5 rounded-full shrink-0 inline-flex items-center gap-2 text-sm font-extrabold bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white dark:bg-brand-primary dark:hover:bg-brand-primary-hover dark:text-stone-900 transition-colors"
            aria-haspopup="dialog"
            :aria-expanded="filtersOpen ? 'true' : 'false'"
            @click="openFilters"
          >
            <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            Filters
            <template v-if="activeFilterCount">
              <span class="filters-count min-w-5 h-5 px-1 rounded-full inline-flex items-center justify-center text-xs font-black bg-white text-brand-primary-strong dark:bg-stone-900 dark:text-brand-primary" aria-hidden="true">{{ activeFilterCount }}</span>
              <span class="sr-only">, {{ activeFilterCount }} active</span>
            </template>
          </button>
          <div class="min-w-0 flex-1">
            <ExploreCategoryBar
              :categories="uniqueCategories"
              :selected-category="selectedCategory"
              @update:selected-category="handleCategoryUpdate"
            />
          </div>
        </div>

        <!-- The active filters, each removable, and what % Match means. -->
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-if="selectedBrand !== 'All'"
            type="button"
            class="active-filter-chip min-h-9 pl-3 pr-1.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-stone-800 dark:text-stone-100"
            :aria-label="`Remove filter: ${selectedBrand}`"
            @click="removeBrandFilter"
          >
            {{ selectedBrand }}
            <span class="w-6 h-6 inline-flex items-center justify-center text-stone-600 dark:text-stone-300"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></span>
          </button>
          <button
            v-if="priceFiltered"
            type="button"
            class="active-filter-chip min-h-9 pl-3 pr-1.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-stone-800 dark:text-stone-100"
            :aria-label="`Remove filter: ${priceChipLabel}`"
            @click="handlePriceClear"
          >
            {{ priceChipLabel }}
            <span class="w-6 h-6 inline-flex items-center justify-center text-stone-600 dark:text-stone-300"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></span>
          </button>
          <button
            ref="matchInfoButton"
            type="button"
            class="match-info-button ml-auto min-h-11 px-1 inline-flex items-center gap-1.5 text-[13px] font-extrabold text-brand-primary-strong dark:text-brand-primary"
            aria-haspopup="dialog"
            :aria-expanded="matchSheetOpen ? 'true' : 'false'"
            @click="matchSheetOpen = true"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
            What's % Match?
          </button>
        </div>
      </div>

      <!-- Control Deck Container (lg and up) -->
      <div class="explore-filter-panel bg-brand-surface-light dark:bg-brand-surface-dark p-6 rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 shadow-sm hidden lg:grid lg:grid-cols-12 gap-8 items-center">

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

      <!-- 2. The full catalogue -->
      <div class="space-y-6">
        <!-- The heading is for lg and up: on a phone the intro at the top
             already says it (feat/23). -->
        <div class="catalog-heading hidden lg:block">
          <span class="text-[11px] font-bold uppercase tracking-widest text-brand-primary">Complete Registry</span>
          <h3 class="text-xl sm:text-2xl font-serif font-bold text-brand-text dark:text-white mt-1">
            All Formulations
          </h3>
          <p class="text-xs sm:text-sm text-brand-text-muted mt-1">
            Every product in the catalog, filtered by your selections above.
          </p>
          <!-- What % Match is (lg and up), folded by default (feat/23). On a
               phone the same words open in a sheet from "What's % Match?" in
               the filter bar. Wording unchanged. -->
          <div class="match-explainer hidden lg:block mt-3">
            <MatchInfoDisclosure>
              <p class="m-0 text-xs text-brand-text-muted dark:text-stone-400 leading-relaxed bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/15 rounded-xl px-3 py-2">
                {{ matchExplainer }}
                <span class="match-disclaimer block mt-1">{{ MATCH_SCORE_DISCLAIMER }}</span>
                <router-link :to="MATCH_METHOD_PATH" class="match-how-link inline-flex items-center gap-1 text-[11px] font-bold text-brand-primary hover:underline">
                  How % Match is calculated, and our sources
                  <svg class="w-3 h-3 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
                </router-link>
              </p>
            </MatchInfoDisclosure>
          </div>
        </div>

      <div ref="resultsRegion" class="catalog-results" :style="heldHeight ? { minHeight: `${heldHeight}px` } : undefined">
      <!-- Loading: placeholder cards in the product card's own shape, so the
           grid does not jump when the results land. Replaces a line of text
           that said nothing about what was coming (owner request). -->
      <div
        v-if="catalogState === 'loading'"
        class="catalog-skeleton grid grid-cols-1 xl:grid-cols-2 gap-5 w-full"
        role="status"
        aria-busy="true"
      >
        <span class="sr-only">Loading products</span>
        <div
          v-for="n in 4"
          :key="n"
          class="skeleton-card bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2rem] border border-brand-surface-border dark:border-stone-800 shadow-sm flex flex-col sm:flex-row gap-5 p-5 animate-pulse"
          aria-hidden="true"
        >
          <div class="w-full sm:w-44 md:w-48 aspect-[4/3] sm:aspect-square bg-brand-bg-light dark:bg-stone-900 rounded-2xl shrink-0"></div>
          <div class="flex-1 flex flex-col gap-3 py-1">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 space-y-2">
                <div class="h-2.5 w-20 bg-brand-bg-light dark:bg-stone-900 rounded-full"></div>
                <div class="h-4 w-4/5 bg-brand-bg-light dark:bg-stone-900 rounded-full"></div>
              </div>
              <div class="h-7 w-24 bg-brand-bg-light dark:bg-stone-900 rounded-full shrink-0"></div>
            </div>
            <div class="flex gap-3">
              <div class="h-6 w-20 bg-brand-bg-light dark:bg-stone-900 rounded-lg"></div>
              <div class="h-6 w-16 bg-brand-bg-light dark:bg-stone-900 rounded-lg"></div>
            </div>
            <div class="space-y-2 pt-1">
              <div class="h-3 w-full bg-brand-bg-light dark:bg-stone-900 rounded-full"></div>
              <div class="h-3 w-11/12 bg-brand-bg-light dark:bg-stone-900 rounded-full"></div>
              <div class="h-3 w-2/3 bg-brand-bg-light dark:bg-stone-900 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Retrieval failure. Reported before the empty state below, because a
           request that never completed says nothing about how many products
           match - and the empty state's "reset filters" action would only rerun
           the same failing request. -->
      <div v-else-if="catalogState === 'failed'" class="py-16 flex flex-col items-center text-center gap-4 w-full">
        <div class="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center border border-amber-500/30">
          <svg class="w-7 h-7 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div class="space-y-1 max-w-sm">
          <h4 class="text-lg font-serif font-bold text-brand-text dark:text-white">Catalog Unavailable</h4>
          <p class="text-xs text-brand-text-muted leading-relaxed">
            We couldn't reach the formulation registry, so nothing here reflects your current filters. Your selections have been kept &mdash; try again in a moment.
          </p>
        </div>
        <button
          @click="fetchCatalog()"
          class="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all active:scale-95"
        >
          Retry Retrieval
        </button>
      </div>

      <!-- Product Grid. Cards fade up a few at a time as they arrive, glide to
           their new place when a filter narrows the list, and fade out where
           they stood when they leave - the shelf's motion. A list, since each
           card is an li. -->
      <TransitionGroup
        v-else-if="catalogState === 'results'"
        tag="ul"
        name="card-flow"
        appear
        class="relative grid grid-cols-1 xl:grid-cols-2 gap-5 w-full items-start"
        @before-leave="pinLeavingCard"
      >
        <ExploreProductCard
          v-for="(product, index) in filteredCatalog"
          :key="product.id"
          :product="product"
          :style="cardFlowDelay(index)"
          @inspect="selectedForInspection = product"
        />
      </TransitionGroup>

      <div v-else class="py-12 flex flex-col items-center gap-4 w-full">
        <EmptyState
          title="No Formulation Matches"
          message="No curated cosmetic items align with your selected target pricing intervals or catalog filtering boundaries."
          action-label="Reset Filter Criteria"
          @action="handlePriceClear(); selectedCategory = 'All'; selectedBrand = 'All'; router.push('/explore')"
        />
        <!-- Not in the catalogue at all? Product submissions (feat/22). -->
        <p class="text-sm text-stone-600 dark:text-stone-300 text-center">Can't find it? Tell us about it.</p>
        <router-link
          to="/submissions/new"
          class="submit-this-product min-h-12 px-5 rounded-[14px] bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white text-[15px] font-bold inline-flex items-center gap-2 transition-colors"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Submit this product
        </router-link>
      </div>
      </div>

      <!-- Under the results: a way to send a product the catalogue lacks. -->
      <router-link
        v-if="catalogState === 'results'"
        to="/submissions/new"
        class="missing-product mt-6 rounded-[18px] px-4 py-3.5 flex items-center gap-3 bg-brand-primary-light dark:bg-brand-primary/15 text-brand-primary-strong-hover dark:text-brand-primary-accent hover:bg-brand-primary-light/70 dark:hover:bg-brand-primary/25 transition-colors"
      >
        <span class="w-10 h-10 rounded-xl bg-brand-surface-light dark:bg-brand-surface-dark flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-brand-primary-strong dark:text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </span>
        <span class="flex flex-col gap-0.5 flex-grow">
          <span class="text-[15px] font-extrabold">Missing a product?</span>
          <span class="text-[13px]">Send it to us and we'll add it after a check.</span>
        </span>
        <svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
      </router-link>
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

    <!-- Phone: every filter in one sheet, applied on "Show products". -->
    <BottomSheet
      v-if="filtersOpen"
      title="Filters"
      close-label="Close filters"
      :return-focus-to="filtersButton"
      @close="filtersOpen = false"
    >
      <div class="filters-sheet flex flex-col gap-[22px]">
        <fieldset class="sheet-fieldset m-0 p-0 border-0 min-w-0 flex flex-col gap-2.5">
          <legend class="pb-2.5 text-[13px] font-extrabold uppercase tracking-[0.08em] text-stone-600 dark:text-stone-300">Category</legend>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="category in uniqueCategories"
              :key="category"
              type="button"
              :class="[
                'sheet-category min-h-11 px-3.5 rounded-full border text-sm font-bold transition-colors',
                filterDraft.category === category
                  ? 'bg-brand-primary-strong border-brand-primary-strong text-white dark:bg-brand-primary dark:border-brand-primary dark:text-stone-900'
                  : 'bg-brand-surface-light dark:bg-brand-surface-dark border-brand-surface-border dark:border-stone-600 text-stone-800 dark:text-stone-100',
              ]"
              :aria-pressed="filterDraft.category === category ? 'true' : 'false'"
              @click="filterDraft.category = category"
            >
              {{ category }}
            </button>
          </div>
        </fieldset>

        <div class="flex flex-col gap-2">
          <label for="sheet-brand" class="text-[13px] font-extrabold uppercase tracking-[0.08em] text-stone-600 dark:text-stone-300">Brand</label>
          <select
            id="sheet-brand"
            v-model="filterDraft.brand"
            class="min-h-12 rounded-[14px] border border-brand-surface-border dark:border-stone-600 bg-brand-bg-light dark:bg-stone-800 text-stone-800 dark:text-stone-100 px-3 text-[15px] font-bold outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option v-for="brand in uniqueBrands" :key="brand" :value="brand">
              {{ brand === 'All' ? 'All brands' : brand }}
            </option>
          </select>
        </div>

        <fieldset class="sheet-fieldset m-0 p-0 border-0 min-w-0 flex flex-col gap-2.5">
          <legend class="pb-2.5 text-[13px] font-extrabold uppercase tracking-[0.08em] text-stone-600 dark:text-stone-300">Price (baht)</legend>
          <!-- One track, a handle for the lowest and the highest price (the
               owner's choice over typed boxes). The row may shrink (min-w-0),
               so it never pushes past a 375px screen. The fieldsets carry
               min-w-0 too: a fieldset is min-content wide by default. -->
          <div class="sheet-price-row w-full min-w-0">
            <PriceRangeSlider
              variant="sheet"
              :min-price="filterDraft.min"
              :max-price="filterDraft.max"
              :default-max-limit="PRICE_CEILING"
              @update:range="setDraftPrice"
            />
          </div>
        </fieldset>
      </div>

      <template #footer>
        <button
          type="button"
          class="sheet-clear flex-1 min-h-[50px] rounded-[14px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-stone-800 dark:text-stone-100 text-[15px] font-extrabold"
          @click="clearFilterDraft"
        >
          Clear all
        </button>
        <button
          type="button"
          class="sheet-apply flex-[2] min-h-[50px] rounded-[14px] bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white dark:bg-brand-primary dark:hover:bg-brand-primary-hover dark:text-stone-900 text-[15px] font-extrabold transition-colors"
          @click="applyFilters"
        >
          Show products
        </button>
      </template>
    </BottomSheet>

    <!-- Phone: what % Match is, in the same words as the lg note. -->
    <BottomSheet
      v-if="matchSheetOpen"
      title="What is % Match?"
      :return-focus-to="matchInfoButton"
      @close="matchSheetOpen = false"
    >
      <div class="match-sheet flex flex-col gap-3 text-[15px] leading-relaxed text-stone-700 dark:text-stone-200">
        <p class="m-0">{{ matchExplainer }}</p>
        <p class="match-disclaimer m-0">{{ MATCH_SCORE_DISCLAIMER }}</p>
        <router-link
          :to="MATCH_METHOD_PATH"
          class="match-how-link min-h-12 rounded-[14px] border border-brand-surface-border dark:border-stone-600 flex items-center justify-center gap-1.5 text-[15px] font-extrabold text-brand-primary-strong dark:text-brand-primary"
        >
          How % Match is calculated, and our sources
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
        </router-link>
      </div>
    </BottomSheet>
  </div>
</template>
