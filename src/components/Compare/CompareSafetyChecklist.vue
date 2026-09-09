<script setup lang="ts">
import type { CompareResponse } from '../../api/products'

defineProps<{ data: CompareResponse }>()

const propertiesList = [
  { label: 'Alcohol-free', key: 'alcohol_free' },
  { label: 'Fragrance-free', key: 'fragrance_free' },
  { label: 'Paraben-free', key: 'paraben_free' },
  { label: 'Silicone-free', key: 'silicone_free' },
  { label: 'Sulfate-free', key: 'sulfate_free' },
  { label: 'Vegan', key: 'vegan' },
  { label: 'Fungal-acne safe', key: 'fungal_safe' },
]

// Null is a third answer, not a missing one. `safety_flags` can legitimately
// omit a key, and reporting that as `false` would print a claim about a
// formulation nobody made - the same fault FE-DEF-25 recorded for severity and
// FE-DEF-12 for the match score.
const verifyFlagState = (product: any, propertyKey: string): boolean | null => {
  if (!product) return null
  if (product.safety_flags && product.safety_flags[propertyKey] !== undefined) {
    return product.safety_flags[propertyKey]
  }
  return null
}
</script>

<template>
  <div class="bg-brand-surface-light dark:bg-brand-surface-dark p-5 sm:p-6 rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 shadow-xl space-y-3.5">

    <!-- Header and legend on one line. The legend is new: the old layout put A
         and B at opposite ends of a full-width row and relied on that distance
         to say which was which, which a chip cannot do. Stated once here rather
         than repeated in all seven chips. -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="font-serif font-bold text-sm text-brand-text-muted tracking-wider uppercase">
        Free-From Composition Metrics
      </div>
      <div class="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">
        <span class="flex items-center gap-1.5">
          <span class="w-4 h-4 rounded-full bg-stone-400/10 border border-stone-400/20 flex items-center justify-center text-[9px] font-black">A</span>
          <span class="truncate max-w-[7rem]">{{ data.product_a?.brand || 'Formula A' }}</span>
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-4 h-4 rounded-full bg-stone-400/10 border border-stone-400/20 flex items-center justify-center text-[9px] font-black">B</span>
          <span class="truncate max-w-[7rem]">{{ data.product_b?.brand || 'Formula B' }}</span>
        </span>
      </div>
    </div>

    <!-- Chip grid. Was seven full-width rows at 53px each, 458px of panel for
         fourteen booleans. The markers stay in A-then-B reading order inside
         each chip so the mapping to the product-A-left / product-B-right
         arrangement the rest of the screen uses survives the compaction. -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      <div
        v-for="item in propertiesList"
        :key="item.key"
        class="flex items-center gap-2 px-2.5 py-2 rounded-2xl border border-brand-surface-border dark:border-stone-800/80 bg-brand-bg-light/40 dark:bg-stone-900/30 hover:bg-brand-bg-light dark:hover:bg-stone-900/60 transition-colors min-w-0"
      >
        <div class="flex items-center gap-1 shrink-0">
          <!-- Written once per product rather than once per state per product:
               the previous layout repeated the same three-branch block verbatim
               for A and for B, so a change to any marker had to be made twice. -->
          <!-- Keyed by position, not by value: A and B agree on most properties,
               and keying on the state would emit the same key twice whenever
               they do. -->
          <template
            v-for="(side, sideIdx) in [verifyFlagState(data.product_a, item.key), verifyFlagState(data.product_b, item.key)]"
            :key="sideIdx"
          >
            <span
              v-if="side === true"
              class="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0"
            >
              <svg class="w-2.5 h-2.5 stroke-[3.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
            </span>
            <span
              v-else-if="side === false"
              class="w-4 h-4 rounded-full bg-rose-500/10 text-semantic-error border border-rose-500/20 flex items-center justify-center shrink-0"
            >
              <svg class="w-2.5 h-2.5 stroke-[3.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </span>
            <span
              v-else
              class="w-4 h-4 rounded-full bg-stone-400/10 text-stone-400 dark:text-stone-500 border border-stone-400/20 flex items-center justify-center font-bold text-[9px] shrink-0"
            >?</span>
          </template>
        </div>

        <span class="text-[10px] font-bold text-brand-text dark:text-stone-300 uppercase tracking-wide leading-tight min-w-0 break-words">
          {{ item.label }}
        </span>
      </div>
    </div>
  </div>
</template>
