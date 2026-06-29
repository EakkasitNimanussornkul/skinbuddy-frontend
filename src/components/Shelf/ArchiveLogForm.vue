<script setup lang="ts">
import { ref } from 'vue'
import { updateShelfStatus } from '../../api/shelfapi'
import { useToast } from '../../composables/useToast'

const props = defineProps<{
  item: any
  usageLifespan: number | null
}>()

const emit = defineEmits(['back', 'success'])
const { addToast } = useToast()

const archiveOutcome = ref<'empty' | 'discarded' | 'expired'>('empty')
const archiveNotes = ref('')
const isSubmitting = ref(false)

const executeArchive = async () => {
  isSubmitting.value = true
  try {
    const archivedDate = new Date().toISOString()

    await updateShelfStatus(props.item.id, 'archived', {
      outcome: archiveOutcome.value,
      notes: archiveNotes.value,
      archived_at: archivedDate
    })

    emit('success')
  } catch (error) {
    console.error("Archive Failed:", error)
    addToast('Failed to save archive entry. Check backend logs.', 'error')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="p-6 overflow-y-auto flex-grow hide-scrollbar">
    <div class="flex items-center gap-2 mb-4">
      <button @click="emit('back')" class="p-1 -ml-1 text-stone-400 hover:text-brand-text rounded-full transition-colors">
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
    <button @click="executeArchive" :disabled="isSubmitting" class="w-full bg-brand-primary text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-orange-800 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-70">
      <svg v-if="isSubmitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      {{ isSubmitting ? 'Saving...' : 'Complete Archive Entry' }}
    </button>
  </div>
</template>
