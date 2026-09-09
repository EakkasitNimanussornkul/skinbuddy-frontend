<script setup lang="ts">
import { computed, watch } from 'vue'
import KeyActivesGrid from '../Shelf/KeyActivesGrid.vue'
import { resolvePairConflictState, resolvePairConflicts, resolveProductLabel, type CompareResponse } from '../../api/products'
import { resolveSeverityBand } from '../../api/safety'
import { useClampedText } from '../../composables/useClampedText'

const props = defineProps<{ data: CompareResponse }>()

// FE-DEF-32: `CompareResponse.conflicts` is the three-pass compatibility engine
// run between these two specific products, and no component read it. The panel
// below is titled "Contraindications & Concerns" and was built entirely from
// `ingredient_concerns` - static, per-ingredient records that describe each
// product on its own and say nothing about the pair. A retinol serum compared
// against a BHA exfoliant produced the clash, returned it in this field, and
// showed the user two columns of unrelated boilerplate.
const pairConflicts = computed(() => resolvePairConflicts(props.data))
const pairState = computed(() => resolvePairConflictState(props.data))

// Measured, not guessed - the same rule the shelf's warning cards use. A
// conflict message that fits two lines must not offer a control that reveals
// nothing (FE-DEF-26), and one that does not must not hide half a safety
// warning behind no control at all (FE-DEF-27).
const { overflowing, expanded, setElement, toggle, remeasure } = useClampedText()

watch(pairConflicts, remeasure)

// Banded through the shared rule so this screen cannot colour severity
// differently from the three that already render it (FE-DEF-25). The palette is
// this panel's own; only the boundaries are shared.
const SEVERITY_BADGE: Record<string, string> = {
  high: 'bg-semantic-error/10 text-semantic-error border-semantic-error/20',
  medium: 'bg-semantic-warning/10 text-semantic-warning border-semantic-warning/20',
  low: 'bg-brand-primary/10 text-brand-primary dark:text-brand-primary-accent border-brand-primary/20',
  unknown: 'bg-stone-400/10 text-brand-text-muted border-brand-surface-border dark:border-stone-700',
}

const severityBadgeClass = (severity: string | null | undefined) =>
  SEVERITY_BADGE[resolveSeverityBand(severity)] ?? SEVERITY_BADGE.unknown

const pairNames = computed(() => ({
  a: resolveProductLabel(props.data?.product_a, 'Formula A').name,
  b: resolveProductLabel(props.data?.product_b, 'Formula B').name,
}))

const cleanProductAActives = computed(() => props.data?.product_a?.product_ingredients || [])
const cleanProductBActives = computed(() => props.data?.product_b?.product_ingredients || [])

const formulaBreakdowns = computed(() => {
  const extractSkinTypeWarnings = (product: any) => {
    if (!product || !product.product_ingredients) return []
    const concernsList: Array<{ title: string; msg: string; severity: string }> = []

    product.product_ingredients.forEach((pi: any) => {
      const ing = pi.ingredients
      if (!ing || !ing.ingredient_concerns) return

      ing.ingredient_concerns.forEach((concern: any) => {
        concernsList.push({
          title: concern.concern_title,
          msg: concern.concern_description || `Contains ${ing.name} which holds profile alerts: ${concern.target_profile}`,
          severity: concern.severity || 'Moderate'
        })
      })
    })

    return concernsList.slice(0, 4)
  }

  return {
    a: { concerns: extractSkinTypeWarnings(props.data?.product_a) },
    b: { concerns: extractSkinTypeWarnings(props.data?.product_b) }
  }
})
</script>

