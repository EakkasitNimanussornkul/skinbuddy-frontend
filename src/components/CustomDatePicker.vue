<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  modelValue: string | null
  minDate?: string
  placeholder?: string
}>()

const emit = defineEmits(['update:modelValue'])

const isCalendarOpen = ref(false)
const manualInput = ref('')
const selectedDate = ref<Date | null>(null)
const currentMonthView = ref(new Date())

const formatDateForInput = (date: Date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Keep internal state synced with the parent's v-model
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    const d = new Date(newVal)
    if (!isNaN(d.getTime())) {
      selectedDate.value = d
      manualInput.value = formatDateForInput(d)
      currentMonthView.value = new Date(d.getFullYear(), d.getMonth(), 1)
    }
  } else {
    selectedDate.value = null
    manualInput.value = ''
  }
}, { immediate: true })

const monthYearLabel = computed(() => {
  return currentMonthView.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const calendarGrid = computed(() => {
  const year = currentMonthView.value.getFullYear()
  const month = currentMonthView.value.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const days = []
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true })
  }
  const remainingSlots = (7 - (days.length % 7)) % 7
  if (remainingSlots < 7) {
    for (let i = 1; i <= remainingSlots; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }
  }
  return days
})

const isPastDate = (date: Date) => {
  if (!props.minDate) return false
  const min = new Date(props.minDate + 'T00:00:00')
  min.setHours(0,0,0,0)
  return date.getTime() < min.getTime()
}

const isSameDay = (d1: Date, d2: Date | null) => {
  if (!d2) return false
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

const nextMonth = () => currentMonthView.value = new Date(currentMonthView.value.getFullYear(), currentMonthView.value.getMonth() + 1, 1)
const prevMonth = () => currentMonthView.value = new Date(currentMonthView.value.getFullYear(), currentMonthView.value.getMonth() - 1, 1)

const handleDateSelect = (date: Date) => {
  if (isPastDate(date)) return
  const formatted = formatDateForInput(date)
  emit('update:modelValue', formatted)
  isCalendarOpen.value = false
}

const handleManualInputBlur = () => {
  const parsedDate = new Date(manualInput.value + 'T00:00:00')
  if (isNaN(parsedDate.getTime()) || isPastDate(parsedDate)) {
    manualInput.value = selectedDate.value ? formatDateForInput(selectedDate.value) : ''
    return
  }
  emit('update:modelValue', formatDateForInput(parsedDate))
}
</script>

<template>
  <div class="relative w-full">
    <div class="relative flex items-center">
      <input
        type="text"
        v-model="manualInput"
        @blur="handleManualInputBlur"
        @keyup.enter="handleManualInputBlur"
        :placeholder="placeholder || 'YYYY-MM-DD'"
        class="w-full bg-white dark:bg-stone-900 border-2 border-red-100 dark:border-red-900/50 text-brand-text dark:text-white px-3 py-2.5 pr-10 rounded-xl focus:outline-none focus:border-red-400 text-sm shadow-sm transition-colors placeholder:text-stone-400 placeholder:font-normal"
      />
      <button
        @click="isCalendarOpen = !isCalendarOpen"
        class="absolute right-2 p-1.5 rounded-lg transition-colors"
        :class="isCalendarOpen ? 'text-red-500 bg-red-50 dark:bg-red-900/30' : 'text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      </button>
    </div>

    <div v-show="isCalendarOpen" class="mt-2 bg-white dark:bg-stone-900 border-2 border-red-100 dark:border-red-900/50 rounded-xl p-3 shadow-inner animate-expand">
      <div class="flex items-center justify-between mb-3">
        <button @click="prevMonth" class="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span class="text-xs font-bold text-brand-text dark:text-stone-200">{{ monthYearLabel }}</span>
        <button @click="nextMonth" class="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div class="grid grid-cols-7 mb-1">
        <span v-for="day in daysOfWeek" :key="day" class="text-center text-[10px] font-bold text-stone-400 uppercase tracking-widest">{{ day }}</span>
      </div>

      <div class="grid grid-cols-7 gap-1">
        <button
          v-for="(day, index) in calendarGrid"
          :key="index"
          :disabled="isPastDate(day.date)"
          @click="handleDateSelect(day.date)"
          class="aspect-square w-full flex items-center justify-center rounded-lg text-xs font-semibold transition-all"
          :class="[
            isPastDate(day.date) ? 'opacity-25 cursor-not-allowed line-through decoration-stone-500' : 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95',
            day.isCurrentMonth ? 'text-brand-text dark:text-stone-200' : 'text-stone-300 dark:text-stone-600',
            isSameDay(day.date, selectedDate) ? '!bg-red-500 text-white shadow-md shadow-red-500/30' : '',
            isSameDay(day.date, new Date()) && !isSameDay(day.date, selectedDate) ? 'text-red-500 border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10' : ''
          ]"
        >
          {{ day.date.getDate() }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-expand {
  animation: expandDown 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transform-origin: top center;
}
@keyframes expandDown {
  from { opacity: 0; transform: scaleY(0.95); }
  to { opacity: 1; transform: scaleY(1); }
}
</style>
