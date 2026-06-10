<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { removeFromShelf, updateShelfStatus } from '../api/shelfapi'
import { useToast } from '../composables/useToast'

import KeyActivesGrid from './KeyActivesGrid.vue'
import ProductLifecycleController from './ProductLifecycleController.vue'
import ArchiveLogForm from './ArchiveLogForm.vue'

const props = defineProps<{
  item: any
}>()

const emit = defineEmits(['close', 'refresh', 'delete'])
const { addToast } = useToast()
const router = useRouter()

// --- UI Sub-Views & Animation State ───
const isClosing = ref(false)
const currentView = ref<'details' | 'archive_form'>('details')
const isPulseTriggered = ref(false)

const handleClose = () => {
  isClosing.value = true
  isPulseTriggered.value = false
  setTimeout(() => { emit('close') }, 300)
}

// Ensure the pulse only triggers when we want it to (e.g., specific interactions)
const triggerPulseAnimation = () => {
  if (isPulseTriggered.value) return
  isPulseTriggered.value = true
  setTimeout(() => { isPulseTriggered.value = false }, 300)
}

// ─── ADDED: Missing Archiving Flow Function ───
const startArchivingFlow = () => {
  currentView.value = 'archive_form'
}

// ─── Computational Product Properties ───
const brand = computed(() => props.item.products?.brand || 'Unknown Brand')
const name = computed(() => props.item.products?.name || 'Unknown Product')
const category = computed(() => props.item.category || props.item.products?.category || 'Uncategorized')
const imageUrl = computed(() => props.item.image_url || props.item.products?.image_url || null)
const description = computed(() => props.item.products?.description || 'No description available for this product.')

const activeOutcome = computed(() => props.item.archive_outcome || 'empty')
const activeNotes = computed(() => props.item.archive_notes || '')

