<script setup lang="ts">
/**
 * The ingredient pairs behind one merged conflict card.
 *
 * The backend reports one warning per clashing product, with each ingredient
 * pair - and the rule's explanation of why it clashes - in `details`, most
 * severe first. Before that, one product clashing on eight pairs drew eight
 * near-identical cards. Hosts keep their own card shell and severity badge;
 * this renders what goes inside it: which product, how many pairs, and the pairs
 * themselves, two at a time.
 *
 * `fold: false` is for the Proceed Anyway dialogue, the consent screen, where
 * the owner decided no conflict is ever hidden behind a control. There every
 * pair stays listed.
 */
import { computed, useId } from 'vue'
import { SKIN_TYPE_CONFLICT, groupSimilarDetails, resolveSeverityBand, type ConflictDetail } from '../../api/safety'
import { useStepList } from '../../composables/useStepList'
import ShowMoreControl from './ShowMoreControl.vue'

const props = withDefaults(
  defineProps<{
    details: ConflictDetail[]
    conflictingProduct?: string | null
    fold?: boolean
  }>(),
  { conflictingProduct: null, fold: true },
)

// Pairs that clash for the same reason fold into one line first (eight
// peptides against one acid, one sentence), then the lines are stepped. Details
// arrive most severe first and groupSimilarDetails keeps that order.
const groups = computed(() => groupSimilarDetails(props.details, props.conflictingProduct))
const steps = useStepList(groups, {
  initial: props.fold ? 2 : Number.POSITIVE_INFINITY,
  step: 2,
})
const listId = useId()

const count = computed(() => props.details.length)

// A grouped skin-type card has no other product to name: every pair is this
// formula against the user's own skin type.
const heading = computed(() => {
  if (props.details[0]?.alert_type === SKIN_TYPE_CONFLICT) {
    return `Poorly suited to your skin type · ${count.value} ingredients`
  }
  const lead = props.conflictingProduct ? `With ${props.conflictingProduct} · ` : ''
  return `${lead}${count.value} ingredient clashes`
})

// Light first, dark behind `dark:` - the same banding as the card badges, so a
// pair is coloured by its own severity rather than inheriting the card's.
const CHIP: Record<string, string> = {
  high: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-800/60 dark:text-rose-400',
  medium: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/60 dark:border-amber-800/60 dark:text-amber-400',
  low: 'bg-stone-100 border-stone-300 text-stone-600 dark:bg-stone-800/80 dark:border-stone-600/60 dark:text-stone-300',
}
</script>

<template>
  <div class="space-y-2">
    <p class="text-xs font-bold text-brand-text dark:text-stone-200">{{ heading }}</p>

    <ul :id="listId" class="space-y-1.5">
      <li
        v-for="(detail, idx) in steps.visible.value"
        :key="idx"
        class="conflict-detail pl-3 border-l-2 border-brand-surface-border dark:border-stone-700 space-y-1.5"
      >
        <span
          v-if="resolveSeverityBand(detail.severity) !== 'unknown'"
          :class="['inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border', CHIP[resolveSeverityBand(detail.severity)]]"
        >
          {{ detail.severity }}
        </span>
        <p class="text-xs font-medium text-brand-text-muted dark:text-stone-300 leading-relaxed">
          {{ detail.message }}
        </p>
        <!-- The ingredients a grouped line covers, named individually. -->
        <div v-if="detail.ingredients.length > 1" class="flex flex-wrap gap-1">
          <span
            v-for="name in detail.ingredients"
            :key="name"
            class="ingredient-chip text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-bg-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700 text-brand-text dark:text-stone-300"
          >
            {{ name }}
          </span>
        </div>
      </li>
    </ul>

    <ShowMoreControl
      v-if="fold"
      :next-count="steps.nextCount.value"
      :remaining="steps.remaining.value"
      :can-show-more="steps.canShowMore.value"
      :can-show-less="steps.canShowLess.value"
      noun="clashes"
      singular="clash"
      :controls="listId"
      @more="steps.showMore"
      @less="steps.showLess"
    />
  </div>
</template>
