<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { removeFromShelf } from '../../api/shelfapi.ts'
import { useToast } from '../../composables/useToast.ts'

import KeyActivesGrid from './KeyActivesGrid.vue'
import ProductLifecycleController from './ProductLifecycleController.vue'
import ArchiveLogForm from './ArchiveLogForm.vue'
import ArchiveLogSummary from './ArchiveLogSummary.vue' // NEW IMPORT

const props = defineProps<{
  item: any
}>()

const emit = defineEmits(['close', 'refresh', 'delete'])
const { addToast } = useToast()
const router = useRouter()

// --- Data Initialization (Fixing Prop Mutation) ---
// Create a reactive, mutable copy of the item
const localItem = ref({ ...props.item })

// Smart Catch: Fix state on the local copy
if (localItem.value.usage_state !== 'archived') {
  if (localItem.value.opened_date || (localItem.value.status && localItem.value.status.trim() !== '' && localItem.value.status !== 'EMPTY')) {
    localItem.value.usage_state = 'active'
  }
}

// --- UI Sub-Views & Animation State ---
const isClosing = ref(false)
const currentView = ref<'details' | 'archive_form'>('details')

const handleClose = () => {
  isClosing.value = true
  setTimeout(() => { emit('close') }, 300)
}

const startArchivingFlow = () => {
  currentView.value = 'archive_form'
}

// --- Computational Product Properties ---
const brand = computed(() => localItem.value.products?.brand || 'Unknown Brand')
const name = computed(() => localItem.value.products?.name || 'Unknown Product')
const category = computed(() => localItem.value.category || localItem.value.products?.category || 'Uncategorized')
const imageUrl = computed(() => localItem.value.image_url || localItem.value.products?.image_url || null)
const description = computed(() => localItem.value.products?.description || 'No description available for this product.')

const isAssignedToRoutine = computed(() => {
  return localItem.value.status && localItem.value.status.trim() !== '' && localItem.value.status !== 'EMPTY'
})

// 🌟 BULLETPROOF LIFESPAN CALCULATION 🌟
const usageLifespan = computed(() => {
  if (!localItem.value?.opened_date) return null
  const opened = new Date(localItem.value.opened_date)

  let endPoint = new Date()

  if (localItem.value.usage_state === 'archived' && localItem.value.archived_at) {
    endPoint = new Date(localItem.value.archived_at)
  }

  const diffTime = endPoint.getTime() - opened.getTime()
  return diffTime > 0 ? Math.ceil(diffTime / (1000 * 3600 * 24)) : 0
})

const handleArchiveSuccess = () => {
  emit('refresh')
  handleClose()
  addToast('Product archived. Find it in your Archived filter!', 'info')
}

const isConfirmingDelete = ref(false)
const handleExecuteDelete = async () => {
  try {
    await removeFromShelf(localItem.value.id)
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
    :class="isClosing ? 'animate-slide-down' : 'animate-slide-up'"
  >
      <button @click="handleClose" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/80 dark:bg-stone-800/80 backdrop-blur-md rounded-full text-stone-500 hover:text-brand-primary dark:text-stone-300 dark:hover:text-orange-300 z-10 shadow-sm transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>

      <template v-if="currentView === 'details'">

        <div class="bg-stone-50 dark:bg-stone-900/50 h-48 sm:h-56 flex items-center justify-center p-6 border-b border-stone-100 dark:border-stone-800 flex-shrink-0">
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
            <p class="text-sm sm:text-[15px] text-brand-text-muted dark:text-stone-400 leading-relaxed">{{ description }}</p>
          </div>

          <ArchiveLogSummary
            v-if="localItem.usage_state === 'archived'"
            :item="localItem"
            :usageLifespan="usageLifespan"
          />

          <div v-else class="mb-6 grid grid-cols-2 gap-3">

            <div class="p-3 bg-brand-primary/5 dark:bg-orange-900/10 border border-brand-primary/20 dark:border-orange-900/30 rounded-xl flex flex-col justify-between">
              <div>
                <h4 class="text-[10px] font-bold uppercase tracking-wider text-brand-primary/70 dark:text-orange-400/70 mb-1">Regimen</h4>
                <p class="text-sm font-bold text-brand-text dark:text-stone-200 leading-tight mb-2">
                  {{ isAssignedToRoutine ? localItem.status : 'Not Assigned' }}
                </p>
              </div>
              <button @click="goToRoutinePlanner" class="text-xs font-bold text-brand-primary dark:text-orange-400 hover:underline self-start">
                {{ isAssignedToRoutine ? 'Edit Routine' : 'Assign Product' }}
              </button>
            </div>

            <div class="p-3 bg-stone-50 dark:bg-stone-900/40 border border-stone-200/60 dark:border-stone-800/80 rounded-xl flex flex-col justify-center">
              <h4 class="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">Lifespan</h4>
               <p class="text-sm font-bold text-brand-text dark:text-stone-200 leading-none flex items-baseline gap-1">
                 <span v-if="usageLifespan !== null">
                   <span class="text-[17px] font-mono text-brand-primary dark:text-orange-400">{{ usageLifespan }}</span> Days
                 </span>
                 <span v-else>Unopened</span>
               </p>
            </div>

          </div>

          <KeyActivesGrid :ingredients="localItem.products?.product_ingredients" />
          <ProductLifecycleController v-if="localItem.usage_state !== 'archived'" :item="localItem" @updated="emit('refresh')" />

        </div>

        <div class="p-4 border-t border-stone-200 dark:border-stone-800 bg-brand-bg-light dark:bg-brand-bg-dark flex-shrink-0">
          <div v-if="!isConfirmingDelete" class="space-y-2">
            <button v-if="localItem.usage_state !== 'archived'" @click="startArchivingFlow" class="w-full py-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-bold rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all text-sm">Archive Product</button>
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
          :item="localItem"
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
</style>
