<script setup lang="ts">
import { computed } from 'vue'
import ItemBadge from '../Shelf/ItemBadge.vue'

const props = defineProps<{
  item: any
}>()

const emit = defineEmits(['open-details', 'delete'])

// Smart Expiration & Countdown Engine
const expirationInfo = computed(() => {
  const state = props.item.usage_state || 'unopened'
  if (state === 'archived') {
    return { label: 'Archived', badgeType: 'archived', dateText: 'Archived Item' }
  }

  let targetDate: Date | null = null

  // Safely extract PAO whether it's stored as a string ('6M') or integer (6)
  const safePao = props.item.pao ? (typeof props.item.pao === 'string' ? props.item.pao.replace('M', '') : String(props.item.pao)) : null

  if (props.item.expiration_date) {
    targetDate = new Date(props.item.expiration_date)
  } else if (props.item.opened_date && safePao) {
    const months = parseInt(safePao) || 12
    targetDate = new Date(props.item.opened_date)
    targetDate.setMonth(targetDate.getMonth() + months)
  }

  if (!targetDate) {
    return { label: 'Unopened', badgeType: 'unopened', dateText: `PAO: ${safePao ? safePao + 'M' : '12M'}` }
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
  <div class="group relative bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl p-3.5 sm:p-4 border border-brand-surface-border dark:border-stone-800 shadow-sm hover:-translate-y-1 hover:shadow-lg hover:border-brand-primary/40 transition-all duration-300 flex flex-col justify-between h-full overflow-hidden">

    <div class="flex items-center justify-between gap-1 mb-2.5">
      <ItemBadge
        :type="expirationInfo.badgeType"
        :text="expirationInfo.label"
        class="truncate max-w-[80%]"
        :class="expirationInfo.badgeType === 'warning' ? 'animate-pulse' : ''"
      />

      <!-- Replaced hardcoded rose hover with semantic error token -->
      <button @click.stop="emit('delete')" class="w-6 h-6 rounded-full flex items-center justify-center text-brand-text-muted hover:text-semantic-error transition-colors shrink-0">
        <svg class="w-3.5 h-3.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>

    <!-- Product Image Thumbnail -->
    <div @click="emit('open-details')" class="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-xl bg-brand-bg-light dark:bg-brand-bg-dark border border-brand-surface-border dark:border-stone-800 flex items-center justify-center overflow-hidden mb-3 cursor-pointer group-hover:scale-105 transition-transform p-1.5">
      <img v-if="item.products?.image_url" :src="item.products.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
      <svg v-else class="w-7 h-7 text-brand-text-muted/60 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    </div>

    <!-- Product Text & Exact Expiration Date -->
    <div @click="emit('open-details')" class="cursor-pointer text-center sm:text-left flex-1 flex flex-col justify-end">
      <p class="text-[9px] font-bold text-brand-primary uppercase tracking-wider truncate">{{ item.products?.brand || 'Unknown Brand' }}</p>
      <h4 class="text-xs sm:text-sm font-bold text-brand-text dark:text-stone-100 truncate line-clamp-1 group-hover:text-brand-primary transition-colors mt-0.5">
        {{ item.products?.name || 'Unnamed Product' }}
      </h4>
      <p class="text-[10px] font-semibold text-brand-text-muted dark:text-stone-400 mt-1.5 flex items-center justify-center sm:justify-start gap-1 bg-brand-bg-light dark:bg-stone-800/80 px-2 py-1 rounded-md border border-brand-surface-border/50 dark:border-stone-800/50">
        <svg class="w-3 h-3 stroke-[2] text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        <span class="truncate">{{ expirationInfo.dateText }}</span>
      </p>
    </div>

  </div>
</template>
