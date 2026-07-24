<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getHistory } from '../api/analysisApi'
import { useToast } from '../composables/useToast'
import AnalysisReportCard from '../components/Analysis/AnalysisReportCard.vue'
import EmptyState from '../components/Shared/EmptyState.vue'

const router = useRouter()
const { addToast } = useToast()

const loading = ref(true)
const timeline = ref<any[]>([]) // [{ week_start, log, report }]
const selected = ref<any>(null) // selected timeline entry to show report

const WEEKS_TO_SHOW = 8

function mondayOf(d: Date): Date {
  const copy = new Date(d)
  const day = (copy.getDay() + 6) % 7 // 0 = Monday
  copy.setDate(copy.getDate() - day)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

onMounted(async () => {
  try {
    const data = await getHistory()
    timeline.value = data.timeline || []
  } catch {
    addToast('Could not load your history', 'error')
  } finally {
    loading.value = false
  }
})

const byWeek = computed(() => {
  const map: Record<string, any> = {}
  for (const entry of timeline.value) map[entry.week_start] = entry
  return map
})

// Build the last N weeks so missing weeks render as gaps (UC-26 SRS-101)
const weeks = computed(() => {
  const start = mondayOf(new Date())
  const rows: any[] = []
  for (let i = 0; i < WEEKS_TO_SHOW; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() - i * 7)
    const key = iso(d)
    const entry = byWeek.value[key]
    rows.push({
      week_start: key,
      label: i === 0 ? 'This week' : i === 1 ? 'Last week' : `${i} weeks ago`,
      dateLabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      entry: entry || null,
    })
  }
  return rows
})

const hasAnyLog = computed(() => timeline.value.length > 0)

function topSymptom(entry: any): string | null {
  const symptoms = entry?.log?.symptoms || []
  if (!symptoms.length) return null
  const top = [...symptoms].sort((a, b) => (b.severity || 0) - (a.severity || 0))[0]
  return top ? `${top.symptom} · ${top.severity}/5` : null
}
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans transition-colors duration-300 pb-28 pt-6">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 flex flex-col gap-6 w-full">

      <!-- Header -->
      <div class="flex items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl sm:text-3xl font-serif font-bold dark:text-white">Skin Progress</h1>
          <p class="text-xs text-brand-text-muted mt-0.5">Your week-over-week check-in history.</p>
        </div>
        <button
          @click="router.push('/checkin')"
          class="text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer shrink-0 shadow-sm"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
          Check in
        </button>
      </div>

      <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-brand-text-muted animate-pulse">
        <div class="w-10 h-10 border-4 border-brand-surface-border border-t-brand-primary rounded-full animate-spin mb-3"></div>
      </div>

      <!-- Empty -->
      <EmptyState
        v-else-if="!hasAnyLog"
        title="No check-ins yet"
        message="Submit your first weekly check-in to start tracking how your skin responds to your routine over time."
        action-label="Start weekly check-in"
        @action="router.push('/checkin')"
      >
        <template #icon>
          <svg class="w-10 h-10 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        </template>
      </EmptyState>

      <!-- Timeline -->
      <div v-else class="relative flex flex-col">
        <div v-for="(w, i) in weeks" :key="w.week_start" class="flex gap-4">
          <!-- rail -->
          <div class="flex flex-col items-center">
            <div
              class="w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-4"
              :class="w.entry
                ? 'bg-brand-primary border-brand-primary'
                : 'bg-brand-bg-light dark:bg-brand-bg-dark border-brand-surface-border dark:border-stone-700'"
            ></div>
            <div v-if="i < weeks.length - 1" class="w-0.5 flex-1 bg-brand-surface-border dark:bg-stone-800"></div>
          </div>

          <!-- card -->
          <div class="flex-1 pb-4">
            <button
              v-if="w.entry"
              @click="selected = w.entry"
              class="w-full text-left bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl border border-brand-surface-border dark:border-stone-800 shadow-sm p-4 hover:border-brand-primary transition-all cursor-pointer"
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-bold text-brand-text dark:text-white">{{ w.label }}</span>
                <span class="text-[11px] text-brand-text-muted">{{ w.dateLabel }}</span>
              </div>
              <p class="text-xs text-brand-text-muted mt-1">
                <template v-if="topSymptom(w.entry)">Top: {{ topSymptom(w.entry) }}</template>
                <template v-else>Logged · no symptoms</template>
              </p>
              <span class="inline-flex items-center gap-1 text-[11px] font-bold text-brand-primary mt-2">
                View report
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg>
              </span>
            </button>

            <!-- gap week (SRS-101) -->
            <div v-else class="rounded-2xl border border-dashed border-brand-surface-border dark:border-stone-700 p-4 opacity-70">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-brand-text-muted">{{ w.label }}</span>
                <span class="text-[11px] text-brand-text-muted">{{ w.dateLabel }}</span>
              </div>
              <p class="text-xs text-brand-text-muted mt-1">No log submitted</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Report panel (UC-25) -->
    <Teleport to="body">
      <div v-if="selected" class="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-stone-900/70 backdrop-blur-sm p-0 sm:p-4 animate-fade-in" @click.self="selected = null">
        <div class="bg-brand-bg-light dark:bg-brand-bg-dark w-full max-w-2xl rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden border border-brand-surface-border dark:border-stone-800 animate-slide-up flex flex-col max-h-[90vh]">
          <div class="px-6 pt-6 pb-4 flex items-center justify-between border-b border-brand-surface-border dark:border-stone-800 bg-brand-surface-light dark:bg-brand-surface-dark">
            <div>
              <h2 class="text-lg font-serif font-bold text-brand-text dark:text-white">Weekly report</h2>
              <p class="text-xs text-brand-text-muted">Week of {{ selected.week_start }}</p>
            </div>
            <button @click="selected = null" class="text-brand-text-muted hover:text-brand-text dark:hover:text-white transition-colors cursor-pointer">✕</button>
          </div>
          <div class="p-6 overflow-y-auto hide-scrollbar">
            <AnalysisReportCard v-if="selected.report" :report="selected.report" />
            <div v-else class="text-center py-8 text-brand-text-muted text-sm">No report was generated for this week.</div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
</style>
