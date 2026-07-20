<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProductBySlug } from '../api/products'
import ProductSpecContent from '../components/Catalog/ProductSpecContent.vue'
import CompareSelectorModal from '../components/Compare/CompareSelectorModal.vue'
import SimilarProductsWidget from '../components/Catalog/SimilarProductsWidget.vue'
import EmptyState from '../components/Shared/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const product = ref<any>(null)
const isLoading = ref(true)
const baseProductForCompare = ref<any | null>(null)

const loadPage = async (slug: string) => {
  isLoading.value = true
  try {
    product.value = await getProductBySlug(slug)
  } catch (error) {
    console.error("Product fetch error:", error)
    product.value = null
  } finally {
    isLoading.value = false
  }
}

onMounted(() => loadPage((route.params.slug as string) || ''))
watch(() => route.params.slug, (newSlug) => { if (newSlug) loadPage(newSlug as string) })
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 pb-36">

    <!-- Sticky Header -->
    <div class="sticky top-0 z-40 bg-brand-surface-light/80 dark:bg-brand-surface-dark/80 backdrop-blur-md pt-4 pb-4 px-4 sm:px-6 flex items-center gap-4 border-b border-brand-surface-border dark:border-stone-800 transition-colors">
      <button
        @click="router.back()"
        class="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-brand-bg-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800 text-brand-text-muted hover:text-brand-primary dark:hover:text-brand-primary hover:border-brand-primary/40 transition-all shadow-sm active:scale-95"
        aria-label="Go back"
      >
        <svg class="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <h1 class="text-lg font-serif font-bold text-brand-text dark:text-white tracking-tight line-clamp-1">
        Product Details
      </h1>
    </div>

    <div class="pt-6">
      <div v-if="isLoading" class="py-32 text-center animate-pulse text-xs font-bold uppercase tracking-widest text-brand-text-muted">
        Loading Formula Specification...
      </div>

      <!-- Valid Content State -->
      <div v-else-if="product" class="max-w-6xl mx-auto px-4 sm:px-6 space-y-12 animate-fade-in">

        <!-- Breadcrumb Nav -->
        <nav class="flex items-center gap-2 text-xs font-semibold text-brand-text-muted">
          <router-link to="/explore" class="hover:text-brand-primary transition-colors">Explore</router-link>
          <span>/</span>
          <span class="text-brand-text dark:text-stone-200 font-bold truncate">{{ product.brand }}</span>
        </nav>

        <!-- Main Product Specification -->
        <ProductSpecContent
          :product="product"
          mode="detail"
          @open-compare-selector="baseProductForCompare = $event"
        />

        <!-- Extracted Recommended Similar Products Widget -->
        <SimilarProductsWidget
          :similar-products="product.similar_products"
          :base-product-slug="product.slug"
        />

      </div>

      <!-- Invalid / Non-Existent Product Empty State Trigger -->
      <div v-else class="py-24 px-4 flex justify-center items-center">
        <EmptyState
          title="Product Not Found"
          message="The product you are trying to view does not exist in our catalog database or the address signature was entered incorrectly."
          action-label="Return to Catalog"
          @action="router.push('/explore')"
        >
          <template #icon>
            <svg class="w-10 h-10 text-brand-text-muted/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </template>
        </EmptyState>
      </div>
    </div>

    <Teleport to="body">
      <CompareSelectorModal v-if="baseProductForCompare" :base-product="baseProductForCompare" @close="baseProductForCompare = null" />
    </Teleport>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.25s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
