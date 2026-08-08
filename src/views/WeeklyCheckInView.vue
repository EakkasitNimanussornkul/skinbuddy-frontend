<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentLog, submitLog } from '../api/analysisApi'
import { useToast } from '../composables/useToast'
import WeeklyLogForm from '../components/Analysis/WeeklyLogForm.vue'
import AnalysisReportCard from '../components/Analysis/AnalysisReportCard.vue'

const router = useRouter()
const { addToast } = useToast()

const loading = ref(true)
const submitting = ref(false)
const existingLog = ref<any>(null)
const report = ref<any>(null)
const stage = ref<'form' | 'result'>('form')

onMounted(async () => {
  try {
    const data = await getCurrentLog()
    existingLog.value = data.log // may be null (UC-23 A1)
  } catch {
    // non-fatal; user can still submit
  } finally {
    loading.value = false
  }
})

const onSubmit = async (payload: any) => {
  submitting.value = true
  try {
    const data = await submitLog(payload)
    report.value = data.report
    stage.value = 'result'
    addToast('Check-in saved', 'success')
  } catch {
    addToast('Failed to submit your check-in', 'error')
  } finally {
    submitting.value = false
  }
}

const editAgain = () => {
  stage.value = 'form'
}
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans transition-colors duration-300 pb-28 pt-6">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 flex flex-col gap-6 w-full">

      <!-- Header -->
      <div class="flex items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl sm:text-3xl font-serif font-bold dark:text-white">Weekly Check-in</h1>
          <p class="text-xs text-brand-text-muted mt-0.5">Track how your skin responds to your routine.</p>
        </div>
        <button
          @click="router.push('/analysis')"
          class="text-xs font-bold text-brand-primary hover:text-brand-primary-hover inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-primary-light/60 dark:bg-brand-primary/10 transition-colors cursor-pointer shrink-0"
        >
          History
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-brand-text-muted animate-pulse">
        <div class="w-10 h-10 border-4 border-brand-surface-border border-t-brand-primary rounded-full animate-spin mb-3"></div>
      </div>

      <!-- FORM -->
      <template v-else-if="stage === 'form'">
        <div v-if="existingLog" class="bg-brand-primary-light/60 dark:bg-brand-primary/10 border border-brand-primary/20 rounded-2xl p-4 text-sm text-brand-text dark:text-stone-200 flex items-start gap-2.5">
          <svg class="w-5 h-5 text-brand-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>You already checked in this week. Submitting again will <strong>update</strong> this week's log.</span>
        </div>

        <WeeklyLogForm :initial="existingLog" :submitting="submitting" @submit="onSubmit" />
      </template>

      <!-- RESULT (report) -->
      <template v-else>
        <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl border border-brand-surface-border dark:border-stone-800 shadow-sm p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p class="text-sm font-bold text-brand-text dark:text-white">Your check-in is saved</p>
            <p class="text-xs text-brand-text-muted">Here's what SkinBuddy found this week.</p>
          </div>
        </div>

        <AnalysisReportCard v-if="report" :report="report" />

        <div class="grid grid-cols-2 gap-3">
          <button @click="editAgain" class="py-3.5 rounded-xl font-bold text-sm text-brand-text dark:text-stone-300 bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 hover:bg-brand-bg-light dark:hover:bg-stone-800 transition-colors cursor-pointer">Edit check-in</button>
          <button @click="router.push('/routine')" class="py-3.5 rounded-xl font-bold text-sm text-white bg-brand-primary hover:bg-brand-primary-hover transition-all shadow-md active:scale-[0.98] cursor-pointer">Back to routine</button>
        </div>
      </template>

    </div>
  </div>
</template>
