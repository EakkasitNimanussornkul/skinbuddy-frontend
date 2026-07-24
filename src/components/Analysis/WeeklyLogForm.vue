<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  initial?: any
  submitting?: boolean
}>()

const emit = defineEmits(['submit'])

const SYMPTOMS = [
  'Redness', 'Itchiness', 'Dryness', 'Oiliness', 'Breakouts',
  'Flaking', 'Stinging', 'Tightness', 'Bumps / Texture', 'Dark spots',
]
const AREAS = ['Forehead', 'Cheeks', 'Nose', 'Chin', 'Around eyes', 'Jawline', 'Neck']

// severity map: symptom -> 1..5 (presence in map = selected)
const severities = ref<Record<string, number>>({})
const areas = ref<Set<string>>(new Set())
const notes = ref('')

// Prefill when editing an existing log
if (props.initial) {
  for (const s of props.initial.symptoms || []) {
    severities.value[s.symptom] = s.severity || 3
  }
  for (const a of props.initial.affected_areas || []) areas.value.add(a)
  notes.value = props.initial.notes || ''
}

const toggleSymptom = (s: string) => {
  if (s in severities.value) {
    const copy = { ...severities.value }
    delete copy[s]
    severities.value = copy
  } else {
    severities.value = { ...severities.value, [s]: 3 }
  }
}

const setSeverity = (s: string, v: number) => {
  severities.value = { ...severities.value, [s]: v }
}

const toggleArea = (a: string) => {
  const next = new Set(areas.value)
  next.has(a) ? next.delete(a) : next.add(a)
  areas.value = next
}

const severityOf = (s: string): number => severities.value[s] ?? 0
const selectedSymptoms = computed(() => Object.keys(severities.value))
const canSubmit = computed(() => selectedSymptoms.value.length > 0 || notes.value.trim().length > 0)

const submit = () => {
  if (!canSubmit.value) return
  emit('submit', {
    symptoms: selectedSymptoms.value.map((s) => ({ symptom: s, severity: severities.value[s] })),
    affected_areas: Array.from(areas.value),
    notes: notes.value.trim() || null,
  })
}

const SEVERITY_LABEL = ['', 'Very mild', 'Mild', 'Moderate', 'Strong', 'Severe']
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Symptoms -->
    <section>
      <h2 class="text-sm font-bold text-brand-text dark:text-stone-200 mb-1">How is your skin this week?</h2>
      <p class="text-xs text-brand-text-muted mb-3">Select any symptoms you noticed, then rate each.</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="s in SYMPTOMS"
          :key="s"
          @click="toggleSymptom(s)"
          class="px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95"
          :class="s in severities
            ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
            : 'bg-brand-surface-light dark:bg-brand-surface-dark text-brand-text-muted border-brand-surface-border dark:border-stone-700 hover:border-brand-primary'"
        >
          {{ s }}
        </button>
      </div>
    </section>

    <!-- Severity per selected symptom -->
    <section v-if="selectedSymptoms.length" class="space-y-3">
      <h3 class="text-xs font-bold uppercase tracking-widest text-brand-text-muted">Severity</h3>
      <div
        v-for="s in selectedSymptoms"
        :key="s"
        class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl border border-brand-surface-border dark:border-stone-800 p-4"
      >
        <div class="flex items-center justify-between mb-2.5">
          <span class="text-sm font-bold text-brand-text dark:text-stone-100">{{ s }}</span>
          <span class="text-[11px] font-bold text-brand-primary">{{ SEVERITY_LABEL[severityOf(s)] }}</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-for="n in 5"
            :key="n"
            @click="setSeverity(s, n)"
            class="flex-1 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer"
            :class="n <= severityOf(s)
              ? 'bg-brand-primary text-white'
              : 'bg-brand-bg-light dark:bg-stone-800 text-brand-text-muted hover:bg-brand-primary-light dark:hover:bg-brand-primary/10'"
          >
            {{ n }}
          </button>
        </div>
      </div>
    </section>

    <!-- Affected areas -->
    <section>
      <h3 class="text-xs font-bold uppercase tracking-widest text-brand-text-muted mb-2">Affected areas <span class="normal-case font-medium text-brand-text-muted">(optional)</span></h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="a in AREAS"
          :key="a"
          @click="toggleArea(a)"
          class="px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95"
          :class="areas.has(a)
            ? 'bg-brand-primary-light text-brand-primary border-brand-primary dark:bg-brand-primary/10 dark:text-brand-primary-accent'
            : 'bg-brand-surface-light dark:bg-brand-surface-dark text-brand-text-muted border-brand-surface-border dark:border-stone-700 hover:border-brand-primary'"
        >
          {{ a }}
        </button>
      </div>
    </section>

    <!-- Notes -->
    <section>
      <h3 class="text-xs font-bold uppercase tracking-widest text-brand-text-muted mb-2">Notes <span class="normal-case font-medium text-brand-text-muted">(optional)</span></h3>
      <textarea
        v-model="notes"
        rows="3"
        placeholder="e.g. Stings a little after my cleanser…"
        class="w-full bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 text-sm rounded-2xl p-4 outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all text-brand-text dark:text-white resize-none"
      ></textarea>
    </section>

    <button
      @click="submit"
      :disabled="!canSubmit || submitting"
      class="w-full py-4 rounded-xl font-bold text-white bg-brand-primary hover:bg-brand-primary-hover transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {{ submitting ? 'Analyzing…' : 'Submit check-in' }}
    </button>
  </div>
</template>
