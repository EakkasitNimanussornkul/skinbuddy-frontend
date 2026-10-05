<script setup lang="ts">
import { computed } from 'vue'
import { HIDDEN_CHARS_WARNING, hasHiddenChars } from '../../utils/hiddenChars'
import RevealedText from './RevealedText.vue'

/**
 * Under an editable field on the review and edit screens: an input cannot show
 * a hidden character, so when its value holds any this says so, shows the
 * value with each one as a marker, and offers to take them out. Taking them
 * out is the admin's own edit, saved only with the rest of the form.
 */
const props = defineProps<{ value: string | null | undefined; label?: string }>()
const emit = defineEmits<{ clean: [] }>()

const shown = computed(() => hasHiddenChars(props.value))
</script>

<template>
  <p v-if="shown" class="hidden-chars-notice m-0 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-100 text-xs leading-relaxed break-words">
    <strong class="font-extrabold">{{ HIDDEN_CHARS_WARNING }}:</strong>
    <RevealedText :text="value" :warn="false" class="text-stone-800 dark:text-white" />
    <button
      type="button"
      class="remove-hidden-chars block mt-1 min-h-11 font-extrabold underline text-amber-900 dark:text-amber-100"
      @click="emit('clean')"
    >
      Remove them<span v-if="label" class="sr-only"> from the {{ label }}</span>
    </button>
  </p>
</template>
