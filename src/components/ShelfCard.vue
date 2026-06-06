<script setup lang="ts">
import { computed } from 'vue'
import ItemBadge from './ItemBadge.vue'

const props = defineProps<{
  item: any
}>()

const emit = defineEmits(['open-details', 'delete'])

const brand = computed(() => props.item.products?.brand || 'Unknown Brand')
const name = computed(() => props.item.products?.name || 'Unknown Product')
const category = computed(() => props.item.category || props.item.products?.category || 'Uncategorized')
const imageUrl = computed(() => props.item.image_url || props.item.products?.image_url || null)

// --- Dynamic Database States ---
const usageState = computed(() => props.item.usage_state || 'unopened')

const expirationStatus = computed(() => {
  // 🌟 FIX: We removed the strict 'active' check so unopened items still trigger warnings!
  // However, if the user explicitly archived the item, we hide the warning so it stays quiet.
  if (!props.item.expiration_date || usageState.value === 'archived') return null

  const today = new Date()
  const exp = new Date(props.item.expiration_date)

  const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24))

  if (daysLeft < 0) return 'expired'
  if (daysLeft <= 30) return 'expiring_soon'

  return null
})
</script>

<template>
  <div
    @click="emit('open-details')"
    class="relative group bg-brand-surface-light dark:bg-[#292524] rounded-3xl p-3 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col hover:shadow-md transition-all duration-300 cursor-pointer"
    :class="usageState === 'archived' ? 'opacity-60 grayscale-[40%] hover:opacity-100 hover:grayscale-0' : ''"
  >

    <div v-if="expirationStatus" class="absolute -top-3 inset-x-0 flex justify-center z-30 pointer-events-none">
      <ItemBadge
        v-if="expirationStatus === 'expired'"
        type="error"
        text="Expired"
        class="shadow-md px-3 border-2 border-red-200 dark:border-red-900/50"
      />
      <ItemBadge
        v-else-if="expirationStatus === 'expiring_soon'"
        type="warning"
        text="Expiring Soon"
        class="shadow-md px-3 border-2 border-amber-200 dark:border-amber-700/50"
      />
    </div>

    <div class="w-full aspect-square sm:h-36 bg-stone-50 dark:bg-[#1C1917] rounded-2xl mb-3 flex items-center justify-center relative overflow-hidden border border-stone-100 dark:border-stone-800/50" :class="expirationStatus ? 'mt-1' : ''">
      <img v-if="imageUrl" :src="imageUrl" :alt="name" class="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal p-1" />
      <svg v-else class="w-10 h-10 text-stone-300 dark:text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
      </svg>

    <div class="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">
      <ItemBadge v-if="usageState === 'archived'" type="archived" text="Archived" />
      <ItemBadge v-else-if="usageState === 'unopened'" type="unopened" text="Unopened" />

      <ItemBadge v-else-if="usageState === 'active'" type="routine" text="In Routine" />
    </div>

      <button
        @click.stop.prevent="emit('delete', item)"
        class="absolute top-2 right-2 bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm p-1.5 rounded-full text-stone-400 hover:text-red-500 border border-stone-200 dark:border-stone-600 hover:border-red-300 dark:hover:border-red-900/50 transition-all z-20 shadow-sm"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
      </button>
    </div>

    <div class="flex flex-col flex-grow">
      <p class="text-[9px] font-bold text-brand-primary dark:text-stone-400 uppercase tracking-wider mb-0.5 line-clamp-1">
        {{ brand }}
      </p>
      <h3 class="text-xs sm:text-sm font-semibold text-brand-text dark:text-stone-100 leading-snug line-clamp-2 mb-2 group-hover:text-brand-primary transition-colors">
        {{ name }}
      </h3>
      <div class="mt-auto">
        <span class="text-[10px] text-brand-text-muted dark:text-stone-500 font-medium">
          {{ category }}
        </span>
      </div>
    </div>

  </div>
</template>
