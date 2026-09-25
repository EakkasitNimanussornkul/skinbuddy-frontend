<script setup lang="ts">
import { NO_SOURCE_YET, SOURCE_CLAIM_LABEL, SOURCE_TYPE_LABEL, type SourceEntry, type SourceType } from '../../api/sources'

/**
 * The sources behind one ingredient, concern or warning, as a compact line.
 *
 * An empty list says so - "No published source linked yet" - rather than
 * disappearing (owner request: be open about what the data rests on). A source
 * with no link (a book) is named without one. Links open in a new tab and are
 * only ever http(s): readSourceRef drops anything else.
 */
defineProps<{
  entries: SourceEntry[]
}>()

const typeLabel = (type: string) => SOURCE_TYPE_LABEL[type as SourceType] ?? null
</script>

<template>
  <div class="source-list flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[11px] leading-relaxed text-brand-text-muted dark:text-stone-400">
    <span class="font-bold">Sources:</span>
    <template v-if="entries.length">
      <span v-for="(entry, i) in entries" :key="`${entry.source.id}:${entry.claim ?? ''}`" class="source-entry inline-flex items-baseline gap-1">
        <span v-if="entry.claim" class="source-claim font-semibold">{{ SOURCE_CLAIM_LABEL[entry.claim] }}:</span>
        <a
          v-if="entry.source.url"
          :href="entry.source.url"
          target="_blank"
          rel="noopener noreferrer"
          class="source-link font-bold text-brand-primary hover:underline"
          :title="typeLabel(entry.source.source_type) ?? undefined"
        >{{ entry.source.title }}</a>
        <span v-else class="source-title font-bold text-brand-text dark:text-stone-200" :title="typeLabel(entry.source.source_type) ?? undefined">{{ entry.source.title }}</span>
        <span v-if="entry.source.publisher" class="source-publisher">({{ entry.source.publisher }})</span><span v-if="i < entries.length - 1">;</span>
      </span>
    </template>
    <span v-else class="source-none italic">{{ NO_SOURCE_YET }}</span>
  </div>
</template>
