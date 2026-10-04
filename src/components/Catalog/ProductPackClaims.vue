<script setup lang="ts">
import { computed } from 'vue'

/**
 * What the product says about itself, from migration 0013: the concerns it is
 * made for (good_for), its key benefits, and how long it keeps once opened
 * (pao_months). Only what an admin published at approve, or set in an edit,
 * ever reaches these fields.
 *
 * Every field is optional and may be null on an older response or an older
 * product; an empty or missing one shows nothing at all, never a placeholder.
 * Headed as the brand's claims, so they are not read as SkinBuddy's own
 * finding - the % Match is the app's assessment, these are the pack's.
 */
const props = defineProps<{ product: unknown }>()

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim()) : []

const record = computed(() => (props.product ?? {}) as { good_for?: unknown; benefits?: unknown; pao_months?: unknown })
const goodFor = computed(() => strings(record.value.good_for))
const benefits = computed(() => strings(record.value.benefits))
const paoMonths = computed(() => {
  const months = record.value.pao_months
  return typeof months === 'number' && Number.isInteger(months) && months > 0 ? months : null
})

const hasAny = computed(() => goodFor.value.length > 0 || benefits.value.length > 0 || paoMonths.value !== null)
</script>

<template>
  <div v-if="hasAny" class="pack-claims space-y-3 pt-1">
    <p v-if="goodFor.length || benefits.length" class="text-[11px] font-semibold text-brand-text-muted dark:text-stone-400">
      What the brand says about this product:
    </p>

    <div v-if="goodFor.length" class="pack-good-for">
      <h2 class="text-[13px] font-extrabold text-stone-800 dark:text-white">Good for</h2>
      <ul class="mt-1.5 flex flex-wrap gap-1.5 list-none p-0 m-0">
        <li
          v-for="tag in goodFor"
          :key="tag"
          class="px-2.5 py-1 rounded-full bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary-strong-hover dark:text-brand-primary-accent text-[13px] font-bold"
        >
          {{ tag }}
        </li>
      </ul>
    </div>

    <div v-if="benefits.length" class="pack-benefits">
      <h2 class="text-[13px] font-extrabold text-stone-800 dark:text-white">Key benefits</h2>
      <ul class="mt-1 list-none p-0 m-0 space-y-0.5">
        <li v-for="benefit in benefits" :key="benefit" class="flex items-start gap-2 text-sm text-brand-text dark:text-stone-300">
          <svg class="w-3.5 h-3.5 mt-1 shrink-0 text-brand-primary-strong dark:text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
          {{ benefit }}
        </li>
      </ul>
    </div>

    <p v-if="paoMonths !== null" class="pack-pao flex items-center gap-2 text-sm text-brand-text dark:text-stone-300">
      <svg class="w-4 h-4 shrink-0 text-brand-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6v4l2 3v10a1 1 0 01-1 1H8a1 1 0 01-1-1V10l2-3z" /><path d="M10 14h4" /></svg>
      Use within {{ paoMonths }} months after opening
    </p>
  </div>
</template>
