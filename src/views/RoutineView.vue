<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import Sortable from 'sortablejs'
import {
  getRoutine,
  removeRoutineStep,
  updateStepFrequency,
  completeStep,
  uncompleteStep,
  reorderSteps,
} from '../api/routineApi'
import { useToast } from '../composables/useToast'
import { scheduleLabel, groupSteps, isDueToday, isPeriodicStep } from '../utils/routineSchedule'

import RoutineChecklistItem from '../components/Routine/RoutineChecklistItem.vue'
import AddToRoutineModal from '../components/Routine/AddToRoutineModal.vue'
import FrequencySelectorModal from '../components/Routine/FrequencySelectorModal.vue'
import ConfirmDeleteModal from '../components/Shared/ConfirmDeleteModal.vue'
import EmptyState from '../components/Shared/EmptyState.vue'

const router = useRouter()
const { addToast } = useToast()

const steps = ref<any[]>([])
const isLoading = ref(true)
const busy = ref(false)

const showAdd = ref(false)
const stepToRemove = ref<any>(null)
const stepToEditFrequency = ref<any>(null)

// UC-15: generation happens through the chatbot session.
const goGenerate = () => router.push({ path: '/chat', query: { intent: 'generate-routine' } })

const existingProductIds = computed(() => steps.value.map((s) => s.product_id).filter(Boolean))

// "Done today" is counted per session: a "both" product due today is two tasks
// (morning + evening), so completing only the morning reads as 1 of 2. A step
// counts only on days it is actually scheduled, so a 2x/week step doesn't make
// 100% unreachable on its off days.
const sessionsOf = (s: any): ('am' | 'pm')[] => {
  const t = (s.time_of_day || 'both').toLowerCase()
  return t === 'both' ? ['am', 'pm'] : [t as 'am' | 'pm']
}
const dueTodayCount = computed(() =>
  steps.value.reduce((n, s) => (isDueToday(s.frequency) ? n + sessionsOf(s).length : n), 0),
)
const completedCount = computed(() =>
  steps.value.reduce((n, s) => {
    if (!isDueToday(s.frequency)) return n
    return n + sessionsOf(s).filter((sess) => (sess === 'am' ? s.completed_am : s.completed_pm)).length
  }, 0),
)

// Morning / Evening only. Cadence is shown per step, not used to file it into a
// separate block — see groupSteps() in utils/routineSchedule.
const grouped = computed(() => groupSteps(steps.value))

const blocks = computed(() => [
  { key: 'morning', title: 'Morning', session: 'am' as const, accent: 'morning' as const, pill: 'bg-amber-200/70 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300', items: grouped.value.morning },
  { key: 'evening', title: 'Evening', session: 'pm' as const, accent: 'evening' as const, pill: 'bg-brand-primary-light text-brand-primary dark:bg-brand-primary/20 dark:text-brand-primary-accent', items: grouped.value.evening },
])

