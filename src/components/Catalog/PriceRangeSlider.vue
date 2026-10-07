<script setup lang="ts">
import { ref, computed, watch } from 'vue'

/**
 * Two handles on one track for the lowest and highest price.
 *
 * `variant` "panel" (the default) is Explore's lg filter panel, unchanged: the
 * editable ceiling, a value tag over each handle, and its own Clear and Apply.
 * "sheet" is for the phone Filters sheet, which has its own "Clear all" and
 * "Show products": no buttons and no number box, one "฿X – ฿Y" label above the
 * track (two tags would overlap where the handles meet), 44px handles, and every
 * move reported as `update:range` for the sheet's draft. A drag on the track
 * pans sideways only, so it does not scroll the sheet.
 */
const props = withDefaults(
  defineProps<{
    minPrice: number
    maxPrice: number
    defaultMaxLimit?: number
    variant?: 'panel' | 'sheet'
  }>(),
  { defaultMaxLimit: undefined, variant: 'panel' },
)

const emit = defineEmits<{
  apply: [range: { min: number; max: number }]
  clear: []
  'update:range': [range: { min: number; max: number }]
}>()

const sheet = computed(() => props.variant === 'sheet')

const localMin = ref(props.minPrice)
const localMax = ref(props.maxPrice)
const ceilingLimit = ref(props.defaultMaxLimit || 1500)

watch(() => props.minPrice, (val) => { localMin.value = val })
watch(() => props.maxPrice, (val) => { localMax.value = val })

watch(ceilingLimit, (newCeiling) => {
  if (!newCeiling || newCeiling < 100) ceilingLimit.value = 500
  if (localMax.value > ceilingLimit.value) localMax.value = ceilingLimit.value
  if (localMin.value > ceilingLimit.value - 20) localMin.value = Math.max(0, ceilingLimit.value - 20)
})

const handleMinChange = () => {
  if (localMin.value > localMax.value - 20) {
    localMin.value = Math.max(0, localMax.value - 20)
  }
}

const handleMaxChange = () => {
  if (localMax.value < localMin.value + 20) {
    localMax.value = Math.min(ceilingLimit.value, localMin.value + 20)
  }
  if (localMax.value > ceilingLimit.value) localMax.value = ceilingLimit.value
}

const leftPercent = computed(() => {
  const p = (localMin.value / ceilingLimit.value) * 100
  return Math.min(98, Math.max(0, p))
})

const widthPercent = computed(() => {
  const p = ((localMax.value - localMin.value) / ceilingLimit.value) * 100
  return Math.min(100 - leftPercent.value, Math.max(0, p))
})

// --- Sheet variant --------------------------------------------------------------
// The panel's rules (the 20 baht gap, the ceiling), then the handle moved back
// to the value they kept, since an unchanged value does not re-render it, and
// the range reported to the sheet.
const onSheetInput = (event: Event, handle: 'min' | 'max') => {
  if (handle === 'min') handleMinChange()
  else handleMaxChange()
  const input = event.target as HTMLInputElement
  const kept = String(handle === 'min' ? localMin.value : localMax.value)
  if (input.value !== kept) input.value = kept
  emit('update:range', { min: localMin.value, max: localMax.value })
}

// Where the handles meet, the one on top is the one that can still move: the
// lower handle once it is past the middle, the upper one before.
const lowerOnTop = computed(() => localMin.value > ceilingLimit.value / 2)

const baht = (amount: number) => `฿${amount.toLocaleString('en-US')}`
const spokenBaht = (amount: number) => `${amount.toLocaleString('en-US')} baht`

const handleApply = () => {
  emit('apply', { min: localMin.value, max: localMax.value })
}

const handleClear = () => {
  localMin.value = 0
  localMax.value = ceilingLimit.value
  emit('clear')
}
</script>

