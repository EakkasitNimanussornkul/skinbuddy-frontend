<script setup lang="ts">
import { watch } from 'vue'
import { useClampedText } from '../../composables/useClampedText'
import { resolveSeverityBand } from '../../api/safety'

export interface WarningAlert {
  alert_type: string
  severity: string
  message: string
}

const props = defineProps<{
  warnings: WarningAlert[]
  isLoading?: boolean
  // Distinct from `warnings: []`. An empty list means the scan ran and found
  // nothing; this means it never produced a verdict at all.
  scanFailed?: boolean
}>()

// FE-DEF-26: the toggle below used to render for every warning. A one-line
// message such as "Use at night." is not clamped by anything, so its "Read
// more" opened nothing and its "Read less" closed nothing. Whether a message
// overflows two lines depends on the font and the width it is read at, not on
// the message, so it is measured.
const { overflowing, expanded, setElement, toggle, remeasure } = useClampedText()

watch(() => props.warnings, remeasure)

// FE-DEF-25: this badge was a hardcoded rose, so a Low warning was drawn in the
// same alarm red as a High one. The band is shared with the two other
// components that render this field; the palette is this component's own.
const SEVERITY_BADGE: Record<string, string> = {
  high: 'bg-rose-950/80 border-rose-800/60 text-rose-400',
  medium: 'bg-amber-950/80 border-amber-800/60 text-amber-400',
  low: 'bg-stone-800/80 border-stone-600/60 text-stone-300',
  unknown: 'bg-stone-800/80 border-stone-600/60 text-stone-300',
}

const severityBadgeClass = (severity: string | null | undefined) =>
  SEVERITY_BADGE[resolveSeverityBand(severity)] ?? SEVERITY_BADGE.unknown
</script>

<template>
  <div v-if="isLoading" class="p-5 rounded-3xl bg-stone-900/40 border border-brand-primary/20 backdrop-blur-sm shadow-sm relative overflow-hidden">
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

  <!-- Scan Unavailable: must not look like a clean result -->
  <div v-else-if="scanFailed" class="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/30 space-y-2">
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

  <!-- Warning Cards Container -->
  <div v-else-if="warnings && warnings.length > 0" class="space-y-3">
    <div class="flex items-center justify-between">
      <h4 class="text-xs font-bold uppercase tracking-widest text-brand-text-muted">Biochemical Safety & Conflict Warning</h4>
      <span class="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
        {{ warnings.length }} Warning{{ warnings.length > 1 ? 's' : '' }}
      </span>
    </div>

    <div class="space-y-2.5">
      <div
        v-for="(warning, idx) in warnings"
        :key="idx"
        class="p-4 rounded-2xl bg-stone-800/60 dark:bg-stone-900/80 border border-stone-700/60 space-y-2 shadow-sm"
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

        <!-- Alert Message Body -->
        <p
          :ref="(el) => setElement(idx, el)"
          :class="['text-xs sm:text-sm font-medium text-stone-200 leading-relaxed transition-all', expanded[idx] ? '' : 'line-clamp-2']"
        >
          {{ warning.message }}
        </p>

        <!-- Read More Toggle: only when there is more to read (FE-DEF-26) -->
        <button
          v-if="overflowing[idx]"
          @click="toggle(idx)"
          class="inline-flex items-center gap-1 text-[11px] font-bold text-brand-primary hover:underline cursor-pointer pt-0.5"
        >
          <span>{{ expanded[idx] ? 'Read less' : 'Read more' }}</span>
          <svg :class="['w-3 h-3 transition-transform', expanded[idx] ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
