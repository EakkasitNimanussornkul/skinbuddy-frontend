<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getRoutine,
  removeRoutineStep,
  updateStepFrequency,
  reorderSteps,
  completeStep,
  uncompleteStep,
} from '../api/routineApi'
import { useToast } from '../composables/useToast'

import RoutineStepCard from '../components/Routine/RoutineStepCard.vue'
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
const completedCount = computed(() => steps.value.filter((s) => s.completed_today).length)

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

// UC-22: toggle completion (optimistic)
const toggleComplete = async (step: any) => {
  const previous = !!step.completed_today
  step.completed_today = !previous
  try {
    if (step.completed_today) await completeStep(step.id)
    else await uncompleteStep(step.id)
  } catch {
    step.completed_today = previous // revert
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

// UC-19: edit frequency
const saveFrequency = async (frequency: string) => {
  const step = stepToEditFrequency.value
  if (!step) return
  const previous = step.frequency
  step.frequency = frequency
  stepToEditFrequency.value = null
  try {
    await updateStepFrequency(step.id, frequency)
    addToast('Frequency updated', 'success')
  } catch {
    step.frequency = previous
    addToast('Failed to update frequency', 'error')
  }
}

// UC-20: drag-and-drop reorder, persist, revert on failure
const dragIndex = ref<number | null>(null)
const overIndex = ref<number | null>(null)

const onDragStart = (index: number) => {
  dragIndex.value = index
}
const onDragOver = (index: number) => {
  overIndex.value = index
}
const onDragEnd = () => {
  dragIndex.value = null
  overIndex.value = null
}
const onDrop = async (index: number) => {
  const from = dragIndex.value
  onDragEnd()
  if (from === null || from === index) return

  const snapshot = [...steps.value]
  const reordered = [...steps.value]
  const [moved] = reordered.splice(from, 1)
  reordered.splice(index, 0, moved)
  steps.value = reordered

  busy.value = true
  try {
    await reorderSteps(reordered.map((s) => s.id))
  } catch {
    steps.value = snapshot // revert
    addToast('Failed to save new order', 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans transition-colors duration-300 pb-28 pt-6">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col gap-6 w-full">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl sm:text-3xl font-serif font-bold dark:text-white">Daily Regimen</h1>
          <p class="text-xs text-brand-text-muted mt-0.5">
            <template v-if="steps.length">{{ completedCount }} of {{ steps.length }} done today</template>
            <template v-else>Build a routine from the products you own.</template>
          </p>
        </div>
        <button
          @click="router.push('/checkin')"
          class="self-start sm:self-auto text-xs font-bold text-brand-primary hover:text-brand-primary-hover inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-primary-light/60 dark:bg-brand-primary/10 transition-colors cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          Weekly check-in
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 text-brand-text-muted animate-pulse">
        <div class="w-10 h-10 border-4 border-brand-surface-border border-t-brand-primary rounded-full animate-spin mb-3"></div>
        <p class="text-xs font-bold uppercase tracking-widest text-brand-primary">Loading your routine…</p>
      </div>

      <!-- Steps -->
      <template v-else-if="steps.length">
        <p class="text-[11px] text-brand-text-muted -mb-1 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" /></svg>
          Drag a step by its handle to reorder — application order matters.
        </p>
        <div class="flex flex-col gap-2.5">
          <div
            v-for="(step, index) in steps"
            :key="step.id"
            draggable="true"
            @dragstart="onDragStart(index)"
            @dragover.prevent="onDragOver(index)"
            @drop="onDrop(index)"
            @dragend="onDragEnd"
            class="transition-all rounded-2xl"
            :class="[
              dragIndex === index ? 'opacity-40' : '',
              overIndex === index && dragIndex !== null && dragIndex !== index ? 'ring-2 ring-brand-primary' : '',
            ]"
          >
            <RoutineStepCard
              :step="step"
              :index="index"
              :busy="busy"
              @toggle-complete="toggleComplete(step)"
              @remove="stepToRemove = step"
              @edit-frequency="stepToEditFrequency = step"
            />
          </div>
        </div>

        <!-- Action bar -->
        <div class="grid grid-cols-2 gap-3 pt-1">
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

      <!-- Empty state (UC-16 A1) -->
      <EmptyState
        v-else
        title="No routine yet"
        message="Let SkinBuddy generate a personalized morning and evening routine from the products already in your storage."
        action-label="Generate routine"
        @action="goGenerate"
      >
        <template #icon>
          <svg class="w-10 h-10 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </template>
      </EmptyState>

      <p v-if="!isLoading && !steps.length" class="text-center">
        <button @click="showAdd = true" class="text-xs font-bold text-brand-text-muted hover:text-brand-primary underline transition-colors cursor-pointer">or add products one by one</button>
      </p>
    </div>

    <!-- Overlays -->
    <Teleport to="body">
      <AddToRoutineModal v-if="showAdd" :existing-product-ids="existingProductIds" @close="showAdd = false" @added="fetchRoutine()" />
      <FrequencySelectorModal
        v-if="stepToEditFrequency"
        :current="stepToEditFrequency.frequency"
        :product-name="stepToEditFrequency.products?.name"
        @cancel="stepToEditFrequency = null"
        @save="saveFrequency"
      />
      <ConfirmDeleteModal v-if="stepToRemove" :item="stepToRemove" @cancel="stepToRemove = null" @confirm="confirmRemove" />
    </Teleport>
  </div>
</template>
