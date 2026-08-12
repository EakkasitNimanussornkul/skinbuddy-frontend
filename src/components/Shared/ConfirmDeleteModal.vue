<script setup lang="ts">
import { computed } from 'vue'
import type { ShelfItem } from '../../stores/shelfStore'

const props = defineProps<{
  item: ShelfItem | null
}>()

const emit = defineEmits(['cancel', 'confirm'])

// Safely extract the data just like we do in the ShelfCard!
const name = computed(() => props.item?.products?.name || 'this product')
const brand = computed(() => props.item?.products?.brand || '')
const imageUrl = computed(() => props.item?.products?.image_url || null)
</script>

<template>
  <div class="fixed inset-0 z-[80] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-fade-in" @click.self="emit('cancel')">
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-semantic-error/30 dark:border-semantic-error/20 animate-slide-up">

      <div class="bg-semantic-error/5 dark:bg-semantic-error/10 p-6 flex flex-col items-center text-center border-b border-semantic-error/20 dark:border-semantic-error/20">
        <div class="w-16 h-16 bg-brand-surface-light dark:bg-brand-bg-dark text-semantic-error rounded-full flex items-center justify-center shadow-sm mb-4 border border-semantic-error/30 dark:border-semantic-error/40">
          <svg class="w-8 h-8 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-brand-text dark:text-white">Remove Product?</h2>
        <p class="text-xs font-bold text-semantic-error mt-1">This will remove it from your shelf and routine.</p>
      </div>

      <div class="p-6 bg-brand-bg-light dark:bg-stone-800/30 flex items-center gap-4">
        <div class="w-12 h-12 bg-brand-surface-light dark:bg-stone-800 rounded-xl p-1 border border-brand-surface-border dark:border-stone-700 flex items-center justify-center flex-shrink-0">
          <img v-if="imageUrl" :src="imageUrl" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal p-0.5" />
          <svg v-else class="w-6 h-6 text-brand-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        </div>
        <div>
          <p class="text-[10px] font-bold text-brand-primary uppercase tracking-wider line-clamp-1">{{ brand }}</p>
          <p class="text-sm font-bold text-brand-text dark:text-stone-200 line-clamp-2 leading-tight mt-0.5">{{ name }}</p>
        </div>
      </div>

      <div class="p-4 grid grid-cols-2 gap-3 bg-brand-surface-light dark:bg-brand-surface-dark border-t border-brand-surface-border dark:border-stone-800">
        <button @click="emit('cancel')" class="py-3 rounded-xl font-bold text-brand-text dark:text-stone-300 bg-brand-bg-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700 hover:bg-brand-surface-border/50 dark:hover:bg-stone-700 transition-colors text-sm">Cancel</button>
        <button @click="emit('confirm')" class="py-3 rounded-xl font-bold text-white bg-semantic-error hover:bg-semantic-error/90 transition-colors shadow-sm shadow-semantic-error/20 text-sm">Yes, Remove</button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>
