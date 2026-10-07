<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, useId } from 'vue'
import {
  PRICE_FLOOR,
  PRICE_SCALE_DEFAULT,
  PRICE_CAP_LIMIT,
  PRICE_GAP,
  PRICE_HANDLE_STEP,
  scaleEndFor,
  baht,
  readBaht,
  isPriceFiltered,
  UNPRICED_NOTE,
  parseTypedPrice,
  type PriceRange,
} from './priceRange'

/**
 * The price control: a Lowest and a Highest box and a two-handle bar under them.
 *
 * The bar runs 0 to 1,500 and its far end, "฿1,500+", means no upper limit
 * (`maxCap` null). Typing a higher number in Highest sets a cap and grows the bar
 * to fit it, up to 20,000. The boxes and the handles are one value: typing moves
 * the handles as you go and is kept on blur or Enter (a number that cannot be
 * read puts the old one back); a handle moves the boxes as it goes.
 *
 * `variant` "popover" (the default) is the desktop Price popover: the changes
 * stay here until Apply, with Clear beside it. "sheet" is the phone Filters
 * sheet, which has its own "Clear all" and "Show products": no buttons, and
 * every change is reported as `update:range` for the sheet's draft. A drag on the
 * bar pans sideways only, so it does not scroll the sheet.
 *
 * The handles you see are drawn here; the real range inputs over them carry the
 * drag, the keyboard and the screen reader, with a 44px invisible thumb. The
 * drawn bar and handles glide when a number is typed and follow the finger
 * without delay during a drag.
 */
const props = withDefaults(
  defineProps<{
    minPrice: number
    maxCap?: number | null
    variant?: 'popover' | 'sheet'
  }>(),
  { maxCap: null, variant: 'popover' },
)

const emit = defineEmits<{
  apply: [range: PriceRange]
  clear: []
  'update:range': [range: PriceRange]
}>()

const sheet = computed(() => props.variant === 'sheet')
const uid = useId()

const localMin = ref(readBaht(props.minPrice, PRICE_FLOOR))
const localCap = ref<number | null>(props.maxCap ?? null)
// Where the bar ends. 1,500 until a higher cap is set, when it grows to fit it.
const scaleEnd = ref(scaleEndFor(localCap.value))
const grown = computed(() => scaleEnd.value > PRICE_SCALE_DEFAULT)
// The highest handle's place: the cap, or the end of the bar for no limit.
const highValue = computed(() => localCap.value ?? scaleEnd.value)

watch(() => props.minPrice, (val) => { localMin.value = readBaht(val, PRICE_FLOOR) })
// An echo of what was just set here (the sheet's draft) leaves the bar as it is;
// only a different cap from outside, such as "Clear all", sets the bar again.
watch(() => props.maxCap, (val) => {
  const cap = val ?? null
  if (cap === localCap.value) return
  localCap.value = cap
  scaleEnd.value = scaleEndFor(cap)
})

// --- The rules ------------------------------------------------------------------
const setMin = (value: number) => {
  localMin.value = Math.max(PRICE_FLOOR, Math.min(Math.round(value), highValue.value - PRICE_GAP))
}

// `typed` is a number typed into Highest, which grows or shrinks the bar to fit.
// Otherwise it is a handle: the bar stays put, and the end of the default bar is
// no limit.
const setCap = (value: number, typed: boolean) => {
  let cap = Math.min(PRICE_CAP_LIMIT, Math.round(value))
  if (cap < localMin.value + PRICE_GAP) cap = localMin.value + PRICE_GAP
  if (cap > PRICE_CAP_LIMIT) {
    cap = PRICE_CAP_LIMIT
    localMin.value = PRICE_CAP_LIMIT - PRICE_GAP
  }
  if (!typed && !grown.value && cap >= PRICE_SCALE_DEFAULT) {
    localCap.value = null
    return
  }
  localCap.value = cap
  if (typed) scaleEnd.value = scaleEndFor(cap)
}

const reportLive = () => {
  if (sheet.value) emit('update:range', { min: localMin.value, maxCap: localCap.value })
}

