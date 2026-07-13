<script setup lang="ts">
defineProps<{
  product: any
  isRecommended?: boolean
}>()

const emit = defineEmits(['select'])
</script>

<template>
  <li class="list-none h-full">
    <button
      @click="emit('select')"
      class="w-full h-full bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl p-4 border border-brand-surface-border dark:border-stone-800 shadow-sm flex items-center justify-between gap-4 hover:border-brand-primary/50 dark:hover:border-brand-primary/50 hover:shadow-md transition-all text-left group"
    >
      <div class="flex items-center gap-4 min-w-0">
        <div class="w-16 h-16 rounded-2xl bg-brand-bg-light dark:bg-stone-900 flex-shrink-0 flex items-center justify-center border border-brand-surface-border dark:border-stone-800 overflow-hidden">
          <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-contain p-1.5 mix-blend-multiply dark:mix-blend-normal" />
          <svg v-else class="w-7 h-7 text-brand-text-muted/60 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-[10px] font-bold text-brand-primary uppercase tracking-wider truncate">{{ product.brand }}</span>
            <span v-if="isRecommended" class="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">Skin Match</span>
          </div>
          <h4 class="text-sm sm:text-base font-bold text-brand-text dark:text-stone-100 truncate group-hover:text-brand-primary transition-colors">{{ product.name }}</h4>
          <p class="text-xs text-brand-text-muted mt-0.5 truncate">{{ product.category }}</p>
        </div>
      </div>

      <div class="flex-shrink-0 w-9 h-9 rounded-full bg-brand-bg-light dark:bg-stone-800 text-brand-primary flex items-center justify-center border border-brand-surface-border dark:border-stone-700 group-hover:bg-brand-primary group-hover:text-brand-surface-light group-hover:border-brand-primary transition-all">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
      </div>
    </button>
  </li>
</template>