const archiveOutcomeDetails = computed(() => {
  const details = {
    empty: { label: 'Finished Product', color: 'text-green-600 dark:text-green-400', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    discarded: { label: 'Abandoned / Discarded', color: 'text-amber-600 dark:text-amber-400', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
    expired: { label: 'Expired Inventory', color: 'text-red-600 dark:text-red-400', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
  }
  return details[activeOutcome.value as 'empty' | 'discarded' | 'expired'] || details.empty
})

const usageLifespan = computed(() => {
  if (!props.item?.opened_date) return null
  const opened = new Date(props.item.opened_date)
  const endPoint = props.item.updated_at ? new Date(props.item.updated_at) : new Date()
  const diffTime = endPoint.getTime() - opened.getTime()
  return diffTime > 0 ? Math.ceil(diffTime / (1000 * 3600 * 24)) : 0
})

const handleUnarchive = async () => {
  try {
    const restoredState = props.item.opened_date ? 'active' : 'unopened'
    await updateShelfStatus(props.item.id, restoredState)
    props.item.usage_state = restoredState
    emit('refresh')
    handleClose()
    addToast('Product successfully restored to your shelf!', 'success')
  } catch (error) {
    addToast('Failed to restore product', 'error')
  }
}
const handleArchiveSuccess = () => {
  emit('refresh')
  handleClose()
  addToast('Product archived. Find it in your Archived filter!', 'info') // 👈 Here is the missing toast!
}
const isConfirmingDelete = ref(false)
const handleExecuteDelete = async () => {
  try {
    await removeFromShelf(props.item.id)
    emit('refresh')
    handleClose()
    addToast('Product removed from your shelf', 'info')
  } catch (error) {
    addToast('Failed to remove product', 'error')
  }
}

const goToRoutinePlanner = () => {
  handleClose()
  setTimeout(() => { router.push('/routine') }, 300)
}
</script>

<template>
  <div
    class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-sm p-0 sm:p-4"
    :class="isClosing ? 'animate-fade-out' : 'animate-fade-in'"
    @click.self="handleClose"
  >
    <div
      class="bg-brand-surface-light dark:bg-brand-surface-dark w-full max-w-md rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-stone-200/50 dark:border-stone-800 relative"
      :class="[isClosing ? 'animate-slide-down' : 'animate-slide-up', isPulseTriggered ? 'animate-interact-pulse' : '']"
    >
      <button @click="handleClose" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/80 dark:bg-stone-800/80 backdrop-blur-md rounded-full text-stone-500 hover:text-brand-primary dark:text-stone-300 dark:hover:text-orange-300 z-10 shadow-sm transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>

      <template v-if="currentView === 'details'">
        <div @click="triggerPulseAnimation" class="bg-stone-50 dark:bg-stone-900/50 h-48 sm:h-56 flex items-center justify-center p-6 border-b border-stone-100 dark:border-stone-800 flex-shrink-0 cursor-pointer">
          <img v-if="imageUrl" :src="imageUrl" class="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal drop-shadow-xl" />
          <svg v-else class="w-16 h-16 text-stone-300 dark:text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        </div>

        <div class="overflow-y-auto p-6 flex-grow hide-scrollbar">
          <p class="text-xs text-brand-primary dark:text-orange-400 font-bold uppercase tracking-widest mb-1">{{ brand }}</p>
          <h2 class="text-2xl font-serif font-bold text-brand-text dark:text-white leading-tight mb-2">{{ name }}</h2>

          <div class="flex flex-wrap gap-2 mb-4">
            <span class="text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-3 py-1 rounded-lg font-semibold border border-stone-200 dark:border-stone-700">{{ category }}</span>
          </div>

          <div class="mb-5">
            <p class="text-[13px] text-brand-text-muted dark:text-stone-400 leading-relaxed">{{ description }}</p>
          </div>

          <div v-if="item.usage_state === 'archived'" class="mb-6 bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800/80 p-4 rounded-2xl flex flex-col gap-3">
            <h4 class="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 px-0.5">Historical Log Summary</h4>
            <div class="grid grid-cols-2 gap-2.5">
              <div class="p-3 bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-xl flex flex-col justify-center">
                <span class="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider">Outcome</span>
                <div class="flex items-center gap-1.5 mt-1" :class="archiveOutcomeDetails.color">
                  <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" :d="archiveOutcomeDetails.icon" /></svg>
                  <span class="text-xs font-bold leading-tight">{{ archiveOutcomeDetails.label.split(' ')[0] }}</span>
                </div>
              </div>
              <div class="p-3 bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-xl flex flex-col justify-center">
                <span class="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider">Total Lifespan</span>
                <span class="text-sm font-mono font-bold text-brand-primary dark:text-orange-400 mt-0.5">{{ usageLifespan !== null ? `${usageLifespan} Days` : 'Not Opened' }}</span>
              </div>
            </div>
            <div v-if="activeNotes" class="p-3 bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-xl">
              <span class="block text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider mb-1">Skin Diary Note</span>
              <p class="text-xs text-brand-text dark:text-stone-300 italic leading-relaxed">"{{ activeNotes }}"</p>
            </div>
          </div>

          <div v-else class="mb-6 bg-brand-primary/5 dark:bg-orange-900/10 border border-brand-primary/20 dark:border-orange-900/30 p-4 rounded-2xl flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-brand-primary-light dark:bg-orange-900/40 text-brand-primary dark:text-orange-400 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div>
                <h4 class="text-sm font-bold text-brand-text dark:text-stone-200">Daily Regimen</h4>
                <p class="text-[10px] font-bold text-brand-text-muted dark:text-stone-500 uppercase tracking-wider mt-0.5">Not Assigned</p>
              </div>
            </div>
            <button @click="goToRoutinePlanner" class="text-xs font-bold bg-white dark:bg-stone-800 text-brand-primary dark:text-orange-400 border border-brand-primary/30 dark:border-orange-900/50 px-4 py-2.5 rounded-xl shadow-sm hover:bg-brand-primary hover:text-white dark:hover:bg-orange-900/60 transition-all">Assign to Routine</button>
          </div>

          <KeyActivesGrid :ingredients="item.products?.product_ingredients" />

          <ProductLifecycleController :item="item" @updated="emit('refresh')" />
        </div>

        <div class="p-4 border-t border-stone-200 dark:border-stone-800 bg-brand-bg-light dark:bg-brand-bg-dark flex-shrink-0">
          <div v-if="!isConfirmingDelete" class="space-y-2">
            <button v-if="item.usage_state !== 'archived'" @click="startArchivingFlow" class="w-full py-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-bold rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all text-sm">Archive Product</button>
            <button v-else @click="handleUnarchive" class="w-full py-3 bg-brand-primary/10 dark:bg-orange-900/20 text-brand-primary dark:text-orange-400 font-bold rounded-xl border border-brand-primary/20 dark:border-orange-900/30 hover:bg-brand-primary/20 transition-all text-sm animate-fade-in">Restore to Shelf (Unarchive)</button>
            <button @click="isConfirmingDelete = true" class="w-full py-2 bg-transparent text-red-500 font-bold text-xs uppercase tracking-widest hover:text-red-600 transition-all">Permanently Delete</button>
          </div>
          <div v-else>
            <p class="text-center text-[11px] font-bold text-red-500 uppercase tracking-widest mb-3">Permanently delete this product?</p>
            <div class="grid grid-cols-2 gap-3">
              <button @click="isConfirmingDelete = false" class="py-3 rounded-xl font-bold text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 transition-colors text-sm">Cancel</button>
              <button @click="handleExecuteDelete" class="py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20 transition-all active:scale-[0.98] text-sm">Yes, Delete</button>
            </div>
          </div>
        </div>
      </template>
      <template v-else-if="currentView === 'archive_form'">
        <ArchiveLogForm
          :item="item"
          :usage-lifespan="usageLifespan"
          @back="currentView = 'details'"
          @success="handleArchiveSuccess"
        />
      </template>

    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-fade-out { animation: fadeOut 0.25s ease-in forwards; }
.animate-slide-down { animation: slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideDown { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(100%); } }

@keyframes interactPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
}
.animate-interact-pulse { animation: interactPulse 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

@media (min-width: 640px) {
  .animate-slide-up { animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .animate-slide-down { animation: popOut 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  @keyframes popOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.95); } }
  @keyframes interactPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.02) rotate(0.5deg); }
    100% { transform: scale(1); }
  }
}
</style>
