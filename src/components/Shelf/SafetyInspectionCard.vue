<script setup lang="ts">
import { ref } from 'vue'

export interface WarningAlert {
  alert_type: string
  severity: string
  message: string
}

defineProps<{
  warnings: WarningAlert[]
  isLoading?: boolean
}>()

const expandedIndices = ref<Record<number, boolean>>({})

const toggleExpand = (idx: number) => {
  expandedIndices.value[idx] = !expandedIndices.value[idx]
}
</script>

<template>
  <!-- 🌟 ENHANCED ANIMATED ANALYZING STATE 🌟 -->
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
        <!-- Alert Badge Header -->
        <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-800/60 text-[10px] font-black tracking-wider uppercase text-rose-400">
          <span>{{ warning.severity || 'HIGH' }}</span>
          <span>•</span>
          <span>{{ warning.alert_type }}</span>
        </div>

        <!-- Alert Message Body -->
        <p :class="['text-xs sm:text-sm font-medium text-stone-200 leading-relaxed transition-all', expandedIndices[idx] ? '' : 'line-clamp-2']">
          {{ warning.message }}
        </p>

        <!-- Read More Toggle -->
        <button
          @click="toggleExpand(idx)"
          class="inline-flex items-center gap-1 text-[11px] font-bold text-brand-primary hover:underline cursor-pointer pt-0.5"
        >
          <span>{{ expandedIndices[idx] ? 'Read less' : 'Read more' }}</span>
          <svg :class="['w-3 h-3 transition-transform', expandedIndices[idx] ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
