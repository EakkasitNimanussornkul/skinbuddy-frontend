<script setup lang="ts">
import ProductSpecContent from './ProductSpecContent.vue'

defineProps<{
  product: any
  mode?: 'explore' | 'shelf'
}>()

const emit = defineEmits(['close', 'refresh', 'open-compare-selector'])
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in" @click.self="emit('close')">

    <div class="w-full max-w-5xl max-h-[92vh] flex flex-col bg-brand-bg-light dark:bg-brand-bg-dark rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up border border-slate-200 dark:border-slate-800">

      <div class="px-6 py-4 bg-brand-surface-light dark:bg-brand-surface-dark border-b border-slate-100 dark:border-slate-800 z-20 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <span class="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            Quick Inspect
          </span>
          <router-link
            v-if="product?.slug"
            :to="`/product/${product.slug}`"
            @click="emit('close')"
            class="text-xs font-semibold text-slate-500 hover:text-brand-primary dark:text-slate-400 dark:hover:text-white flex items-center gap-1 underline transition-colors cursor-pointer"
          >
            <span>View Full Page</span>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </router-link>
        </div>

        <button @click="emit('close')" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-brand-text dark:hover:text-white transition-colors cursor-pointer">
          <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div class="overflow-y-auto flex-1 hide-scrollbar bg-brand-bg-light dark:bg-brand-bg-dark">
        <div class="p-4 sm:p-6">
          <ProductSpecContent
            :product="product"
            :mode="mode || 'explore'"
            @open-compare-selector="emit('open-compare-selector', $event); emit('close')"
            @shelf-updated="emit('refresh')"
            @close="emit('close')"
          />
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
