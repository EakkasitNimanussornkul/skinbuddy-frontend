<script setup lang="ts">
import { computed } from 'vue'
import './quizMotion.css'

// A bar from the low letter to the high letter, filled from the middle towards
// where the answers lean. Visual only: the lean is always stated in words next
// to it ("Leaning oily"), so the bar itself is hidden from screen readers.
// The fill and the marker slide out from the centre as the bar appears.
const props = withDefaults(
  defineProps<{
    /** Average of counted answers on the 1-4 scale, or null when none counted. */
    average: number | null
    closeCall: boolean
    lowLabel: string
    highLabel: string
    /** Large shows the labels above and a marker; compact shows labels below. */
    size?: 'large' | 'compact'
    /** Holds the slide from the centre back this long, to follow a card's own entrance. */
    delayMs?: number
    /**
     * Show the large marker at the centre with no average, for a part whose
     * letter was the user's own pick: nothing counted, so nothing leans.
     */
    markCentre?: boolean
  }>(),
  { delayMs: 0, markCentre: false },
)

const showMarker = computed(() => props.size === 'large' && (props.average !== null || props.markCentre))

// 1 is the far low end, 4 the far high end.
const position = computed(() => {
  if (props.average === null) return 50
  return Math.min(100, Math.max(0, ((props.average - 1) / 3) * 100))
})

const leansHigh = computed(() => position.value >= 50)

const fillStyle = computed(() => ({
  left: `${Math.min(position.value, 50)}%`,
  width: `${Math.abs(position.value - 50)}%`,
  animationDelay: `${props.delayMs}ms`,
}))
</script>

<template>
  <div aria-hidden="true" data-testid="lean-bar" :data-position="Math.round(position)">
    <div
      v-if="size === 'large'"
      class="flex justify-between text-xs font-extrabold uppercase tracking-[0.08em]"
    >
      <span :class="!leansHigh && average !== null ? 'text-brand-primary-strong-hover dark:text-brand-primary' : 'text-stone-500 dark:text-stone-400'">{{ lowLabel }}</span>
      <span :class="leansHigh && average !== null ? 'text-brand-primary-strong-hover dark:text-brand-primary' : 'text-stone-500 dark:text-stone-400'">{{ highLabel }}</span>
    </div>

    <div
      class="relative rounded-full bg-stone-200/70 dark:bg-stone-700"
      :class="size === 'large' ? 'h-2.5 mt-2.5' : 'h-2 mt-2.5'"
    >
      <span class="absolute left-1/2 -top-1 w-0.5 -translate-x-1/2 bg-stone-300 dark:bg-stone-500" :class="size === 'large' ? 'h-[18px]' : 'h-3.5'" />
      <span
        v-if="average !== null"
        class="quiz-lean-fill absolute top-0 h-full"
        :class="[
          closeCall ? 'bg-[#E7B04A]' : 'bg-brand-primary',
          leansHigh ? 'rounded-r-full' : 'rounded-l-full',
        ]"
        :style="fillStyle"
      />
      <span
        v-if="showMarker"
        class="quiz-lean-marker absolute top-1/2 w-5 h-5 rounded-full bg-white dark:bg-brand-surface-dark border-[3px] border-brand-primary-strong dark:border-brand-primary -translate-x-1/2 -translate-y-1/2"
        :style="{ left: `${position}%`, animationDelay: `${delayMs}ms` }"
      />
    </div>

    <div
      v-if="size !== 'large'"
      class="flex justify-between mt-1.5 text-[11px] font-bold text-stone-500 dark:text-stone-400"
    >
      <span>{{ lowLabel }}</span>
      <span>{{ highLabel }}</span>
    </div>
  </div>
</template>
