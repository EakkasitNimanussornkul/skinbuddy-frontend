<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { markItemOpened, removeFromShelf, updateShelfStatus } from '../api/shelfapi'
import { useToast } from '../composables/useToast'

const props = defineProps<{
  item: any
}>()

const emit = defineEmits(['close', 'refresh', 'delete'])
const { addToast } = useToast()
const router = useRouter()
const isClosing = ref(false)
const currentView = ref<'details' | 'archive_form'>('details')

// State to trigger the interactive pulse animation on click/tap
const isPulseTriggered = ref(false)

// --- Archive Log Form Fields ---
const archiveOutcome = ref<'empty' | 'discarded' | 'expired'>('empty')
const archiveNotes = ref('')

// Function to handle the opening animation/closing, reset pulse state
const handleClose = () => {
  isClosing.value = true
  isPulseTriggered.value = false // Reset pulse just in case
  setTimeout(() => {
    emit('close')
  }, 300)
}

// Trigger the quick pulse animation on interaction
const triggerPulseAnimation = () => {
  if (isPulseTriggered.value) return // Prevent spamming while animation plays
  isPulseTriggered.value = true

  // The animation duration is 300ms, so we reset the trigger after that
  setTimeout(() => {
    isPulseTriggered.value = false
  }, 300)
}

const brand = computed(() => props.item.products?.brand || 'Unknown Brand')
const name = computed(() => props.item.products?.name || 'Unknown Product')
const category = computed(() => props.item.category || props.item.products?.category || 'Uncategorized')
const imageUrl = computed(() => props.item.image_url || props.item.products?.image_url || null)
const description = computed(() => props.item.products?.description || 'No description available for this product.')

// Compute current archive values from backend schema columns safely
const activeOutcome = computed(() => props.item.archive_outcome || 'empty')
const activeNotes = computed(() => props.item.archive_notes || '')

