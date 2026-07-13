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
    class="w-full flex items-center justify-between p-4 sm:p-5 transition-colors text-left group"
    :class="[
      isLast ? '' : 'border-b border-brand-surface-border dark:border-stone-800',
      type === 'link' ? 'hover:bg-brand-bg-light dark:hover:bg-stone-800/40' : ''
    ]"
  >
    <div class="flex items-center gap-4">
      <div class="w-8 h-8 rounded-full bg-brand-primary-light dark:bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 group-hover:bg-brand-primary/20 transition-colors">
        <svg class="w-4 h-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" :d="iconPath"></path>
        </svg>
      </div>
      <span class="text-sm font-bold text-brand-text dark:text-stone-200">{{ label }}</span>
    </div>

    <!-- Toggle Switch -->
    <div v-if="type === 'toggle'" class="flex-shrink-0">
      <div class="w-11 h-6 rounded-full relative transition-colors duration-300 shadow-inner" :class="toggleState ? 'bg-brand-primary' : 'bg-stone-300 dark:bg-stone-700'">
        <div class="absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-sm" :class="toggleState ? 'translate-x-5' : 'translate-x-0'"></div>
      </div>
    </div>

    <!-- Link Arrow -->
    <div v-else-if="type === 'link'" class="flex items-center gap-2 text-brand-text-muted">
      <span v-if="rightText" class="text-sm font-medium">{{ rightText }}</span>
      <svg class="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
    </div>

    <!-- Read-Only Text -->
    <div v-else-if="type === 'text'" class="flex-shrink-0">
      <span class="text-xs text-brand-text-muted font-mono font-bold">{{ rightText }}</span>
    </div>
  </button>
</template>
