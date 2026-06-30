<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  item: any
  usageLifespan: number | null
}>()

const activeOutcome = computed(() => props.item.archive_outcome || 'empty')
const activeNotes = computed(() => props.item.archive_notes || '')

const archiveOutcomeDetails = computed(() => {
  const details = {
    empty: { label: 'Finished Product', color: 'text-green-600 dark:text-green-400', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    discarded: { label: 'Abandoned / Discarded', color: 'text-amber-600 dark:text-amber-400', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
    expired: { label: 'Expired Inventory', color: 'text-red-600 dark:text-red-400', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
  }
  return details[activeOutcome.value as 'empty' | 'discarded' | 'expired'] || details.empty
})
</script>

<template>
  <div class="mb-6 bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800/80 p-4 rounded-2xl flex flex-col gap-3">
    <h4 class="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 px-0.5">Historical Log Summary</h4>
    <div class="grid grid-cols-2 gap-2.5">
      <div class="p-3 bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-xl flex flex-col justify-center">
        <span class="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider">Outcome</span>
        <div class="flex items-center gap-1.5 mt-1" :class="archiveOutcomeDetails.color">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" :d="archiveOutcomeDetails.icon" /></svg>
          <span class="text-xs font-bold leading-tight">{{ archiveOutcomeDetails.label.split(' ')[0] }}</span>
        </div>
      </div>
      <div class="p-3 bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-xl flex flex-col justify-center">
        <span class="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider">Total Lifespan</span>
        <span class="text-sm font-mono font-bold text-brand-primary dark:text-orange-400 mt-0.5">{{ usageLifespan !== null ? `${usageLifespan} Days` : 'Not Opened' }}</span>
      </div>
    </div>
    <div v-if="activeNotes" class="p-3 bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-xl">
      <span class="block text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider mb-1">Skin Diary Note</span>
      <p class="text-xs text-brand-text dark:text-stone-300 italic leading-relaxed">"{{ activeNotes }}"</p>
    </div>
  </div>
</template>
