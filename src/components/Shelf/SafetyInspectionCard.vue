<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { useClampedText } from '../../composables/useClampedText'
import { useStepList } from '../../composables/useStepList'
import { groupSkinTypeConflicts, hasConflictDetails, resolveSeverityBand, sortBySeverity, type ConflictDetail, type SafetyStatus, type SkinTypeReason } from '../../api/safety'
import ShowMoreControl from '../Shared/ShowMoreControl.vue'
import ConflictDetailsList from '../Shared/ConflictDetailsList.vue'
import SkinTypeReasons from '../Shared/SkinTypeReasons.vue'

export interface WarningAlert {
  alert_type: string
  severity: string
  message: string
  // One warning per clashing product; its ingredient pairs are in details.
  // Optional - an older response carries neither. See api/safety.ts.
  conflicting_product?: string | null
  details?: ConflictDetail[]
  // On a Skin Type Conflict: why it fired, per trait. See api/safety.ts.
  reasons?: SkinTypeReason[]
}

const props = defineProps<{
  warnings: WarningAlert[]
  isLoading?: boolean
  // The outcome's status, not a boolean for "something went wrong". Both
  // non-verdict statuses are distinct from `warnings: []`, which means the scan
  // ran and found nothing - but they are also distinct from each other, and
  // FE-DEF-29 is that they were being told to the user in the same words. A
  // second boolean alongside the first would have let both be set at once,
  // which is not a state that exists.
  // Null means no check has resolved yet, so neither panel below is shown.
  scanStatus?: SafetyStatus | null
  // Lets the user fold the warnings behind their header, which keeps the count
  // on screen. Starts open. The item details modal passes it for a product in
  // use; an archived product's check is folded one level up, in the modal,
  // and is not run until opened.
  foldable?: boolean
}>()

const folded = ref(false)

const warningsVisible = computed(() => !props.foldable || !folded.value)
const warningRegionId = useId()

// FE-DEF-26: the toggle below used to render for every warning. A one-line
// message such as "Use at night." is not clamped by anything, so its "Read
// more" opened nothing and its "Read less" closed nothing. Whether a message
// overflows two lines depends on the font and the width it is read at, not on
// the message, so it is measured.
const { overflowing, expanded, setElement, toggle, remeasure } = useClampedText()

// Most severe first, two at a time. A product can clash with several items on
// the shelf, and a column of long warnings buried the rest of the details
// modal. Sorting first is what makes folding safe here: the worst warning is
// always among the two on screen, and the header count still states the total.
// The measurement indices stay valid because stepping only appends - an item
// already on screen never changes position.
// Skin-type alerts grouped into one card first (see groupSkinTypeConflicts),
// then the cards sorted. The header counts these cards, not the raw alerts.
const sortedWarnings = computed(() => sortBySeverity(groupSkinTypeConflicts(props.warnings)))
const warningSteps = useStepList(sortedWarnings, { initial: 2, step: 2 })
const warningListId = useId()

watch(() => props.warnings, remeasure)
watch(() => warningSteps.visible.value.length, remeasure)
// A folded paragraph measures as zero lines, so it is measured again on unfold.
watch(warningsVisible, remeasure)

// FE-DEF-25: this badge was a hardcoded rose, so a Low warning was drawn in the
// same alarm red as a High one. The band is shared with the two other
// components that render this field; the palette is this component's own.
const SEVERITY_BADGE: Record<string, string> = {
  // Light first, dark behind `dark:`. These were dark-only, so in light mode
  // each badge was a near-black chip on a pale modal.
  high: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/80 dark:border-rose-800/60 dark:text-rose-400',
  medium: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/80 dark:border-amber-800/60 dark:text-amber-400',
  low: 'bg-stone-100 border-stone-300 text-stone-600 dark:bg-stone-800/80 dark:border-stone-600/60 dark:text-stone-300',
  unknown: 'bg-stone-100 border-stone-300 text-stone-600 dark:bg-stone-800/80 dark:border-stone-600/60 dark:text-stone-300',
}

const severityBadgeClass = (severity: string | null | undefined) =>
  SEVERITY_BADGE[resolveSeverityBand(severity)] ?? SEVERITY_BADGE.unknown
</script>

