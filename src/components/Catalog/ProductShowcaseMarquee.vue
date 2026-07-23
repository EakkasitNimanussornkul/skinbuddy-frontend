<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  products?: any[]
  isLoading?: boolean
}>()

const displayProducts = computed(() => {
  if (props.products && props.products.length > 0) {
    return props.products.slice(0, 8)
  }
  return []
})
</script>

<template>
  <div class="relative w-full overflow-hidden py-2">
    <!-- Fade edges gradient overlay -->
    <div class="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-brand-bg-light dark:from-brand-bg-dark to-transparent z-10 pointer-events-none"></div>
    <div class="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-brand-bg-light dark:from-brand-bg-dark to-transparent z-10 pointer-events-none"></div>

    <!-- 🌟 Skeleton Loading State (Shown while catalog API fetches) 🌟 -->
    <div v-if="isLoading || displayProducts.length === 0" class="flex gap-3 w-max animate-pulse">
      <div
        v-for="n in 5"
        :key="n"
        class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-brand-surface-light/80 dark:bg-stone-900/80 border border-brand-surface-border dark:border-stone-800 shrink-0"
      />
    </div>

    <!-- 🌟 Infinite Scrolling Track (Rendered ONLY after products are fully loaded) 🌟 -->
    <div v-else class="flex gap-3 w-max animate-marquee hover:[animation-play-state:paused]">
      <div
        v-for="(item, idx) in [...displayProducts, ...displayProducts]"
        :key="idx"
        class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-brand-surface-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800 p-2 flex items-center justify-center shrink-0 shadow-2xs group cursor-pointer hover:border-brand-primary transition-colors"
      >
        <img
          v-if="item.image_url"
          :src="item.image_url"
          :alt="item.name"
          class="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-200"
        />
        <svg v-else class="w-6 h-6 text-brand-text-muted stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes marquee {
  0% { transform: translateX(0%); }
  100% { transform: translateX(-50%); }
}

.animate-marquee {
  animation: marquee 25s linear infinite;
}
</style>
