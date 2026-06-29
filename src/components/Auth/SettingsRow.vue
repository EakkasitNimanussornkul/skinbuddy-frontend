<script setup lang="ts">
defineProps<{
  iconPath: string
  label: string
  type?: 'toggle' | 'link' | 'text'
  toggleState?: boolean
  rightText?: string
  isLast?: boolean
}>()

const emit = defineEmits(['click', 'toggle'])
</script>

<template>
  <button
    @click="type === 'toggle' ? emit('toggle') : emit('click')"
    class="w-full flex items-center justify-between p-4 sm:p-5 transition-colors text-left"
    :class="[
      isLast ? '' : 'border-b border-stone-100 dark:border-stone-800/50',
      type === 'link' ? 'hover:bg-stone-50 dark:hover:bg-stone-800/30' : ''
    ]"
  >
    <div class="flex items-center gap-4">
      <div class="w-8 h-8 rounded-full bg-brand-bg-light dark:bg-stone-800/50 flex items-center justify-center text-stone-500 dark:text-stone-400">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPath"></path>
        </svg>
      </div>
      <span class="text-sm font-semibold text-brand-text dark:text-stone-200">{{ label }}</span>
    </div>

    <div v-if="type === 'toggle'">
      <div class="w-12 h-7 rounded-full relative transition-colors duration-300" :class="toggleState ? 'bg-brand-primary dark:bg-brand-primary-light' : 'bg-stone-200 dark:bg-stone-700'">
        <div class="absolute top-1 bg-white dark:bg-brand-surface-dark w-5 h-5 rounded-full transition-transform duration-300 shadow-sm" :class="toggleState ? 'translate-x-6' : 'translate-x-1'"></div>
      </div>
    </div>

    <div v-else-if="type === 'link'" class="flex items-center gap-2 text-stone-400">
      <span v-if="rightText" class="text-sm">{{ rightText }}</span>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
    </div>

    <div v-else-if="type === 'text'">
      <span class="text-xs text-stone-500 dark:text-stone-400 font-mono">{{ rightText }}</span>
    </div>
  </button>
</template>
