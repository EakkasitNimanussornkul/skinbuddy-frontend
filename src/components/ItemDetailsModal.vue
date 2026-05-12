<script setup lang="ts">
import { ref } from 'vue'
import { markItemOpened } from '../api/shelfApi'

const props = defineProps<{
  item: any
}>()

// It can tell the parent view to close it, or to refresh the shelf!
const emit = defineEmits(['close', 'refresh'])

// --- Local State for Editing ---
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

// --- API Calls ---
const handleUpdateExpiration = async () => {
  try {
    await markItemOpened(props.item.id, props.item.opened_date, editExpirationDate.value)
    props.item.expiration_date = editExpirationDate.value // Update local UI
    isEditingExpiration.value = false
    emit('refresh') // Tell parent to fetch new data
  } catch (error) {
    console.error("Failed to update expiration:", error)
    alert("Could not update date.")
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
    await markItemOpened(props.item.id, openedDateStr, expDateStr)
    props.item.opened_date = openedDateStr
    props.item.expiration_date = expDateStr
    emit('refresh')
  } catch (error) {
    console.error("Failed to start PAO", error)
    alert("Could not update product status.")
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-0 animate-fade-in">
    <div class="bg-white dark:bg-clinical-surface w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up relative">

      <button @click="emit('close')" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-300 z-10 hover:bg-slate-200 transition-colors">✕</button>

      <div class="bg-slate-50 dark:bg-slate-800/50 h-48 flex items-center justify-center p-6 border-b border-slate-100 dark:border-slate-700">
        <img v-if="item.products?.image_url" :src="item.products.image_url" class="h-full object-contain mix-blend-multiply dark:mix-blend-normal drop-shadow-xl" />
        <span v-else class="text-6xl">🧴</span>
      </div>

      <div class="p-6">
        <p class="text-xs text-[#2E5BFF] font-bold uppercase tracking-widest mb-1">{{ item.products?.brand }}</p>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white leading-tight mb-4">{{ item.products?.name }}</h2>

        <div class="flex gap-2 mb-6">
          <span class="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-lg font-semibold">{{ item.products?.category }}</span>
          <span class="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg font-semibold">{{ item.status }} Routine</span>
        </div>

        <div v-if="item.products?.product_ingredients?.length" class="mb-5">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-3">Key Actives</h3>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="pi in item.products.product_ingredients"
              :key="pi.ingredients.id"
              class="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 flex-1 min-w-[140px]"
            >
              <span class="block text-sm font-bold text-[#2E5BFF] dark:text-blue-400">{{ pi.ingredients.name }}</span>
              <span v-if="pi.ingredients.benefits" class="block text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{{ pi.ingredients.benefits }}</span>
            </div>
          </div>
        </div>

        <div class="mt-6 space-y-2">

          <div v-if="item.opened_date" class="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl transition-all">
            <div v-if="!isEditingExpiration" @click="startEditingExpiration" class="flex justify-between items-center cursor-pointer group">
              <span class="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                Expiration Date
                <span class="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-300 px-1.5 py-0.5 rounded">EDIT</span>
              </span>
              <span class="text-sm font-bold" :class="item.expiration_date ? 'text-red-700 dark:text-red-300' : 'text-red-400 italic'">
                {{ item.expiration_date || 'Not set' }}
              </span>
            </div>

            <div v-else class="space-y-4 animate-fade-in pt-1">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-bold text-red-600 dark:text-red-400">Update Expiration</span>
                <button @click="isEditingExpiration = false" class="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors">Cancel</button>
              </div>
              <div class="flex gap-2">
                <button @click="setEditPAO(3)" class="flex-1 py-2 bg-white dark:bg-slate-800 rounded-lg text-xs font-bold border border-red-100 dark:border-red-900/30 text-slate-600 dark:text-slate-300 hover:border-red-300 transition-colors">3M</button>
                <button @click="setEditPAO(6)" class="flex-1 py-2 bg-white dark:bg-slate-800 rounded-lg text-xs font-bold border border-red-100 dark:border-red-900/30 text-slate-600 dark:text-slate-300 hover:border-red-300 transition-colors">6M</button>
                <button @click="setEditPAO(12)" class="flex-1 py-2 bg-white dark:bg-slate-800 rounded-lg text-xs font-bold border border-red-100 dark:border-red-900/30 text-slate-600 dark:text-slate-300 hover:border-red-300 transition-colors">12M</button>
              </div>
              <input v-model="editExpirationDate" type="date" class="w-full bg-white dark:bg-clinical-surface border-2 border-red-100 dark:border-red-900/50 text-slate-900 dark:text-white px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-400 text-sm shadow-sm transition-colors" />
              <button @click="handleUpdateExpiration" class="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-md shadow-red-500/20 transition-all active:scale-[0.98]">Save Date</button>
            </div>
          </div>

          <div v-else class="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex flex-col gap-4">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <span class="text-lg">🔒</span>
                <span class="text-sm font-bold text-slate-700 dark:text-slate-300">Status: Unopened</span>
              </div>
              <span v-if="item.pao" class="text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-3 py-1 rounded-lg">
                {{ item.pao }}M PAO
              </span>
            </div>
            <button @click="handleStartPAO" class="w-full py-3.5 bg-[#2E5BFF] hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <span>🔓</span> {{ item.pao ? 'Open Today & Start Clock' : 'Mark as Opened Today' }}
            </button>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>