const fetchRoutine = async () => {
  isLoading.value = true
  try {
    const data = await getRoutine()
    steps.value = data.steps || []
  } catch {
    addToast('Could not load your routine', 'error')
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchRoutine)

// UC-22: toggle completion for one session (optimistic). The same step object is
// shared by the Morning and Evening cards, so we flip only that session's flag.
const toggleComplete = async (step: any, session: 'am' | 'pm') => {
  const flag = session === 'am' ? 'completed_am' : 'completed_pm'
  const previous = !!step[flag]
  step[flag] = !previous
  const sessionArg = session.toUpperCase() // "AM" | "PM"
  try {
    if (step[flag]) await completeStep(step.id, undefined, sessionArg)
    else await uncompleteStep(step.id, undefined, sessionArg)
  } catch {
    step[flag] = previous // revert
    addToast('Could not update completion', 'error')
  }
}

// UC-18: remove
const confirmRemove = async () => {
  const step = stepToRemove.value
  if (!step) return
  busy.value = true
  try {
    await removeRoutineStep(step.id)
    steps.value = steps.value.filter((s) => s.id !== step.id)
    addToast('Step removed', 'info')
  } catch {
    addToast('Failed to remove step', 'error')
  } finally {
    busy.value = false
    stepToRemove.value = null
  }
}

// --- UC-20: reorder steps -----------------------------------------------------
// Dragging happens in place, inside the Morning / Evening blocks. Cross-block
// dragging is deliberately not allowed: moving a step between sessions is a
// time_of_day change, which is what the schedule editor is for.
//
// step_order is global while the blocks are a per-session view, so a drag inside
// one block rewrites only the global positions that block already occupies —
// steps in the other session keep theirs.
const isReordering = ref(false)
const draftSteps = ref<any[]>([])
const savingOrder = ref(false)
const listRefs = ref<HTMLElement[]>([])
let sortables: Sortable[] = []

const byStepOrder = (a: any, b: any) => (a.step_order ?? 0) - (b.step_order ?? 0)

// UC-20 precondition: the routine has at least two steps.
const canReorder = computed(() => steps.value.length >= 2)

// Reorder mode shows the same order as the checklist — every-day steps first,
// then the periodic ones. Periodic steps are pinned: they already sit at the
// bottom of their session, so there is nothing meaningful to drag them past.
const reorderBlocks = computed(() => {
  const g = groupSteps(draftSteps.value)
  return [
    { key: 'morning', title: 'Morning', pill: 'bg-amber-200/70 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300', items: g.morning },
    { key: 'evening', title: 'Evening', pill: 'bg-brand-primary-light text-brand-primary dark:bg-brand-primary/20 dark:text-brand-primary-accent', items: g.evening },
  ]
})

/** Rewrite the global order so one block's steps sit in their new sequence,
 *  reusing the global positions that block already held. */
const applyBlockOrder = (all: any[], blockNewOrder: any[]) => {
  const sorted = [...all].sort(byStepOrder)
  const blockIds = new Set(blockNewOrder.map((s) => s.id))
  const slots: number[] = []
  sorted.forEach((s, i) => { if (blockIds.has(s.id)) slots.push(i) })
  const result = [...sorted]
  slots.forEach((slot, i) => { result[slot] = blockNewOrder[i] })
  result.forEach((s, i) => { s.step_order = i + 1 })
  return result
}

const onDragEnd = (listEl: HTMLElement) => {
  // Pinned rows are excluded from Sortable, so its indices don't line up with
  // the block. Read the resulting DOM order instead — it is always accurate.
  const ids = Array.from(listEl.querySelectorAll<HTMLElement>('[data-id]')).map((el) => el.dataset.id)
  const byId = new Map(draftSteps.value.map((s) => [s.id, s]))
  const items = ids.map((id) => byId.get(id)).filter(Boolean)
  if (!items.length) return
  draftSteps.value = applyBlockOrder(draftSteps.value, items)
}

const destroySortables = () => {
  sortables.forEach((s) => s.destroy())
  sortables = []
}

const initSortables = () => {
  destroySortables()
  for (const el of listRefs.value) {
    if (!el) continue
    sortables.push(
      Sortable.create(el, {
        animation: 150,
        handle: '.drag-handle',
        draggable: '.reorder-item',   // pinned periodic rows are not draggable
        ghostClass: 'opacity-40',
        onEnd: () => onDragEnd(el),
      }),
    )
  }
}

const startReorder = async () => {
  // Work on a copy so a failed save leaves the real routine untouched.
  draftSteps.value = steps.value.map((s) => ({ ...s }))
  isReordering.value = true
  await nextTick()
  initSortables()
}

const cancelReorder = () => {
  destroySortables()
  isReordering.value = false
  draftSteps.value = []
}

const orderChanged = computed(() => {
  const original = [...steps.value].sort(byStepOrder)
  const draft = [...draftSteps.value].sort(byStepOrder)
  return draft.some((s, i) => s.id !== original[i]?.id)
})

const saveOrder = async () => {
  // [A1] Dropped back where it started — nothing to save.
  if (!orderChanged.value) {
    cancelReorder()
    return
  }
  savingOrder.value = true
  const ordered = [...draftSteps.value].sort(byStepOrder)
  try {
    await reorderSteps(ordered.map((s) => s.id))
    steps.value = ordered
    destroySortables()
    isReordering.value = false
    draftSteps.value = []
    addToast('Routine order saved', 'success')
  } catch {
    // [E1] Save failed — restore the draft and stay in reorder mode.
    draftSteps.value = steps.value.map((s) => ({ ...s }))
    await nextTick()
    initSortables()
    addToast('Failed to save the new order', 'error')
  } finally {
    savingOrder.value = false
  }
}

onBeforeUnmount(destroySortables)

// UC-19: edit frequency
const saveFrequency = async (payload: { frequency: string; time_of_day: string }) => {
  const step = stepToEditFrequency.value
  if (!step) return
  const previousFreq = step.frequency
  const previousTime = step.time_of_day
  step.frequency = payload.frequency
  step.time_of_day = payload.time_of_day
  stepToEditFrequency.value = null
  try {
    await updateStepFrequency(step.id, payload.frequency, payload.time_of_day)
    addToast('Schedule updated', 'success')
  } catch {
    step.frequency = previousFreq
    step.time_of_day = previousTime
    addToast('Failed to update the schedule', 'error')
  }
}
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans transition-colors duration-300 pb-28 pt-6">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col gap-6 w-full">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl sm:text-3xl font-serif font-bold dark:text-white">Routine Checklist</h1>
          <p class="text-xs text-brand-text-muted mt-0.5">
            <template v-if="steps.length">{{ completedCount }} of {{ dueTodayCount }} due today</template>
            <template v-else>Build a routine from the products you own.</template>
          </p>
        </div>
        <div class="flex items-center gap-2 self-start sm:self-auto">
        <button
          v-if="!isReordering"
          @click="router.push('/routine/history')"
          class="text-xs font-bold text-brand-text-muted hover:text-brand-primary inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 hover:border-brand-primary/40 transition-colors cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          History
        </button>
        <button
          v-if="canReorder && !isReordering"
          @click="startReorder"
          class="text-xs font-bold text-brand-text-muted hover:text-brand-primary inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 hover:border-brand-primary/40 transition-colors cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          Reorder
        </button>
        <button
          @click="router.push('/analysis')"
          class="text-xs font-bold text-brand-primary hover:text-brand-primary-hover inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-primary-light/60 dark:bg-brand-primary/10 transition-colors cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          Skin progress
        </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 text-brand-text-muted animate-pulse">
        <div class="w-10 h-10 border-4 border-brand-surface-border border-t-brand-primary rounded-full animate-spin mb-3"></div>
        <p class="text-xs font-bold uppercase tracking-widest text-brand-primary">Loading your routine…</p>
      </div>

      <!-- UC-20: reorder mode — drag steps inside their session -->
      <template v-else-if="isReordering">
        <p class="text-xs text-brand-text-muted -mt-2">
          Drag steps into the order you apply them. Cleanse first, protect last.
          Steps that don't run every day stay at the end of their session.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <section
            v-for="block in reorderBlocks"
            :key="block.key"
            class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl border border-brand-surface-border dark:border-stone-800 shadow-sm p-4 sm:p-5"
          >
            <div class="flex justify-center mb-3">
              <span class="text-[11px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full" :class="block.pill">{{ block.title }}</span>
            </div>

            <ul ref="listRefs" :data-block="block.key" class="space-y-2">
              <li
                v-for="step in block.items"
                :key="step.id"
                :data-id="step.id"
                :class="[
                  'flex items-center gap-3 p-2.5 rounded-2xl border',
                  isPeriodicStep(step)
                    ? 'bg-brand-surface-light dark:bg-stone-900/50 border-dashed border-brand-surface-border dark:border-stone-700'
                    : 'reorder-item bg-brand-bg-light dark:bg-stone-800/60 border-brand-surface-border dark:border-stone-700',
                ]"
              >
                <!-- Periodic steps stay at the bottom of their session, so there is
                     nothing to drag them past — pinned rather than draggable. -->
                <span
                  v-if="isPeriodicStep(step)"
                  class="shrink-0 p-1 -m-1 text-brand-text-muted/60"
                  aria-label="Pinned to the end"
                  title="Runs on set days — always last in this session"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v5m-6-8V6a2 2 0 012-2h8a2 2 0 012 2v6l2 3H4l2-3z" /></svg>
                </span>
                <span
                  v-else
                  class="drag-handle cursor-grab active:cursor-grabbing touch-none text-brand-text-muted hover:text-brand-primary shrink-0 p-1 -m-1"
                  aria-label="Drag to reorder"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" /></svg>
                </span>

                <div class="w-9 h-9 shrink-0 bg-brand-surface-light dark:bg-stone-800 rounded-xl p-1 border border-brand-surface-border dark:border-stone-700 flex items-center justify-center">
                  <img v-if="step.products?.image_url" :src="step.products.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" :alt="step.products?.name || 'Product'" />
                  <svg v-else class="w-4 h-4 text-brand-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 3h6l-1 4H10L9 3zm0 4h6a2 2 0 012 2v9a3 3 0 01-3 3H10a3 3 0 01-3-3V9a2 2 0 012-2z" /></svg>
                </div>

                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-brand-text dark:text-stone-100 leading-tight line-clamp-2">{{ step.products?.name || 'Product' }}</p>
                  <p class="text-[10px] font-semibold text-brand-text-muted mt-0.5">
                    {{ scheduleLabel(step.frequency) }}<span v-if="isPeriodicStep(step)"> · pinned</span>
                  </p>
                </div>
              </li>
            </ul>

            <p v-if="!block.items.length" class="text-center text-xs text-brand-text-muted py-6">Nothing here yet.</p>
          </section>
        </div>

        <div class="grid grid-cols-2 gap-3 max-w-md mx-auto w-full pt-1">
          <button
            @click="cancelReorder"
            :disabled="savingOrder"
            class="py-3.5 rounded-xl font-bold text-sm text-brand-text dark:text-stone-300 bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 hover:bg-brand-bg-light dark:hover:bg-stone-800 transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            @click="saveOrder"
            :disabled="savingOrder"
            class="py-3.5 rounded-xl font-bold text-sm text-white bg-brand-primary hover:bg-brand-primary-hover transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            <span v-if="savingOrder" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
            {{ savingOrder ? 'Saving…' : 'Save order' }}
          </button>
        </div>
      </template>

      <!-- 3-block checklist -->
      <template v-else-if="steps.length">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <section
            v-for="block in blocks"
            :key="block.key"
            class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl border border-brand-surface-border dark:border-stone-800 shadow-sm p-4 sm:p-5"
          >
            <!-- Block header pill -->
            <div class="flex justify-center mb-3">
              <span class="text-[11px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full" :class="block.pill">{{ block.title }}</span>
            </div>

            <!-- Items -->
            <div v-if="block.items.length" class="divide-y divide-brand-surface-border/60 dark:divide-stone-800">
              <template v-for="(step, i) in block.items" :key="step.id">
                <!-- Separator where the every-day steps end and the periodic ones begin -->
                <p
                  v-if="isPeriodicStep(step) && !isPeriodicStep(block.items[i - 1] || {})"
                  class="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted pt-3 pb-1"
                >
                  Not every day
                </p>
                <RoutineChecklistItem
                  :step="step"
                  :step-number="i + 1"
                  :accent="block.accent"
                  :busy="busy"
                  :due-today="isDueToday(step.frequency)"
                  :completed="block.session === 'am' ? step.completed_am : step.completed_pm"
                  @toggle-complete="toggleComplete(step, block.session)"
                  @edit-frequency="stepToEditFrequency = step"
                  @remove="stepToRemove = step"
                />
              </template>
            </div>
            <p v-else class="text-center text-xs text-brand-text-muted py-6">Nothing here yet.</p>
          </section>
        </div>

        <!-- Action bar -->
        <div class="grid grid-cols-2 gap-3 max-w-md mx-auto w-full pt-1">
          <button
            @click="showAdd = true"
            class="py-3.5 rounded-xl font-bold text-sm text-brand-primary bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-primary/40 hover:bg-brand-primary-light/40 dark:hover:bg-brand-primary/10 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
            Add product
          </button>
          <button
            @click="goGenerate"
            class="py-3.5 rounded-xl font-bold text-sm text-white bg-brand-primary hover:bg-brand-primary-hover transition-all shadow-md active:scale-[0.98] inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
            Regenerate
          </button>
        </div>
      </template>

      <!-- Empty state (no routine yet) -->
      <EmptyState
        v-else
        title="No routine yet"
        message="Let SkinBuddy generate a personalized morning and evening routine from the products already in your storage."
        action-label="Generate routine"
        @action="goGenerate"
      >
        <template #icon>
          <svg class="w-10 h-10 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
        </template>
      </EmptyState>
    </div>

    <!-- Overlays -->
    <Teleport to="body">
      <AddToRoutineModal v-if="showAdd" :existing-product-ids="existingProductIds" @close="showAdd = false" @added="fetchRoutine()" />
      <FrequencySelectorModal
        v-if="stepToEditFrequency"
        :current="stepToEditFrequency.frequency"
        :current-time-of-day="stepToEditFrequency.time_of_day"
        :product-name="stepToEditFrequency.products?.name"
        @cancel="stepToEditFrequency = null"
        @save="saveFrequency"
      />
      <ConfirmDeleteModal v-if="stepToRemove" :item="stepToRemove" @cancel="stepToRemove = null" @confirm="confirmRemove" />
    </Teleport>
  </div>
</template>