<template>
  <!-- Plain wrapper with no padding or background of its own -->
  <div v-if="!sheet" class="w-full space-y-4">

    <!-- Header & Editable Ceiling -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-brand-text-muted">Price Range</h4>
        <p class="text-xs font-mono font-bold text-brand-primary mt-0.5">
          ฿{{ localMin.toLocaleString() }} - ฿{{ localMax.toLocaleString() }}
        </p>
      </div>

      <div class="flex items-center gap-1.5 bg-brand-bg-light dark:bg-stone-900 px-3 py-1.5 rounded-xl border border-brand-surface-border dark:border-stone-800">
        <span class="text-[9px] font-bold text-brand-text-muted uppercase">Ceiling ฿</span>
        <input
          v-model.number="ceilingLimit"
          type="number"
          step="100"
          min="500"
          max="20000"
          class="w-14 bg-transparent text-xs font-mono font-bold outline-none text-right text-brand-text dark:text-white"
        />
      </div>
    </div>

    <!-- Dual Slider Track Area -->
    <div class="relative pt-5 pb-2">
      <!-- Tooltip Min -->
      <div
        class="absolute -top-1 -translate-x-1/2 px-2 py-0.5 bg-brand-text dark:bg-stone-200 text-white dark:text-brand-bg-dark text-[10px] font-mono font-black rounded-md shadow-sm pointer-events-none z-10"
        :style="{ left: `${leftPercent}%` }"
      >
        ฿{{ localMin }}
      </div>

      <!-- Tooltip Max -->
      <div
        class="absolute -top-1 -translate-x-1/2 px-2 py-0.5 bg-brand-primary text-white text-[10px] font-mono font-black rounded-md shadow-sm pointer-events-none z-10"
        :style="{ left: `${leftPercent + widthPercent}%` }"
      >
        ฿{{ localMax }}
      </div>

      <!-- Track Base -->
      <div class="relative w-full h-2 bg-brand-surface-border dark:bg-stone-800 rounded-full"></div>

      <!-- Active Range Bar -->
      <div
        class="absolute top-5 h-2 bg-gradient-to-r from-brand-primary-light to-brand-primary rounded-full pointer-events-none"
        :style="{ left: `${leftPercent}%`, width: `${widthPercent}%` }"
      ></div>

      <!-- Inputs -->
      <input v-model.number="localMin" @input="handleMinChange" type="range" :min="0" :max="ceilingLimit" step="10" class="absolute top-4 left-0 w-full appearance-none bg-transparent pointer-events-none z-20 custom-slider" />
      <input v-model.number="localMax" @input="handleMaxChange" type="range" :min="0" :max="ceilingLimit" step="10" class="absolute top-4 left-0 w-full appearance-none bg-transparent pointer-events-none z-20 custom-slider" />
    </div>

    <!-- Buttons -->
    <div class="flex items-center justify-between pt-2 border-t border-brand-surface-border dark:border-stone-800/60">
      <button @click="handleClear" type="button" class="px-4 py-1.5 bg-brand-bg-light dark:bg-stone-800 hover:bg-brand-surface-border text-brand-text-muted font-bold text-xs rounded-xl transition-all cursor-pointer">
        CLEAR
      </button>
      <button @click="handleApply" type="button" class="px-5 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer">
        APPLY
      </button>
    </div>
  </div>

  <!-- The phone sheet. Shrinks with the sheet (min-w-0), so it never pushes
       past a 375px screen. -->
  <div v-else class="price-slider-sheet w-full min-w-0 flex flex-col gap-1">
    <p class="price-range-label m-0 text-[15px] font-extrabold tabular-nums text-stone-800 dark:text-stone-100">
      {{ baht(localMin) }} – {{ baht(localMax) }}
    </p>
    <!-- touch-pan-x: a drag here moves a handle and never scrolls the sheet. -->
    <div class="price-track relative h-11 min-w-0 touch-pan-x">
      <!-- Inset by half a handle, so the bar's ends sit under the handles'
           centres. -->
      <div aria-hidden="true" class="absolute inset-x-[22px] top-1/2 -translate-y-1/2 h-2">
        <div class="absolute inset-0 rounded-full bg-brand-surface-border dark:bg-stone-600"></div>
        <div class="price-track-fill absolute inset-y-0 rounded-full bg-brand-primary-strong dark:bg-brand-primary" :style="{ left: `${leftPercent}%`, width: `${widthPercent}%` }"></div>
      </div>
      <input
        v-model.number="localMin"
        type="range"
        :min="0"
        :max="ceilingLimit"
        step="10"
        aria-label="Lowest price"
        :aria-valuetext="spokenBaht(localMin)"
        :class="['sheet-range sheet-range-min absolute inset-0 w-full h-11 m-0 appearance-none bg-transparent pointer-events-none outline-none', lowerOnTop ? 'z-30' : 'z-20']"
        @input="onSheetInput($event, 'min')"
      />
      <input
        v-model.number="localMax"
        type="range"
        :min="0"
        :max="ceilingLimit"
        step="10"
        aria-label="Highest price"
        :aria-valuetext="spokenBaht(localMax)"
        class="sheet-range sheet-range-max absolute inset-0 w-full h-11 m-0 appearance-none bg-transparent pointer-events-none outline-none z-20"
        @input="onSheetInput($event, 'max')"
      />
    </div>
  </div>
</template>

<style scoped>
.custom-slider {
  -webkit-appearance: none;
  width: 100%;
}
.custom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  border: 4px solid #06b6d4;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
}
.custom-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  border: 4px solid #06b6d4;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
}

/* The sheet's handles: a 44px target around a 24px dot (a white centre in a
   teal ring), and a wider halo while the handle has keyboard focus. Only the
   handles take a touch; the inputs themselves let it through. No motion. */
.sheet-range {
  -webkit-appearance: none;
}
.sheet-range::-webkit-slider-runnable-track {
  height: 44px;
  background: transparent;
}
.sheet-range::-moz-range-track {
  height: 44px;
  background: transparent;
}
.sheet-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 7px, var(--color-brand-primary-strong) 7.5px 12px, transparent 12.5px);
  cursor: grab;
  pointer-events: auto;
}
.sheet-range::-moz-range-thumb {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 7px, var(--color-brand-primary-strong) 7.5px 12px, transparent 12.5px);
  cursor: grab;
  pointer-events: auto;
}
:global(.dark) .sheet-range::-webkit-slider-thumb {
  background: radial-gradient(circle, #fff 0 7px, var(--color-brand-primary) 7.5px 12px, transparent 12.5px);
}
:global(.dark) .sheet-range::-moz-range-thumb {
  background: radial-gradient(circle, #fff 0 7px, var(--color-brand-primary) 7.5px 12px, transparent 12.5px);
}
.sheet-range:focus-visible::-webkit-slider-thumb {
  background: radial-gradient(circle, #fff 0 7px, var(--color-brand-primary-strong) 7.5px 12px, color-mix(in srgb, var(--color-brand-primary) 45%, transparent) 12.5px 18px, transparent 18.5px);
}
.sheet-range:focus-visible::-moz-range-thumb {
  background: radial-gradient(circle, #fff 0 7px, var(--color-brand-primary-strong) 7.5px 12px, color-mix(in srgb, var(--color-brand-primary) 45%, transparent) 12.5px 18px, transparent 18.5px);
}
</style>
