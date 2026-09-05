<script setup lang="ts">
import { computed } from 'vue'
import ItemBadge from '../Shelf/ItemBadge.vue'
import { resolveExpiryDate } from '../../api/shelfapi'
import type { ShelfItem } from '../../stores/shelfStore'

const props = defineProps<{
  item: ShelfItem
}>()

const emit = defineEmits(['open-details', 'delete'])

// Smart Expiration & Countdown Engine
type BadgeType = 'routine' | 'warning' | 'error' | 'unopened' | 'archived' | 'good'
const expirationInfo = computed<{ label: string; badgeType: BadgeType; dateText: string }>(() => {
  const state = props.item.usage_state || 'unopened'
  if (state === 'archived') {
    return { label: 'Archived', badgeType: 'archived', dateText: 'Archived Item' }
  }

  const safePao = props.item.pao ? String(props.item.pao) : null

  // FE-DEF-16: shared with ShelfView's status filter, which used to derive this
  // separately and without the opened-date fallback below.
  const targetDate = resolveExpiryDate(props.item)

  const isOpened = Boolean(props.item.opened_date) || state === 'active'

  if (!targetDate) {
    if (!isOpened) {
      return {
        label: 'Unopened',
        badgeType: 'unopened',
        dateText: safePao ? `PAO: ${safePao}M` : 'Status: Unopened'
      }
    }
    return {
      label: 'Active',
      badgeType: 'good',
      dateText: safePao ? `PAO: ${safePao}M` : 'Expiration: Not Set'
    }
  }

  const today = new Date()
  const daysLeft = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
  const formattedDate = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  if (daysLeft < 0) {
    return { label: 'Expired', badgeType: 'error', dateText: `Expired: ${formattedDate}` }
  }
  if (daysLeft <= 30) {
    return { label: `In ${daysLeft} days`, badgeType: 'warning', dateText: `Expires: ${formattedDate}` }
  }

  return { label: `In ${daysLeft} days`, badgeType: 'good', dateText: `Expires: ${formattedDate}` }
})
</script>

<template>
  <div class="group relative bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl lg:rounded-[1.75rem] p-4 lg:p-5 border border-brand-surface-border dark:border-stone-800 shadow-sm hover:-translate-y-0.5 sm:hover:-translate-y-1 hover:shadow-lg hover:border-brand-primary/40 transition-all duration-300 flex flex-col justify-between h-full overflow-hidden">

    <!-- Top Badge & Delete Row -->
    <div class="flex items-center justify-between gap-1 mb-3 sm:mb-2.5">
      <ItemBadge
        :type="expirationInfo.badgeType"
        :text="expirationInfo.label"
        class="truncate max-w-[80%] text-[10px] lg:text-xs"
        :class="expirationInfo.badgeType === 'warning' ? 'animate-pulse' : ''"
      />

      <button @click.stop="emit('delete')" class="w-7 h-7 rounded-full flex items-center justify-center text-brand-text-muted hover:text-semantic-error transition-colors shrink-0 cursor-pointer">
        <svg class="w-4 h-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>

    <!-- Main Content Frame: Horizontal layout on mobile (flex-row), Vertical stack on sm+ (sm:flex-col) -->
    <div @click="emit('open-details')" class="flex flex-row sm:flex-col items-center sm:items-stretch gap-4 sm:gap-2 cursor-pointer flex-1">

      <!-- Larger, Responsive Product Image Box -->
      <div class="w-24 h-24 sm:w-24 sm:h-24 lg:w-28 lg:h-28 sm:mx-auto rounded-2xl bg-brand-bg-light dark:bg-brand-bg-dark border border-brand-surface-border dark:border-stone-800/60 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform p-3">
        <img v-if="item.products?.image_url" :src="item.products.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
        <svg v-else class="w-10 h-10 text-brand-text-muted/60 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
      </div>

      <!-- Product Meta Info & Expiration Pill -->
      <div class="flex-1 min-w-0 text-left sm:text-center flex flex-col justify-center sm:justify-end">
        <p class="text-[10px] lg:text-[11px] font-bold text-brand-primary uppercase tracking-wider truncate">{{ item.products?.brand || 'Unknown Brand' }}</p>

        <h4 class="text-sm sm:text-base font-serif font-bold text-brand-text dark:text-stone-100 truncate line-clamp-2 sm:line-clamp-1 group-hover:text-brand-primary transition-colors mt-0.5 leading-snug">
          {{ item.products?.name || 'Unnamed Product' }}
        </h4>

        <p class="text-[10px] lg:text-[11px] font-semibold text-brand-text-muted dark:text-stone-400 mt-2 sm:mt-2.5 flex items-center justify-start sm:justify-center gap-1.5 bg-brand-bg-light dark:bg-stone-800/80 px-2.5 py-1.5 rounded-xl border border-brand-surface-border/50 dark:border-stone-800/50 w-max sm:w-auto">
          <svg class="w-3.5 h-3.5 stroke-[2] text-brand-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span class="truncate">{{ expirationInfo.dateText }}</span>
        </p>
      </div>

    </div>

  </div>
</template>
