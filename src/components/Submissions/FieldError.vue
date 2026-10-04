<script setup lang="ts">
// The line under a field that failed its check. The field points at it with
// aria-describedby, so a screen reader reads it with the field.
defineProps<{ id: string; message?: string }>()
</script>

<template>
  <span v-if="message" :id="id" class="field-error flex items-start gap-1.5 text-[13px] font-semibold text-red-800 dark:text-red-300">
    <svg class="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
    {{ message }}
  </span>
</template>
