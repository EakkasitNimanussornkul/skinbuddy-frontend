<script setup lang="ts">
import { computed } from 'vue'

/**
 * The strip at the end of the Explore grid: how far through the list you are, and
 * one button for what comes next. Four states of the same strip (feat/30):
 *
 *   ready    "Showing 12 of 34 products", a bar, and "Show 12 more"
 *   loading  "Loading products 13 to 24", the button busy, placeholder cards below
 *   failed   an alert; the products already shown stay, and "Try again" asks for
 *            the same page
 *   done     "That is all 34 products", a full bar, and "Back to top" (with
 *            "Clear filters" too when filters are on)
 *
 * It owns no data: the page says the state and the counts, and hears back through
 * the three events.
 *
 * One button serves every state, so the focus stays on it from "Show 12 more"
 * through "Loading" to the next "Show 12 more". While busy it is aria-disabled
 * rather than disabled, because a disabled button drops the focus.
 */
const props = defineProps<{
  status: 'ready' | 'loading' | 'failed' | 'done'
  /** Products on the page now. */
  shown: number
  /** Products the server has for this search and these filters. */
  total: number
  /** How many one press adds. */
  pageSize: number
  /** A search term or filter is on: the end reads "all N matching products". */
  matching?: boolean
  /** A filter the page can clear is on: the end offers "Clear filters". */
  clearable?: boolean
}>()

const emit = defineEmits<{
  (e: 'load-more'): void
  (e: 'retry'): void
  (e: 'clear-filters'): void
}>()

const next = computed(() => Math.max(0, Math.min(props.pageSize, props.total - props.shown)))
const percent = computed(() => (props.total > 0 ? Math.min(100, Math.round((props.shown / props.total) * 100)) : 0))
const noun = computed(() => (props.total === 1 ? 'product' : 'products'))

const moreLabel = computed(() => (next.value < props.pageSize ? `Show the last ${next.value}` : `Show ${next.value} more`))
const loadingText = computed(() => `Loading products ${props.shown + 1} to ${props.shown + next.value}`)
const doneText = computed(() => `That is all ${props.total} ${props.matching ? 'matching ' : ''}${noun.value}`)

const backToTop = () => {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
}

const press = () => {
  if (props.status === 'ready') emit('load-more')
  else if (props.status === 'failed') emit('retry')
  else if (props.status === 'done') backToTop()
}

const BUTTON_BASE = 'strip-button min-h-[52px] sm:min-h-12 w-full sm:w-auto px-6 rounded-2xl sm:rounded-[14px] text-base sm:text-[15px] font-extrabold inline-flex items-center justify-center gap-2.5 transition-colors motion-reduce:transition-none'
const BUTTON_LOOK: Record<typeof props.status, string> = {
  ready: 'bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white dark:bg-brand-primary dark:hover:bg-brand-primary-hover dark:text-stone-900',
  loading: 'bg-brand-surface-border dark:bg-stone-600 text-stone-700 dark:text-stone-200 cursor-default',
  failed: 'border-2 border-red-800 dark:border-red-300 bg-transparent text-red-800 dark:text-red-300',
  done: 'border border-brand-surface-border dark:border-stone-600 bg-brand-bg-light dark:bg-stone-800 text-stone-800 dark:text-stone-100',
}
</script>

