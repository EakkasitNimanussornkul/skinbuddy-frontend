<script setup lang="ts">
/**
 * Why a skin-type alert fired, one entry per trait of the user's Baumann code.
 *
 * A Skin Type Conflict used to say only "X is known to trigger adverse
 * reactions for Baumann Type DSPT" - no reason, no indication of which letter
 * matched. The backend now carries the explanation from ingredient_concerns
 * and the trait that matched. Each entry shows the concern's title and
 * description when there is one, and always the trait as a small label, so an
 * ingredient with no concern written yet still says which part of the user's
 * type it is flagged for.
 *
 * A per-entry grade is shown only when there are two or more entries. With
 * one, the alert's own badge already carries it, because the backend grades
 * the alert by its worst entry.
 */
import { resolveSeverityBand, type SkinTypeReason } from '../../api/safety'
import { readSourceList } from '../../api/sources'
import SourceList from './SourceList.vue'

const props = defineProps<{ reasons: SkinTypeReason[] }>()

const CHIP: Record<string, string> = {
  high: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-800/60 dark:text-rose-400',
  medium: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/60 dark:border-amber-800/60 dark:text-amber-400',
  low: 'bg-stone-100 border-stone-300 text-stone-600 dark:bg-stone-800/80 dark:border-stone-600/60 dark:text-stone-300',
}

const showGrades = () => props.reasons.length > 1
</script>

<template>
  <ul v-if="reasons.length" class="space-y-2">
    <li v-for="(reason, idx) in reasons" :key="idx" class="skin-reason space-y-1">
      <div class="flex flex-wrap items-center gap-1.5">
        <span
          v-if="showGrades() && resolveSeverityBand(reason.severity) !== 'unknown'"
          :class="['reason-grade inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border', CHIP[resolveSeverityBand(reason.severity)]]"
        >
          {{ reason.severity }}
        </span>
        <span v-if="reason.title" class="reason-title text-xs font-bold text-brand-text dark:text-stone-200">
          {{ reason.title }}
        </span>
      </div>
      <p v-if="reason.description" class="reason-description text-xs font-medium text-brand-text-muted dark:text-stone-300 leading-relaxed">
        {{ reason.description }}
      </p>
      <span
        class="reason-trait inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-bg-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700 text-brand-text-muted dark:text-stone-300"
      >
        Flagged for: {{ reason.trait }}
      </span>
      <!-- The sources behind the concern that explains this trait. -->
      <SourceList :entries="readSourceList(reason.sources)" />
    </li>
  </ul>
</template>
