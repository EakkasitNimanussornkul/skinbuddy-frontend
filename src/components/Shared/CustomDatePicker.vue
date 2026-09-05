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
  emit('update:modelValue', formatDateForInput(date))
  isCalendarOpen.value = false
}
</script>

<template>
  <div class="relative w-full">
    <div class="relative flex items-center">
      <!-- FE-DEF-18: readonly. This field accepted keystrokes and displayed
           them, but nothing emitted update:modelValue from it - the only emit
           is handleDateSelect, reached from the calendar grid. A user could
           type a date, see it, save, and have the previously selected value
           written instead. Readonly rather than parsing typed input, because a
           typed date would also bypass isPastDate and the min-date rule the
           calendar enforces. -->
      <input
        type="text"
        readonly
        v-model="manualInput"
        :placeholder="placeholder || 'Select a date'"
        @click="isCalendarOpen = !isCalendarOpen"
        class="w-full bg-white dark:bg-brand-surface-dark border-2 border-stone-200 dark:border-stone-800 text-brand-text dark:text-stone-200 px-3 py-3 rounded-xl focus:outline-none focus:border-brand-primary dark:focus:border-brand-primary text-sm shadow-sm transition-all cursor-pointer"
      />
      <button
        @click="isCalendarOpen = !isCalendarOpen"
        class="absolute right-2 p-1.5 rounded-lg transition-colors"
        :class="isCalendarOpen ? 'text-brand-primary bg-brand-primary-light' : 'text-stone-400 hover:text-brand-primary'"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      </button>
    </div>

    <div v-show="isCalendarOpen" class="mt-2 bg-white dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xl z-50 absolute w-full animate-expand">
      <div class="flex items-center justify-between mb-4">
        <button @click="prevMonth" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span class="text-xs font-bold text-brand-text dark:text-stone-200 tracking-widest uppercase">{{ monthYearLabel }}</span>
        <button @click="nextMonth" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div class="grid grid-cols-7 mb-2">
        <span v-for="day in daysOfWeek" :key="day" class="text-center text-[10px] font-bold text-stone-400">{{ day }}</span>
      </div>

      <div class="grid grid-cols-7 gap-1">
        <button
          v-for="(day, index) in calendarGrid"
          :key="index"
          :disabled="isPastDate(day.date)"
          @click="handleDateSelect(day.date)"
          class="aspect-square w-full flex items-center justify-center rounded-lg text-xs font-semibold transition-all"
          :class="[
            isPastDate(day.date) ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer hover:bg-brand-primary-light dark:hover:bg-brand-primary/20',
            day.isCurrentMonth ? 'text-brand-text dark:text-stone-200' : 'text-stone-300 dark:text-stone-700',
            isSameDay(day.date, selectedDate) ? '!bg-brand-primary text-white shadow-md' : '',
            isSameDay(day.date, new Date()) && !isSameDay(day.date, selectedDate) ? 'text-brand-primary font-bold' : ''
          ]"
        >
          {{ day.date.getDate() }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-expand { animation: expandDown 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes expandDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
</style>
