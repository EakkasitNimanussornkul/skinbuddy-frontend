<script setup lang="ts">
const props = withDefaults(defineProps<{
  options: string[]
  modelValue: string
  variant?: 'neutral' | 'brand'
}>(), {
  variant: 'neutral'
})

const emit = defineEmits(['update:modelValue'])

const getButtonClasses = (option: string) => {
  const isActive = option === props.modelValue
  const baseClasses = 'whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-colors border'

  if (isActive) {
    if (props.variant === 'brand') {
      return `${baseClasses} bg-brand-primary-light text-brand-primary border-brand-primary-light dark:bg-orange-900/40 dark:text-orange-300`
    }
    return `${baseClasses} bg-brand-text text-brand-surface-light border-brand-text dark:bg-stone-200 dark:text-brand-bg-dark`
  } else {
    if (props.variant === 'brand') {
      return `${baseClasses} text-brand-text-muted border-stone-200 dark:border-stone-800`
    }
    return `${baseClasses} bg-brand-surface-light text-brand-text-muted border-stone-200 dark:bg-brand-surface-dark dark:border-stone-800`
  }
}
</script>

<template>
  <div class="flex overflow-x-auto gap-2 pb-1 hide-scrollbar">
    <button
      v-for="option in options"
      :key="option"
      @click="emit('update:modelValue', option)"
      :class="getButtonClasses(option)"
    >
      {{ option }}
    </button>
  </div>
</template>

<style scoped>
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
</style>
