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

// 🌟 CRITICAL FIX: Watch ceiling limit so values never exceed the new max! 🌟
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

// 🌟 Strict percentage boundaries guarantee zero CSS bar overflow 🌟
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
  <div class="bg-brand-surface-light dark:bg-brand-surface-dark p-6 rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-sm space-y-6 overflow-hidden">

    <!-- Header & Editable Ceiling -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h4 class="text-sm font-serif font-bold text-brand-text dark:text-white">Price Range</h4>
        <p class="text-xs font-mono font-bold text-brand-primary mt-0.5">
          ฿{{ localMin.toLocaleString() }} - ฿{{ localMax.toLocaleString() }}
        </p>
      </div>

      <div class="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-200/60 dark:border-stone-800">
        <span class="text-[10px] font-bold text-stone-400 uppercase">Ceiling ฿</span>
        <input
          v-model.number="ceilingLimit"
          type="number"
          step="100"
          min="500"
          max="20000"
          class="w-16 bg-transparent text-xs font-mono font-bold outline-none text-right text-brand-text dark:text-white"
        />
      </div>
    </div>

    <!-- Dual Slider Track Area -->
    <div class="relative pt-6 pb-2">

      <!-- Tooltip Min -->
      <div
        class="absolute -top-1 -translate-x-1/2 px-2 py-0.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-[10px] font-mono font-black rounded-md shadow-sm pointer-events-none z-10"
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
      <div class="relative w-full h-2 bg-stone-200 dark:bg-stone-800 rounded-full"></div>

      <!-- Active Range Bar -->
        <div
          class="absolute top-6 h-2 bg-gradient-to-r from-purple-500 to-brand-primary rounded-full pointer-events-none"
          :style="{ left: `${leftPercent}%`, width: `${widthPercent}%` }"
        ></div>

      <!-- Range Input Min -->
      <input
        v-model.number="localMin"
        @input="handleMinChange"
        type="range"
        :min="0"
        :max="ceilingLimit"
        step="10"
        class="absolute top-5 left-0 w-full appearance-none bg-transparent pointer-events-none z-20 custom-slider"
      />

      <!-- Range Input Max -->
      <input
        v-model.number="localMax"
        @input="handleMaxChange"
        type="range"
        :min="0"
        :max="ceilingLimit"
        step="10"
        class="absolute top-5 left-0 w-full appearance-none bg-transparent pointer-events-none z-20 custom-slider"
      />
    </div>

    <!-- Buttons -->
    <div class="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800/80">
      <button
        @click="handleClear"
        type="button"
        class="px-5 py-2 bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
      >
        CLEAR
      </button>

      <button
        @click="handleApply"
        type="button"
        class="px-6 py-2 bg-brand-primary hover:bg-pink-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
      >
        APPLY
      </button>
    </div>

  </div>
</template>
<style scoped>
.custom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #ffffff;
  border: 3px solid #FF7EB3; /* Updated to Aquatic Pink */
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}
.custom-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}
.custom-slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #ffffff;
  border: 3px solid #FF7EB3; /* Updated to Aquatic Pink */
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}
</style>
