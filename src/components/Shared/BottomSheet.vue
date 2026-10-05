<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'

/**
 * A sheet that rises from the bottom of a phone screen, for a short task that
 * keeps the page behind it (Explore's filters, what % Match means).
 *
 * A modal dialog: focus moves into it and stays inside while Tab is pressed,
 * Escape and the close button close it, the page behind does not scroll, and
 * focus goes back to the control that opened it. The rise is skipped under
 * prefers-reduced-motion. Mounted with v-if; the parent owns whether it is
 * open and closes it on `close`.
 */
const props = withDefaults(
  defineProps<{
    title: string
    closeLabel?: string
    /** Where focus goes on close; the focused element when it opened if not given. */
    returnFocusTo?: HTMLElement | null
  }>(),
  { closeLabel: 'Close', returnFocusTo: null },
)
const emit = defineEmits<{ close: [] }>()

const uid = useId()
const dialog = ref<HTMLElement | null>(null)
let opener: HTMLElement | null = null
let previousOverflow = ''

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

onMounted(async () => {
  opener = props.returnFocusTo ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  await nextTick()
  dialog.value?.focus()
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
  if (opener && document.contains(opener)) opener.focus()
})

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return
  const items = Array.from(dialog.value.querySelectorAll<HTMLElement>(FOCUSABLE))
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) {
    event.preventDefault()
    return
  }
  const active = document.activeElement
  if (active === dialog.value || !dialog.value.contains(active)) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
  } else if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="bottom-sheet-backdrop fixed inset-0 z-[90] flex items-end justify-center bg-stone-900/60" @click.self="emit('close')">
      <section
        ref="dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`${uid}-title`"
        tabindex="-1"
        class="bottom-sheet outline-none w-full max-w-lg max-h-[92vh] flex flex-col rounded-t-[28px] bg-brand-surface-light dark:bg-brand-surface-dark border-t border-brand-surface-border dark:border-stone-600 shadow-[0_-12px_40px_rgba(0,0,0,0.2)]"
        @keydown="onKeydown"
      >
        <span aria-hidden="true" class="block w-11 h-[5px] rounded-full bg-brand-surface-border dark:bg-stone-600 mx-auto mt-2.5"></span>
        <div class="pl-5 pr-3 py-2 flex items-center justify-between gap-3">
          <h2 :id="`${uid}-title`" class="m-0 font-serif text-[22px] font-bold text-stone-800 dark:text-white">{{ title }}</h2>
          <button
            type="button"
            class="bottom-sheet-close w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-brand-bg-light dark:hover:bg-stone-700/60"
            :aria-label="closeLabel"
            @click="emit('close')"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto px-5 pt-1 pb-5">
          <slot />
        </div>
        <div v-if="$slots.footer" class="shrink-0 px-5 pt-3 pb-6 flex gap-2.5 border-t border-brand-surface-border dark:border-stone-600">
          <slot name="footer" />
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.bottom-sheet {
  animation: sheet-rise 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes sheet-rise {
  from {
    transform: translateY(24px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .bottom-sheet {
    animation: none;
  }
}
</style>
