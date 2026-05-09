<script setup lang="ts">
import { ref } from 'vue'

// --- DYNAMIC CALENDAR LOGIC (Locked Mon-Sun) ---
const generateWeek = () => {
  const daysArray = []
  const today = new Date()

  // In JavaScript, Sunday is 0, Monday is 1.
  // We calculate how many days to jump backwards to find Monday.
  const currentDay = today.getDay()
  const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1

  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - distanceToMonday)

  // Hardcoding the labels ensures it perfectly matches your requested layout
  const weekLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(startOfWeek)
    targetDate.setDate(startOfWeek.getDate() + i)

    daysArray.push({
      day: weekLabels[i],
      date: targetDate.getDate(),
      // Checks if this specific loop iteration matches exactly today
      active: targetDate.toDateString() === today.toDateString()
    })
  }
  return daysArray
}

const days = ref(generateWeek())

// --- HEADER DATE LOGIC ---
const getHeaderDate = () => {
  const today = new Date()
  const day = today.getDate()
  const month = today.toLocaleString('en-US', { month: 'short' }) // Gets "May", "Jun", etc.
  return `Today, ${day} ${month}`
}

const headerTitle = ref(getHeaderDate())

// --- MOCK ROUTINE DATA ---
const morningRoutine = [
  { step: 1, type: 'Cleanser', name: 'Hydrating Facial Cleanser', brand: 'CeraVe' },
  { step: 2, type: 'Moisturizer', name: 'Hydration Station', brand: 'Geek & Gorgeous' },
  { step: 3, type: 'Sun protection', name: 'Madagascar Centella Hyalu-Cica Water-Fit Sun Serum SPF50+ PA++++', brand: 'Skin1004' }
]
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-clinical-bg pt-4 pb-28 font-sans transition-colors duration-300">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      <div class="bg-white dark:bg-clinical-surface p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mb-6 transition-colors">
        <div class="flex justify-between items-center mb-5 gap-2">
          <div class="flex gap-2 text-slate-400 dark:text-slate-500 text-xs">
            <span class="flex items-center">⚡ 1 <span class="ml-1 opacity-60">☁️ 0</span></span>
          </div>
  <h1 class="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{{ headerTitle }}</h1>          <div class="flex gap-3 text-slate-400 dark:text-slate-500">
            <span>🔔</span><span>🀱</span>
          </div>
        </div>

<div class="flex justify-between items-center gap-0 sm:gap-1 pt-1 pb-1 px-1">
            <div v-for="day in days" :key="day.day" class="flex flex-col items-center group cursor-pointer">
            <span class="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">{{ day.day }}</span>
            <div
              class="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-xs sm:text-sm font-semibold rounded-full transition-colors"
              :class="day.active ? 'bg-[#2E5BFF] text-white' : 'text-slate-800 dark:text-slate-200 group-hover:bg-slate-100 dark:group-hover:bg-slate-800'"
            >
              {{ day.date }}
            </div>
          </div>
        </div>
      </div>

      <div class="mb-8 p-3 pt-0">
        <h2 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 px-2">MORNING</h2>

        <div class="bg-white dark:bg-clinical-surface p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <div class="flex justify-between items-center mb-5 pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div class="flex items-center gap-2">
              <span class="text-slate-400 dark:text-slate-500 text-sm">🔄</span>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white tracking-tight uppercase">MY ROUTINE</h3>
            </div>
            <div class="flex items-center gap-3 text-sm text-slate-400 dark:text-slate-500 opacity-80">
              <span class="text-xs">💎</span>
              <span class="text-[#2E5BFF] text-lg leading-none">✅</span>
            </div>
          </div>

          <div class="space-y-5">
            <div v-for="product in morningRoutine" :key="product.step" class="flex items-center justify-between gap-4">
              <div class="flex gap-3.5 items-center flex-grow">
                <div class="w-11 h-11 bg-slate-50 dark:bg-clinical-bg rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 font-bold overflow-hidden flex-shrink-0 transition-colors">
                  <span v-if="product.brand === 'CeraVe'" class="text-emerald-700 dark:text-emerald-500 text-xs scale-[0.8]">CeraVe</span>
                  <span v-else class="text-xs opacity-60">Logo</span>
                </div>
                <div class="leading-tight">
                  <span class="text-slate-500 dark:text-slate-300 text-xs tracking-tight block">
                    {{ product.step }}. <strong class="text-slate-900 dark:text-white font-semibold">{{ product.type }}</strong>:
                    {{ product.name }}
                  </span>
                  <span class="text-slate-400 dark:text-slate-500 text-xs tracking-tight block mt-0.5">{{ product.brand }}</span>
                </div>
              </div>
              <div class="flex items-center gap-3 text-sm flex-shrink-0">
                <span class="text-slate-400 dark:text-slate-500 text-xs">💎</span>
                <span class="text-[#2E5BFF] text-lg leading-none">✅</span>
              </div>
            </div>

            <div class="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 mt-5 text-slate-400 dark:text-slate-500 text-sm cursor-pointer hover:opacity-80 transition-opacity">
              <div class="flex items-center gap-1.5">
                <span>•••</span>
                <span class="text-slate-600 dark:text-slate-300 font-semibold text-xs tracking-wide">More</span>
              </div>
              <div class="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span>+</span>
                <span class="opacity-80">⛳</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-3 pt-0">
        <h2 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 px-2">EVENING</h2>

        <div class="bg-white dark:bg-clinical-surface p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm opacity-90 transition-colors">
          <div class="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div class="flex items-center gap-2">
              <span class="text-slate-400 dark:text-slate-500 text-sm">🔄</span>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white tracking-tight uppercase">MY ROUTINE</h3>
            </div>
            <div class="flex items-center gap-3 text-sm text-slate-400 dark:text-slate-500">
               <span class="text-xs">💎</span>
              <span class="text-lg leading-none opacity-50 grayscale">✅</span>
            </div>
          </div>
          <div class="flex flex-col items-center py-10 text-slate-400 dark:text-slate-500 text-center gap-2">
              <span>🀱</span>
              <p class="text-sm tracking-tight text-slate-500 dark:text-slate-400">Your Evening routine will live here.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pb-28 { padding-bottom: 7rem; }
</style>
