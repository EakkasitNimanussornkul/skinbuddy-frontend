<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

/**
 * A question before something that matters, with room for more than one line
 * of text: a list, a tick box, an error (the Settings withdraw and delete
 * dialogs). The same rules as components/Submissions/ConfirmDialog: focus moves
 * to the safe choice, Tab stays inside (tick boxes and links included), Escape
 * cancels, and focus goes back where it was on close. While busy both buttons
 * are off, so the dialog itself holds focus.
 *
 * The default slot is the description (aria-describedby); the `extra` slot
 * sits under it for controls and messages that are not part of it.
 *
 * The backdrop fades and the panel scales up as it opens, and the reverse as
 * it closes (dialog-pop in style.css; none under reduced motion). For the
 * closing half the host keeps it mounted and turns `open` off; a host that
 * mounts it with v-if, leaving `open` at its default, gets the opening only.
 * Focus moves in as soon as it opens rather than after the motion, so a key
 * pressed during it already lands in the dialog, and goes back on close.
 */
const props = withDefaults(
  defineProps<{
    open?: boolean
    title: string
    confirmLabel: string
    cancelLabel: string
    tone?: 'primary' | 'danger'
    confirmDisabled?: boolean
    busy?: boolean
  }>(),
  { open: true, tone: 'danger', confirmDisabled: false, busy: false },
)
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const uid = useId()
const dialog = ref<HTMLElement | null>(null)
const cancelButton = ref<HTMLButtonElement | null>(null)
let returnFocusTo: HTMLElement | null = null

const takeFocus = async () => {
  returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
  await nextTick()
  cancelButton.value?.focus()
}

const giveFocusBack = () => {
  if (returnFocusTo && document.contains(returnFocusTo)) returnFocusTo.focus()
  returnFocusTo = null
}

onMounted(() => {
  if (props.open) takeFocus()
})

watch(
  () => props.open,
  (open) => (open ? takeFocus() : giveFocusBack()),
)

watch(
  () => props.busy,
  (busy) => {
    if (busy) dialog.value?.focus()
    else if (document.activeElement === dialog.value) cancelButton.value?.focus()
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  if (props.open) giveFocusBack()
})

const cancel = () => {
  if (!props.busy) emit('cancel')
}

const confirm = () => {
  if (!props.busy && !props.confirmDisabled) emit('confirm')
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled])'

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    cancel()
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return
  const items = Array.from(dialog.value.querySelectorAll<HTMLElement>(FOCUSABLE))
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) {
    event.preventDefault()
    dialog.value.focus()
  } else if (document.activeElement === dialog.value) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-pop" appear>
      <div v-if="open" class="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-stone-900/60 p-4" @click.self="cancel">
        <section
          ref="dialog"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="`${uid}-title`"
          :aria-describedby="`${uid}-body`"
          :aria-busy="busy ? 'true' : undefined"
          tabindex="-1"
          class="alert-dialog dialog-pop-panel scroll-thin outline-none w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-600 shadow-2xl p-[22px] flex flex-col gap-3.5"
          @keydown="onKeydown"
        >
          <h2 :id="`${uid}-title`" class="m-0 font-serif text-[22px] font-bold text-stone-800 dark:text-white">{{ title }}</h2>
          <div :id="`${uid}-body`" class="flex flex-col gap-3">
            <slot />
          </div>
          <slot name="extra" />
          <div class="flex flex-wrap gap-2.5">
            <button
              ref="cancelButton"
              type="button"
              class="alert-cancel flex-[1_1_140px] min-h-12 rounded-[14px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-stone-800 dark:text-white text-[15px] font-extrabold"
              :disabled="busy"
              @click="cancel"
            >
              {{ cancelLabel }}
            </button>
            <button
              type="button"
              :class="[
                'alert-confirm flex-[1_1_140px] min-h-12 rounded-[14px] text-[15px] font-extrabold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed',
                'disabled:bg-brand-surface-border disabled:text-stone-600 dark:disabled:bg-stone-600 dark:disabled:text-stone-300',
                tone === 'danger'
                  ? 'bg-[#B3261E] hover:bg-[#8C1D18] text-white'
                  : 'bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white',
              ]"
              :disabled="busy || confirmDisabled"
              :aria-busy="busy ? 'true' : undefined"
              @click="confirm"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
