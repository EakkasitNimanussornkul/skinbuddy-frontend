<script setup lang="ts">
defineProps<{ data: any }>()
</script>

<template>
  <div class="space-y-6">

    <!-- Shared Cross-Chemical Overlap Header Banner block -->
    <div class="bg-brand-primary-light/50 dark:bg-brand-primary/5 border border-brand-primary/20 rounded-[2.5rem] p-6 space-y-3 shadow-sm">
      <h4 class="text-xs font-bold uppercase tracking-widest text-brand-primary dark:text-brand-primary-accent">Shared Component Overlap ({{ data.shared_ingredients?.length || 0 }})</h4>
      <div class="flex flex-wrap gap-2 pt-1">
        <span v-for="ing in data.shared_ingredients" :key="ing.id" class="px-3.5 py-2 bg-brand-surface-light dark:bg-stone-900 text-brand-text dark:text-stone-200 rounded-2xl text-xs font-bold border border-brand-surface-border dark:border-stone-800 shadow-xs flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-brand-primary shadow-sm"></span>
          <span>{{ ing.name }}</span>
        </span>
        <p v-if="!data.shared_ingredients?.length" class="text-xs text-brand-text-muted italic font-medium">No identical active ingredients overlap between these two formulations.</p>
      </div>
    </div>

    <!-- Master Side by Side Splitting Grid Columns Frame -->
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

      <!-- Product A Ingredient Deck Track -->
      <div class="space-y-4">
        <div class="flex items-center justify-between pl-1 border-b border-brand-surface-border dark:border-stone-800 pb-2">
          <h5 class="text-xs font-bold uppercase tracking-widest text-brand-text-muted">Unique Components Deck</h5>
          <span class="text-[10px] bg-brand-bg-light dark:bg-stone-900 px-2.5 py-1 rounded-lg border border-brand-surface-border dark:border-stone-800 font-bold text-brand-primary font-mono">{{ data.product_a?.brand }}</span>
        </div>

        <div class="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 hide-scrollbar">
          <div v-for="(item, idx) in data.product_a?.product_ingredients" :key="idx" class="p-3.5 bg-brand-bg-light/40 dark:bg-stone-900/50 rounded-2xl border border-brand-surface-border dark:border-stone-800/60 flex items-center justify-between shadow-2xs">
            <div class="min-w-0 pr-2">
              <span class="text-xs font-bold text-brand-text dark:text-stone-100 truncate block">{{ item.ingredients?.name || 'Active Component' }}</span>
              <span v-if="item.ingredients?.functional_group" class="text-[10px] font-semibold text-brand-text-muted dark:text-stone-400 block mt-0.5 uppercase tracking-wider">{{ item.ingredients.functional_group }}</span>
            </div>

            <span :class="['text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 shadow-3xs', item.ingredients?.benefits ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' : 'bg-brand-surface-light dark:bg-stone-800 text-brand-text-muted border-brand-surface-border dark:border-stone-700']">
              {{ item.ingredients?.benefits ? 'Active' : 'Base' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Product B Ingredient Deck Track -->
      <div class="space-y-4">
        <div class="flex items-center justify-between pl-1 border-b border-brand-surface-border dark:border-stone-800 pb-2">
          <h5 class="text-xs font-bold uppercase tracking-widest text-brand-text-muted">Unique Components Deck</h5>
          <span class="text-[10px] bg-brand-bg-light dark:bg-stone-900 px-2.5 py-1 rounded-lg border border-brand-surface-border dark:border-stone-800 font-bold text-brand-primary font-mono">{{ data.product_b?.brand }}</span>
        </div>

        <div class="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 hide-scrollbar">
          <div v-for="(item, idx) in data.product_b?.product_ingredients" :key="idx" class="p-3.5 bg-brand-bg-light/40 dark:bg-stone-900/50 rounded-2xl border border-brand-surface-border dark:border-stone-800/60 flex items-center justify-between shadow-2xs">
            <div class="min-w-0 pr-2">
              <span class="text-xs font-bold text-brand-text dark:text-stone-100 truncate block">{{ item.ingredients?.name || 'Active Component' }}</span>
              <span v-if="item.ingredients?.functional_group" class="text-[10px] font-semibold text-brand-text-muted dark:text-stone-400 block mt-0.5 uppercase tracking-wider">{{ item.ingredients.functional_group }}</span>
            </div>

            <span :class="['text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 shadow-3xs', item.ingredients?.benefits ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' : 'bg-brand-surface-light dark:bg-stone-800 text-brand-text-muted border-brand-surface-border dark:border-stone-700']">
              {{ item.ingredients?.benefits ? 'Active' : 'Base' }}
            </span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
</style>
