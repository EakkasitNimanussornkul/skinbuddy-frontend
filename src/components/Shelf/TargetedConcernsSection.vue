<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  item: any
}>()

const showAllConcerns = ref(false)

// 🌟 Strict badge parser that excludes full sentences/descriptions
const targetedConcerns = computed(() => {
  if (!props.item) return []

  const list = new Set<string>()

  const addValidBadge = (str: any) => {
    if (typeof str !== 'string') return
    const trimmed = str.trim()
    // Filter out long description sentences (badge tags are typically short focus areas)
    if (trimmed.length > 0 && trimmed.length <= 25) {
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

  // 2. Ingredient target profiles (e.g. good_for: "Aging Skin, Dry Skin")
  if (Array.isArray(productData.product_ingredients)) {
    productData.product_ingredients.forEach((pi: any) => {
      const ing = pi?.ingredients || pi
      if (ing) {
        extract(ing.good_for)
        extract(ing.ingredient_concerns)
      }
    })
  }

  return Array.from(list)
})
</script>

<template>
  <div v-if="targetedConcerns.length > 0" class="pt-4 border-t border-brand-surface-border dark:border-stone-800 space-y-3">
    <div class="flex items-center justify-between">
      <h4 class="text-xs font-bold uppercase tracking-widest text-brand-text-muted">Targeted Skin Concerns</h4>
      <span class="text-[10px] font-mono text-brand-text-muted font-bold px-2.5 py-0.5 rounded-lg bg-brand-surface-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700">
        {{ targetedConcerns.length }} Focus Areas
      </span>
    </div>

    <!-- Clean Badges Only -->
    <div class="flex flex-wrap gap-1.5">
      <span
        v-for="(concern, idx) in (showAllConcerns ? targetedConcerns : targetedConcerns.slice(0, 5))"
        :key="idx"
        class="text-[11px] font-bold bg-brand-primary/10 text-brand-primary dark:text-brand-primary-accent px-3 py-1 rounded-xl border border-brand-primary/20 shadow-2xs"
      >
        {{ concern }}
      </span>
    </div>

    <!-- View More / View Less Toggle -->
    <button
      v-if="targetedConcerns.length > 5"
      @click="showAllConcerns = !showAllConcerns"
      class="text-[11px] font-bold text-brand-primary hover:underline cursor-pointer pt-0.5 block"
    >
      {{ showAllConcerns ? 'Show Fewer Concerns' : `+${targetedConcerns.length - 5} More Targeted Concerns` }}
    </button>
  </div>
</template>
