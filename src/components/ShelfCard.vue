<script setup lang="ts">
// 1. Accept the item data from the parent view
defineProps<{
  item: any
}>()

// 2. Define the actions this card is allowed to shout back to the parent
const emit = defineEmits(['click', 'delete'])
</script>

<template>
  <div
    @click="emit('click')"
    class="bg-white dark:bg-clinical-surface rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
  >
    <div class="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-100 dark:border-slate-700 p-1">
      <img v-if="item.products?.image_url" :src="item.products.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
      <span v-else class="text-2xl">🧴</span>
    </div>

    <div class="flex-grow pr-8">
      <p class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
        {{ item.products?.brand || 'Unknown Brand' }}
      </p>
      <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight mb-2 line-clamp-1">
        {{ item.products?.name || 'Unknown Product' }}
      </h4>

      <div class="flex gap-2 items-center mt-1 flex-wrap">
        <span class="text-[10px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1"
          :class="item.status === 'Morning' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : (item.status === 'Evening' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')"
        >
          {{ item.status === 'Morning' ? '☀️' : (item.status === 'Evening' ? '🌙' : '☀️/🌙') }} {{ item.status }}
        </span>

        <span v-if="item.opened_date && item.expiration_date" class="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-md font-semibold border border-red-100 dark:border-red-900/30">
          Exp: {{ item.expiration_date }}
        </span>

        <span v-else-if="item.opened_date && !item.expiration_date" class="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md font-semibold border border-emerald-100 dark:border-emerald-900/30">
          ✓ Opened
        </span>

        <span v-else-if="!item.opened_date" class="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md font-semibold border border-slate-200 dark:border-slate-700">
          🔒 Unopened
        </span>

        <span v-if="item.pao && !item.opened_date" class="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-[#2E5BFF] dark:text-blue-400 px-2 py-0.5 rounded-md font-bold border border-blue-100 dark:border-blue-900/30 flex items-center gap-1 shadow-sm">
          ⏳ {{ item.pao }}M PAO
        </span>
      </div>
    </div>

    <button @click.stop="emit('delete')" class="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
      ✕
    </button>
  </div>
</template>
