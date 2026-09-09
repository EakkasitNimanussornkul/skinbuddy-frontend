<script setup lang="ts">
import CompareFlagMarker from './CompareFlagMarker.vue'
import { resolveProductLabel, type CompareResponse } from '../../api/products'

const props = defineProps<{ data: CompareResponse }>()

// The two sides are labelled by position, so a product missing both a name and
// a brand still has to be called something the reader can match to a column.
const labelFor = (product: unknown) =>
  resolveProductLabel(product, product === props.data?.product_a ? 'Formula A' : 'Formula B')

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
// omit a key, and reporting that as `false` would state something about the
// formulation that nobody recorded. CompareFlagMarker draws it as its own thing.
const verifyFlagState = (product: any, propertyKey: string): boolean | null => {
  if (!product) return null
  if (product.safety_flags && product.safety_flags[propertyKey] !== undefined) {
    return product.safety_flags[propertyKey]
  }
  return null
}
</script>

<template>
  <div class="bg-brand-surface-light dark:bg-brand-surface-dark p-5 sm:p-6 rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 shadow-xl space-y-3">

    <!-- Header, and a legend naming which side is which product. The row layout
         below says it by position - product A on the left, product B on the
         right, matching the two columns the rest of the screen uses - and the
         legend states in words what that position means, which the original
         version left the reader to infer.

         Each side names the product, not just its brand. The brand alone does
         not identify which formula a column belongs to, and identifies nothing
         at all when both products are the same brand, which is the comparison a
         user is most likely to run. -->
    <div class="grid grid-cols-3 items-start gap-x-3">
      <div class="min-w-0 text-left">
        <span class="block text-[9px] font-bold uppercase tracking-widest text-brand-text-muted truncate">
          {{ labelFor(data.product_a).brand }}
        </span>
        <span class="block text-[10px] font-bold text-brand-primary leading-tight line-clamp-2">
          {{ labelFor(data.product_a).name }}
        </span>
      </div>

      <div class="font-serif font-bold text-xs sm:text-sm text-brand-text-muted tracking-wider uppercase text-center self-center">
        Free-From Composition
      </div>

      <div class="min-w-0 text-right">
        <span class="block text-[9px] font-bold uppercase tracking-widest text-brand-text-muted truncate">
          {{ labelFor(data.product_b).brand }}
        </span>
        <span class="block text-[10px] font-bold text-brand-primary leading-tight line-clamp-2">
          {{ labelFor(data.product_b).name }}
        </span>
      </div>
    </div>

    <!-- Same three-part row as before - product A's answer at the left edge, the
         property in the middle, product B's answer at the right edge - because
         that mapping to the page's two product columns is what makes the panel
         readable without a legend per line. Only the scale changed: the panel
         spent 458px on fourteen booleans, at 53px a row, which was more page
         than the facts were worth. Padding, marker and label sizes are all down
         a step, and the panel's own padding with them. -->
    <div class="border border-brand-surface-border dark:border-stone-800/80 rounded-2xl overflow-hidden divide-y divide-brand-surface-border dark:divide-stone-800/60">
      <div
        v-for="item in propertiesList"
        :key="item.key"
        class="grid grid-cols-12 items-center gap-2 py-1.5 px-3 sm:px-4 hover:bg-brand-bg-light/40 dark:hover:bg-stone-900/10 transition-colors"
      >
        <div class="col-span-2 flex justify-start">
          <CompareFlagMarker :state="verifyFlagState(data.product_a, item.key)" />
        </div>

        <div class="col-span-8 text-center font-bold text-brand-text dark:text-stone-300 uppercase tracking-wide text-[10px] leading-tight">
          {{ item.label }}
        </div>

        <div class="col-span-2 flex justify-end">
          <CompareFlagMarker :state="verifyFlagState(data.product_b, item.key)" />
        </div>
      </div>
    </div>
  </div>
</template>
