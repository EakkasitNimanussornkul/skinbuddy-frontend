<script setup lang="ts">
import { computed } from 'vue'
import {
  describeDuplicateOverlap,
  resolveSeverityBand,
  type DuplicateMatch,
  type SafetyStatus,
} from '../../api/safety'

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    product: any
    isLoading: boolean
    warnings: Array<{ alert_type: string; severity: string; message: string }>
    hasChecked: boolean
    // The outcome's own status. Without it, an empty warnings array from a
    // failed request rendered as a pass. It is the whole status rather than a
    // "it failed" boolean because the two statuses that produce no verdict need
    // different words on screen - FE-DEF-29 - and because reading it directly
    // is what keeps `isSafe` below from being re-derived from a list length.
    // Null until a check resolves.
    scanStatus?: SafetyStatus | null
    // Shelf products with substantially overlapping actives. The caller has
    // already run showsDuplicates() over these, so an empty list here means the
    // check ran and found nothing - never that it failed. Do not add a second
    // failure branch on this length; that is what FE-DEF-03 was.
    duplicates?: DuplicateMatch[]
  }>(),
  { scanStatus: null, duplicates: () => [] },
)

const emit = defineEmits(['close'])

// FE-DEF-25: the severity line was `high ? error : warning`, so Low and Medium
// were the same amber. The band is shared with the two other components that
// render this field; these colours are this component's own.
const SEVERITY_TEXT: Record<string, string> = {
  high: 'text-semantic-error',
  medium: 'text-semantic-warning',
  low: 'text-brand-primary',
  unknown: 'text-brand-text-muted',
}

