<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ImageZoomModal from '@/components/Shared/ImageZoomModal.vue'
import type { TraitDetail } from '@/data/typologydata'

// One of the user's four traits next to its opposite. A bottom sheet on a
// phone and a centred dialog from lg. SkinProfileView opens it from a trait
// card and steps it through the four traits with the prev / next buttons.

// Nullable, and typed rather than `any`, because SkinProfileView passes
// `typologyDetails[letter] ?? null` - a lookup that can miss. Declaring these
// `any` is what let a guard be applied to nine reads and omitted from two: the
// compiler had no way to point at the gap. FE-DEF-08.
const props = withDefaults(
  defineProps<{
    activeTrait: TraitDetail | null
    oppositeTrait: TraitDetail | null
    isOpen: boolean
    // Where this pair sits among the user's traits, and each pair's title in
    // order ("Oily vs Dry", ...). With fewer than two steps the sheet shows one
    // pair and no prev / next row.
    position?: number
    steps?: string[]
  }>(),
  { position: 0, steps: () => [] },
)

const emit = defineEmits<{ close: []; step: [direction: 1 | -1] }>()

const sheetEl = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)

/** The pair slides out the way the user is stepping: next goes left, previous goes right. */
const direction = ref<1 | -1>(1)

const stepTitle = (offset: number) => {
  const count = props.steps.length
  return props.steps[(props.position + offset + count) % count] ?? ''
}

const step = (dir: 1 | -1) => {
  direction.value = dir
  emit('step', dir)
}

// Zoom State
const isZoomOpen = ref(false)
const zoomImageUrl = ref('')
const zoomAltText = ref('')

const triggerZoom = (url: string, alt: string) => {
  zoomImageUrl.value = url
  zoomAltText.value = alt
  isZoomOpen.value = true
}

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

// Escape closes the photo first when one is open, then the sheet. Tab and
// Shift+Tab wrap inside the sheet, because aria-modal tells a screen reader the
// page behind is out of reach and the keyboard has to agree. Neither applies
// while the full-screen photo is up: that overlay is its own layer.
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (isZoomOpen.value) {
      isZoomOpen.value = false
    } else {
      emit('close')
    }
    return
  }
  if (event.key !== 'Tab' || isZoomOpen.value || !sheetEl.value) return
  const focusable = Array.from(sheetEl.value.querySelectorAll<HTMLElement>(FOCUSABLE))
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

// Focus moves to the close button as the sheet opens, so the keyboard starts
// inside it. Returning focus to the card that opened it is the host's job: it
// knows which card that was.
const onOpen = async () => {
  document.addEventListener('keydown', onKeydown)
  await nextTick()
  closeButton.value?.focus()
}

const onClose = () => {
  document.removeEventListener('keydown', onKeydown)
  isZoomOpen.value = false
}

watch(
  () => props.isOpen,
  (open) => (open ? onOpen() : onClose()),
)

