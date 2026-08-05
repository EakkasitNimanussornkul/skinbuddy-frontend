<script setup lang="ts">
defineProps<{ data: any }>()

const propertiesList = [
  { label: 'Alcohol-free', key: 'alcohol_free' },
  { label: 'Fragrance-free', key: 'fragrance_free' },
  { label: 'Paraben-free', key: 'paraben_free' },
  { label: 'Silicone-free', key: 'silicone_free' },
  { label: 'Sulfate-free', key: 'sulfate_free' },
  { label: 'Vegan', key: 'vegan' },
  { label: 'Fungal-acne safe', key: 'fungal_safe' },
]

const verifyFlagState = (product: any, propertyKey: string): boolean => {
  if (!product) return true
  if (product.safety_flags && product.safety_flags[propertyKey] !== undefined) {
    return product.safety_flags[propertyKey]
  }
  return true
}
</script>

<template>
  <div class="bg-brand-surface-light dark:bg-brand-surface-dark p-6 sm:p-8 rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 shadow-xl space-y-4">
    <div class="text-center font-serif font-bold text-sm text-brand-text-muted tracking-wider uppercase">Free-From Composition Metrics</div>

    <div class="border border-brand-surface-border dark:border-stone-800/80 rounded-3xl overflow-hidden divide-y divide-brand-surface-border dark:divide-stone-800/60">
      <div v-for="item in propertiesList" :key="item.key" class="grid grid-cols-12 items-center py-3.5 px-6 text-xs font-semibold hover:bg-brand-bg-light/40 dark:hover:bg-stone-900/10 transition-colors">

        <!-- Product A Composition Check Status Indicator (Left) -->
        <div class="col-span-3 flex justify-start">
          <span v-if="verifyFlagState(data.product_a, item.key)" class="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shadow-2xs">
            <svg class="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
          </span>
          <span v-else class="w-6 h-6 rounded-full bg-rose-500/10 text-semantic-error border border-rose-500/20 flex items-center justify-center shadow-2xs">
            <svg class="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </span>
        </div>

        <!-- Central Structural Descriptor Key Label -->
        <div class="col-span-6 text-center font-bold text-brand-text dark:text-stone-300 uppercase tracking-wide text-[10px] sm:text-[11px]">{{ item.label }}</div>

        <!-- Product B Composition Check Status Indicator (Right) -->
        <div class="col-span-3 flex justify-end">
          <span v-if="verifyFlagState(data.product_b, item.key)" class="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shadow-2xs">
            <svg class="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
          </span>
          <span v-else class="w-6 h-6 rounded-full bg-rose-500/10 text-semantic-error border border-rose-500/20 flex items-center justify-center shadow-2xs">
            <svg class="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </span>
        </div>

      </div>
    </div>
  </div>
</template>
