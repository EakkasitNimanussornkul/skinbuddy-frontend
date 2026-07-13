<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProductBySlug } from '../api/products'
import ProductSpecContent from '../components/Catalog/ProductSpecContent.vue'
import CompareSelectorModal from '../components/Catalog/CompareSelectorModal.vue'

const route = useRoute()
const router = useRouter()
const product = ref<any>(null)
const isLoading = ref(true)
const baseProductForCompare = ref<any | null>(null)

const loadPage = async (slug: string) => {
  isLoading.value = true
  try {
    product.value = await getProductBySlug(slug)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => loadPage((route.params.slug as string) || ''))
watch(() => route.params.slug, (newSlug) => { if (newSlug) loadPage(newSlug as string) })
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 pb-36">

    <div class="sticky top-0 z-40 bg-brand-bg-light/80 dark:bg-brand-bg-dark/80 backdrop-blur-md pt-4 pb-4 px-4 sm:px-6 flex items-center gap-4 border-b border-stone-200/50 dark:border-stone-800/50">
      <button
        @click="router.back()"
        class="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-white dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 hover:text-brand-primary dark:hover:text-brand-primary hover:border-brand-primary/30 dark:hover:border-brand-primary/40 transition-all shadow-sm active:scale-95"
        aria-label="Go back"
      >
        <svg class="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <h1 class="text-lg font-bold text-brand-text dark:text-stone-100 tracking-tight line-clamp-1">
        Product Details
      </h1>
    </div>

    <div class="pt-6">
      <div v-if="isLoading" class="py-32 text-center animate-pulse text-xs font-bold uppercase tracking-widest text-stone-400">
        Loading Formula Specification...
      </div>

      <div v-else-if="product" class="max-w-6xl mx-auto px-4 sm:px-6 space-y-12 animate-fade-in">

        <nav class="flex items-center gap-2 text-xs font-semibold text-stone-400">
          <router-link to="/explore" class="hover:text-brand-primary transition-colors">Explore</router-link>
          <span>/</span>
          <span class="text-brand-text dark:text-stone-200 font-bold truncate">{{ product.brand }}</span>
        </nav>

        <ProductSpecContent
          :product="product"
          mode="detail"
          @open-compare-selector="baseProductForCompare = $event"
        />

        <div v-if="product.similar_products?.length" class="space-y-6 pt-6">
          <h3 class="text-xl font-serif font-bold">Often compared with</h3>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <div
              v-for="sim in product.similar_products"
              :key="sim.id"
              class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl p-4 sm:p-6 border border-stone-200 dark:border-stone-800 flex flex-col justify-between hover:shadow-lg transition-all"
            >
              <router-link :to="`/product/${sim.slug}`" class="space-y-3 block">
                <div class="w-full h-36 sm:h-44 bg-stone-50 dark:bg-stone-900 rounded-2xl p-3 flex items-center justify-center mix-blend-multiply dark:mix-blend-normal">
                  <img v-if="sim.image_url" :src="sim.image_url" class="w-full h-full object-contain" />
                </div>
                <div>
                  <span class="text-[10px] font-bold text-brand-primary uppercase tracking-wider">{{ sim.brand }}</span>
                  <h4 class="font-serif font-bold text-xs sm:text-sm text-brand-text dark:text-white line-clamp-2 mt-0.5">{{ sim.name }}</h4>
                </div>
              </router-link>

              <button
                @click="router.push(`/compare?a=${product.slug}&b=${sim.slug}`)"
                class="w-full mt-4 py-2 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 dark:hover:text-white font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Compare</span>
                <svg class="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </div>
          </div>
        </div>

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
