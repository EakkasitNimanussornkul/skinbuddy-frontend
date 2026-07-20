<script setup lang="ts">
defineProps<{ data: any }>()

const getMatchBadgeStyles = (product: any) => {
  const score = product?.skin_match_score || 85
  if (score >= 85) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  if (score >= 60) return 'bg-semantic-warning/10 text-semantic-warning border-semantic-warning/20'
  return 'bg-semantic-error/5 text-semantic-error border-semantic-error/20'
}
</script>

<template>
  <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 shadow-xl overflow-hidden">
    <!-- Visual Image Grid Row Block Split layout -->
    <div class="grid grid-cols-2 relative divide-x divide-brand-surface-border dark:divide-stone-800/60 text-center items-stretch border-b border-brand-surface-border dark:border-stone-800/60">
      <!-- absolute centered anchor tag circle split indicator -->
      <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-brand-bg-light dark:bg-stone-900 text-brand-text dark:text-stone-200 font-serif font-bold text-xs px-5 py-2 rounded-full border border-brand-surface-border dark:border-stone-800 shadow-md uppercase tracking-wider select-none">
        Versus
      </div>

      <!-- Identity Left Viewport Block Product A -->
      <div class="p-6 sm:p-10 flex flex-col items-center justify-between space-y-4">
        <div class="w-40 h-44 sm:w-48 sm:h-52 p-4 bg-brand-bg-light/50 dark:bg-stone-900/40 rounded-3xl border border-brand-surface-border dark:border-stone-800/50 flex items-center justify-center mix-blend-multiply dark:mix-blend-normal">
          <img v-if="data.product_a?.image_url" :src="data.product_a.image_url" class="max-h-full object-contain" />
        </div>
        <div>
          <span class="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{{ data.product_a?.brand }}</span>
          <h3 class="text-base sm:text-xl font-serif font-bold text-brand-text dark:text-white mt-1 leading-tight">{{ data.product_a?.name }}</h3>
        </div>
      </div>

      <!-- Identity Right Viewport Block Product B -->
      <div class="p-6 sm:p-10 flex flex-col items-center justify-between space-y-4">
        <div class="w-40 h-44 sm:w-48 sm:h-52 p-4 bg-brand-bg-light/50 dark:bg-stone-900/40 rounded-3xl border border-brand-surface-border dark:border-stone-800/50 flex items-center justify-center mix-blend-multiply dark:mix-blend-normal">
          <img v-if="data.product_b?.image_url" :src="data.product_b.image_url" class="max-h-full object-contain" />
        </div>
        <div>
          <span class="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{{ data.product_b?.brand }}</span>
          <h3 class="text-base sm:text-xl font-serif font-bold text-brand-text dark:text-white mt-1 leading-tight">{{ data.product_b?.name }}</h3>
        </div>
      </div>
    </div>

    <!-- Structured Data Metrics Specifications Comparison Table Grid Rows -->
    <div class="divide-y divide-brand-surface-border dark:divide-stone-800/60 text-center font-medium text-xs sm:text-sm">
      <!-- Description Section row block grid -->
      <div class="grid grid-cols-2 divide-x divide-brand-surface-border dark:divide-stone-800/60 bg-brand-bg-light/30 dark:bg-stone-900/10">
        <div class="p-4 sm:p-6 text-brand-text-muted dark:text-stone-400 leading-relaxed px-4 sm:px-8">
          {{ data.product_a?.description || 'No specialized description logs saved for this active formula component.' }}
        </div>
        <div class="p-4 sm:p-6 text-brand-text-muted dark:text-stone-400 leading-relaxed px-4 sm:px-8">
          {{ data.product_b?.description || 'No specialized description logs saved for this active formula component.' }}
        </div>
      </div>

      <!-- Match Score Matrix Layer -->
      <div class="grid grid-cols-2 divide-x divide-brand-surface-border dark:divide-stone-800/60 py-4.5 bg-white dark:bg-brand-surface-dark">
        <div class="flex justify-center items-center">
          <span :class="['text-xs font-black px-4 py-1.5 rounded-full border font-mono tracking-wide shadow-2xs', getMatchBadgeStyles(data.product_a)]">
            {{ data.product_a?.skin_match_score || 85 }}% Match
          </span>
        </div>
        <div class="flex justify-center items-center">
          <span :class="['text-xs font-black px-4 py-1.5 rounded-full border font-mono tracking-wide shadow-2xs', getMatchBadgeStyles(data.product_b)]">
            {{ data.product_b?.skin_match_score || 85 }}% Match
          </span>
        </div>
      </div>

      <!-- Category Category Chips Row Layer -->
      <div class="grid grid-cols-2 divide-x divide-brand-surface-border dark:divide-stone-800/60 py-4 bg-brand-bg-light/10 dark:bg-stone-900/10 text-brand-text dark:text-stone-300 font-bold uppercase tracking-wider text-[11px]">
        <div>{{ data.product_a?.category || 'General Skincare' }}</div>
        <div>{{ data.product_b?.category || 'General Skincare' }}</div>
      </div>

      <!-- Absolute Ingredient Density Counts Row Layer -->
      <div class="grid grid-cols-2 divide-x divide-brand-surface-border dark:divide-stone-800/60 py-4 text-xs font-bold text-brand-text-muted dark:text-stone-400">
        <div><span class="font-mono text-brand-primary text-sm font-black">{{ data.product_a?.product_ingredients?.length || 0 }}</span> ingredients</div>
        <div><span class="font-mono text-brand-primary text-sm font-black">{{ data.product_b?.product_ingredients?.length || 0 }}</span> ingredients</div>
      </div>
    </div>
  </div>
</template>
