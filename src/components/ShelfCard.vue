<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  item: any
}>()

// 1. Renamed 'click' to 'open-details' to prevent Vue fallthrough bugs
const emit = defineEmits(['open-details', 'delete'])

const brand = computed(() => props.item.products?.brand || 'Unknown Brand')
const name = computed(() => props.item.products?.name || 'Unknown Product')
const category = computed(() => props.item.category || props.item.products?.category || 'Uncategorized')
const status = computed(() => props.item.status || 'Unopened')
const imageUrl = computed(() => props.item.image_url || props.item.products?.image_url || null)

const getStatusBadgeClass = (status: string) => {
  if (!status) return 'bg-stone-800 text-stone-300 border border-stone-700/50'
  const s = status.toLowerCase()
  if (s.includes('morning') || s.includes('evening') || s.includes('routine')) {
    return 'bg-stone-800 text-stone-200 border border-stone-700/50'
  }
  if (s.includes('expir')) {
    return 'bg-amber-900/40 text-amber-400 border border-amber-900/50'
  }
  return 'bg-stone-800 text-stone-300 border border-stone-700/50'
}
</script>

<template>
  <div
    @click="emit('open-details')"
    class="relative group bg-brand-surface-light dark:bg-[#292524] rounded-3xl p-3 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col hover:shadow-md transition-shadow cursor-pointer"
  >

    <button
      @click.stop.prevent="emit('delete', item)"
      class="absolute top-4 right-4 bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm p-1.5 rounded-full text-stone-400 hover:text-red-500 border border-stone-200 dark:border-stone-600 hover:border-red-300 dark:hover:border-red-900/50 transition-all z-20 shadow-sm"
    >
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
    </button>

    <div class="w-full aspect-square sm:h-36 bg-stone-50 dark:bg-[#1C1917] rounded-2xl mb-3 flex items-center justify-center relative overflow-hidden border border-stone-100 dark:border-stone-800/50">
      <img v-if="imageUrl" :src="imageUrl" :alt="name" class="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal p-1" />
      <svg v-else class="w-10 h-10 text-stone-300 dark:text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
      </svg>
      <div
        class="absolute top-2 left-2 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest shadow-sm backdrop-blur-md"
        :class="getStatusBadgeClass(status)"
      >
        {{ status }}
      </div>
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
