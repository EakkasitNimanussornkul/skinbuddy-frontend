<script setup lang="ts">
import { computed, ref } from 'vue'
import { markItemOpened } from '../../api/shelfapi.ts'
import { addMonthsAsDateString, parseLocalDate, toLocalDateString } from '../../api/dates.ts'
import { useToast } from '../../composables/useToast.ts'
import CustomDatePicker from '../Shared/CustomDatePicker.vue'
import type { ShelfItem } from '../../stores/shelfStore'

const props = defineProps<{
  item: ShelfItem
}>()

const emit = defineEmits(['updated'])
const { addToast } = useToast()

const isEditingExpiration = ref(false)
const editExpirationDate = ref('')
const activeEditPao = ref<number | null>(null)

const optionsScrollFrame = ref<HTMLElement | null>(null)

const paoOptions = [1, 3, 6, 9, 12, 18, 24, 36]
// Feeds the expiry picker's :min-date. Read in the local calendar, not through
// toISOString() - see api/dates.ts.
const todayString = computed(() => toLocalDateString())

const startEditingExpiration = () => {
  editExpirationDate.value = props.item.expiration_date || ''
  activeEditPao.value = props.item.pao ? parseInt(String(props.item.pao)) : null
  isEditingExpiration.value = true
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return ''
  const [year, month, day] = dateString.split('-')
  if (!year || !month || !day) return ''
  return `${day}/${month}/${year.slice(2)}`
}

// Counts from the item's OPENED date, deliberately - a period after opening is
// defined from when the product was opened. ProductConfigurator.setPAO counts
// from today instead, which is right for its own context: at add time there is
// no opened date yet. The two differ on purpose; FE-DEF-19 recorded that
// nothing said so.
//
// STILL OPEN, and the remaining half of FE-DEF-19: for a product opened longer
// ago than the period, this computes a date in the past - which the calendar
// beside it now refuses again. The button is telling the truth (that product
// really did expire) and the calendar is enforcing the rule the panel is meant
// to enforce; reconciling them needs a product decision, not a code change.
const setEditPAO = (months: number) => {
  const opened = parseLocalDate(props.item?.opened_date)
  if (!opened) return
  activeEditPao.value = months
  editExpirationDate.value = addMonthsAsDateString(opened, months)
}

const handleHorizontalWheel = (event: WheelEvent) => {
  if (!optionsScrollFrame.value) return
  event.preventDefault()
  optionsScrollFrame.value.scrollLeft += event.deltaY
}

// 🌟 PERSIST PAO TO BACKEND
const handleUpdateExpiration = async () => {
  // The edit button only renders once the item has been opened, so this is a
  // guard for the type rather than a reachable branch.
  if (!props.item.opened_date) return

  try {
    const finalPao = activeEditPao.value || props.item.pao

    await markItemOpened(
      props.item.id,
      props.item.opened_date,
      editExpirationDate.value,
      'active',
      finalPao
    )

    isEditingExpiration.value = false

    // 🌟 Create a fresh updated clone rather than mutating props.item directly
    const updatedItem = {
      ...props.item,
      expiration_date: editExpirationDate.value,
      pao: finalPao,
      usage_state: 'active'
    }

    // Emit updated clone
    emit('updated', updatedItem)
    addToast('Expiration date & PAO updated!', 'success')
  } catch (error) {
    addToast('Could not update date', 'error')
  }
}

const handleStartPAO = async () => {
  const today = new Date()
  const openedDateStr = toLocalDateString(today)
  let expDateStr = null
  const currentPao = props.item.pao ? parseInt(String(props.item.pao)) : null

  if (currentPao) {
    expDateStr = addMonthsAsDateString(today, currentPao)
  }

  try {
    await markItemOpened(
      props.item.id,
      openedDateStr,
      expDateStr || null,
      'active',
      currentPao
    )
    // FE-DEF-20: a second `updateShelfStatus(id, 'active')` used to run here.
    // PATCH /shelf/{item_id}/open already writes usage_state 'active'
    // unconditionally (app/api/shelf.py:122), so it set the same column to the
    // same value - and it opened a window where the first write could succeed
    // and the second fail, leaving the item opened in the database while the
    // screen still showed the unopened panel. Pressing "Start Product Life"
    // again then reset the opened date to today, discarding the real one.

    // 🌟 Emit clone without direct prop mutation
    const updatedItem = {
      ...props.item,
      opened_date: openedDateStr,
      expiration_date: expDateStr,
      usage_state: 'active',
      pao: currentPao
    }

    emit('updated', updatedItem)
    addToast('Product opened! Clock started.', 'success')
  } catch (error) {
    addToast('Could not update product status', 'error')
  }
}
</script>

