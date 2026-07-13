<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { removeFromShelf } from '../../api/shelfapi'
import { useToast } from '../../composables/useToast'
import { useAuthStore } from '../../stores/auth'

import KeyActivesGrid from './KeyActivesGrid.vue'
import ProductLifecycleController from './ProductLifecycleController.vue'
import ArchiveLogForm from './ArchiveLogForm.vue'
import ArchiveLogSummary from './ArchiveLogSummary.vue'

const props = defineProps<{
  item: any
}>()

const emit = defineEmits(['close', 'refresh'])
const { addToast } = useToast()
const router = useRouter()
const authStore = useAuthStore()

const localItem = ref({ ...props.item })
const currentView = ref<'details' | 'archive_form'>('details')
const isConfirmingDelete = ref(false)

const brand = computed(() => localItem.value.products?.brand || 'Unknown Brand')
const name = computed(() => localItem.value.products?.name || 'Unknown Product')
const category = computed(() => localItem.value.category || localItem.value.products?.category || 'Formulation')
const imageUrl = computed(() => localItem.value.image_url || localItem.value.products?.image_url || null)
const description = computed(() => localItem.value.products?.description || 'Active skincare routine item.')

// --- Dynamic Baumann Skin Match Breakdown ---
const baumannMatch = computed(() => {
  const score = localItem.value.products?.skin_match_score || 88
  const matchReasons = localItem.value.products?.match_reasons || [
    'Formulated around essential lipid and humectant components to support overall barrier hydration.'
  ]
  const cautionReasons = localItem.value.products?.caution_reasons || []
  const skinType = authStore.user?.skin_type || 'Your Profile'

  if (cautionReasons.length > 0 || score < 55) {
    return {
      title: 'Proceed with Caution',
      score,
      badgeClass: 'bg-semantic-warning/10 text-semantic-warning border-semantic-warning/20',
      containerClass: 'bg-semantic-warning/5 border-semantic-warning/10',
      matchReasons,
      cautionReasons,
      skinType
    }
  }

  return {
    title: 'Great match',
    score,
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    containerClass: 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-500/10',
    matchReasons,
    cautionReasons,
    skinType
  }
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

const handleExecuteDelete = async () => {
  try {
    await removeFromShelf(localItem.value.id)
    emit('refresh')
    emit('close')
    addToast('Product removed from active routine check.', 'info')
  } catch (error) {
    addToast('Failed to delete shelf item.', 'error')
  }
}
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-md p-0 sm:p-4 animate-fade-in" @click.self="emit('close')">
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark w-full max-w-4xl rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-brand-surface-border dark:border-stone-800 flex flex-col max-h-[92vh] overflow-hidden animate-slide-up">

      <div class="px-6 py-4 border-b border-brand-surface-border dark:border-stone-800 flex items-center justify-between flex-shrink-0 bg-brand-bg-light/80 dark:bg-brand-bg-dark/80 backdrop-blur-md z-10">
        <span class="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-brand-primary-light dark:bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
          Shelf Item Inspection
        </span>
        <button @click="emit('close')" class="w-8 h-8 rounded-full bg-brand-surface-light dark:bg-brand-surface-dark flex items-center justify-center text-brand-text-muted hover:text-brand-primary transition-colors border border-brand-surface-border dark:border-stone-800">
          <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div v-if="currentView === 'details'" class="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto flex-1 hide-scrollbar">

        <!-- Left Pane: Visuals -->
        <div class="lg:col-span-5 bg-brand-bg-light dark:bg-stone-900/30 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-brand-surface-border dark:border-stone-800 space-y-6">
          <div>
            <div class="w-44 h-44 sm:w-56 sm:h-56 mx-auto bg-white dark:bg-brand-surface-dark rounded-3xl p-4 border border-brand-surface-border dark:border-stone-800 flex items-center justify-center shadow-sm">
              <img v-if="imageUrl" :src="imageUrl" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
              <svg v-else class="w-16 h-16 text-brand-text-muted stroke-[1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div class="mt-4 text-center sm:text-left">
              <span class="text-[10px] font-bold text-brand-primary uppercase tracking-widest">{{ brand }}</span>
              <h2 class="text-xl sm:text-2xl font-serif font-bold text-brand-text dark:text-white leading-tight mt-0.5">{{ name }}</h2>
              <span class="inline-block mt-2 text-[11px] font-bold uppercase tracking-wider bg-brand-surface-light dark:bg-brand-surface-dark px-3 py-1 rounded-xl text-brand-text-muted border border-brand-surface-border dark:border-stone-700">{{ category }}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 pt-4 border-t border-brand-surface-border dark:border-stone-800">
            <div class="bg-brand-surface-light dark:bg-brand-surface-dark p-3.5 rounded-2xl border border-brand-surface-border dark:border-stone-800 text-center shadow-sm">
              <span class="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest block mb-0.5">Active Lifespan</span>
              <span class="text-lg font-mono font-bold text-brand-primary">{{ usageLifespan !== null ? `${usageLifespan} Days` : 'Unopened' }}</span>
            </div>
            <div class="bg-brand-surface-light dark:bg-brand-surface-dark p-3.5 rounded-2xl border border-brand-surface-border dark:border-stone-800 text-center shadow-sm">
              <span class="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest block mb-0.5">PAO Window</span>
              <span class="text-lg font-mono font-bold text-brand-text dark:text-stone-100">{{ localItem.pao ? localItem.pao + 'M' : '12M' }}</span>
            </div>
          </div>
        </div>

        <!-- Right Pane: Details & Configuration -->
        <div class="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div class="space-y-6">

            <div :class="['p-5 rounded-3xl border transition-all space-y-4 shadow-sm', baumannMatch.containerClass]">
              <div class="flex items-center justify-between border-b border-brand-surface-border dark:border-stone-800 pb-3">
                <div>
                  <h4 class="font-bold text-base text-brand-text dark:text-white">{{ baumannMatch.title }}</h4>
                  <p class="text-[11px] font-medium text-brand-text-muted mt-0.5">Tailored compatibility for <strong class="text-brand-text dark:text-stone-200 font-mono">{{ baumannMatch.skinType }}</strong></p>
                </div>
                <span :class="['text-sm font-black px-3 py-1 rounded-full font-mono border', baumannMatch.badgeClass]">
                  {{ baumannMatch.score }}%
                </span>
              </div>

              <!-- Match Reasons -->
              <div class="space-y-2">
                <div v-for="(reason, idx) in baumannMatch.matchReasons" :key="idx" class="flex items-start gap-2.5 text-xs font-medium text-brand-text dark:text-stone-300">
                  <svg class="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <span class="leading-relaxed">{{ reason }}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 class="text-xs font-bold uppercase tracking-widest text-brand-text-muted mb-1.5">Description</h4>
              <p class="text-xs sm:text-sm font-medium text-brand-text-muted dark:text-stone-400 leading-relaxed">{{ description }}</p>
            </div>

            <ArchiveLogSummary v-if="localItem.usage_state === 'archived'" :item="localItem" :usage-lifespan="usageLifespan" />
            <ProductLifecycleController v-else :item="localItem" @updated="emit('refresh')" />

            <KeyActivesGrid :ingredients="localItem.products?.product_ingredients" />
          </div>

          <!-- Footer Actions -->
          <div class="pt-6 border-t border-brand-surface-border dark:border-stone-800 space-y-2.5">
            <div v-if="!isConfirmingDelete" class="grid grid-cols-2 gap-3">
              <button v-if="localItem.usage_state !== 'archived'" @click="currentView = 'archive_form'" class="py-3 bg-brand-surface-light dark:bg-stone-800 text-brand-text dark:text-stone-200 font-bold rounded-xl text-xs hover:bg-brand-surface-border transition-all border border-brand-surface-border dark:border-stone-700 shadow-sm">
                Archive Product
              </button>
              <button @click="isConfirmingDelete = true" class="py-3 bg-semantic-error/5 dark:bg-semantic-error/10 text-semantic-error font-bold rounded-xl text-xs hover:bg-semantic-error/10 transition-all border border-semantic-error/20 shadow-sm">
                Permanently Delete
              </button>
            </div>

            <div v-else class="bg-semantic-error/10 p-4 rounded-2xl border border-semantic-error/20 space-y-3 shadow-sm">
              <p class="text-center text-xs font-bold text-semantic-error">Permanently delete this item from your routine?</p>
              <div class="grid grid-cols-2 gap-3">
                <button @click="isConfirmingDelete = false" class="py-2.5 rounded-xl font-bold text-xs bg-brand-surface-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700 text-brand-text dark:text-stone-300 shadow-sm">Cancel</button>
                <button @click="handleExecuteDelete" class="py-2.5 rounded-xl font-bold text-xs bg-semantic-error hover:bg-semantic-error/90 text-white shadow-sm transition-transform active:scale-[0.98]">Yes, Delete</button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div v-else-if="currentView === 'archive_form'" class="p-6 sm:p-8 flex-1 overflow-y-auto">
        <ArchiveLogForm :item="localItem" :usage-lifespan="usageLifespan" @back="currentView = 'details'" @success="emit('refresh'); emit('close')" />
      </div>

    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