// --- The boxes ------------------------------------------------------------------
const format = (amount: number) => amount.toLocaleString('en-US')
const highDisplay = () => (localCap.value === null ? `${format(PRICE_SCALE_DEFAULT)}+` : format(localCap.value))
const lowText = ref(format(localMin.value))
const highText = ref(highDisplay())
const syncTexts = () => {
  lowText.value = format(localMin.value)
  highText.value = highDisplay()
}
watch([localMin, localCap], syncTexts)

// What the handles show while a number is being typed, before it is kept.
const draftLow = ref<number | null>(null)
const draftHigh = ref<number | null>(null)
const previewOf = (text: string) => {
  const typed = parseTypedPrice(text)
  return typed.kind === 'value' ? typed.value : null
}
const onLowTyping = () => { draftLow.value = previewOf(lowText.value) }
const onHighTyping = () => { draftHigh.value = previewOf(highText.value) }

const commitLow = () => {
  draftLow.value = null
  const typed = parseTypedPrice(lowText.value)
  if (typed.kind !== 'invalid') {
    setMin(typed.kind === 'empty' ? PRICE_FLOOR : typed.value)
    reportLive()
  }
  syncTexts()
}

const commitHigh = () => {
  draftHigh.value = null
  // Left as it was shown, such as "1,500+" read back, it is not a new number.
  if (highText.value !== highDisplay()) {
    const typed = parseTypedPrice(highText.value)
    if (typed.kind === 'empty') {
      localCap.value = null
      scaleEnd.value = PRICE_SCALE_DEFAULT
      // The bar may have shrunk under the lowest handle.
      setMin(localMin.value)
      reportLive()
    } else if (typed.kind === 'value') {
      setCap(typed.value, true)
      reportLive()
    }
  }
  syncTexts()
}

// --- The handles ----------------------------------------------------------------
const clampToBar = (value: number) => Math.max(0, Math.min(value, scaleEnd.value))
const lowShown = computed(() => clampToBar(draftLow.value ?? localMin.value))
const highShown = computed(() => clampToBar(draftHigh.value ?? highValue.value))
const percent = (value: number) => (value / scaleEnd.value) * 100
const leftPercent = computed(() => percent(lowShown.value))
const widthPercent = computed(() => Math.max(0, percent(highShown.value) - leftPercent.value))

const onLowInput = (event: Event) => {
  const el = event.target as HTMLInputElement
  draftLow.value = null
  setMin(Number(el.value))
  // A handle pushed past the gap is put back, even when the kept value did not change.
  el.value = String(localMin.value)
  reportLive()
}

const onHighInput = (event: Event) => {
  const el = event.target as HTMLInputElement
  draftHigh.value = null
  setCap(Number(el.value), false)
  el.value = String(highValue.value)
  reportLive()
}

// Where the handles meet, the one on top is the one that can still move: the
// lower handle once it is past the middle, the upper one before.
const lowerOnTop = computed(() => localMin.value > scaleEnd.value / 2)

const focused = ref<'min' | 'max' | null>(null)

// While a handle is held the drawn bar follows it with no delay; otherwise it glides.
const dragging = ref(false)
const stopDrag = () => {
  dragging.value = false
  window.removeEventListener('pointerup', stopDrag)
  window.removeEventListener('pointercancel', stopDrag)
}
const startDrag = () => {
  dragging.value = true
  window.addEventListener('pointerup', stopDrag)
  window.addEventListener('pointercancel', stopDrag)
}
onBeforeUnmount(stopDrag)

const glide = computed(() => (dragging.value ? '' : 'transition-[left,width] duration-200 ease-out motion-reduce:transition-none'))
const glideLeft = computed(() => (dragging.value ? '' : 'transition-[left] duration-200 ease-out motion-reduce:transition-none'))

const spokenBaht = (amount: number) => `${amount.toLocaleString('en-US')} baht`
const highSpoken = computed(() => (localCap.value === null ? 'no upper limit' : spokenBaht(localCap.value)))