<template>
  <div class="space-y-2">

    <!-- Active State -->
    <div v-if="item.opened_date" class="bg-brand-primary-light/30 dark:bg-brand-primary/10 border border-brand-primary/20 p-4 rounded-2xl transition-all">
      <div v-if="!isEditingExpiration" class="flex justify-between items-center group">
        <div class="flex flex-col">
          <span class="text-xs font-bold text-brand-primary">Expiration Date</span>
          <span v-if="item.pao" class="text-[10px] text-brand-primary font-bold uppercase tracking-widest mt-0.5">({{ String(item.pao).replace('M', '') }}M PAO)</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm font-bold text-brand-primary">{{ item.expiration_date ? formatDate(item.expiration_date) : 'Not Set' }}</span>
          <button v-if="item.usage_state !== 'archived'" @click="startEditingExpiration" class="w-8 h-8 flex items-center justify-center rounded-full bg-brand-surface-light dark:bg-brand-surface-dark text-brand-primary hover:bg-brand-primary-light dark:hover:bg-brand-primary/20 transition-colors border border-brand-primary/20 shadow-sm cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
          </button>
        </div>
      </div>

      <!-- Edit Mode -->
      <div v-else class="space-y-4 pt-1 animate-fade-in">
        <div class="flex justify-between items-center relative z-10">
          <span class="text-sm font-bold text-brand-primary">Update Expiration</span>
          <button @click="isEditingExpiration = false" class="text-xs font-bold text-brand-text-muted hover:text-brand-primary transition-colors cursor-pointer">Cancel</button>
        </div>

        <div
          ref="optionsScrollFrame"
          @wheel="handleHorizontalWheel"
          class="flex overflow-x-auto gap-2 pb-2 p-1 horizontal-pao-track -mx-1 select-none"
        >
          <button
            v-for="months in paoOptions"
            :key="months"
            @click="setEditPAO(months)"
            :class="[
              'shrink-0 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer',
              activeEditPao === months
                ? 'bg-brand-primary text-white border-brand-primary shadow-md'
                : 'bg-brand-surface-light dark:bg-brand-surface-dark border-brand-surface-border dark:border-stone-700 text-brand-text-muted hover:border-brand-primary/50'
            ]"
          >
            {{ months }}M
          </button>
        </div>

        <!-- FE-DEF-19, reopened 06/09/2026. This binding was dropped in
             dbf9b82 on the reasoning that the period buttons beside it can
             legitimately compute a past expiry, so the calendar should allow
             what they produce. Dropping it also let the user hand-pick any past
             date, which is what this panel exists to prevent - a date being
             *derived* from an opened date long ago is not the same act as a
             date being *chosen*. The guard is restored; the buttons keep their
             own arithmetic. -->
        <CustomDatePicker v-model="editExpirationDate" :min-date="todayString" />
        <button @click="handleUpdateExpiration" class="w-full py-3 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-bold text-sm transition-all active:scale-[0.98] shadow-sm cursor-pointer">Save Date</button>
      </div>
    </div>

    <!-- Unopened State -->
    <div v-else class="bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 p-4 rounded-2xl flex flex-col gap-4 shadow-sm">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-brand-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          <span class="text-sm font-bold text-brand-text-muted dark:text-stone-300">Status: Unopened</span>
        </div>
        <span class="text-xs font-bold bg-brand-bg-light dark:bg-stone-800 text-brand-text-muted px-3 py-1 rounded-lg border border-brand-surface-border dark:border-stone-700">
          {{ item.pao ? `${String(item.pao).replace('M', '')}M PAO` : 'PAO: Not Set' }}
        </span>
      </div>
      <button v-if="item.usage_state !== 'archived'" @click="handleStartPAO" class="w-full py-3.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm cursor-pointer">
        Start Product Life
      </button>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

.horizontal-pao-track::-webkit-scrollbar {
  height: 4px;
}
.horizontal-pao-track::-webkit-scrollbar-track {
  background: transparent;
}
.horizontal-pao-track::-webkit-scrollbar-thumb {
  background-color: rgba(120, 113, 108, 0.2);
  border-radius: 10px;
}
.horizontal-pao-track::-webkit-scrollbar-thumb:hover {
  background-color: rgba(120, 113, 108, 0.4);
}
</style>
