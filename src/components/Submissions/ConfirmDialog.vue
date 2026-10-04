<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

// A yes-or-no question before something that cannot be taken back: publishing
// a product, not adding a submission, leaving unsaved edits. Focus moves to the
// safe choice (cancel), Tab stays inside, Escape cancels, and focus goes back
// where it was on close - the same rules as LeaveDraftDialog. While busy both
// buttons are off, so the dialog itself holds focus (see the busy watcher).
const props = withDefaults(
  defineProps<{
    title: string
    text: string
    confirmLabel: string
    cancelLabel?: string
    tone?: 'primary' | 'danger'
    busy?: boolean
  }>(),
  { cancelLabel: 'Not yet', tone: 'primary', busy: false },
)
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const uid = useId()
const dialog = ref<HTMLElement | null>(null)
const cancelButton = ref<HTMLButtonElement | null>(null)
let returnFocusTo: HTMLElement | null = null

onMounted(async () => {
  returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
  await nextTick()
  cancelButton.value?.focus()
})

// A disabled button cannot hold focus: the browser drops it to <body>, where
// neither Tab nor Escape reaches this dialog. So while busy the dialog itself
// takes focus, and hands it to the safe choice when the wait is over.
watch(
  () => props.busy,
  (busy) => {
    if (busy) dialog.value?.focus()
    else if (document.activeElement === dialog.value) cancelButton.value?.focus()
  },
  { flush: 'post' },
)

// Focus goes back where it was. A control that is now off (Publish after a
// refusal that added a blocker) cannot take it, so the parent places it then.
onBeforeUnmount(() => {
  if (returnFocusTo && document.contains(returnFocusTo)) returnFocusTo.focus()
})

const cancel = () => {
  if (!props.busy) emit('cancel')
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    cancel()
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return
  const buttons = Array.from(dialog.value.querySelectorAll<HTMLElement>('button:not([disabled])'))
  const first = buttons[0]
  const last = buttons[buttons.length - 1]
  if (!first || !last) {
    // Busy: there is nothing to move to, so focus stays on the dialog.
    event.preventDefault()
    dialog.value.focus()
  } else if (document.activeElement === dialog.value) {
    // Focus is on the dialog itself (it held it while busy): move to a button.
    event.preventDefault()
    const target = event.shiftKey ? last : first
    target.focus()
  } else if (event.shiftKey && document.activeElement === first) {
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
    <div class="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-stone-900/60 p-4" @click.self="cancel">
      <div
        ref="dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`${uid}-title`"
        :aria-describedby="`${uid}-text`"
        :aria-busy="busy ? 'true' : undefined"
        tabindex="-1"
        class="confirm-dialog outline-none w-full max-w-md rounded-3xl bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-600 shadow-2xl p-6"
        @keydown="onKeydown"
      >
        <h2 :id="`${uid}-title`" class="m-0 font-serif text-[22px] font-bold text-stone-800 dark:text-white">{{ title }}</h2>
        <p :id="`${uid}-text`" class="mt-2 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">{{ text }}</p>
        <slot />
        <div class="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button
            ref="cancelButton"
            type="button"
            class="confirm-cancel min-h-12 px-5 rounded-2xl border-[1.5px] border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-stone-800 dark:text-white font-bold"
            :disabled="busy"
            @click="cancel"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            :class="[
              'confirm-ok min-h-12 px-5 rounded-2xl font-extrabold transition-colors disabled:opacity-60',
              tone === 'danger'
                ? 'bg-red-800 hover:bg-red-900 text-white dark:bg-red-300 dark:hover:bg-red-200 dark:text-stone-900'
                : 'bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white',
            ]"
            :disabled="busy"
            :aria-busy="busy ? 'true' : undefined"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
