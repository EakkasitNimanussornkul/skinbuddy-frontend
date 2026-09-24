<script setup lang="ts">
import { computed, useId } from 'vue'
import { useStepList } from '../../composables/useStepList'
import ShowMoreControl from '../Shared/ShowMoreControl.vue'

const props = defineProps<{
  item: any
}>()

/**
 * What the product is suited to - the positive sense only.
 *
 * Headed "Targeted Skin Concerns" until the owner pointed out it read as the
 * opposite of the product page, where "concerns" are warnings. The chips here
 * come from each ingredient's good_for ("Dry Skin, Dehydrated Skin"), which is
 * what the product helps with, so the section is now "Best Suited For".
 *
 * The component also used to read ingredient_concerns into the same chips.
 * Those are warnings - the product page lists them under "Formula Concerns &
 * Sensitivity Profile" - so a concern title would have rendered here as a
 * benefit. The shelf join does not select that relation today, so none ever
 * appeared, but it is no longer read: this list must only ever say good things
 * because its heading does.
 *
 * The file keeps its name so imports and the Test Record module path hold.
 */
const suitedFor = computed(() => {
  if (!props.item) return []

  const list = new Set<string>()

  const addValidBadge = (str: any) => {
    if (typeof str !== 'string') return
    const trimmed = str.trim()
    // Filter out long description sentences (badge tags are typically short focus areas).
    // "None" is skipped: it is the catalogue's placeholder for an empty field,
    // and "Best Suited For: None" would read as a verdict.
    if (trimmed.length > 0 && trimmed.length <= 25 && trimmed.toLowerCase() !== 'none') {
      list.add(trimmed)
    }
  }

  const extract = (val: any) => {
    if (!val) return
    if (Array.isArray(val)) {
      val.forEach(item => {
        if (typeof item === 'string') addValidBadge(item)
        else if (item?.concern_title) addValidBadge(item.concern_title)
        else if (item?.concern_name) addValidBadge(item.concern_name)
        else if (item?.name) addValidBadge(item.name)
        else if (item?.title) addValidBadge(item.title)
      })
    } else if (typeof val === 'string') {
      val.split(',').forEach(s => addValidBadge(s))
    } else if (typeof val === 'object') {
      addValidBadge(val.concern_title || val.concern_name || val.name || val.title)
    }
  }

  // 1. Direct product target tags
  const productData = props.item.products || props.item
  extract(productData.concerns)
  extract(productData.target_concerns)
  extract(productData.skin_concerns)
  extract(productData.product_concerns)

  // 2. Ingredient target profiles (e.g. good_for: "Aging Skin, Dry Skin").
  // good_for only - not ingredient_concerns, which are warnings (see above).
  if (Array.isArray(productData.product_ingredients)) {
    productData.product_ingredients.forEach((pi: any) => {
      const ing = pi?.ingredients || pi
      if (ing) {
        extract(ing.good_for)
      }
    })
  }

  return Array.from(list)
})

// Five chips, then five more at a time rather than every remaining one at once.
const suitedSteps = useStepList(suitedFor, { initial: 5, step: 5 })
const suitedListId = useId()
</script>

<template>
  <div v-if="suitedFor.length > 0" class="pt-4 border-t border-brand-surface-border dark:border-stone-800 space-y-3">
    <div class="flex items-center justify-between gap-3">
      <div class="space-y-0.5">
        <h4 class="text-xs font-bold uppercase tracking-widest text-brand-text-muted">Best Suited For</h4>
        <p class="text-[11px] text-brand-text-muted">Skin types and needs this product's ingredients are known to support.</p>
      </div>
      <span class="shrink-0 text-[10px] font-mono text-brand-text-muted font-bold px-2.5 py-0.5 rounded-lg bg-brand-surface-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700">
        {{ suitedFor.length }} Listed
      </span>
    </div>

    <!-- Clean Badges Only -->
    <div :id="suitedListId" class="flex flex-wrap gap-1.5">
      <span
        v-for="(concern, idx) in suitedSteps.visible.value"
        :key="idx"
        class="animate-reveal text-[11px] font-bold bg-brand-primary/10 text-brand-primary dark:text-brand-primary-accent px-3 py-1 rounded-xl border border-brand-primary/20 shadow-2xs"
      >
        {{ concern }}
      </span>
    </div>

    <ShowMoreControl
      :next-count="suitedSteps.nextCount.value"
      :remaining="suitedSteps.remaining.value"
      :can-show-more="suitedSteps.canShowMore.value"
      :can-show-less="suitedSteps.canShowLess.value"
      :controls="suitedListId"
      @more="suitedSteps.showMore"
      @less="suitedSteps.showLess"
    />
  </div>
</template>