const archiveOutcomeDetails = computed(() => {
  const details = {
    empty: { label: 'Finished Product', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10 border-green-500/20', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    discarded: { label: 'Abandoned / Discarded', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
    expired: { label: 'Expired Inventory', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
  }
  return details[activeOutcome.value as 'empty' | 'discarded' | 'expired'] || details.empty
})

// Calculate product active shelf lifecycle duration
const usageLifespan = computed(() => {
  if (!props.item?.opened_date) return null
  const opened = new Date(props.item.opened_date)

  // If already archived, calculate diff using its snapshot update time if available, or fall back to today
  const endPoint = props.item.updated_at ? new Date(props.item.updated_at) : new Date()
  const diffTime = endPoint.getTime() - opened.getTime()
  return diffTime > 0 ? Math.ceil(diffTime / (1000 * 3600 * 24)) : 0
})

const formatDate = (dateString: string | null) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year.slice(2)}`;
}

const isEditingExpiration = ref(false)
const editExpirationDate = ref('')

const startEditingExpiration = () => {
  editExpirationDate.value = props.item.expiration_date || ''
  isEditingExpiration.value = true
}

const setEditPAO = (months: number) => {
  if (!props.item?.opened_date) return
  const d = new Date(props.item.opened_date)
  d.setMonth(d.getMonth() + months)
  editExpirationDate.value = d.toISOString().split('T')[0]
}

const handleUpdateExpiration = async () => {
  try {
    await markItemOpened(props.item.id, props.item.opened_date, editExpirationDate.value, 'active')
    props.item.expiration_date = editExpirationDate.value
    isEditingExpiration.value = false
    emit('refresh')
    addToast('Expiration date updated!', 'success')
  } catch (error) {
    console.error(error)
    addToast('Could not update date', 'error')
  }
}

const handleStartPAO = async () => {
  const today = new Date()
  const openedDateStr = today.toISOString().split('T')[0]

  let expDateStr = null
  if (props.item.pao) {
    const expDate = new Date()
    expDate.setMonth(expDate.getMonth() + props.item.pao)
    expDateStr = expDate.toISOString().split('T')[0]
  }

  try {
    await markItemOpened(props.item.id, openedDateStr, expDateStr, 'active')
    props.item.opened_date = openedDateStr
    props.item.expiration_date = expDateStr
    props.item.usage_state = 'active'
    emit('refresh')
    addToast('Product opened! Clock started.', 'success')
  } catch (error) {
    console.error(error)
    addToast('Could not update product status', 'error')
  }
}

const startArchivingFlow = () => {
  currentView.value = 'archive_form'
}

const executeArchive = async () => {
  try {
    await updateShelfStatus(props.item.id, 'archived', {
      outcome: archiveOutcome.value,
      notes: archiveNotes.value
    })
    emit('refresh')
    handleClose()
    addToast('Product archived. Find it in your Archived filter!', 'info')
  } catch (error) {
    addToast('Failed to archive', 'error')
  }
}

const handleUnarchive = async () => {
  try {
    const restoredState = props.item.opened_date ? 'active' : 'unopened'
    await updateShelfStatus(props.item.id, restoredState)
    props.item.usage_state = restoredState
    emit('refresh')
    handleClose()
    addToast('Product successfully restored to your shelf!', 'success')
  } catch (error) {
    console.error(error)
    addToast('Failed to restore product', 'error')
  }
}

const isConfirmingDelete = ref(false)

const handleExecuteDelete = async () => {
  try {
    await removeFromShelf(props.item.id)
    emit('refresh')
    handleClose()
    addToast('Product removed from your shelf', 'info')
  } catch (error) {
    console.error(error)
    addToast('Failed to remove product', 'error')
  }
}

const goToRoutinePlanner = () => {
  handleClose()
  setTimeout(() => {
    router.push('/routine')
  }, 300)
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
      :class="[
        isClosing ? 'animate-slide-down' : 'animate-slide-up',
        // Dynamic class to trigger the interactive pulse animation
        isPulseTriggered ? 'animate-interact-pulse' : ''
      ]"
      @click="triggerPulseAnimation"
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
                <span class="text-sm font-mono font-bold text-brand-primary dark:text-orange-400 mt-0.5">
                  {{ usageLifespan !== null ? `${usageLifespan} Days` : 'Not Opened' }}
                </span>
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
            <button @click="goToRoutinePlanner" class="text-xs font-bold bg-white dark:bg-stone-800 text-brand-primary dark:text-orange-400 border border-brand-primary/30 dark:border-orange-900/50 px-4 py-2.5 rounded-xl shadow-sm hover:bg-brand-primary hover:text-white dark:hover:bg-orange-900/60 transition-all">
              Assign to Routine
            </button>
          </div>

          <div v-if="item.products?.product_ingredients?.length" class="mb-6">
            <h3 class="text-sm font-bold text-brand-text dark:text-stone-200 mb-3 flex items-center gap-2">
              <svg class="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
              Key Actives
            </h3>
            <div class="flex flex-wrap gap-2">
              <div v-for="pi in item.products.product_ingredients" :key="pi.ingredients.id" class="bg-brand-bg-light dark:bg-[#1C1917] border border-stone-200 dark:border-stone-800 rounded-xl p-3 flex-1 min-w-[140px]">
                <span class="block text-sm font-bold text-brand-primary dark:text-orange-300">{{ pi.ingredients.name }}</span>
                <span v-if="pi.ingredients.benefits" class="block text-[10px] text-brand-text-muted dark:text-stone-500 mt-1 leading-snug">{{ pi.ingredients.benefits }}</span>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <div v-if="item.opened_date" class="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl transition-all">
              <div v-if="!isEditingExpiration" class="flex justify-between items-center group">
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-red-600 dark:text-red-400">Expiration Date</span>
                  <span v-if="item.pao" class="text-[10px] text-red-500/70 dark:text-red-400/60 font-bold uppercase tracking-widest mt-0.5">({{ item.pao }}M PAO)</span>
                </div>
                <div class="flex items-center gap-3">
                  <span v-if="item.expiration_date" class="text-sm font-bold text-red-700 dark:text-red-300">{{ formatDate(item.expiration_date) }}</span>
                  <span v-else class="text-xs font-bold text-red-500">Not Set</span>

                  <button v-if="item.usage_state !== 'archived'" @click="startEditingExpiration" class="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-red-900/40 text-red-600 hover:bg-red-100 transition-colors border border-red-200 dark:border-red-800 shadow-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                </div>
              </div>

              <div v-else class="space-y-4 pt-1">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm font-bold text-red-600 dark:text-red-400">Update Expiration</span>
                  <button @click="isEditingExpiration = false" class="text-xs font-bold text-stone-400 hover:text-red-500 transition-colors">Cancel</button>
                </div>
                <div class="flex gap-2">
                  <button @click="setEditPAO(3)" class="flex-1 py-2 bg-white dark:bg-stone-800 rounded-lg text-xs font-bold border border-red-100 dark:border-red-900/30 text-stone-600 dark:text-stone-300 hover:border-red-300 transition-colors">3M</button>
                  <button @click="setEditPAO(6)" class="flex-1 py-2 bg-white dark:bg-stone-800 rounded-lg text-xs font-bold border border-red-100 dark:border-red-900/30 text-stone-600 dark:text-stone-300 hover:border-red-300 transition-colors">6M</button>
                  <button @click="setEditPAO(12)" class="flex-1 py-2 bg-white dark:bg-stone-800 rounded-lg text-xs font-bold border border-red-100 dark:border-red-900/30 text-stone-600 dark:text-stone-300 hover:border-red-300 transition-colors">12M</button>
                </div>
                <input v-model="editExpirationDate" type="date" class="w-full bg-white dark:bg-stone-900 border-2 border-red-100 dark:border-red-900/50 text-brand-text dark:text-white px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-400 text-sm shadow-sm transition-colors" />
                <button @click="handleUpdateExpiration" class="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-md shadow-red-500/20 transition-all active:scale-[0.98]">Save Date</button>
              </div>
            </div>

            <div v-else class="bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 p-4 rounded-2xl flex flex-col gap-4">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <svg class="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  <span class="text-sm font-bold text-brand-text-muted dark:text-stone-300">Status: Unopened</span>
                </div>
                <span v-if="item.pao" class="text-xs font-bold bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300 px-3 py-1 rounded-lg">{{ item.pao }}M PAO</span>
              </div>

              <button v-if="item.usage_state !== 'archived'" @click="handleStartPAO" class="w-full py-3.5 bg-brand-primary hover:bg-orange-800 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
                {{ item.pao ? 'Open Today & Start Clock' : 'Mark as Opened Today' }}
              </button>
            </div>
          </div>
        </div>

        <div class="p-4 border-t border-stone-200 dark:border-stone-800 bg-brand-bg-light dark:bg-brand-bg-dark flex-shrink-0">
          <div v-if="!isConfirmingDelete" class="space-y-2">
            <button
              v-if="item.usage_state !== 'archived'"
              @click="startArchivingFlow"
              class="w-full py-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-bold rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all text-sm"
            >
              Archive Product
            </button>
            <button
              v-else
              @click="handleUnarchive"
              class="w-full py-3 bg-brand-primary/10 dark:bg-orange-900/20 text-brand-primary dark:text-orange-400 font-bold rounded-xl border border-brand-primary/20 dark:border-orange-900/30 hover:bg-brand-primary/20 transition-all text-sm animate-fade-in"
            >
              Restore to Shelf (Unarchive)
            </button>
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
        <div class="p-6 overflow-y-auto flex-grow hide-scrollbar">
          <div class="flex items-center gap-2 mb-4">
            <button @click="currentView = 'details'" class="p-1 -ml-1 text-stone-400 hover:text-brand-text rounded-full transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h3 class="text-base font-serif font-bold text-brand-text dark:text-white">Archive Skin Diary</h3>
          </div>

          <div v-if="usageLifespan !== null" class="mb-5 bg-stone-50 dark:bg-stone-900/50 p-4 rounded-2xl border border-stone-200/60 dark:border-stone-800 text-center">
            <p class="text-[10px] uppercase font-black tracking-widest text-stone-400 dark:text-stone-500">Total Lifespan</p>
            <p class="text-2xl font-mono font-bold text-brand-primary dark:text-orange-400 mt-1">{{ usageLifespan }} Days</p>
            <p class="text-xs text-brand-text-muted mt-0.5">from open date to shelf removal log.</p>
          </div>

          <div class="mb-5">
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2">Product Outcome</label>
            <div class="grid grid-cols-3 gap-2">
              <button @click="archiveOutcome = 'empty'" :class="archiveOutcome === 'empty' ? 'bg-orange-700 text-white border-orange-700' : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'" class="py-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 shadow-sm">
                <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Finished
              </button>
              <button @click="archiveOutcome = 'discarded'" :class="archiveOutcome === 'discarded' ? 'bg-orange-700 text-white border-orange-700' : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'" class="py-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 shadow-sm">
                <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Abandoned
              </button>
              <button @click="archiveOutcome = 'expired'" :class="archiveOutcome === 'expired' ? 'bg-orange-700 text-white border-orange-700' : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'" class="py-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 shadow-sm">
                <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Expired
              </button>
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2">Skin Performance Notes</label>
            <textarea
              v-model="archiveNotes"
              rows="4"
              placeholder="Did this product break you out, fix irritation, or did you absolutely love it? Record your notes for future reference..."
              class="w-full bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-700 text-brand-text dark:text-white p-3.5 rounded-2xl focus:outline-none focus:border-brand-primary text-sm shadow-sm transition-colors resize-none leading-relaxed placeholder:text-stone-400 dark:placeholder:text-stone-600"
            ></textarea>
          </div>
        </div>

        <div class="p-4 border-t border-stone-200 dark:border-stone-800 bg-brand-bg-light dark:bg-brand-bg-dark flex-shrink-0">
          <button @click="executeArchive" class="w-full bg-brand-primary text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-orange-800 active:scale-[0.98] transition-all text-sm">
            Complete Archive Entry
          </button>
        </div>
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

.animate-interact-pulse {
  animation: interactPulse 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

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
