<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { removeFromShelf, analyzeProduct } from '../../api/shelfapi'
import { useToast } from '../../composables/useToast'

import KeyActivesGrid from './KeyActivesGrid.vue'
import ProductLifecycleController from './ProductLifecycleController.vue'
import ArchiveLogForm from './ArchiveLogForm.vue'
import ArchiveLogSummary from './ArchiveLogSummary.vue'
import SafetyInspectionCard, { type WarningAlert } from './SafetyInspectionCard.vue'
import TargetedConcernsSection from './TargetedConcernsSection.vue'

const props = defineProps<{
  item: any
}>()

const emit = defineEmits(['close', 'refresh'])
const { addToast } = useToast()

const isVisible = ref(false)
const isAnalyzing = ref(false)
const warningAlerts = ref<WarningAlert[]>([])

const localItem = ref({ ...props.item })

// 🌟 Auto-fetch safety analysis on mount
const runAutomaticSafetyCheck = async () => {
  const productId = localItem.value.product_id || localItem.value.products?.id
  if (!productId) return

  isAnalyzing.value = true
  try {
    const data = await analyzeProduct(productId)
    if (data && Array.isArray(data.warnings)) {
      warningAlerts.value = data.warnings
    }
  } catch (error) {
    console.warn('Analysis execution fallback:', error)
  } finally {
    isAnalyzing.value = false
  }
}

onMounted(() => {
  isVisible.value = true
  runAutomaticSafetyCheck()
})

const handleClose = () => {
  isVisible.value = false
  setTimeout(() => {
    emit('close')
  }, 250)
}

watch(
  () => props.item,
  (newItem) => {
    localItem.value = { ...newItem }
    runAutomaticSafetyCheck()
  },
  { deep: true }
)

const currentView = ref<'details' | 'archive_form'>('details')
const isConfirmingDelete = ref(false)

const brand = computed(() => localItem.value.products?.brand || localItem.value.brand || 'Unknown Brand')
const name = computed(() => localItem.value.products?.name || localItem.value.name || 'Unknown Product')
const category = computed(() => localItem.value.category || localItem.value.products?.category || 'Formulation')
const imageUrl = computed(() => localItem.value.image_url || localItem.value.products?.image_url || null)
const description = computed(() => localItem.value.products?.description || localItem.value.description || '')

const paoDisplay = computed(() => {
  const pao = localItem.value.pao || localItem.value.products?.pao
  if (!pao) return 'Not Set'
  return `${String(pao).replace('M', '')}M`
})

const usageLifespan = computed(() => {
  if (!localItem.value?.opened_date) return null
  const opened = new Date(localItem.value.opened_date)
  const endPoint = localItem.value.usage_state === 'archived' && localItem.value.archived_at
    ? new Date(localItem.value.archived_at)
    : new Date()
  const diff = endPoint.getTime() - opened.getTime()
  return diff > 0 ? Math.ceil(diff / (1000 * 3600 * 24)) : 0
})

const handleChildUpdate = (updatedItem?: any) => {
  if (updatedItem) {
    localItem.value = { ...localItem.value, ...updatedItem }
  }
  emit('refresh')
}

const handleExecuteDelete = async () => {
  try {
    await removeFromShelf(localItem.value.id)
    emit('refresh')
    handleClose()
    addToast('Product removed from active routine check.', 'info')
  } catch (error) {
    addToast('Failed to delete shelf item.', 'error')
  }
}
</script>