<template>
  <div class="load-more">
    <div
      role="group"
      :aria-label="status === 'done' ? 'End of list' : 'More products'"
      :aria-busy="status === 'loading' ? 'true' : undefined"
      :class="[
        'strip flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6 p-4 sm:px-[22px] sm:py-[18px] rounded-[22px] border',
        status === 'failed'
          ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
          : 'bg-brand-surface-light dark:bg-brand-surface-dark border-brand-surface-border dark:border-stone-800',
      ]"
    >
      <div v-if="status === 'failed'" role="alert" class="strip-alert min-w-0 flex-1 flex items-start gap-2.5 text-red-800 dark:text-red-200">
        <svg class="w-[22px] h-[22px] shrink-0 mt-px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5h.01" /></svg>
        <div class="flex flex-col gap-0.5">
          <span class="text-[15px] font-extrabold">Could not load the next products.</span>
          <span class="text-sm leading-snug">Your first {{ shown }} are still here. Check your connection and try again.</span>
        </div>
      </div>

      <div v-else class="min-w-0 flex-1 flex flex-col gap-3 sm:gap-2.5">
        <div class="flex items-baseline justify-between gap-3">
          <span class="strip-text inline-flex items-center gap-2 text-[15px] font-extrabold text-brand-text dark:text-stone-100" aria-live="polite">
            <svg v-if="status === 'done'" class="w-[18px] h-[18px] shrink-0 text-brand-primary-strong dark:text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            <template v-if="status === 'done'">{{ doneText }}</template>
            <template v-else-if="status === 'loading'">{{ loadingText }}</template>
            <template v-else>Showing {{ shown }} of {{ total }}<span class="hidden sm:inline">{{ ' ' + noun }}</span></template>
          </span>
          <span class="strip-percent sm:hidden text-[13px] font-bold text-stone-600 dark:text-stone-300" aria-hidden="true">{{ percent }}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="Products shown"
          aria-valuemin="0"
          :aria-valuemax="total"
          :aria-valuenow="shown"
          class="h-1.5 rounded-full bg-brand-surface-border dark:bg-stone-600 overflow-hidden"
        >
          <div
            :class="['strip-fill h-full rounded-full bg-brand-primary-strong dark:bg-brand-primary', status === 'loading' ? 'motion-safe:animate-pulse' : '']"
            :style="{ width: `${percent}%` }"
          ></div>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-2 sm:shrink-0">
        <button
          type="button"
          :class="[BUTTON_BASE, BUTTON_LOOK[status]]"
          :aria-disabled="status === 'loading' ? 'true' : undefined"
          @click="press"
        >
          <svg v-if="status === 'loading'" class="w-4 h-4 motion-safe:animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9" /></svg>
          <svg v-else-if="status === 'done'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
          <template v-if="status === 'loading'">Loading</template>
          <template v-else-if="status === 'failed'">Try again</template>
          <template v-else-if="status === 'done'">Back to top</template>
          <template v-else>{{ moreLabel }}</template>
          <svg v-if="status === 'ready'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <button
          v-if="status === 'done' && clearable"
          type="button"
          class="clear-filters-button min-h-[52px] sm:min-h-12 w-full sm:w-auto px-5 rounded-2xl sm:rounded-[14px] text-base sm:text-[15px] font-extrabold text-brand-primary-strong dark:text-brand-primary hover:underline"
          @click="emit('clear-filters')"
        >
          Clear filters
        </button>
      </div>
    </div>

    <!-- The next page's place, under the strip, so the real cards do not push
         anything when they land. Two across from xl, as the grid is; one below. -->
    <div v-if="status === 'loading'" class="load-more-skeleton mt-5 grid grid-cols-1 xl:grid-cols-2 gap-5" aria-hidden="true">
      <div
        v-for="n in 2"
        :key="n"
        :class="[
          'skeleton-card bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2rem] border border-brand-surface-border dark:border-stone-800 shadow-sm flex-col sm:flex-row gap-5 p-5 motion-safe:animate-pulse',
          n === 2 ? 'hidden xl:flex' : 'flex',
        ]"
      >
        <div class="w-full sm:w-44 md:w-48 aspect-[4/3] sm:aspect-square bg-brand-bg-light dark:bg-stone-900 rounded-2xl shrink-0"></div>
        <div class="flex-1 flex flex-col justify-center gap-3 py-1">
          <div class="h-2.5 w-20 bg-brand-bg-light dark:bg-stone-900 rounded-full"></div>
          <div class="h-4 w-4/5 bg-brand-bg-light dark:bg-stone-900 rounded-full"></div>
          <div class="h-3 w-1/4 bg-brand-bg-light dark:bg-stone-900 rounded-full"></div>
        </div>
      </div>
    </div>
  </div>
</template>
