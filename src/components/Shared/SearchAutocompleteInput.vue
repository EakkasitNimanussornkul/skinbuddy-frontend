<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { searchProducts } from '../../api/products'

const props = defineProps<{
  initialQuery?: string
  placeholder?: string
}>()

const emit = defineEmits(['select-product', 'search-submit'])
const router = useRouter()

const searchQuery = ref(props.initialQuery || '')
const results = ref<any[]>([])
const isLoading = ref(false)
const isFocused = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

let debounceTimeout: any = null

watch(searchQuery, (newVal) => {
  emit('search-submit', newVal)

  if (!newVal.trim() || newVal.trim().length < 2) {
    results.value = []
    return
  }

  clearTimeout(debounceTimeout)
  isLoading.value = true

  debounceTimeout = setTimeout(async () => {
    try {
      const data = await searchProducts(newVal.trim())
      results.value = (data || []).slice(0, 7)
    } catch (error) {
      console.error("Autocomplete search failed:", error)
    } finally {
      isLoading.value = false
    }
  }, 250)
})

const slugify = (brand: string, name: string) => {
  return `${brand}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const handleSelectProduct = (product: any) => {
  isFocused.value = false
  emit('select-product', product)

  const targetSlug = product.slug || slugify(product.brand || '', product.name || '')
  router.push(`/product/${targetSlug}`)
}

const handleFullSearch = (categoryFilter?: string) => {
  isFocused.value = false
  const finalQuery = categoryFilter ? `${searchQuery.value} ${categoryFilter}` : searchQuery.value
  router.push({ path: '/explore', query: { q: finalQuery.trim() } })
}

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isFocused.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<template>
  <div ref="dropdownRef" class="relative w-full">

    <!-- 🌟 ENLARGED INPUT BAR 🌟 -->
    <div class="relative flex items-center">
      <svg class="absolute left-4 w-5 h-5 text-brand-text-muted stroke-[2.5] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        v-model="searchQuery"
        @focus="isFocused = true"
        @keydown.enter.prevent="handleFullSearch()"
        type="text"
        :placeholder="placeholder || 'Find products, ingredients, or brands...'"
        class="w-full bg-brand-bg-light dark:bg-brand-bg-dark border border-brand-surface-border dark:border-stone-800 text-xs sm:text-sm font-medium rounded-2xl pl-12 pr-10 py-3.5 outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text dark:text-stone-100 shadow-sm"
      />

      <!-- Clear Button -->
      <button v-if="searchQuery" @click="searchQuery = ''; results = []" type="button" class="absolute right-3.5 text-brand-text-muted hover:text-brand-primary p-1 transition-colors">
        <svg class="w-4 h-4 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- 🌟 EXPANDED INSTANT POPOVER DROPDOWN CARDS 🌟 -->
    <div
      v-if="isFocused && searchQuery.trim().length >= 2"
      class="absolute left-0 right-0 top-full mt-2.5 bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 rounded-[2rem] shadow-2xl z-50 overflow-hidden max-h-[82vh] flex flex-col animate-fade-in divide-y divide-brand-surface-border dark:divide-stone-800/80"
    >
<!-- 🌟 ENLARGED SECTION A: Quick Search Suggestion Banner 🌟 -->
<div class="p-3 bg-brand-bg-light dark:bg-brand-bg-dark/70">
  <button
    @click="handleFullSearch()"
    class="w-full text-left px-4 py-3 rounded-2xl hover:bg-brand-surface-light dark:hover:bg-stone-800/80 flex items-center gap-3.5 text-sm sm:text-base text-brand-text dark:text-stone-200 transition-all cursor-pointer group border border-transparent hover:border-brand-surface-border dark:hover:border-stone-800 shadow-2xs"
  >
    <!-- Scaled Icon (w-5 h-5) -->
    <svg class="w-5 h-5 text-brand-primary stroke-[2.5] flex-shrink-0 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>

    <!-- Scaled Text (text-sm sm:text-base) -->
    <span class="font-medium">
      Search catalog for <strong class="text-brand-primary font-bold">"{{ searchQuery }}"</strong>
    </span>

    <!-- Optional subtle trailing indicator -->
    <svg class="w-4 h-4 text-brand-text-muted ml-auto group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </button>
</div>

      <!-- Section B: Enriched Product Match Rows -->
      <div class="overflow-y-auto flex-1 p-3 space-y-2">
        <div v-if="isLoading" class="p-8 text-center text-xs text-brand-text-muted font-bold flex items-center justify-center gap-2.5">
          <div class="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <span>Matching formulation matrix...</span>
        </div>

        <div v-else-if="results.length === 0" class="p-8 text-center text-xs text-brand-text-muted font-medium">
          No immediate product formulas match "{{ searchQuery }}".
        </div>

        <!-- 🌟 PROMINENT RESULT CARDS 🌟 -->
<!-- 🌟 ENLARGED PROMINENT RESULT CARDS 🌟 -->
<div
  v-for="product in results"
  :key="product.id"
  @click="handleSelectProduct(product)"
  class="flex items-center gap-4.5 p-4 rounded-2xl bg-brand-surface-light dark:bg-stone-900/50 hover:bg-brand-bg-light dark:hover:bg-stone-800 border border-brand-surface-border/70 dark:border-stone-800 cursor-pointer transition-all duration-200 group shadow-2xs hover:shadow-md hover:-translate-y-0.5"
>
  <!-- Product Image (Enlarged to 80px: w-16 h-16 sm:w-20 sm:h-20) -->
  <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800 p-2 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200 shadow-inner">
    <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-contain" />
    <svg v-else class="w-7 h-7 text-brand-text-muted stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  </div>

  <!-- Product Metadata -->
  <div class="min-w-0 flex-1 space-y-1">
    <span class="text-xs font-bold text-brand-primary uppercase tracking-widest block truncate">
      {{ product.brand || 'Cosmetic Formula' }}
    </span>
    <h5 class="text-sm sm:text-base font-bold text-brand-text dark:text-stone-100 truncate group-hover:text-brand-primary transition-colors leading-snug">
      {{ product.name }}
    </h5>

    <div class="flex items-center gap-2.5 pt-0.5">
      <!-- Only ever show a price the catalog actually has. The chip is narrow, so
           prefer THB and fall back to USD rather than showing both. -->
      <span v-if="product.price_thb" class="text-xs sm:text-sm font-mono font-bold text-brand-text dark:text-stone-200 bg-brand-bg-light dark:bg-stone-800 px-2.5 py-1 rounded-lg border border-brand-surface-border dark:border-stone-700">
        ฿{{ product.price_thb }}
      </span>
      <span v-else-if="product.price_usd" class="text-xs sm:text-sm font-mono font-bold text-brand-text dark:text-stone-200 bg-brand-bg-light dark:bg-stone-800 px-2.5 py-1 rounded-lg border border-brand-surface-border dark:border-stone-700">
        ${{ product.price_usd }}
      </span>
      <span v-else class="text-xs sm:text-sm font-mono font-bold text-brand-text-muted opacity-70 bg-brand-bg-light dark:bg-stone-800 px-2.5 py-1 rounded-lg border border-brand-surface-border dark:border-stone-700">
        Price unavailable
      </span>
      <span class="text-xs font-medium text-brand-text-muted truncate">
        {{ product.category || 'Skincare' }}
      </span>
    </div>
  </div>

  <!-- Action Chevron -->
  <div class="w-8 h-8 rounded-full bg-brand-bg-light dark:bg-stone-800/80 flex items-center justify-center text-brand-text-muted group-hover:text-brand-primary group-hover:bg-brand-primary/10 transition-colors flex-shrink-0 mr-1">
    <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  </div>
</div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>
