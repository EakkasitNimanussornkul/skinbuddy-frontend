<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  product: any
  isSelectedForCompare?: boolean
}>()

const emit = defineEmits(['inspect', 'toggle-compare'])

// Semantic match info using your color palette
const matchInfo = computed(() => {
  const score = props.product.skin_match_score || 88
  if (score >= 85) return {
    label: `${score}% Match`,
    class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
  }
  if (score >= 60) return {
    label: `${score}% Match`,
    class: 'bg-amber-50 text-semantic-warning dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'
  }
  return {
    label: `${score}% Caution`,
    class: 'bg-semantic-error/5 text-semantic-error dark:bg-semantic-error/10 border-semantic-error/20'
  }
})
</script>

<template>
  <li class="list-none h-full">
    <button
      @click="emit('inspect', product)"
      class="w-full h-full bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl p-4 border border-brand-surface-border dark:border-stone-800 shadow-sm flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg hover:border-brand-primary/40 transition-all duration-300 text-left group"
    >

      <!-- Top Row: Match Pill & Compare Toggle -->
      <div class="flex items-center justify-between gap-1.5 mb-3 w-full">
        <span :class="['text-[10px] font-black px-2.5 py-0.5 rounded-full border font-mono tracking-wide', matchInfo.class]">
          {{ matchInfo.label }}
        </span>

        <button
          @click.stop="emit('toggle-compare')"
          :class="[
            'flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all border flex-shrink-0',
            isSelectedForCompare
              ? 'bg-brand-primary text-white border-brand-primary'
              : 'bg-brand-surface-light dark:bg-brand-surface-dark text-brand-text-muted border-brand-surface-border dark:border-stone-700 hover:border-brand-primary/50'
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
      <div class="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl bg-brand-bg-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800/80 flex items-center justify-center p-2 mb-3 group-hover:scale-105 transition-transform overflow-hidden">
        <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
        <svg v-else class="w-8 h-8 text-brand-text-muted/60 stroke-[1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
      </div>

      <!-- Product Text Details -->
      <div class="flex-1 flex flex-col justify-end text-center sm:text-left min-w-0">
        <p class="text-[10px] font-bold text-brand-primary uppercase tracking-widest truncate">{{ product.brand || 'Unknown Brand' }}</p>
        <h3 class="text-xs sm:text-sm font-bold text-brand-text dark:text-white truncate mt-0.5 group-hover:text-brand-primary transition-colors">{{ product.name }}</h3>

        <div class="mt-1.5 flex items-center justify-center sm:justify-start gap-1.5 font-mono font-bold text-xs">
          <span class="text-brand-primary">฿{{ product.price_thb || 350 }}</span>
          <span class="text-brand-surface-border dark:text-stone-700 font-normal">/</span>
          <span class="text-brand-text-muted dark:text-stone-400">${{ product.price_usd || '11.00' }}</span>
        </div>

        <p class="text-[11px] text-brand-text-muted dark:text-stone-400 truncate mt-1">{{ product.category || 'Active Formula' }}</p>
      </div>

    </button>
  </li>
</template>