const skinConflicts = computed(() => props.warnings.filter(w => w.alert_type === 'Skin Type Conflict'))
const chemicalConflicts = computed(() => props.warnings.filter(w => w.alert_type === 'Chemical Interaction Warning' || w.alert_type === 'Active Routine Clash'))
// Reads the verdict rather than reconstructing it from an empty list. `cleared`
// is the only status the backend affirms, so this cannot drift back toward
// "no warnings, therefore safe" - the reading FE-DEF-03 recorded.
const isSafe = computed(() => props.hasChecked && props.scanStatus === 'cleared')
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[130] flex items-center justify-center bg-stone-900/60 backdrop-blur-md p-4 animate-fade-in" @click.self="emit('close')">
      <div class="bg-brand-surface-light dark:bg-brand-surface-dark w-full max-w-md rounded-[2.5rem] shadow-2xl border border-brand-surface-border dark:border-stone-800 p-6 flex flex-col space-y-5 animate-scale-in transition-colors duration-300">

        <!-- Header -->
        <div class="flex items-center justify-between border-b border-brand-surface-border dark:border-stone-800 pb-3">
          <div class="flex items-center gap-2">
            <span v-if="hasChecked" class="w-2.5 h-2.5 rounded-full" :class="isSafe ? 'bg-brand-primary' : 'bg-semantic-error'"></span>
            <h3 class="text-xs font-bold uppercase tracking-widest text-brand-text-muted">Safety Gateway</h3>
          </div>
          <button @click="emit('close')" class="text-xs font-bold text-brand-text-muted hover:text-brand-primary dark:hover:text-brand-primary-accent transition-colors cursor-pointer focus:outline-none">
            Dismiss
          </button>
        </div>

        <!-- Content Area -->
        <div class="space-y-4 overflow-y-auto max-h-[60vh] pr-1 hide-scrollbar">

          <!-- Loading Tracker -->
          <div v-if="isLoading" class="text-center py-10 space-y-3 animate-pulse">
            <div class="w-10 h-10 border-4 border-brand-surface-border dark:border-stone-700 border-t-brand-primary rounded-full animate-spin mx-auto"></div>
            <p class="text-xs font-bold uppercase tracking-widest text-brand-primary dark:text-brand-primary-accent">Running Compatibility Evaluation...</p>
          </div>

          <template v-else-if="hasChecked">
            <!-- Case 0: the evaluation did not run. Reported before the clean
                 and conflict cases, because neither of those is known.

                 A null status is folded in here rather than given a branch of
                 its own: reaching this template means hasChecked is set, so a
                 modal that has checked and holds no status has no verdict, and
                 that is what this panel says. Failing into the panel that
                 claims least is the same choice blocksAction makes. -->
            <div v-if="scanStatus === 'unavailable' || scanStatus == null" class="text-center py-6 space-y-3">
              <div class="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
                <svg class="w-7 h-7 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h4 class="text-base font-serif font-bold text-brand-text dark:text-white">Evaluation Unavailable</h4>
              <p class="text-xs text-brand-text-muted max-w-xs mx-auto leading-relaxed">
                We couldn't reach the compatibility engine, so this formula has not been evaluated against your shelf. Please try again shortly.
              </p>
            </div>

            <!-- Case 0b: the evaluation ran and returned no verdict for this
                 product. Every bit as much "not cleared" as the panel above,
                 and separated from it only because the advice differs: there is
                 nothing to come back and retry, so it does not say there is
                 (FE-DEF-29). It also does not name a cause - the reason sits in
                 the catalogue and this screen has not been told it. -->
            <div v-else-if="scanStatus === 'unassessed'" class="text-center py-6 space-y-3">
              <div class="w-14 h-14 bg-stone-500/10 text-brand-text-muted rounded-full flex items-center justify-center mx-auto border border-stone-500/30">
                <svg class="w-7 h-7 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 class="text-base font-serif font-bold text-brand-text dark:text-white">Not Assessed</h4>
              <p class="text-xs text-brand-text-muted max-w-xs mx-auto leading-relaxed">
                The compatibility check ran but returned no verdict for this formula, so it has not been evaluated against your shelf.
              </p>
            </div>

            <!-- Case A: Clean Record, completely safe formulation -->
            <div v-else-if="isSafe" class="text-center py-6 space-y-3">
              <div class="w-14 h-14 bg-brand-primary-light/40 dark:bg-brand-primary/10 text-brand-primary dark:text-brand-primary-accent rounded-full flex items-center justify-center mx-auto border border-brand-primary/20 shadow-xs">
                <svg class="w-7 h-7 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div class="space-y-1 px-2">
                <h4 class="text-lg font-serif font-bold text-brand-text dark:text-white">No Conflict Detected</h4>
                <p class="text-xs text-brand-text-muted dark:text-stone-300 leading-relaxed">
                  No active compound interactions or skin vulnerabilities were flagged against your profile. This product is clear for your active routine wear.
                </p>
              </div>
            </div>

            <!-- Case B: Risks Found -->
            <div v-else class="space-y-4">
              <div class="flex items-center gap-3 bg-semantic-error/5 dark:bg-semantic-error/10 border border-semantic-error/20 rounded-2xl p-4 transition-colors">
                <svg class="w-5 h-5 text-semantic-error shrink-0 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 class="text-xs font-bold text-brand-text dark:text-stone-100">Interaction Risks Found</h4>
                  <p class="text-[11px] text-brand-text-muted dark:text-stone-400 mt-0.5">Review the clashing items logged in your system below.</p>
                </div>
              </div>

              <!-- Pass 1 & Pass 2 Chemistry Errors -->
              <div v-if="chemicalConflicts.length" class="space-y-2">
                <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-semantic-error/10 text-semantic-error rounded-md border border-semantic-error/20">Chemical Interaction Risks</span>
                <div v-for="(warn, i) in chemicalConflicts" :key="i" class="text-xs font-medium leading-relaxed text-brand-text dark:text-stone-300 bg-brand-bg-light dark:bg-stone-900/60 p-3.5 rounded-xl border border-brand-surface-border dark:border-stone-800/80 flex flex-col gap-1">
                  <!-- FE-DEF-25: was a two-way test that drew Low in the same
                       amber as Medium. Banded by the shared rule now; the
                       colours stay this component's own. -->
                  <span
                    v-if="resolveSeverityBand(warn.severity) !== 'unknown'"
                    class="text-[10px] font-bold tracking-wide"
                    :class="SEVERITY_TEXT[resolveSeverityBand(warn.severity)]"
                  >
                    Severity: {{ warn.severity }}
                  </span>
                  <p>{{ warn.message }}</p>
                </div>
              </div>

              <!-- Pass 3 Skin Type Warnings -->
              <div v-if="skinConflicts.length" class="space-y-2">
                <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-semantic-warning/10 text-semantic-warning rounded-md border border-semantic-warning/20">Skin Type Contraindications</span>
                <div v-for="(warn, i) in skinConflicts" :key="i" class="text-xs font-medium leading-relaxed text-brand-text dark:text-stone-300 bg-brand-bg-light dark:bg-stone-900/60 p-3.5 rounded-xl border border-brand-surface-border dark:border-stone-800/80 flex flex-col gap-1">
                  <span class="text-[10px] font-bold text-semantic-warning tracking-wide">Severity: High &bull; Skin Type Conflict</span>
                  <p>{{ warn.message }}</p>
                </div>
              </div>
            </div>

            <!-- Shelf overlap. Deliberately outside the clear/conflict chain
                 above: it is advisory, it appears alongside either verdict, and
                 it must never change one. Neutral styling for the same reason -
                 no red, no alert icon, no severity. -->
            <div
              v-if="duplicates.length"
              class="bg-brand-bg-light dark:bg-stone-900/60 border border-brand-surface-border dark:border-stone-800 rounded-2xl p-4 space-y-3"
            >
              <div class="flex items-center gap-2.5">
                <svg class="w-4 h-4 text-brand-text-muted shrink-0 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 7l8-4 8 4-8 4-8-4z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 12l8 4 8-4M4 17l8 4 8-4" />
                </svg>
                <div>
                  <h4 class="text-xs font-bold text-brand-text dark:text-stone-100">You already own something similar</h4>
                  <p class="text-[11px] text-brand-text-muted dark:text-stone-400 mt-0.5">Not a conflict &mdash; just so you know before buying again.</p>
                </div>
              </div>

              <div
                v-for="dupe in duplicates"
                :key="dupe.product_id"
                class="bg-brand-surface-light dark:bg-stone-900 rounded-xl border border-brand-surface-border dark:border-stone-800/80 p-3.5 space-y-1"
              >
                <!-- Both brand and slug are nullable server-side, so neither the
                     prefix nor the link can be assumed. -->
                <component
                  :is="dupe.slug ? 'router-link' : 'span'"
                  :to="dupe.slug ? `/product/${dupe.slug}` : undefined"
                  class="text-xs font-bold text-brand-text dark:text-stone-100 block"
                  :class="dupe.slug ? 'hover:text-brand-primary dark:hover:text-brand-primary-accent transition-colors cursor-pointer' : ''"
                >
                  <span v-if="dupe.brand" class="text-brand-text-muted font-medium">{{ dupe.brand }}&nbsp;</span>{{ dupe.name }}
                </component>
                <p class="text-[11px] text-brand-text-muted dark:text-stone-400 leading-relaxed">
                  {{ describeDuplicateOverlap(dupe) }}
                </p>
              </div>
            </div>
          </template>

        </div>

        <!-- Footer Control Button -->
        <button
          @click="emit('close')"
          class="w-full py-3 bg-brand-bg-light dark:bg-stone-800 hover:bg-brand-surface-border dark:hover:bg-stone-700 text-brand-text dark:text-stone-200 hover:text-brand-text dark:hover:text-white font-bold text-xs rounded-xl border border-brand-surface-border dark:border-stone-700 transition-all cursor-pointer focus:outline-none shadow-2xs active:scale-[0.99]"
        >
          Close Safety Report
        </button>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
.animate-fade-in { animation: fadeIn 0.15s ease-out forwards; }
.animate-scale-in { animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
</style>
