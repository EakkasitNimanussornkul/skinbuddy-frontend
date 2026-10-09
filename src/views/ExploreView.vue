<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
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
import CollapseTransition from '../components/Shared/CollapseTransition.vue'
import { cardFlowDelay, pinLeavingCard } from '../components/Shared/cardFlow'
import {
  PRICE_FLOOR,
  isPriceFiltered,
  normalizePriceRange,
  priceChipLabel as priceChipText,
  priceButtonLabel,
  UNPRICED_NOTE,
  type PriceRange,
} from '../components/Catalog/priceRange'

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

// The price filter: a lowest price, and a highest that is a number of baht or
// null for no upper limit. Nothing is sent for either until it is set, so a
// product above 1,500 is not hidden when no filter is on.
const activeMinPrice = ref(PRICE_FLOOR)
const activeMaxCap = ref<number | null>(null)

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

// Counts the catalogue requests. Price Apply, a search from the top bar and Retry
// can overlap, and the slowest answer used to win; only the latest is used now.
let latestCatalogRequest = 0

const fetchCatalog = async () => {
  const mine = ++latestCatalogRequest
  heldHeight.value = resultsRegion.value?.offsetHeight || null
  isLoading.value = true
  catalogFailed.value = false
  // Recorded before the await, not after. A failure leaves the failed state on
  // screen for this term rather than re-requesting it on the next unrelated
  // address change.
  fetchedQuery = searchQuery.value
  try {
    const data = await searchProducts(
      searchQuery.value,
      activeMinPrice.value > PRICE_FLOOR ? activeMinPrice.value : undefined,
      activeMaxCap.value ?? undefined,
      // The grid and the shortlist read card fields only; the ingredient tree
      // is fetched when a product is opened (UniversalProductModal).
      { view: 'card' },
    )
    if (mine !== latestCatalogRequest) return
    // A reply that is not a list (an error page, a changed shape) is a failed
    // request, not a catalogue: it would throw on .map below. No reply at all
    // stays an empty list, as before.
    if (data != null && !Array.isArray(data)) throw new Error('The catalogue reply was not a list.')
    catalog.value = data ?? []
  } catch {
    if (mine !== latestCatalogRequest) return
    // Clear rather than keep. A failed re-request from the price controls would
    // otherwise leave the previous bounds' results on screen while the controls
    // show the new ones, presenting stale data as current with only a
    // self-dismissing toast to say otherwise.
    catalog.value = []
    catalogFailed.value = true
    addToast('Failed to load product catalog.', 'error')
  } finally {
    // An answer that was superseded leaves the loading state, and the held
    // height, to the request that replaced it.
    if (mine === latestCatalogRequest) {
      isLoading.value = false
      // Released once the new results are drawn, so the region then takes their
      // own height - shorter or longer - rather than the old one.
      nextTick(() => { heldHeight.value = null })
    }
  }
}

const handleCategoryUpdate = (newCategory: string) => {
  router.push({
    path: route.path,
    query: { ...route.query, category: newCategory === 'All' ? undefined : newCategory }
  })
}

// Whatever arrives is made safe first: a lowest price that is not a number is 0,
// a highest that is not a number is no limit, a cap is at most 20,000, and a
// range given the wrong way round is put in order.
const handlePriceApply = (range: { min: unknown; maxCap: unknown }) => {
  const safe = normalizePriceRange(range.min, range.maxCap)
  activeMinPrice.value = safe.min
  activeMaxCap.value = safe.maxCap
  fetchCatalog()
}

const handlePriceClear = () => {
  activeMinPrice.value = PRICE_FLOOR
  activeMaxCap.value = null
  fetchCatalog()
}

// --- Phone filters (below lg) ------------------------------------------------
// A Filters button with a count, the category chips, the active filters as
// removable chips, and a sheet with every filter. The sheet works on a copy:
// "Show products" applies it through the handlers above, and closing it any
// other way drops it. The big filter panel is for lg and up only.
const priceFiltered = computed(() => isPriceFiltered(activeMinPrice.value, activeMaxCap.value))
const activeFilterCount = computed(() => (selectedBrand.value !== 'All' ? 1 : 0) + (priceFiltered.value ? 1 : 0))

const priceChipLabel = computed(() => priceChipText(activeMinPrice.value, activeMaxCap.value))

