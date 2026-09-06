<script setup lang="ts">
/**
 * UC-27 View Routine Completion History — SRS-103 … SRS-108.
 *
 * A month calendar of completed / partial / missed days, a streak summary, and a
 * per-day detail sheet. Day statuses are computed on the server, where "due" is
 * derived from each step's frequency (see schedule_service.py).
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAdherence, type AdherenceResponse, type AdherenceDay } from '../api/routineApi'
import { useToast } from '../composables/useToast'
import EmptyState from '../components/Shared/EmptyState.vue'

const router = useRouter()
const { addToast } = useToast()

const loading = ref(true)
const data = ref<AdherenceResponse | null>(null)
const cursor = ref(new Date())          // any date inside the month being shown
const selectedKey = ref<string | null>(null)

// Local date parts — never toISOString(), which shifts to UTC and lands a day early
// east of Greenwich.
const keyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

onMounted(async () => {
  try {
    data.value = await getAdherence()
  } catch {
    addToast('Could not load your history', 'error')
  } finally {
    loading.value = false
  }
})

const monthLabel = computed(() =>
  cursor.value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
)

const rangeStart = computed(() => (data.value ? new Date(data.value.range.from + 'T00:00:00') : null))
const today = new Date()

const canGoBack = computed(() => {
  if (!rangeStart.value) return false
  const first = new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1)
  return first > rangeStart.value
})
const canGoForward = computed(() => {
  const first = new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1)
  return first < new Date(today.getFullYear(), today.getMonth(), 1)
})

const shiftMonth = (delta: number) => {
  const d = new Date(cursor.value)
  d.setDate(1)
  d.setMonth(d.getMonth() + delta)
  cursor.value = d
}

// Monday-first grid, padded so the 1st lands under the right weekday.
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const cells = computed(() => {
  const year = cursor.value.getFullYear()
  const month = cursor.value.getMonth()
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7          // 0 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const out: { key: string | null; day: number | null; entry: AdherenceDay | null; isToday: boolean }[] = []
  for (let i = 0; i < lead; i++) out.push({ key: null, day: null, entry: null, isToday: false })
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    const key = keyOf(d)
    out.push({
      key,
      day,
      entry: data.value?.days[key] ?? null,
      isToday: key === keyOf(today),
    })
  }
  return out
})

const STATUS_CLASS: Record<string, string> = {
  complete: 'bg-emerald-500 text-white border-emerald-500',
  partial: 'bg-amber-400 text-amber-950 border-amber-400',
  missed: 'bg-semantic-error/15 text-semantic-error border-semantic-error/40',
  none: 'bg-transparent text-brand-text-muted border-brand-surface-border dark:border-stone-700',
}
const cellClass = (entry: AdherenceDay | null) =>
  STATUS_CLASS[entry?.status ?? 'none'] ?? STATUS_CLASS.none

const selected = computed(() => (selectedKey.value ? data.value?.days[selectedKey.value] ?? null : null))
const selectedLabel = computed(() =>
  selectedKey.value
    ? new Date(selectedKey.value + 'T00:00:00').toLocaleDateString(undefined, {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : '',
)

const openDay = (key: string | null, entry: AdherenceDay | null) => {
  if (!key || !entry || entry.status === 'none') return
  selectedKey.value = key
}
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans transition-colors duration-300 pb-28 pt-6">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 flex flex-col gap-6 w-full">

      <!-- Header -->
      <div class="flex items-center gap-3">
        <button
          @click="router.push('/routine')"
          aria-label="Back to routine"
          class="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 text-brand-text-muted hover:text-brand-primary hover:border-brand-primary/40 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <svg class="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div class="min-w-0">
          <h1 class="text-2xl sm:text-3xl font-serif font-bold dark:text-white">Completion History</h1>
          <p class="text-xs text-brand-text-muted mt-0.5">Which days you kept to your routine.</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-brand-text-muted animate-pulse">
        <div class="w-10 h-10 border-4 border-brand-surface-border border-t-brand-primary rounded-full animate-spin mb-3"></div>
      </div>

      <!-- [SRS-108] Empty state -->
      <EmptyState
        v-else-if="!data?.has_history"
        title="No history yet"
        message="Tick off your routine steps and the days you complete will show up here."
        action-label="Go to my routine"
        @action="router.push('/routine')"
      >
        <template #icon>
          <svg class="w-10 h-10 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </template>
      </EmptyState>

      <template v-else>
        <!-- [SRS-107] Streak + adherence summary -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl border border-brand-surface-border dark:border-stone-800 shadow-sm p-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted">Current streak</p>
            <p class="text-2xl font-serif font-bold text-brand-primary mt-1">
              {{ data.streak }} <span class="text-sm font-sans font-bold">{{ data.streak === 1 ? 'day' : 'days' }}</span>
            </p>
          </div>
          <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl border border-brand-surface-border dark:border-stone-800 shadow-sm p-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted">Days completed</p>
            <p class="text-2xl font-serif font-bold text-brand-text dark:text-white mt-1">{{ data.adherence_pct }}%</p>
          </div>
        </div>

        <!-- [SRS-105] Calendar -->
        <section class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl border border-brand-surface-border dark:border-stone-800 shadow-sm p-4 sm:p-5">
          <div class="flex items-center justify-between mb-4">
            <button
              @click="shiftMonth(-1)" :disabled="!canGoBack" aria-label="Previous month"
              class="w-8 h-8 rounded-lg border border-brand-surface-border dark:border-stone-700 text-brand-text-muted hover:text-brand-primary hover:border-brand-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center"
            >
              <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <p class="text-sm font-bold text-brand-text dark:text-white">{{ monthLabel }}</p>
            <button
              @click="shiftMonth(1)" :disabled="!canGoForward" aria-label="Next month"
              class="w-8 h-8 rounded-lg border border-brand-surface-border dark:border-stone-700 text-brand-text-muted hover:text-brand-primary hover:border-brand-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center"
            >
              <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <div class="grid grid-cols-7 gap-1.5 mb-2">
            <p v-for="w in WEEKDAYS" :key="w" class="text-[10px] font-bold uppercase text-center text-brand-text-muted">{{ w.charAt(0) }}</p>
          </div>

          <div class="grid grid-cols-7 gap-1.5">
            <template v-for="(cell, i) in cells" :key="i">
              <div v-if="!cell.day" class="aspect-square"></div>
              <button
                v-else
                @click="openDay(cell.key, cell.entry)"
                :disabled="!cell.entry || cell.entry.status === 'none'"
                :class="[
                  'aspect-square rounded-xl border text-xs font-bold flex items-center justify-center transition-all',
                  cellClass(cell.entry),
                  cell.entry && cell.entry.status !== 'none' ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default',
                  cell.isToday ? 'ring-2 ring-brand-primary ring-offset-1 ring-offset-brand-surface-light dark:ring-offset-brand-surface-dark' : '',
                ]"
              >
                {{ cell.day }}
              </button>
            </template>
          </div>

          <!-- Legend -->
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-brand-surface-border dark:border-stone-800">
            <span class="inline-flex items-center gap-1.5 text-[10px] font-semibold text-brand-text-muted"><span class="w-3 h-3 rounded bg-emerald-500"></span>All done</span>
            <span class="inline-flex items-center gap-1.5 text-[10px] font-semibold text-brand-text-muted"><span class="w-3 h-3 rounded bg-amber-400"></span>Partly done</span>
            <span class="inline-flex items-center gap-1.5 text-[10px] font-semibold text-brand-text-muted"><span class="w-3 h-3 rounded bg-semantic-error/25 border border-semantic-error/40"></span>Missed</span>
            <span class="inline-flex items-center gap-1.5 text-[10px] font-semibold text-brand-text-muted"><span class="w-3 h-3 rounded border border-brand-surface-border dark:border-stone-700"></span>Rest day</span>
          </div>
        </section>
      </template>
    </div>

    <!-- [SRS-106] Day detail -->
    <Teleport to="body">
      <div
        v-if="selected"
        class="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-sm p-0 sm:p-4"
        @click.self="selectedKey = null"
      >
        <div class="bg-brand-surface-light dark:bg-brand-surface-dark w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl border border-brand-surface-border dark:border-stone-800 max-h-[80vh] overflow-y-auto">
          <div class="px-5 pt-5 pb-3 border-b border-brand-surface-border dark:border-stone-800">
            <p class="text-sm font-bold text-brand-text dark:text-white">{{ selectedLabel }}</p>
            <p class="text-xs text-brand-text-muted mt-0.5">{{ selected.done }} of {{ selected.due }} steps completed</p>
          </div>

          <div class="p-5 space-y-4">
            <div v-if="selected.completed.length">
              <p class="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1.5">Completed</p>
              <ul class="space-y-1">
                <li v-for="s in selected.completed" :key="s.step_id || s.product_name" class="text-sm text-brand-text dark:text-stone-200 flex items-start gap-2">
                  <svg class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
                  {{ s.product_name }}
                </li>
              </ul>
            </div>

            <div v-if="selected.missed.length">
              <p class="text-[10px] font-bold uppercase tracking-widest text-semantic-error mb-1.5">Missed</p>
              <ul class="space-y-1">
                <li v-for="s in selected.missed" :key="s.step_id || s.product_name" class="text-sm text-brand-text-muted flex items-start gap-2">
                  <svg class="w-4 h-4 text-semantic-error/70 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  {{ s.product_name }}
                </li>
              </ul>
            </div>

            <div v-if="selected.also_completed.length">
              <p class="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted mb-1.5">No longer in your routine</p>
              <ul class="space-y-1">
                <li v-for="(s, i) in selected.also_completed" :key="i" class="text-sm text-brand-text-muted">{{ s.product_name }}</li>
              </ul>
            </div>
          </div>

          <div class="p-4 border-t border-brand-surface-border dark:border-stone-800">
            <button @click="selectedKey = null" class="w-full py-3 rounded-xl font-bold text-sm text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors cursor-pointer active:scale-[0.98]">Close</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
