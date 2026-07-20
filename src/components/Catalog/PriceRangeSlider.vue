<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  minPrice: number
  maxPrice: number
  defaultMaxLimit?: number
}>()

const emit = defineEmits(['apply', 'clear'])

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
  <!-- 🌟 Container stripped down to a zero-padded, transparent block wrapper 🌟 -->
  <div class="w-full space-y-4">

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
</style>
