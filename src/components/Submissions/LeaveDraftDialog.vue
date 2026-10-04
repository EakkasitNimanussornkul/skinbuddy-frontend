<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

// Asked before leaving a half-filled submission, which lives in memory only.
// Focus moves into the dialog (to "Keep editing", the safe choice), Tab stays
// inside it, Escape keeps editing, and focus goes back where it was on close.
const emit = defineEmits<{ stay: []; leave: [] }>()

const dialog = ref<HTMLElement | null>(null)
const stayButton = ref<HTMLButtonElement | null>(null)
let returnFocusTo: HTMLElement | null = null

onMounted(async () => {
  returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
  await nextTick()
  stayButton.value?.focus()
})

onBeforeUnmount(() => {
  if (returnFocusTo && document.contains(returnFocusTo)) returnFocusTo.focus()
})

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('stay')
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return
  const buttons = Array.from(dialog.value.querySelectorAll<HTMLElement>('button'))
  const first = buttons[0]
  const last = buttons[buttons.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-stone-900/60 p-4" @click.self="emit('stay')">
      <div
        ref="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-draft-title"
        aria-describedby="leave-draft-text"
        class="leave-draft w-full max-w-sm rounded-3xl bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-600 shadow-2xl p-6"
        @keydown="onKeydown"
      >
        <h2 id="leave-draft-title" class="m-0 font-serif text-xl font-bold text-stone-800 dark:text-white">Leave without sending?</h2>
        <p id="leave-draft-text" class="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          What you've entered isn't saved anywhere, so it will be lost.
        </p>
        <div class="mt-5 flex flex-col gap-2.5">
          <button
            ref="stayButton"
            type="button"
            class="keep-editing h-12 rounded-2xl bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white font-bold transition-colors"
            @click="emit('stay')"
          >
            Keep editing
          </button>
          <button
            type="button"
            class="leave-anyway h-12 rounded-2xl border-[1.5px] border-brand-surface-border dark:border-stone-600 text-stone-700 dark:text-stone-200 font-bold hover:border-red-800 hover:text-red-800 dark:hover:border-red-300 dark:hover:text-red-300 transition-colors"
            @click="emit('leave')"
          >
            Leave and lose it
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
