<script setup lang="ts">
import { ref, useId } from 'vue'
import ItemBadge from './ItemBadge.vue'

// What each badge on a shelf card means, drawn with the cards' own ItemBadge so
// the guide cannot show a colour the cards do not use. Folded by default: the
// shelf is visited often, and a returning user does not need the key each time.
const isOpen = ref(false)
const regionId = useId()

type BadgeType = 'warning' | 'error' | 'unopened' | 'archived' | 'good'

const BADGES: ReadonlyArray<{ type: BadgeType; text: string; name: string; meaning: string }> = [
  {
    type: 'error',
    text: 'Expired',
    name: 'Expired',
    meaning: 'Past its expiry date. Time to replace it.',
  },
  {
    type: 'warning',
    text: 'In 12 days',
    name: 'Expiring soon',
    meaning: 'Expires within 30 days. The badge counts the days left.',
  },
  {
    type: 'good',
    text: 'In 90 days',
    name: 'Active',
    meaning: 'Opened and in use. Shows the days left, or "Active" when no expiry date is set.',
  },
  {
    type: 'unopened',
    text: 'Unopened',
    name: 'Unopened',
    meaning: 'Not opened yet, so its countdown has not started. Open the product and press "Start Product Life" when you open it.',
  },
  {
    type: 'archived',
    text: 'Archived',
    name: 'Archived',
    meaning: 'Finished or thrown away. Hidden from "All" - pick the Archived filter to see these.',
  },
]
</script>

<template>
  <div class="rounded-2xl border border-brand-surface-border dark:border-stone-800 bg-brand-surface-light dark:bg-brand-surface-dark">
    <h2 class="text-xs font-bold text-brand-text dark:text-stone-200">
      <button
        type="button"
        class="status-guide-toggle flex items-center justify-between gap-3 w-full text-left px-4 py-3 cursor-pointer group"
        :aria-expanded="isOpen"
        :aria-controls="regionId"
        @click="isOpen = !isOpen"
      >
        <span class="flex items-center gap-2">
          <svg class="w-4 h-4 text-brand-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          What do the badges mean?
        </span>
        <span class="flex items-center gap-1 text-[11px] font-bold text-brand-primary group-hover:underline">
          {{ isOpen ? 'Hide' : 'Show' }}
          <svg
            :class="['w-3.5 h-3.5 stroke-[2.5] transition-transform duration-200', isOpen ? 'rotate-180' : '']"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
    </h2>

    <div v-show="isOpen" :id="regionId" class="px-4 pb-4 space-y-3">
      <ul class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        <li v-for="badge in BADGES" :key="badge.name" class="status-guide-entry flex items-start gap-3">
          <ItemBadge :type="badge.type" :text="badge.text" class="shrink-0 mt-0.5" />
          <p class="text-[11px] text-brand-text-muted dark:text-stone-400 leading-relaxed">
            <span class="font-bold text-brand-text dark:text-stone-200">{{ badge.name }}.</span>
            {{ badge.meaning }}
          </p>
        </li>

        <!-- Not a badge: a separate marker under the date line, because it
             answers a different question from the lifecycle badge. -->
        <li class="status-guide-entry flex items-start gap-3">
          <span class="flex items-center gap-1 text-[10px] font-bold text-brand-primary shrink-0 mt-0.5">
            <svg class="w-3.5 h-3.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            In Routine
          </span>
          <p class="text-[11px] text-brand-text-muted dark:text-stone-400 leading-relaxed">
            <span class="font-bold text-brand-text dark:text-stone-200">In Routine.</span>
            A step in your current routine uses it. Shown beside the badge, so an unopened product can be in your routine too.
          </p>
        </li>
      </ul>

      <p class="status-guide-order text-[11px] text-brand-text-muted dark:text-stone-400 leading-relaxed border-t border-brand-surface-border dark:border-stone-800 pt-3">
        "Needs attention first" lists expired products, then those expiring soon, then active ones - routine products first - then unopened ones. Change the order with "Sort by".
      </p>
    </div>
  </div>
</template>
