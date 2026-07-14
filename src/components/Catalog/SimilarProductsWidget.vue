<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{
  similarProducts: any[]
  baseProductSlug: string
}>()

const router = useRouter()
</script>

<template>
  <div v-if="similarProducts && similarProducts.length > 0" class="space-y-6 pt-6 border-t border-brand-surface-border dark:border-stone-800">
    <div>
      <h3 class="text-xl sm:text-2xl font-serif font-bold text-brand-text dark:text-white">Recommended products similar to this</h3>
      <p class="text-xs sm:text-sm text-brand-text-muted mt-1">Alternative formulations matched with similar active ingredient profiles.</p>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
      <div
        v-for="sim in similarProducts"
        :key="sim.id"
        class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl p-4 sm:p-5 border border-brand-surface-border dark:border-stone-800 flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg hover:border-brand-primary/40 transition-all duration-300 group"
      >
        <router-link :to="`/product/${sim.slug}`" class="space-y-3 block">
          <div class="w-full h-36 sm:h-44 bg-brand-bg-light dark:bg-stone-900 rounded-2xl p-3 flex items-center justify-center border border-brand-surface-border/50 dark:border-stone-800 overflow-hidden">
            <img v-if="sim.image_url" :src="sim.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition-transform" />
            <svg v-else class="w-8 h-8 text-brand-text-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <div>
            <span class="text-[10px] font-bold text-brand-primary uppercase tracking-wider block truncate">{{ sim.brand }}</span>
            <h4 class="font-serif font-bold text-xs sm:text-sm text-brand-text dark:text-white line-clamp-2 mt-0.5 group-hover:text-brand-primary transition-colors">{{ sim.name }}</h4>
          </div>
        </router-link>

        <button
          @click="router.push(`/compare?a=${baseProductSlug}&b=${sim.slug}`)"
          class="w-full mt-4 py-2.5 bg-brand-bg-light dark:bg-stone-800 hover:bg-brand-primary hover:text-white dark:hover:bg-brand-primary text-brand-text dark:text-stone-200 font-bold text-xs rounded-xl border border-brand-surface-border dark:border-stone-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
        >
          <span>Compare</span>
          <svg class="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>