const filtersOpen = ref(false)
const filtersButton = ref<HTMLButtonElement | null>(null)
const filterDraft = reactive<{ category: string; brand: string; min: number; maxCap: number | null }>({
  category: 'All',
  brand: 'All',
  min: PRICE_FLOOR,
  maxCap: null,
})

const openFilters = () => {
  Object.assign(filterDraft, {
    category: selectedCategory.value,
    brand: selectedBrand.value,
    min: activeMinPrice.value,
    maxCap: activeMaxCap.value,
  })
  filtersOpen.value = true
}

const clearFilterDraft = () => {
  Object.assign(filterDraft, { category: 'All', brand: 'All', min: PRICE_FLOOR, maxCap: null })
}

// The sheet's price slider writes the draft as it moves (feat/26; it replaced
// the typed From and Up to boxes).
const setDraftPrice = (range: PriceRange) => {
  filterDraft.min = range.min
  filterDraft.maxCap = range.maxCap
}

const applyFilters = () => {
  filtersOpen.value = false
  // The same guards as any price change: a value that is not a number cannot
  // reach the request, and a range the wrong way round is put in order.
  const range = normalizePriceRange(filterDraft.min, filterDraft.maxCap)
  if (range.min !== activeMinPrice.value || range.maxCap !== activeMaxCap.value) handlePriceApply(range)
  selectedBrand.value = filterDraft.brand
  if (filterDraft.category !== selectedCategory.value) handleCategoryUpdate(filterDraft.category)
}

const removeBrandFilter = () => {
  selectedBrand.value = 'All'
}

// --- The filter bar (lg and up) ---------------------------------------------------
// The heading: the category in view (spelled as the chip is, whatever the address
// said), with how many products the list holds. The count is read off the list
// itself, so it is whatever the server returned, and is blank while loading or
// when the catalogue could not be reached.
const headingTitle = computed(() => {
  if (selectedCategory.value === 'All') return 'All formulations'
  const wanted = cleanString(selectedCategory.value)
  return uniqueCategories.value.find((c) => c !== 'All' && cleanString(c) === wanted) ?? selectedCategory.value
})
const countText = computed(() => {
  if (catalogState.value !== 'results' && catalogState.value !== 'empty') return ''
  const count = filteredCatalog.value.length
  return `${count} ${count === 1 ? 'product' : 'products'}`
})

const TOOLBAR_IDLE = 'border-brand-surface-border dark:border-stone-600 bg-brand-bg-light dark:bg-stone-800 text-stone-800 dark:text-stone-100'
const TOOLBAR_ACTIVE = 'border-brand-primary-strong ring-1 ring-brand-primary-strong dark:border-brand-primary dark:ring-brand-primary bg-brand-primary-light dark:bg-brand-primary/15 text-brand-primary-strong-hover dark:text-brand-primary-accent'
const brandActive = computed(() => selectedBrand.value !== 'All')
const priceButtonText = computed(() => priceButtonLabel(activeMinPrice.value, activeMaxCap.value))

// The Price popover. A dialog that is not modal: Escape and a click outside close
// it, Tab leaving it closes it, and Escape gives focus back to its button.
const priceOpen = ref(false)
const priceButton = ref<HTMLButtonElement | null>(null)
const pricePopover = ref<HTMLElement | null>(null)

const closePrice = (returnFocus = false) => {
  if (!priceOpen.value) return
  priceOpen.value = false
  if (returnFocus) nextTick(() => priceButton.value?.focus())
}

const togglePrice = async () => {
  if (priceOpen.value) return closePrice(true)
  priceOpen.value = true
  await nextTick()
  pricePopover.value?.querySelector<HTMLElement>('input')?.focus()
}

const onPriceKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  event.preventDefault()
  closePrice(true)
}
const onPricePointerDown = (event: Event) => {
  const target = event.target as Node | null
  if (target && (pricePopover.value?.contains(target) || priceButton.value?.contains(target))) return
  closePrice()
}
const onPriceFocusOut = (event: FocusEvent) => {
  const next = event.relatedTarget as Node | null
  if (!priceOpen.value || !next) return
  if (pricePopover.value?.contains(next) || priceButton.value?.contains(next)) return
  closePrice()
}
watch(priceOpen, (open) => {
  if (open) {
    document.addEventListener('keydown', onPriceKeydown)
    document.addEventListener('pointerdown', onPricePointerDown)
  } else {
    document.removeEventListener('keydown', onPriceKeydown)
    document.removeEventListener('pointerdown', onPricePointerDown)
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onPriceKeydown)
  document.removeEventListener('pointerdown', onPricePointerDown)
})

