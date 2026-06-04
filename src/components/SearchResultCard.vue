<script setup lang="ts">
defineProps<{
  product: any
}>()

const emit = defineEmits(['select'])
</script>

<template>
  <li class="list-none">
    <button
      @click="emit('select')"
      class="w-full bg-white dark:bg-stone-900 rounded-2xl p-3 border border-stone-200 dark:border-stone-800 shadow-sm flex items-center gap-4 hover:border-brand-primary/40 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-all text-left group"
    >
      <div class="w-14 h-14 bg-brand-bg-light dark:bg-stone-800 rounded-xl flex-shrink-0 flex items-center justify-center border border-stone-100 dark:border-stone-700/50 overflow-hidden">
        <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal p-1" />
        <svg v-else class="w-6 h-6 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
      </div>

      <div class="flex-grow min-w-0">
        <p class="text-[9px] font-bold text-brand-primary dark:text-orange-400 uppercase tracking-widest truncate">{{ product.brand }}</p>
        <h4 class="text-sm font-semibold text-brand-text dark:text-stone-100 truncate mt-0.5 group-hover:text-brand-primary transition-colors">{{ product.name }}</h4>
        <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">{{ product.category }}</p>
      </div>

      <div class="flex-shrink-0 w-8 h-8 rounded-full bg-brand-bg-light dark:bg-stone-800 text-brand-primary dark:text-orange-300 flex items-center justify-center border border-stone-200 dark:border-stone-700 group-hover:bg-brand-primary group-hover:text-white dark:group-hover:bg-brand-primary dark:group-hover:text-stone-900 transition-colors shadow-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
      </div>
    </button>
  </li>
</template>
