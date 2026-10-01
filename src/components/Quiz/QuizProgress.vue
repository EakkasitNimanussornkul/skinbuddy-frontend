<script setup lang="ts">
// One bar per part. A finished part is full, a part not reached yet is empty,
// and the part in progress is split into one segment per question it has asked
// so far. An extra (backup) question gets an amber segment only once it is
// asked, so the bar never promises questions that may not come.
//
// Each segment is a track with a fill inside it, so a segment fills from the
// left as it is reached rather than changing colour in place.
import type { PartState, SegmentState } from './axisCopy'
import './quizMotion.css'

defineProps<{
  parts: PartState[]
  /** Segments of the part in progress; ignored for the other parts. */
  segments: SegmentState[]
}>()

const segmentFill: Record<SegmentState, string> = {
  answered: 'w-full bg-brand-primary-strong dark:bg-brand-primary',
  current: 'w-full bg-brand-primary dark:bg-brand-primary-accent',
  todo: 'w-0',
  backup: 'w-full bg-[#E7B04A]',
}
</script>

<template>
  <div class="grid grid-cols-4 gap-1.5" aria-hidden="true" data-testid="quiz-progress">
    <template v-for="(part, i) in parts" :key="i">
      <div
        v-if="part === 'current'"
        class="grid gap-[3px]"
        :style="{ gridTemplateColumns: `repeat(${Math.max(segments.length, 1)}, minmax(0, 1fr))` }"
      >
        <span
          v-for="(segment, j) in segments"
          :key="j"
          class="h-1.5 rounded-full overflow-hidden bg-brand-surface-border dark:bg-stone-700"
          :data-segment="segment"
        >
          <span class="quiz-fill block h-full rounded-full" :class="segmentFill[segment]" />
        </span>
      </div>
      <span
        v-else
        class="h-1.5 rounded-full"
        :class="part === 'done' ? 'bg-brand-primary-strong dark:bg-brand-primary' : 'bg-brand-surface-border dark:bg-stone-700'"
        :data-part="part"
      />
    </template>
  </div>
</template>
