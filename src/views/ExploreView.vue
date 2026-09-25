<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  searchProducts,
  pickTopRecommendations,
  resolveCatalogState,
  MATCH_SCORE_BASIS,
  MATCH_SCORE_DISCLAIMER,
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

const activeMinPrice = ref(0)
const activeMaxPrice = ref(1500)

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

  if (route.query.brand) {
    selectedBrand.value = route.query.brand as string
  } else {
    selectedBrand.value = 'All'
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

      <!-- Mobile/Tablet Search Input.
           No `@search-submit` binding, and that is the fix rather than an
           omission. Despite its name, the child emits that event from a watcher
           on every keystroke - not on submit - so binding it to `searchQuery`
           made each character re-run `filteredCatalog` over the products already
           in memory. Those are the previous term's at-most-100 results, so a
           half-typed search could report "No Formulation Matches" about a
           product the catalogue holds: the third occurrence of FE-DEF-30, whose
           first two were fixed in the mount order and the address watcher.
           Submitting (Enter, or the "Search catalog for" row in the child's own
           dropdown) pushes /explore?q=..., which the watcher at the bottom of
           this file turns into a real request - the same single path the desktop
           TopNav search uses, which binds nothing. Live feedback while typing
           still exists and is server-backed: the child's dropdown runs its own
           debounced searchProducts, unbounded by what this page has loaded. -->
      <div class="w-full block lg:hidden">
        <SearchAutocompleteInput :initial-query="searchQuery" />
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

      <!-- 2. The full catalogue -->
      <div class="space-y-6">
        <div>
          <span class="text-[11px] font-bold uppercase tracking-widest text-brand-primary">Complete Registry</span>
          <h3 class="text-xl sm:text-2xl font-serif font-bold text-brand-text dark:text-white mt-1">
            All Formulations
          </h3>
          <p class="text-xs sm:text-sm text-brand-text-muted mt-1">
            Every product in the catalog, filtered by your selections above.
          </p>
          <p class="match-explainer mt-3 flex items-start gap-2 text-xs text-brand-text-muted dark:text-stone-400 leading-relaxed bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/15 rounded-xl px-3 py-2">
            <svg class="w-4 h-4 text-brand-primary shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <span class="font-bold text-brand-text dark:text-stone-200">What is % Match?</span> {{ matchExplainer }}
              <span class="match-disclaimer block mt-1">{{ MATCH_SCORE_DISCLAIMER }}</span>
            </span>
          </p>
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
