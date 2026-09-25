<script setup lang="ts">
import { MATCH_METHOD_PATH } from '../../api/products'

/**
 * The honest status of the ingredient notes shown beside it: the team's own,
 * from general knowledge, and not yet checked against a published source - the
 * backend's ingredients.source field says exactly that for every entry.
 *
 * Owner request: say where the data shown comes from. Until sources are
 * attached ingredient by ingredient, this says plainly that they are not, and
 * links to the page that names where the rest of the app's data comes from.
 */
</script>

<template>
  <p class="source-status-note flex items-start gap-2 text-[11px] leading-relaxed text-brand-text-muted dark:text-stone-400">
    <svg class="w-3.5 h-3.5 shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>
      These ingredient notes are general reference written by our team, not yet checked against a published source.
      <router-link :to="MATCH_METHOD_PATH" class="source-status-link font-bold text-brand-primary hover:underline">See our sources</router-link>
    </span>
  </p>
</template>
