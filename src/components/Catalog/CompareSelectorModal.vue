<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { searchProducts } from '../../api/products'

const props = defineProps<{
  baseProduct: any
}>()

const emit = defineEmits(['close'])
const router = useRouter()

const searchQuery = ref('')
const allProducts = ref<any[]>([])
const selectedTarget = ref<any | null>(null)
const isLoading = ref(true)

onMounted(async () => {
  isLoading.value = true
  try {
    const data = await searchProducts('')
    // Filter out the base product itself
    allProducts.value = (data || []).filter(p => p.id !== props.baseProduct.id)
  } catch (error) {
    console.error("Failed to load compare suggestions:", error)
  } finally {
    isLoading.value = false
  }
})

// Prioritize same-category products (e.g. Cleanser vs Cleanser)
const sortedSuggestions = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()

  return allProducts.value
    .filter(p => {
      if (!query) return true
      return (p.name?.toLowerCase().includes(query)) || (p.brand?.toLowerCase().includes(query))
    })
    .sort((a, b) => {
      const aSameCat = a.category === props.baseProduct.category ? -1 : 1
      const bSameCat = b.category === props.baseProduct.category ? -1 : 1
      return aSameCat - bSameCat
    })
})

const handleConfirmCompare = () => {
  if (!selectedTarget.value) return
  emit('close')
  // Navigate to full-page compare view with both slugs
  const slugA = props.baseProduct.slug || props.baseProduct.id
  const slugB = selectedTarget.value.slug || selectedTarget.value.id
  router.push(`/compare?a=${slugA}&b=${slugB}`)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-md p-0 sm:p-4 animate-fade-in" @click.self="emit('close')">
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[85vh] overflow-hidden animate-slide-up">

      <!-- Modal Header -->
      <div class="p-6 border-b border-stone-200 dark:border-stone-800 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Step 2 of 2</span>
            <h3 class="font-serif font-bold text-lg text-brand-text dark:text-white">Select Product to Compare</h3>
          </div>
          <button @click="emit('close')" class="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 hover:text-brand-primary transition-colors">
            <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <!-- Search Input inside Modal -->
        <div class="relative">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="`Search ${baseProduct.category || 'products'} to compare against...`"
            class="w-full bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs rounded-2xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary text-brand-text dark:text-stone-100"
          />
        </div>
      </div>

      <!-- Base Product Reminder Banner -->
      <div class="px-6 py-2.5 bg-brand-primary/10 dark:bg-orange-950/30 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs font-semibold">
        <span class="text-stone-500 dark:text-stone-400">Comparing against:</span>
        <span class="font-bold text-brand-primary truncate max-w-[220px]">{{ baseProduct.brand }} {{ baseProduct.name }}</span>
      </div>

      <!-- Suggestions List -->
      <div class="flex-1 overflow-y-auto p-4 space-y-2 hide-scrollbar">
        <div v-if="isLoading" class="p-12 text-center text-stone-400 animate-pulse text-xs font-bold">Loading recommendations...</div>

        <div
          v-else
          v-for="prod in sortedSuggestions"
          :key="prod.id"
          @click="selectedTarget = prod"
          :class="[
            'flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer',
            selectedTarget?.id === prod.id
              ? 'bg-brand-primary/10 border-brand-primary dark:bg-orange-950/40'
              : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200/80 dark:border-stone-800 hover:border-stone-300'
          ]"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-12 h-12 rounded-xl bg-white dark:bg-stone-800 p-1 flex items-center justify-center flex-shrink-0 border border-stone-100 dark:border-stone-700">
              <img v-if="prod.image_url" :src="prod.image_url" class="w-full h-full object-contain" />
              <svg v-else class="w-6 h-6 text-stone-300 stroke-[1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div class="min-w-0">
              <span class="text-[10px] font-bold text-brand-primary uppercase tracking-wider block truncate">{{ prod.brand }}</span>
              <h5 class="text-xs font-bold text-brand-text dark:text-stone-100 truncate">{{ prod.name }}</h5>
              <span v-if="prod.category === baseProduct.category" class="inline-block mt-0.5 text-[9px] font-bold bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-md">Same Category</span>
            </div>
          </div>

          <!-- Selection Checkmark or Plus -->
          <div :class="['w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ml-2 transition-colors', selectedTarget?.id === prod.id ? 'bg-brand-primary text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-500']">
            <svg v-if="selectedTarget?.id === prod.id" class="w-4 h-4 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
            <svg v-else class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
        <button
          @click="handleConfirmCompare"
          :disabled="!selectedTarget"
          :class="[
            'w-full py-3.5 rounded-2xl font-bold text-xs transition-all shadow-md',
            selectedTarget ? 'bg-brand-primary hover:bg-pink-800 text-white cursor-pointer' : 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
          ]"
        >
          {{ selectedTarget ? `Compare vs ${selectedTarget.brand}` : 'Select a product above' }}
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