onMounted(() => {
  if (props.isOpen) onOpen()
})

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="sheet">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-end lg:items-center justify-center bg-stone-900/55 dark:bg-black/70 lg:p-6"
      @click.self="emit('close')"
    >
      <div
        ref="sheetEl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trait-sheet-heading"
        class="sheet-panel w-full lg:max-w-3xl max-h-[90vh] overflow-y-auto bg-brand-surface-light dark:bg-brand-surface-dark rounded-t-[28px] lg:rounded-[28px] border border-brand-surface-border dark:border-stone-700 px-5 pt-3 pb-7 lg:px-8 lg:pt-7 lg:pb-8 flex flex-col"
      >
        <span class="lg:hidden self-center w-10 h-[5px] rounded-full bg-brand-surface-border dark:bg-stone-600" aria-hidden="true" />

        <div class="flex items-center justify-between mt-2.5 lg:mt-0">
          <h2 id="trait-sheet-heading" class="font-serif text-[22px] lg:text-2xl font-bold text-stone-800 dark:text-white" aria-live="polite">
            {{ activeTrait?.name }} <span class="font-normal text-stone-600 dark:text-stone-400">vs</span> {{ oppositeTrait?.name }}
          </h2>
          <button
            ref="closeButton"
            type="button"
            aria-label="Close"
            class="w-11 h-11 -mr-2 shrink-0 flex items-center justify-center rounded-full text-stone-600 dark:text-stone-300 hover:text-brand-primary-strong dark:hover:text-brand-primary transition-colors"
            @click="emit('close')"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <!-- Keyed by the user's letter, so stepping to another trait slides the
             pair out and the next one in from the side being stepped to. -->
        <Transition :name="direction === 1 ? 'pair-next' : 'pair-prev'" mode="out-in">
          <div :key="activeTrait?.letter ?? 'none'" class="grid grid-cols-2 gap-2.5 lg:gap-5 mt-3.5 lg:mt-5">
            <!-- User's Trait -->
            <div data-testid="trait-panel" class="flex flex-col gap-2 lg:gap-3 rounded-[20px] border-2 border-brand-primary-strong dark:border-brand-primary bg-[#F4FBFB] dark:bg-brand-primary/10 p-3 lg:p-5">
              <!-- The zoom affordance is conditional on there being an image.
                   The tile used to be a clickable container, not an <img>, so
                   it stayed clickable when the trait was missing and threw on
                   activeTrait.image - FE-DEF-08. -->
              <button
                v-if="activeTrait?.image"
                type="button"
                :aria-label="`Enlarge the photo of ${activeTrait.name.toLowerCase()} skin`"
                class="cursor-zoom-in relative h-24 lg:h-40 w-full rounded-[14px] overflow-hidden bg-brand-surface-border dark:bg-stone-700"
                @click="triggerZoom(activeTrait.image, activeTrait.name)"
              >
                <img :src="activeTrait.image" :alt="activeTrait.name" class="w-full h-full object-cover" />
                <span class="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-black/45 text-white flex items-center justify-center" aria-hidden="true">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </span>
              </button>
              <div v-else class="h-24 lg:h-40 rounded-[14px] bg-brand-surface-border dark:bg-stone-700 flex items-center justify-center p-1.5 text-center text-[11px] font-bold text-stone-600 dark:text-stone-300">
                Reference image unavailable
              </div>
              <span data-testid="trait-badge" class="self-start px-2 py-0.5 rounded-full bg-brand-primary-strong text-white text-[11px] font-extrabold">You</span>
              <span class="text-base lg:text-lg font-extrabold text-stone-800 dark:text-white">{{ activeTrait?.letter }} · {{ activeTrait?.name }}</span>
              <p class="text-xs lg:text-sm leading-relaxed text-stone-600 dark:text-stone-300">{{ activeTrait?.desc }}</p>
              <ul class="pl-4 list-disc text-xs lg:text-sm leading-relaxed text-brand-text dark:text-stone-200">
                <li v-for="(point, idx) in activeTrait?.points" :key="idx">{{ point }}</li>
              </ul>
            </div>

            <!-- Opposite Trait -->
            <div data-testid="trait-panel" class="flex flex-col gap-2 lg:gap-3 rounded-[20px] border border-brand-surface-border dark:border-stone-700 p-3 lg:p-5">
              <button
                v-if="oppositeTrait?.image"
                type="button"
                :aria-label="`Enlarge the photo of ${oppositeTrait.name.toLowerCase()} skin`"
                class="cursor-zoom-in relative h-24 lg:h-40 w-full rounded-[14px] overflow-hidden bg-brand-bg-light dark:bg-stone-700"
                @click="triggerZoom(oppositeTrait.image, oppositeTrait.name)"
              >
                <img :src="oppositeTrait.image" :alt="oppositeTrait.name" class="w-full h-full object-cover" />
                <span class="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-black/45 text-white flex items-center justify-center" aria-hidden="true">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </span>
              </button>
              <div v-else class="h-24 lg:h-40 rounded-[14px] bg-brand-bg-light dark:bg-stone-700 flex items-center justify-center p-1.5 text-center text-[11px] font-bold text-stone-600 dark:text-stone-300">
                Reference image unavailable
              </div>
              <span data-testid="trait-badge" class="self-start px-2 py-0.5 rounded-full bg-brand-bg-light dark:bg-stone-700 text-stone-600 dark:text-stone-300 text-[11px] font-extrabold">The other side</span>
              <span class="text-base lg:text-lg font-extrabold text-stone-800 dark:text-white">{{ oppositeTrait?.letter }} · {{ oppositeTrait?.name }}</span>
              <p class="text-xs lg:text-sm leading-relaxed text-stone-600 dark:text-stone-300">{{ oppositeTrait?.desc }}</p>
              <ul class="pl-4 list-disc text-xs lg:text-sm leading-relaxed text-brand-text dark:text-stone-200">
                <li v-for="(point, idx) in oppositeTrait?.points" :key="idx">{{ point }}</li>
              </ul>
            </div>
          </div>
        </Transition>

        <div v-if="steps.length > 1" class="flex items-center justify-between mt-[18px] lg:mt-6">
          <button
            type="button"
            :aria-label="`Previous trait: ${stepTitle(-1)}`"
            class="w-11 h-11 rounded-full border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark flex items-center justify-center text-brand-text dark:text-stone-200 hover:border-brand-primary-strong dark:hover:border-brand-primary transition-colors"
            @click="step(-1)"
          >
            <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span class="sr-only" data-testid="trait-step-count">Trait {{ position + 1 }} of {{ steps.length }}</span>
          <div class="flex gap-1.5" aria-hidden="true">
            <span
              v-for="(title, i) in steps"
              :key="title"
              data-testid="trait-dot"
              class="h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none"
              :class="i === position ? 'w-[18px] bg-brand-primary-strong dark:bg-brand-primary' : 'w-1.5 bg-brand-surface-border dark:bg-stone-600'"
            />
          </div>
          <button
            type="button"
            :aria-label="`Next trait: ${stepTitle(1)}`"
            class="w-11 h-11 rounded-full border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark flex items-center justify-center text-brand-text dark:text-stone-200 hover:border-brand-primary-strong dark:hover:border-brand-primary transition-colors"
            @click="step(1)"
          >
            <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Nested Fullscreen Pan Zoom Canvas Overlay -->
  <Teleport to="body">
    <ImageZoomModal
      :is-open="isZoomOpen"
      :image-url="zoomImageUrl"
      :alt-text="zoomAltText"
      @close="isZoomOpen = false"
    />
  </Teleport>