<template>
  <div v-if="isLoading" class="p-5 rounded-3xl bg-brand-bg-light dark:bg-stone-900/40 border border-brand-primary/20 backdrop-blur-sm shadow-sm relative overflow-hidden">
    <!-- Ambient Pulse Glow Effect -->
    <div class="absolute -inset-x-20 -top-20 h-40 bg-brand-primary/10 rounded-full blur-2xl animate-pulse"></div>

    <div class="flex items-center gap-3.5 relative z-10">
      <div class="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/30 text-brand-primary shrink-0">
        <!-- Radar Scanning Ring -->
        <span class="absolute inline-flex h-full w-full rounded-2xl bg-brand-primary/20 opacity-75 animate-ping"></span>
        <svg class="w-5 h-5 relative z-10 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.603 15.1a2 2 0 01-1.178-1.948V7a2 2 0 011.178-1.948l2.387-.477a6 6 0 013.86.517l.318.158a6 6 0 003.86.517l2.387-.477A2 2 0 0120 6.732v8.696a2 2 0 01-.572 1.414z" />
        </svg>
      </div>

      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-brand-text dark:text-stone-200 tracking-wide">Routine Safety Scan</span>
          <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-primary animate-ping"></span>
        </div>
        <p class="text-[11px] font-medium text-brand-text-muted">Analyzing formula interactions against your active shelf...</p>
      </div>
    </div>
  </div>

  <!-- Scan Unavailable: the check did not run. Must not look like a clean
       result, and says the one thing that is worth doing about it. -->
  <div v-else-if="scanStatus === 'unavailable'" class="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/30 space-y-2">
    <div class="flex items-center gap-3.5">
      <div class="flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 shrink-0">
        <svg class="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div class="space-y-1">
        <span class="text-xs font-bold text-brand-text dark:text-stone-200 tracking-wide block">Safety Scan Unavailable</span>
        <p class="text-[11px] font-medium text-brand-text-muted">
          We couldn't complete the compatibility check, so this product has not been assessed. This is not a clean result.
        </p>
      </div>
    </div>
  </div>

  <!-- Not Assessed: the check ran and returned no verdict for this product.
       Also not a clean result, but nothing the user can do will change it, so
       it does not borrow the sentence above and ask them to wait and retry
       (FE-DEF-29). It says what is known and stops there - the cause sits in the
       catalogue, and this component has not been told what it is. -->
  <div v-else-if="scanStatus === 'unassessed'" class="p-5 rounded-3xl bg-stone-500/5 border border-stone-500/30 space-y-2">
    <div class="flex items-center gap-3.5">
      <div class="flex items-center justify-center w-10 h-10 rounded-2xl bg-stone-500/10 border border-stone-500/30 text-brand-text-muted shrink-0">
        <svg class="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="space-y-1">
        <span class="text-xs font-bold text-brand-text dark:text-stone-200 tracking-wide block">Not Assessed</span>
        <p class="text-[11px] font-medium text-brand-text-muted">
          The compatibility check ran but returned no verdict for this product, so it has not been assessed against your shelf. This is not a clean result.
        </p>
      </div>
    </div>
  </div>

  <!-- Warning Cards Container -->
  <div v-else-if="warnings && warnings.length > 0" class="space-y-3">
    <!-- When foldable, the button sits inside the h4 and spans the row, the
         same arrangement as KeyActivesGrid: a heading is not valid content for
         a button, and the count stays visible while the warnings are folded. -->
    <h4 class="text-xs font-bold uppercase tracking-widest text-brand-text-muted">
      <component
        :is="foldable ? 'button' : 'div'"
        :type="foldable ? 'button' : undefined"
        :aria-expanded="foldable ? warningsVisible : undefined"
        :aria-controls="foldable ? warningRegionId : undefined"
        class="warning-fold flex items-center justify-between gap-3 w-full text-left uppercase tracking-widest"
        :class="foldable ? 'cursor-pointer group' : ''"
        @click="foldable && (folded = !folded)"
      >
        <span>Biochemical Safety & Conflict Warning</span>
        <span class="flex items-center gap-2 normal-case tracking-normal shrink-0">
          <span class="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            {{ sortedWarnings.length }} Warning{{ sortedWarnings.length > 1 ? 's' : '' }}
          </span>
          <span v-if="foldable" class="flex items-center gap-1 text-[11px] font-bold text-brand-primary group-hover:underline">
            {{ folded ? 'Show' : 'Hide' }}
            <svg
              :class="['w-3.5 h-3.5 stroke-[2.5] transition-transform duration-200', folded ? '' : 'rotate-180']"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </span>
      </component>
    </h4>

    <div v-show="warningsVisible" :id="warningRegionId" class="space-y-3">
      <div :id="warningListId" class="space-y-2.5">
        <div
          v-for="(warning, idx) in warningSteps.visible.value"
          :key="idx"
          class="p-4 rounded-2xl bg-brand-bg-light dark:bg-stone-900/80 border border-brand-surface-border dark:border-stone-700/60 space-y-2 shadow-sm"
        >
          <!-- Alert Badge Header. The severity is omitted rather than defaulted
               when the backend did not send one - `severity || 'HIGH'` printed a
               value nobody computed, and printed the most alarming one. -->
          <div
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black tracking-wider uppercase"
            :class="severityBadgeClass(warning.severity)"
          >
            <template v-if="resolveSeverityBand(warning.severity) !== 'unknown'">
              <span>{{ warning.severity }}</span>
              <span>•</span>
            </template>
            <span>{{ warning.alert_type }}</span>
          </div>

          <!-- A product clashing on two or more ingredient pairs: list the pairs,
               each with its own explanation, rather than the one-line summary. -->
          <ConflictDetailsList
            v-if="hasConflictDetails(warning)"
            :details="warning.details!"
            :conflicting-product="warning.conflicting_product"
          />

          <!-- Alert Message Body -->
          <p
            v-else
            :ref="(el) => setElement(idx, el)"
            :class="['text-xs sm:text-sm font-medium text-brand-text dark:text-stone-200 leading-relaxed transition-all', expanded[idx] ? '' : 'line-clamp-2']"
          >
            {{ warning.message }}
          </p>

          <!-- Read More Toggle: only when there is more to read (FE-DEF-26) -->
          <button
            v-if="!hasConflictDetails(warning) && overflowing[idx]"
            @click="toggle(idx)"
            class="inline-flex items-center gap-1 text-[11px] font-bold text-brand-primary hover:underline cursor-pointer pt-0.5"
          >
            <span>{{ expanded[idx] ? 'Read less' : 'Read more' }}</span>
            <svg :class="['w-3 h-3 transition-transform', expanded[idx] ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <SkinTypeReasons v-if="!hasConflictDetails(warning) && warning.reasons?.length" :reasons="warning.reasons" />
        </div>
      </div>

      <ShowMoreControl
        :next-count="warningSteps.nextCount.value"
        :remaining="warningSteps.remaining.value"
        :can-show-more="warningSteps.canShowMore.value"
        :can-show-less="warningSteps.canShowLess.value"
        noun="conflicts"
        :controls="warningListId"
        @more="warningSteps.showMore"
        @less="warningSteps.showLess"
      />
    </div>
  </div>

  <!-- Cleared: the check ran, returned a verdict, and the verdict was a pass.
       This branch did not exist. The card had one for the check not running,
       one for it returning no verdict, and one for it finding conflicts - and
       nothing at all for the outcome the user is most likely to get, so a clean
       scan rendered an empty element. The scanning panel simply vanished, which
       reads as the check having been abandoned rather than having passed, and
       is the one result the three failure panels are worded to be distinguished
       from.

       Deliberately last, after the warnings branch. `cleared` and a non-empty
       warnings list cannot both come out of evaluateSafety, but these are props
       and a caller could set them, and a panel that says "no conflicts" must
       never be what hides a conflict that was reported. Ordering it behind the
       warnings makes that impossible rather than merely unlikely - the same
       reason resolvePairConflictState tests its conflicts before its ingredient
       counts.

       The wording is scoped to what analyze() actually established: no
       interaction against the active shelf. It does not say the product is safe
       for the user. The backend also runs a Baumann skin-type check, but only
       `if user_skin_type` - a profile with no type saved skips it silently and
       still returns is_safe: true - so a sentence naming that check would be
       false for exactly the users least equipped to notice. Claiming general
       safety would be worse still: nothing here knows about allergies,
       concentration or frequency. FE-DEF-03 and FE-DEF-29 are both this same
       mistake in the other direction. -->
  <div v-else-if="scanStatus === 'cleared'" class="p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/30 space-y-2">
    <div class="flex items-center gap-3.5">
      <div class="flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 shrink-0">
        <svg class="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="space-y-1">
        <span class="text-xs font-bold text-brand-text dark:text-stone-200 tracking-wide block">No Conflicts Found</span>
        <p class="text-[11px] font-medium text-brand-text-muted">
          We checked this formula against the products active on your shelf and found no interactions to flag.
        </p>
      </div>
    </div>
  </div>
</template>
