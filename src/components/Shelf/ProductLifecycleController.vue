<script setup lang="ts">
import { ref, computed } from 'vue'
import { markItemOpened, updateShelfStatus } from '../../api/shelfapi.ts'
import { useToast } from '../../composables/useToast.ts'
import CustomDatePicker from '../Shared/CustomDatePicker.vue'

const props = defineProps<{
  item: any
}>()

const emit = defineEmits(['updated'])
const { addToast } = useToast()

// --- State ---
const isEditingExpiration = ref(false)
const editExpirationDate = ref('')
const showPaoTooltip = ref(false)
const activeEditPao = ref<number | null>(null) // NEW: Tracks which button was clicked

const paoOptions = [1, 3, 6, 9, 12, 18, 24, 36]
const todayString = computed(() => new Date().toISOString().split('T')[0])

// --- Actions ---
const startEditingExpiration = () => {
  editExpirationDate.value = props.item.expiration_date || ''
  activeEditPao.value = null // Reset the button highlight when opening the editor
  isEditingExpiration.value = true
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year.slice(2)}`;
}

const setEditPAO = (months: number) => {
  if (!props.item?.opened_date) return
  activeEditPao.value = months // Highlight the clicked button

  const d = new Date(props.item.opened_date)
  d.setMonth(d.getMonth() + months)
  editExpirationDate.value = d.toISOString().split('T')[0]
}

const handleUpdateExpiration = async () => {
  try {
    await markItemOpened(props.item.id, props.item.opened_date, editExpirationDate.value, 'active')
    props.item.expiration_date = editExpirationDate.value
    isEditingExpiration.value = false
    emit('updated')
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
    await markItemOpened(props.item.id, openedDateStr, expDateStr || null, 'active')
    await updateShelfStatus(props.item.id, 'active')

    props.item.opened_date = openedDateStr
    props.item.expiration_date = expDateStr
    props.item.usage_state = 'active'
    emit('updated')
    addToast('Product opened! Clock started.', 'success')
  } catch (error) {
    console.error(error)
    addToast('Could not update product status', 'error')
  }
}
</script>

<template>
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

      <div v-else class="space-y-4 pt-1 animate-fade-in">

        <div class="flex justify-between items-center relative z-10">
          <div class="flex items-center gap-1">
            <span class="text-sm font-bold text-red-600 dark:text-red-400">Update PAO / Expiration</span>
            <button
              type="button"
              @click.prevent="showPaoTooltip = !showPaoTooltip"
              @mouseenter="showPaoTooltip = true"
              @mouseleave="showPaoTooltip = false"
              class="text-red-400 hover:text-red-600 transition-colors focus:outline-none p-1"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <button @click="isEditingExpiration = false" class="text-xs font-bold text-stone-400 hover:text-red-500 transition-colors">Cancel</button>

          <Transition name="fade">
            <div v-if="showPaoTooltip" class="absolute bottom-full left-0 mb-2 w-64 p-3 bg-stone-800 dark:bg-stone-700 text-xs text-white leading-relaxed rounded-xl shadow-xl z-50 pointer-events-none">
              Select the PAO (Period After Opening) symbol found on your physical product jar to recalculate your expiration date.
              <div class="absolute top-full left-6 border-[6px] border-transparent border-t-stone-800 dark:border-t-stone-700"></div>
            </div>
          </Transition>
        </div>

        <div class="flex overflow-x-auto gap-2 pb-2 snap-x hide-scrollbar -mx-1 px-1">
          <button
            v-for="months in paoOptions"
            :key="months"
            @click="setEditPAO(months)"
            :class="[
              'snap-start shrink-0 px-4 py-2 rounded-lg text-xs font-bold border transition-colors shadow-sm',
              activeEditPao === months
                ? 'bg-red-800 text-white border-red-800 dark:bg-red-200 dark:text-red-900'
                : 'bg-white dark:bg-stone-800 border-red-100 dark:border-red-900/30 text-stone-600 dark:text-stone-300 hover:border-red-400 dark:hover:border-red-600'
            ]"
          >
            {{ months }}M
          </button>
        </div>

        <CustomDatePicker
          v-model="editExpirationDate"
          :min-date="todayString"
        />

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
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; transform: translateY(4px); }
</style>