<template>
  <div class="space-y-6 w-full">

    <!-- SECTION 1: Key Active Ingredients Matrix -->
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 p-6 sm:p-8 space-y-4 shadow-xl transition-colors duration-300">
      <div class="text-center font-serif font-bold text-sm text-brand-text-muted dark:text-stone-400 tracking-wider uppercase border-b border-brand-surface-border dark:border-stone-800 pb-3">
        Key Active Ingredients Matrix
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-brand-surface-border dark:divide-stone-800/60 items-start gap-6 md:gap-0">
        <div class="space-y-2 md:pr-6 w-full">
          <div class="text-xs px-2.5 py-1 font-bold tracking-wider text-brand-primary bg-brand-primary/10 rounded-md mb-4 w-max uppercase">
            {{ data.product_a?.brand || 'Formula A' }}
          </div>
          <KeyActivesGrid :ingredients="cleanProductAActives" />
        </div>

        <div class="space-y-2 md:pl-6 pt-6 md:pt-0 w-full">
          <div class="text-xs px-2.5 py-1 font-bold tracking-wider text-brand-primary bg-brand-primary/10 rounded-md mb-4 w-max uppercase">
            {{ data.product_b?.brand || 'Formula B' }}
          </div>
          <KeyActivesGrid :ingredients="cleanProductBActives" />
        </div>
      </div>
    </div>

    <!-- SECTION 2: Interaction Between These Two Products.
         Full width and ahead of the per-product panel below, because it is
         about the pair rather than about either column - the distinction the
         old panel collapsed by having only per-product content under a title
         that promised this. -->
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 p-6 sm:p-8 space-y-4 shadow-xl transition-colors duration-300">
      <div class="text-center space-y-1.5 border-b border-brand-surface-border dark:border-stone-800 pb-3">
        <div class="font-serif font-bold text-sm text-brand-text-muted dark:text-stone-400 tracking-wider uppercase">
          Using These Two Together
        </div>
        <p class="text-[11px] font-medium text-brand-text-muted dark:text-stone-500">
          Checked between <span class="font-bold text-brand-text dark:text-stone-300">{{ pairNames.a }}</span>
          and <span class="font-bold text-brand-text dark:text-stone-300">{{ pairNames.b }}</span>, not against your shelf.
        </p>
      </div>

      <!-- Conflicts found -->
      <div v-if="pairState === 'conflicts'" class="space-y-2.5">
        <div
          v-for="(warning, idx) in pairConflicts"
          :key="idx"
          class="p-4 rounded-2xl bg-semantic-error/5 border border-semantic-error/15 space-y-2"
        >
          <!-- Severity omitted rather than defaulted when the engine sent none:
               printing the most alarming value nobody computed is FE-DEF-25. -->
          <div class="flex flex-wrap items-center gap-1.5">
            <span
              v-if="resolveSeverityBand(warning.severity) !== 'unknown'"
              :class="['text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border', severityBadgeClass(warning.severity)]"
            >
              {{ warning.severity }}
            </span>
            <span class="text-[10px] font-black uppercase tracking-wider text-brand-text dark:text-stone-200">
              {{ warning.alert_type }}
            </span>
          </div>

          <p
            :ref="(el) => setElement(idx, el)"
            :class="['text-xs sm:text-sm font-medium text-brand-text dark:text-stone-300 leading-relaxed transition-all', expanded[idx] ? '' : 'line-clamp-2']"
          >
            {{ warning.message }}
          </p>

          <button
            v-if="overflowing[idx]"
            @click="toggle(idx)"
            class="inline-flex items-center gap-1 text-[11px] font-bold text-brand-primary hover:underline cursor-pointer"
          >
            <span>{{ expanded[idx] ? 'Read less' : 'Read more' }}</span>
            <svg :class="['w-3 h-3 transition-transform', expanded[idx] ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Checked, nothing found. A real result, and stated as one. -->
      <div v-else-if="pairState === 'clear'" class="flex items-center gap-3.5 p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/15">
        <div class="w-9 h-9 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary dark:text-brand-primary-accent flex items-center justify-center shrink-0">
          <svg class="w-4.5 h-4.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p class="text-[11px] font-medium text-brand-text-muted dark:text-stone-400 leading-relaxed">
          No interaction was flagged between these two formulas. This covers the pair only &mdash; it says nothing about either one against the rest of your shelf.
        </p>
      </div>

      <!-- Could not be checked. Distinct from the above, and it has to be: an
           empty conflicts list is not on its own evidence of safety, and the
           response carries no verdict field to tell the two apart. Both
           ingredient lists are in it though, and a pairwise check needs both. -->
      <div v-else class="flex items-center gap-3.5 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/25">
        <div class="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-500 flex items-center justify-center shrink-0">
          <svg class="w-4.5 h-4.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p class="text-[11px] font-medium text-brand-text-muted dark:text-stone-400 leading-relaxed">
          These two could not be checked against each other, because at least one has no ingredients on record. This is not a clean result.
        </p>
      </div>
    </div>

    <!-- SECTION 3: Per-Product Concerns.
         Retitled. It was "Contraindications & Concerns Matrix", which is what a
         user looking for the panel above would read - and it has never held
         that. Every entry here comes from `ingredient_concerns`, which records
         what one ingredient is associated with regardless of what it is being
         used alongside. -->
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 p-6 sm:p-8 space-y-4 shadow-xl transition-colors duration-300">
      <div class="text-center space-y-1.5 border-b border-brand-surface-border dark:border-stone-800 pb-3">
        <div class="font-serif font-bold text-sm text-brand-text-muted dark:text-stone-400 tracking-wider uppercase">
          Each Formula On Its Own
        </div>
        <p class="text-[11px] font-medium text-brand-text-muted dark:text-stone-500">
          Concerns recorded against each product's own ingredients, independent of the other.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-brand-surface-border dark:divide-stone-800/60 items-start gap-6 md:gap-0">

        <!-- Left Concerns: Product A -->
        <div class="space-y-3 md:pr-4 w-full">
          <div v-for="(con, i) in formulaBreakdowns.a.concerns" :key="i" class="flex items-start gap-3 bg-semantic-error/5 border border-semantic-error/10 p-3.5 rounded-2xl animate-fade-in">
            <div class="w-7 h-7 rounded-full bg-semantic-error/10 border border-semantic-error/20 flex items-center justify-center text-semantic-error shrink-0 font-mono font-bold text-xs">!</div>
            <div>
              <h5 class="text-xs font-black text-brand-text dark:text-stone-200 uppercase tracking-wide">{{ con.title }}</h5>
              <p class="text-[11px] text-brand-text-muted dark:text-stone-400 mt-0.5 leading-relaxed">{{ con.msg }}</p>
            </div>
          </div>
          <p v-if="!formulaBreakdowns.a.concerns.length" class="text-xs font-medium text-brand-text-muted italic pl-1 py-2">
            No active profile contraindications detected for this formula.
          </p>
        </div>

        <!-- Right Concerns: Product B -->
        <div class="space-y-3 md:pl-6 pt-4 md:pt-0 w-full">
          <div v-for="(con, i) in formulaBreakdowns.b.concerns" :key="i" class="flex items-start gap-3 bg-semantic-error/5 border border-semantic-error/10 p-3.5 rounded-2xl animate-fade-in">
            <div class="w-7 h-7 rounded-full bg-semantic-error/10 border border-semantic-error/20 flex items-center justify-center text-semantic-error shrink-0 font-mono font-bold text-xs">!</div>
            <div>
              <h5 class="text-xs font-black text-brand-text dark:text-stone-200 uppercase tracking-wide">{{ con.title }}</h5>
              <p class="text-[11px] text-brand-text-muted dark:text-stone-400 mt-0.5 leading-relaxed">{{ con.msg }}</p>
            </div>
          </div>
          <p v-if="!formulaBreakdowns.b.concerns.length" class="text-xs font-medium text-brand-text-muted italic pl-1 py-2">
            No active profile contraindications detected for this formula.
          </p>
        </div>

      </div>
    </div>

  </div>
</template>
