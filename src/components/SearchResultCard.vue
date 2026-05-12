<script setup lang="ts">
defineProps<{
  product: any
}>()

const emit = defineEmits(['select'])
</script>

<template>
  <li
    @click="emit('select')"
    class="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 last:border-0"
  >
    <div class="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-lg p-1 flex-shrink-0">
      <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"/>
      <div v-else class="w-full h-full flex items-center justify-center text-xl">🧴</div>
    </div>
    <div>
      <div class="text-[10px] font-bold text-[#2E5BFF] uppercase mb-0.5">{{ product.brand }}</div>
      <div class="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">{{ product.name }}</div>
    </div>
  </li>
</template>