const scaleEndLabel = computed(() => (grown.value ? baht(scaleEnd.value) : `${baht(PRICE_SCALE_DEFAULT)}+`))
const hint = computed(() =>
  grown.value
    ? `The bar now runs to ${baht(scaleEnd.value)} to fit your highest price.`
    : `${baht(PRICE_SCALE_DEFAULT)}+ means no upper limit. Type a higher number in Highest to set your own.`,
)

// Whether the range being set would filter anything, which is when the note shows.
const filtering = computed(() => isPriceFiltered(localMin.value, localCap.value))

const handleApply = () => {
  emit('apply', { min: localMin.value, maxCap: localCap.value })
}

const handleClear = () => {
  draftLow.value = null
  draftHigh.value = null
  localMin.value = PRICE_FLOOR
  localCap.value = null
  scaleEnd.value = PRICE_SCALE_DEFAULT
  syncTexts()
  emit('clear')
}
</script>

<template>
  <!-- Shrinks with its container (min-w-0), so it never pushes past a 375px screen
       or the 400px popover. -->
  <div :class="['price-slider w-full min-w-0 flex flex-col gap-3', sheet ? 'price-slider-sheet' : 'price-slider-popover']" :data-variant="variant">
    <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2.5 items-end">
      <label class="flex flex-col gap-1 text-xs font-bold text-stone-600 dark:text-stone-300">
        <span>Lowest</span>
        <span :class="['price-field flex items-center gap-1 rounded-xl border border-brand-surface-border dark:border-stone-600 bg-brand-bg-light dark:bg-stone-800 px-3 focus-within:ring-2 focus-within:ring-brand-primary-strong dark:focus-within:ring-brand-primary', sheet ? 'min-h-12' : 'min-h-11']">
          <span aria-hidden="true" class="text-[15px] font-bold text-stone-600 dark:text-stone-300">฿</span>
          <input
            v-model="lowText"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            class="price-input-low min-w-0 w-full border-0 outline-none bg-transparent text-base font-extrabold text-stone-800 dark:text-stone-100"
            @input="onLowTyping"
            @blur="commitLow"
            @keydown.enter.prevent="commitLow"
          />
        </span>
      </label>
      <span aria-hidden="true" :class="['flex items-center text-sm text-stone-600 dark:text-stone-300', sheet ? 'h-12' : 'h-11']">to</span>
      <label class="flex flex-col gap-1 text-xs font-bold text-stone-600 dark:text-stone-300">
        <span>Highest</span>
        <span :class="['price-field flex items-center gap-1 rounded-xl border-2 border-brand-primary-strong dark:border-brand-primary bg-brand-surface-light dark:bg-brand-surface-dark px-[11px] focus-within:ring-2 focus-within:ring-brand-primary-strong dark:focus-within:ring-brand-primary', sheet ? 'min-h-12' : 'min-h-11']">
          <span aria-hidden="true" class="text-[15px] font-bold text-stone-600 dark:text-stone-300">฿</span>
          <input
            v-model="highText"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            :aria-describedby="`${uid}-hint`"
            class="price-input-high min-w-0 w-full border-0 outline-none bg-transparent text-base font-extrabold text-stone-800 dark:text-stone-100"
            @input="onHighTyping"
            @blur="commitHigh"
            @keydown.enter.prevent="commitHigh"
          />
        </span>
      </label>
    </div>

    <!-- touch-pan-x: a drag here moves a handle and never scrolls the sheet. -->
    <div class="price-track relative h-11 min-w-0 touch-pan-x">
      <!-- Inset by half a handle, so the bar's ends sit under the handles'
           centres. -->
      <div aria-hidden="true" class="absolute inset-x-[22px] top-1/2 -translate-y-1/2 h-1 pointer-events-none">
        <div class="absolute inset-0 rounded-full bg-brand-surface-border dark:bg-stone-600"></div>
        <div :class="['price-track-fill absolute inset-y-0 rounded-full bg-brand-primary-strong dark:bg-brand-primary', glide]" :style="{ left: `${leftPercent}%`, width: `${widthPercent}%` }"></div>
      </div>
      <div aria-hidden="true" class="absolute inset-x-[22px] inset-y-0 pointer-events-none">
        <span
          :class="['price-handle price-handle-min absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full box-border border-[3px] border-brand-primary-strong dark:border-brand-primary bg-brand-surface-light dark:bg-brand-surface-dark shadow-md', focused === 'min' ? 'ring-4 ring-brand-primary/40' : '', glideLeft]"
          :style="{ left: `${leftPercent}%` }"
        ></span>
        <span
          :class="['price-handle price-handle-max absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full box-border border-[3px] border-brand-primary-strong dark:border-brand-primary bg-brand-surface-light dark:bg-brand-surface-dark shadow-md', focused === 'max' ? 'ring-4 ring-brand-primary/40' : '', glideLeft]"
          :style="{ left: `${leftPercent + widthPercent}%` }"
        ></span>
      </div>
      <input
        type="range"
        min="0"
        :max="scaleEnd"
        :step="PRICE_HANDLE_STEP"
        :value="lowShown"
        aria-label="Lowest price"
        :aria-valuetext="spokenBaht(lowShown)"
        :class="['price-range-input price-range-min absolute inset-0 w-full h-11 m-0 appearance-none bg-transparent pointer-events-none outline-none', lowerOnTop ? 'z-30' : 'z-20']"
        @input="onLowInput"
        @pointerdown="startDrag"
        @focus="focused = 'min'"
        @blur="focused = null"
      />
      <input
        type="range"
        min="0"
        :max="scaleEnd"
        :step="PRICE_HANDLE_STEP"
        :value="highShown"
        aria-label="Highest price"
        :aria-valuetext="draftHigh === null ? highSpoken : spokenBaht(highShown)"
        class="price-range-input price-range-max absolute inset-0 w-full h-11 m-0 appearance-none bg-transparent pointer-events-none outline-none z-20"
        @input="onHighInput"
        @pointerdown="startDrag"
        @focus="focused = 'max'"
        @blur="focused = null"
      />
    </div>

    <div aria-hidden="true" class="price-scale -mt-2 mx-1 flex justify-between text-xs font-bold text-stone-600 dark:text-stone-300">
      <span>{{ baht(PRICE_FLOOR) }}</span>
      <span class="price-scale-end">{{ scaleEndLabel }}</span>
    </div>

    <p :id="`${uid}-hint`" class="price-hint m-0 text-[13px] leading-normal text-stone-600 dark:text-stone-300">{{ hint }}</p>
    <p v-if="filtering" class="price-unpriced-note m-0 text-[13px] leading-normal text-stone-600 dark:text-stone-300">{{ UNPRICED_NOTE }}</p>

    <div v-if="!sheet" class="price-actions flex items-center justify-end gap-2">
      <button
        type="button"
        class="price-clear min-h-11 px-4 rounded-xl text-sm font-extrabold text-stone-600 dark:text-stone-300 hover:bg-brand-bg-light dark:hover:bg-stone-800 transition-colors"
        @click="handleClear"
      >
        Clear
      </button>
      <button
        type="button"
        class="price-apply min-h-11 px-5 rounded-xl text-sm font-extrabold bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white dark:bg-brand-primary dark:hover:bg-brand-primary-hover dark:text-stone-900 transition-colors"
        @click="handleApply"
      >
        Apply
      </button>
    </div>
  </div>
</template>

<style scoped>
/* The real handles: a 44px target with nothing drawn on it, because the visible
   dot is drawn beside it (so it can glide when a number is typed). Only the
   handles take a touch; the inputs themselves let it through. */
.price-range-input {
  -webkit-appearance: none;
}
.price-range-input::-webkit-slider-runnable-track {
  height: 44px;
  background: transparent;
}
.price-range-input::-moz-range-track {
  height: 44px;
  background: transparent;
}
.price-range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: grab;
  pointer-events: auto;
}
.price-range-input::-moz-range-thumb {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: grab;
  pointer-events: auto;
}
.price-range-input:active::-webkit-slider-thumb {
  cursor: grabbing;
}
.price-range-input:active::-moz-range-thumb {
  cursor: grabbing;
}
</style>
