<script setup lang="ts">
import { useRouter } from 'vue-router'
import EmptyState from '../Shared/EmptyState.vue'

defineProps<{
  userSkinType: string
  products: any[]
}>()

const router = useRouter()
</script>

<template>
  <div class="space-y-6 pt-8 border-t border-brand-surface-border dark:border-stone-800 w-full">
    <div>
      <h3 class="text-xl sm:text-2xl font-serif font-bold text-brand-text dark:text-white">
        Recommended products for you
      </h3>
      <p class="text-xs sm:text-sm text-brand-text-muted mt-1">
        Biocompatible skincare curation optimized to reinforce your current barrier profile metrics.
      </p>
    </div>

    <!-- Active Grid Render State -->
    <div v-if="products && products.length > 0" class="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 animate-fade-in">
      <div
        v-for="prod in products"
        :key="prod.id"
        class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl p-4 sm:p-5 border border-brand-surface-border dark:border-stone-800 flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg hover:border-brand-primary/40 transition-all duration-300 group"
      >
        <router-link :to="`/product/${prod.slug}`" class="space-y-3 block">
          <div class="w-full h-36 sm:h-44 bg-brand-bg-light dark:bg-stone-900 rounded-2xl p-3 flex items-center justify-center border border-brand-surface-border/50 dark:border-stone-800 overflow-hidden">
            <img v-if="prod.image_url" :src="prod.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition-transform" />
            <svg v-else class="w-8 h-8 text-brand-text-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <span class="text-[10px] font-bold text-brand-primary uppercase tracking-wider block truncate">{{ prod.brand }}</span>
            <h4 class="font-serif font-bold text-xs sm:text-sm text-brand-text dark:text-white line-clamp-2 mt-0.5 group-hover:text-brand-primary transition-colors">
              {{ prod.name }}
            </h4>
          </div>
        </router-link>

        <button
          @click="router.push(`/explore?type=${userSkinType}`)"
          class="w-full mt-4 py-2.5 bg-brand-bg-light dark:bg-stone-800 hover:bg-brand-primary hover:text-white dark:hover:bg-brand-primary text-brand-text dark:text-stone-200 font-bold text-xs rounded-xl border border-brand-surface-border dark:border-stone-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
        >
          View Skin Sorting Specs
        </button>
      </div>
    </div>

    <!-- Clean Empty State Render Block -->
    <div v-else class="py-8 flex justify-center items-center w-full">
      <EmptyState
        title="No Curated Items Ready"
        message="There are currently no products indexed matching your exact diagnostic profile properties. Use our catalog search tool to explore alternative formulas manually."
        action-label="Explore Global Catalog"
        @action="router.push('/explore')"
      />
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
