<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  product: any
  isSelectedForCompare?: boolean
}>()

const emit = defineEmits(['inspect', 'toggle-compare'])

const matchInfo = computed(() => {
  const score = props.product.skin_match_score || 88
  if (score >= 85) return { label: `${score}% Match`, class: 'bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300 border-green-300' }
  if (score >= 60) return { label: `${score}% Match`, class: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300' }
  return { label: `${score}% Caution`, class: 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border-red-300' }
})
</script>

<template>
  <div @click="emit('inspect', product)" class="group cursor-pointer bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl p-4 border border-stone-200 dark:border-stone-800 shadow-sm hover:-translate-y-1 hover:shadow-xl hover:border-brand-primary/40 transition-all duration-300 flex flex-col justify-between h-full">

    <!-- Top Row: Match Pill & Compare Toggle -->
    <div class="flex items-center justify-between gap-1.5 mb-3">
      <span :class="['text-[10px] font-black px-2.5 py-0.5 rounded-full border font-mono tracking-wide shadow-2xs', matchInfo.class]">
        {{ matchInfo.label }}
      </span>

      <button
        @click.stop="emit('toggle-compare')"
        :class="[
          'flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all border flex-shrink-0',
          isSelectedForCompare
            ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
            : 'bg-stone-100 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-brand-primary'
        ]"
      >
        <svg class="w-3 h-3 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path v-if="isSelectedForCompare" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span>{{ isSelectedForCompare ? 'Selected' : 'Compare' }}</span>
      </button>
    </div>

    <!-- Thumbnail Image -->
    <div class="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800/80 flex items-center justify-center p-2 mb-3 group-hover:scale-105 transition-transform">
      <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-contain" />
      <svg v-else class="w-8 h-8 text-stone-300 dark:text-stone-700 stroke-[1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    </div>

    <!-- Product Text Details -->
    <div class="flex-1 flex flex-col justify-end text-center sm:text-left min-w-0">
      <p class="text-[10px] font-bold text-brand-primary dark:text-pink-400 uppercase tracking-widest truncate">{{ product.brand || 'Unknown Brand' }}</p>
      <h3 class="text-xs sm:text-sm font-bold text-brand-text dark:text-white truncate mt-0.5 group-hover:text-brand-primary transition-colors">{{ product.name }}</h3>
          <div class="mt-1.5 flex items-center gap-1.5 font-mono font-bold text-xs">
        <span class="text-brand-primary dark:text-pink-400">฿{{ product.price_thb || 350 }}</span>
        <span class="text-stone-300 dark:text-stone-700 font-normal">/</span>
        <span class="text-stone-500 dark:text-stone-400">${{ product.price_usd || '11.00' }}</span>
      </div>
      <p class="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-1">{{ product.category || 'Active Formula' }}</p>
    </div>

  </div>
</template>