<template>
  <Transition name="modal">
    <div
      v-if="isVisible"
      class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-md p-0 sm:p-4"
      @click.self="handleClose"
    >
      <div class="modal-content bg-brand-surface-light dark:bg-brand-surface-dark w-full max-w-5xl rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl border border-brand-surface-border dark:border-stone-800 flex flex-col max-h-[92vh] overflow-hidden">

        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-brand-surface-border dark:border-stone-800 flex items-center justify-between flex-shrink-0 bg-brand-bg-light/80 dark:bg-brand-bg-dark/80 backdrop-blur-md z-10">
          <span class="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-brand-primary-light dark:bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            Shelf Item Inspection
          </span>
          <button @click="handleClose" class="w-8 h-8 rounded-full bg-brand-surface-light dark:bg-brand-surface-dark flex items-center justify-center text-brand-text-muted hover:text-brand-primary transition-colors border border-brand-surface-border dark:border-stone-800 cursor-pointer">
            <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <!-- Main Section Frame -->
        <div v-if="currentView === 'details'" class="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto flex-1 hide-scrollbar">

          <!-- Left Pane: Visuals & Core Stats -->
          <div class="lg:col-span-5 bg-brand-bg-light dark:bg-stone-900/30 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-brand-surface-border dark:border-stone-800 space-y-6">
            <div>
              <div class="w-44 h-44 sm:w-56 sm:h-56 mx-auto bg-white dark:bg-brand-surface-dark rounded-3xl p-4 border border-brand-surface-border dark:border-stone-800 flex items-center justify-center shadow-sm">
                <img v-if="imageUrl" :src="imageUrl" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                <svg v-else class="w-16 h-16 text-brand-text-muted stroke-[1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <div class="mt-4 text-center sm:text-left">
                <span class="text-[10px] font-bold text-brand-primary uppercase tracking-widest">{{ brand }}</span>
                <h2 class="text-xl sm:text-2xl font-serif font-bold text-brand-text dark:text-white leading-tight mt-0.5">{{ name }}</h2>
                <span class="inline-block mt-2 text-[11px] font-bold uppercase tracking-wider bg-brand-surface-light dark:bg-brand-surface-dark px-3 py-1 rounded-xl border border-brand-surface-border dark:border-stone-700 text-brand-text dark:text-stone-200">{{ category }}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-4 border-t border-brand-surface-border dark:border-stone-800">
              <div class="bg-brand-surface-light dark:bg-brand-surface-dark p-3.5 rounded-2xl border border-brand-surface-border dark:border-stone-800 text-center shadow-sm">
                <span class="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest block mb-0.5">Active Lifespan</span>
                <span class="text-lg font-mono font-bold text-brand-primary">{{ usageLifespan !== null ? `${usageLifespan} Days` : 'Unopened' }}</span>
              </div>
              <div class="bg-brand-surface-light dark:bg-brand-surface-dark p-3.5 rounded-2xl border border-brand-surface-border dark:border-stone-800 text-center shadow-sm">
                <span class="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest block mb-0.5">PAO Window</span>
                <span class="text-lg font-mono font-bold text-brand-text dark:text-stone-100">{{ paoDisplay }}</span>
              </div>
            </div>
          </div>

          <!-- Right Pane: Safety Warnings, Details & Concerns -->
          <div class="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div class="space-y-6">

              <!-- 🌟 1. Safety Inspection Box (With Scanner HUD animation) -->
              <SafetyInspectionCard :warnings="warningAlerts" :is-loading="isAnalyzing" />

              <!-- 🌟 2. Description -->
              <div v-if="description">
                <h4 class="text-xs font-bold uppercase tracking-widest text-brand-text-muted mb-1.5">Description</h4>
                <p class="text-xs sm:text-sm font-medium text-brand-text-muted dark:text-stone-400 leading-relaxed">{{ description }}</p>
              </div>

              <!-- 🌟 3. Targeted Skin Concerns Section (Positioned under Description) -->
              <TargetedConcernsSection :item="localItem" />

              <!-- 🌟 4. Lifecycle Controller -->
              <ArchiveLogSummary v-if="localItem.usage_state === 'archived'" :item="localItem" :usage-lifespan="usageLifespan" />
              <ProductLifecycleController v-else :item="localItem" @updated="handleChildUpdate" />

              <!-- 🌟 5. Key Active Ingredients Grid -->
              <div class="pt-2 border-t border-brand-surface-border dark:border-stone-800/60">
                <KeyActivesGrid :ingredients="localItem.products?.product_ingredients" />
              </div>

            </div>

            <!-- Footer Actions -->
            <div class="pt-6 border-t border-brand-surface-border dark:border-stone-800 space-y-2.5">
              <div v-if="!isConfirmingDelete" class="grid grid-cols-2 gap-3">
                <button v-if="localItem.usage_state !== 'archived'" @click="currentView = 'archive_form'" class="py-3 bg-brand-surface-light dark:bg-stone-800 hover:bg-brand-surface-border dark:hover:bg-stone-700 text-brand-text dark:text-stone-200 font-bold rounded-xl text-xs transition-all border border-brand-surface-border dark:border-stone-700 shadow-sm cursor-pointer">
                  Archive Product
                </button>
                <button @click="isConfirmingDelete = true" class="py-3 bg-semantic-error/5 dark:bg-semantic-error/10 text-semantic-error font-bold rounded-xl text-xs hover:bg-semantic-error/20 dark:hover:bg-brand-surface-dark transition-all border border-semantic-error/20 shadow-sm cursor-pointer">
                  Permanently Delete
                </button>
              </div>

              <div v-if="isConfirmingDelete" class="bg-semantic-error/10 p-4 rounded-2xl border border-semantic-error/20 space-y-3 shadow-sm animate-fade-in">
                <p class="text-center text-xs font-bold text-semantic-error">Permanently delete this item from your routine?</p>
                <div class="grid grid-cols-2 gap-3">
                  <button @click="isConfirmingDelete = false" class="py-2.5 rounded-xl font-bold text-xs bg-brand-surface-light dark:bg-stone-800 hover:bg-brand-surface-border dark:hover:bg-stone-700 border border-brand-surface-border dark:border-stone-700 text-brand-text dark:text-stone-300 shadow-sm cursor-pointer">Cancel</button>
                  <button @click="handleExecuteDelete" class="py-2.5 rounded-xl font-bold text-xs bg-semantic-error hover:opacity-90 text-white shadow-sm transition-transform active:scale-[0.98] cursor-pointer">Yes, Delete</button>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div v-else-if="currentView === 'archive_form'" class="p-6 sm:p-8 flex-1 overflow-y-auto hide-scrollbar">
          <ArchiveLogForm :item="localItem" :usage-lifespan="usageLifespan" @back="currentView = 'details'" @success="emit('refresh'); handleClose()" />
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@media (max-width: 639px) {
  .modal-enter-from .modal-content,
  .modal-leave-to .modal-content {
    opacity: 1;
    transform: translateY(100%);
  }
}

@media (min-width: 640px) {
  .modal-enter-from .modal-content,
  .modal-leave-to .modal-content {
    opacity: 0;
    transform: scale(0.96) translateY(12px);
  }
}
</style>