const onPriceApply = (range: PriceRange) => {
  handlePriceApply(range)
  closePrice(true)
}

// The filters in use as removable chips, the category included (on lg it is the
// one place that says what is selected apart from the highlighted chip).
const activeChips = computed(() => {
  const chips: { key: string; label: string; remove: () => void }[] = []
  if (selectedCategory.value !== 'All') chips.push({ key: 'category', label: headingTitle.value, remove: () => handleCategoryUpdate('All') })
  if (selectedBrand.value !== 'All') chips.push({ key: 'brand', label: selectedBrand.value, remove: removeBrandFilter })
  if (priceFiltered.value) chips.push({ key: 'price', label: priceChipLabel.value, remove: handlePriceClear })
  return chips
})

// Clears the category, the brand and the price. A brand or category carried by
// the address goes from it too, or the address would put it straight back.
const clearAllFilters = () => {
  selectedBrand.value = 'All'
  if (priceFiltered.value) handlePriceClear()
  if (route.query.category || route.query.brand) {
    router.push({ path: route.path, query: { ...route.query, category: undefined, brand: undefined } })
  }
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
    // No term or bounds: the same lean request as an unfiltered grid, so the two
    // share one reply on load.
    const results = await searchProducts(undefined, undefined, undefined, { view: 'card' })
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

      <!-- lg and up: one compact band. The title and a line under it on the left,
           the product carousel (smaller) on the right. The four tick marks and
           the long paragraph of the old banner are gone: the ticks said what
           the cards and the product page already show. -->
      <div class="explore-hero hidden lg:flex items-center justify-between gap-6 py-2 max-h-[120px]">
        <div class="min-w-0">
          <h1 class="explore-hero-title rise-in m-0 font-serif text-3xl font-bold tracking-tight text-brand-text dark:text-stone-100" style="--rise-delay: 0ms">Explore</h1>
          <p class="explore-hero-line rise-in m-0 mt-1 text-sm text-stone-600 dark:text-stone-300" style="--rise-delay: 70ms">Every product in our catalogue, with ingredient breakdowns and a match for your skin type.</p>
        </div>
        <div class="explore-hero-thumbs rise-in w-[19rem] max-w-[40%] shrink-0 min-w-0" style="--rise-delay: 140ms">
          <ProductShowcaseMarquee :products="catalog" :is-loading="isLoading" />
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
        <p v-if="priceFiltered" class="unpriced-note-phone m-0 text-xs leading-normal text-stone-600 dark:text-stone-300">{{ UNPRICED_NOTE }}</p>
      </div>

      <!-- 2. The full catalogue. A normal column: the heading, the filter bar, the
           active filters and the % Match note are ordinary blocks in the flow, so
           the results always start below the lowest of them. Only the price
           popover floats, and it closes on Escape, a click outside, or Apply. -->
      <div class="explore-catalogue space-y-6">
        <!-- lg and up. Below lg the phone intro and the Filters button above
             say the same things. -->
        <section class="explore-filters hidden lg:block" aria-label="Filter products">
          <!-- The heading is the category in view, with how many products there are. -->
          <div class="catalog-heading flex flex-wrap items-baseline justify-between gap-x-3">
            <Transition name="swap-fade" mode="out-in">
              <h2 :key="headingTitle" class="catalog-title m-0 font-serif text-3xl font-bold text-brand-text dark:text-stone-100">{{ headingTitle }}</h2>
            </Transition>
            <span class="catalog-count min-h-5 text-sm text-stone-600 dark:text-stone-300" aria-live="polite">
              <Transition name="swap-fade" mode="out-in">
                <span v-if="countText" :key="countText" class="inline-block">{{ countText }}</span>
              </Transition>
            </span>
          </div>

          <!-- The positioning box for the popover only; the toolbar itself is not
               positioned, sticky or fixed. -->
          <div class="explore-filter-anchor relative mt-3.5" @focusout="onPriceFocusOut">
            <div
              role="toolbar"
              aria-label="Filters"
              class="explore-toolbar min-h-[60px] flex flex-wrap items-center gap-2 rounded-[18px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark px-2.5 py-1.5"
            >
              <div class="toolbar-categories flex-1 basis-[360px] min-w-0">
                <ExploreCategoryBar
                  class="pt-0! pb-1!"
                  :categories="uniqueCategories"
                  :selected-category="selectedCategory"
                  @update:selected-category="handleCategoryUpdate"
                />
              </div>

              <div class="toolbar-controls ml-auto flex items-center gap-2">
                <!-- A real select, drawn as a button: the select itself is
                     invisible over the label, so the keyboard and the screen
                     reader get the native one. -->
                <label :class="['toolbar-brand relative min-h-11 pl-3.5 pr-3 rounded-xl border inline-flex items-center gap-2 text-sm cursor-pointer transition-colors duration-150 motion-reduce:transition-none focus-within:ring-2 focus-within:ring-brand-primary-strong dark:focus-within:ring-brand-primary', brandActive ? TOOLBAR_ACTIVE : TOOLBAR_IDLE]">
                  <span aria-hidden="true" class="toolbar-brand-text font-bold">Brand: {{ selectedBrand === 'All' ? 'All' : selectedBrand }}</span>
                  <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                  <select
                    v-model="selectedBrand"
                    aria-label="Brand"
                    class="toolbar-brand-select absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  >
                    <option v-for="brand in uniqueBrands" :key="brand" :value="brand">
                      {{ brand === 'All' ? 'All brands' : brand }}
                    </option>
                  </select>
                </label>

                <button
                  ref="priceButton"
                  type="button"
                  :class="['toolbar-price min-h-11 pl-3.5 pr-3 rounded-xl border inline-flex items-center gap-2 text-sm font-bold transition-colors duration-150 motion-reduce:transition-none', priceOpen || priceFiltered ? TOOLBAR_ACTIVE : TOOLBAR_IDLE]"
                  aria-haspopup="dialog"
                  :aria-expanded="priceOpen ? 'true' : 'false'"
                  @click="togglePrice"
                >
                  {{ priceButtonText }}
                  <svg :class="['toolbar-price-chevron w-3.5 h-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none', priceOpen ? 'rotate-180' : '']" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </button>
              </div>
            </div>

            <!-- The only overlay: below the sticky top bar (z-50), above the cards. -->
            <Transition name="menu-drop">
              <div
                v-if="priceOpen"
                ref="pricePopover"
                role="dialog"
                aria-label="Price range"
                class="price-popover absolute right-0 top-full mt-2 z-30 w-[400px] max-w-full origin-top-right rounded-[20px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark shadow-xl p-[18px]"
              >
                <PriceRangeSlider
                  variant="popover"
                  :min-price="activeMinPrice"
                  :max-cap="activeMaxCap"
                  @apply="onPriceApply"
                  @clear="handlePriceClear"
                />
              </div>
            </Transition>
          </div>

          <!-- The filters in use, each removable. Folds open with the first chip
               and shut with the last. -->
          <CollapseTransition>
            <div v-if="activeChips.length" class="active-filters-bar">
              <TransitionGroup tag="div" name="chip-pop" class="active-filters flex flex-wrap items-center gap-2 pt-3">
                <button
                  v-for="chip in activeChips"
                  :key="chip.key"
                  type="button"
                  class="desktop-filter-chip min-h-9 pl-3 pr-1.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-stone-800 dark:text-stone-100 transition-colors hover:border-brand-primary-strong dark:hover:border-brand-primary"
                  :aria-label="`Remove filter: ${chip.label}`"
                  @click="chip.remove()"
                >
                  {{ chip.label }}
                  <span class="w-6 h-6 inline-flex items-center justify-center text-stone-600 dark:text-stone-300"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></span>
                </button>
                <button
                  key="clear-all"
                  type="button"
                  class="clear-all-filters min-h-9 px-2 text-[13px] font-extrabold text-brand-primary-strong dark:text-brand-primary hover:underline"
                  @click="clearAllFilters"
                >
                  Clear all
                </button>
              </TransitionGroup>
              <Transition name="swap-fade">
                <p v-if="priceFiltered" class="unpriced-note-bar m-0 mt-2 text-xs leading-normal text-stone-600 dark:text-stone-300">{{ UNPRICED_NOTE }}</p>
              </Transition>
            </div>
          </CollapseTransition>

          <!-- What % Match is, folded by default (feat/23). On a phone the same
               words open in a sheet from "What's % Match?" in the filter bar.
               Wording unchanged. -->
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
        </section>

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
              :max-cap="filterDraft.maxCap"
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
