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

// --- Debounced Live Search API Call ---
watch(searchQuery, (newVal) => {
  emit('search-submit', newVal) // Live sync for parent views like ExploreView

  if (!newVal.trim() || newVal.trim().length < 2) {
    results.value = []
    return
  }

  clearTimeout(debounceTimeout)
  isLoading.value = true

  debounceTimeout = setTimeout(async () => {
    try {
      const data = await searchProducts(newVal.trim())
      results.value = (data || []).slice(0, 7) // Limit to top 7 instant matches
    } catch (error) {
      console.error("Autocomplete search failed:", error)
    } finally {
      isLoading.value = false
    }
  }, 250)
})

// Inside SearchAutocompleteInput.vue
const slugify = (brand: string, name: string) => {
  return `${brand}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const handleSelectProduct = (product: any) => {
  isFocused.value = false
  emit('select-product', product)

  // 🌟 Clean SEO URL redirection without exposing database UUIDs 🌟
  const targetSlug = product.slug || slugify(product.brand || '', product.name || '')
  router.push(`/product/${targetSlug}`)
}

const handleFullSearch = (categoryFilter?: string) => {
  isFocused.value = false
  const finalQuery = categoryFilter ? `${searchQuery.value} ${categoryFilter}` : searchQuery.value
  router.push({ path: '/explore', query: { q: finalQuery.trim() } })
}

// --- Click Outside Dismissal ---
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
    <!-- Input Box -->
    <div class="relative flex items-center">
      <svg class="absolute left-4 w-4 h-4 text-brand-text-muted stroke-[2.5] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      <input
        v-model="searchQuery"
        @focus="isFocused = true"
        @keydown.enter.prevent="handleFullSearch()"
        type="text"
        :placeholder="placeholder || 'Find products, ingredients, or brands...'"
        class="w-full bg-brand-bg-light dark:bg-brand-bg-dark border border-brand-surface-border dark:border-stone-800 text-xs sm:text-sm rounded-2xl pl-10 pr-9 py-3 outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text dark:text-stone-100 shadow-sm"
      />
      <!-- Clear Button -->
      <button v-if="searchQuery" @click="searchQuery = ''; results = []" type="button" class="absolute right-3 text-brand-text-muted hover:text-brand-primary p-1 transition-colors">
        <svg class="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>

    <!-- 🌟 SKINSORT INSTANT POPOVER DROPDOWN 🌟 -->
    <div
      v-if="isFocused && searchQuery.trim().length >= 2"
      class="absolute left-0 right-0 top-full mt-2 bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 rounded-3xl shadow-2xl z-50 overflow-hidden max-h-[80vh] flex flex-col animate-fade-in divide-y divide-brand-surface-border dark:divide-stone-800/80"
    >
      <!-- Section A: Quick Search & Category Suggestions -->
      <div class="p-2 bg-brand-bg-light dark:bg-brand-bg-dark/60 space-y-0.5">
        <button @click="handleFullSearch()" class="w-full text-left px-3 py-2 rounded-xl hover:bg-brand-surface-border/40 dark:hover:bg-stone-800 flex items-center gap-2.5 text-xs text-brand-text dark:text-stone-200 transition-colors">
          <svg class="w-3.5 h-3.5 text-brand-text-muted stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <span>Search all for <strong class="text-brand-primary">"{{ searchQuery }}"</strong></span>
        </button>
        <button @click="handleFullSearch('sunscreen')" class="w-full text-left px-3 py-1.5 rounded-xl hover:bg-brand-surface-border/40 dark:hover:bg-stone-800 flex items-center gap-2.5 text-xs text-brand-text-muted dark:text-stone-400 transition-colors">
          <svg class="w-3.5 h-3.5 text-brand-text-muted stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <span><strong class="text-brand-text dark:text-stone-200">{{ searchQuery }}</strong> sunscreens</span>
        </button>
        <button @click="handleFullSearch('cleanser')" class="w-full text-left px-3 py-1.5 rounded-xl hover:bg-brand-surface-border/40 dark:hover:bg-stone-800 flex items-center gap-2.5 text-xs text-brand-text-muted dark:text-stone-400 transition-colors">
          <svg class="w-3.5 h-3.5 text-brand-text-muted stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <span><strong class="text-brand-text dark:text-stone-200">{{ searchQuery }}</strong> cleansers & moisturizers</span>
        </button>
      </div>

      <!-- Section B: Direct Product Matches List -->
      <div class="overflow-y-auto flex-1 p-2 space-y-1">
        <!-- Loading Spinner -->
        <div v-if="isLoading" class="p-6 text-center text-xs text-brand-text-muted font-bold flex items-center justify-center gap-2">
          <div class="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <span>Searching catalog formulas...</span>
        </div>

        <!-- Empty State -->
        <div v-else-if="results.length === 0" class="p-6 text-center text-xs text-brand-text-muted">
          No immediate product formulas match "{{ searchQuery }}".
        </div>

        <!-- Product Preview Rows -->
        <div
          v-for="product in results"
          :key="product.id"
          @click="handleSelectProduct(product)"
          class="flex items-center gap-3.5 p-2 rounded-2xl hover:bg-brand-bg-light dark:hover:bg-stone-800/80 cursor-pointer transition-all group"
        >
          <!-- Thumbnail Image -->
          <div class="w-11 h-11 rounded-xl bg-brand-surface-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800 p-1 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-contain" />
            <svg v-else class="w-5 h-5 text-brand-text-muted stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>

          <!-- Product Info -->
          <div class="min-w-0 flex-1">
            <h5 class="text-xs font-bold text-brand-text dark:text-stone-100 truncate group-hover:text-brand-primary transition-colors">{{ product.name }}</h5>
            <p class="text-[10px] font-bold text-brand-primary uppercase tracking-wider truncate mt-0.5">{{ product.brand || 'Unknown Brand' }}</p>
          </div>

          <!-- Chevron Right -->
          <svg class="w-4 h-4 text-brand-text-muted group-hover:text-brand-primary transition-colors flex-shrink-0 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>
