<script setup lang="ts">
// A pill that is on or off: categories, roles, period after opening, concerns
// and what a link shows. A real button with aria-pressed, 44px tall.
defineProps<{ pressed: boolean; label: string }>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    :aria-pressed="pressed ? 'true' : 'false'"
    :class="[
      'min-h-11 px-3.5 rounded-full border-[1.5px] text-sm font-bold transition-colors',
      pressed
        ? 'border-brand-primary-strong bg-brand-primary-light text-brand-primary-strong-hover dark:border-brand-primary dark:bg-brand-primary/20 dark:text-brand-primary-accent'
        : 'border-brand-surface-border bg-brand-surface-light text-brand-text hover:border-brand-primary-strong dark:border-stone-600 dark:bg-brand-surface-dark dark:text-stone-200 dark:hover:border-brand-primary',
    ]"
    @click="emit('toggle')"
  >
    {{ label }}
  </button>
</template>