</template>

<style scoped>
/* The backdrop fades while the sheet slides up from the foot of the screen on
   a phone, or fades and scales in from lg. Both last as long as each other:
   Vue times the transition off the backdrop, and would cut the sheet short. */
.sheet-enter-active,
.sheet-enter-active .sheet-panel {
  transition: opacity 350ms ease, transform 350ms cubic-bezier(0.16, 1, 0.3, 1);
}
.sheet-leave-active,
.sheet-leave-active .sheet-panel {
  transition: opacity 200ms ease, transform 200ms ease-in;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}
@media (min-width: 1024px) {
  .sheet-enter-from .sheet-panel,
  .sheet-leave-to .sheet-panel {
    opacity: 0;
    transform: scale(0.96);
  }
}

/* Stepping between traits, timed like the quiz moving between questions. */
.pair-next-enter-active,
.pair-prev-enter-active {
  transition: opacity 300ms ease, transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
.pair-next-leave-active,
.pair-prev-leave-active {
  transition: opacity 120ms ease, transform 120ms ease-in;
}
.pair-next-enter-from {
  opacity: 0;
  transform: translateX(26px);
}
.pair-next-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
.pair-prev-enter-from {
  opacity: 0;
  transform: translateX(-26px);
}
.pair-prev-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active,
  .sheet-leave-active,
  .sheet-enter-active .sheet-panel,
  .sheet-leave-active .sheet-panel,
  .pair-next-enter-active,
  .pair-next-leave-active,
  .pair-prev-enter-active,
  .pair-prev-leave-active {
    transition: none;
  }
}
</style>
