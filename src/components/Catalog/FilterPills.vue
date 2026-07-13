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

  // Base structural classes with the tactile scale effect and focus rings
  const baseClasses = 'whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 ease-out active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-brand-bg-dark border'

  if (isActive) {
    if (props.variant === 'brand') {
      // 100% reliant on your brand-primary variables for both light and dark mode
      return `${baseClasses} bg-brand-primary-light text-brand-primary border-brand-primary/20 shadow-sm dark:bg-brand-primary/20 dark:text-brand-primary dark:border-brand-primary/30 focus-visible:ring-brand-primary/50`
    }
    // Neutral Active maps cleanly to dark grey charcoal / soft grey slate
    return `${baseClasses} bg-brand-text text-brand-surface-light border-brand-text shadow-sm dark:bg-brand-surface-border dark:text-brand-bg-dark dark:border-brand-surface-border focus-visible:ring-stone-400`
  } else {
    if (props.variant === 'brand') {
      // Brand Inactive with smooth hovers adopting your brand-primary theme
      return `${baseClasses} text-brand-text-muted border-brand-surface-border dark:border-stone-800 hover:border-brand-primary/30 hover:text-brand-primary dark:hover:border-brand-primary/40 dark:hover:text-brand-primary focus-visible:ring-brand-primary/30 bg-transparent`
    }
    // Neutral Inactive
    return `${baseClasses} bg-brand-surface-light text-brand-text-muted border-brand-surface-border dark:bg-brand-surface-dark dark:border-stone-800 hover:border-brand-primary/30 hover:text-brand-text dark:hover:border-stone-600 dark:hover:text-stone-300 focus-visible:ring-stone-300`
  }
}
</script>

<template>
  <div class="flex overflow-x-auto gap-3 pb-2 pt-1 px-1 -mx-1 hide-scrollbar">
    <button
      v-for="option in options"
      :key="option"
      @click="emit('update:modelValue', option)"
      :class="getButtonClasses(option)"
      :aria-pressed="option === modelValue"
    >
      {{ option }}
    </button>
  </div>
</template>

<style scoped>
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
