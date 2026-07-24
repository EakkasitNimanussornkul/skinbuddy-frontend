<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getMyShelf, addToShelf } from '../../api/shelfapi'
import { searchProducts } from '../../api/products'
import { analyzeForRoutine, addRoutineStep } from '../../api/routineApi'
import { useToast } from '../../composables/useToast'
import SafetyWarningModal from '../Shelf/SafetyWarningModal.vue'

const props = defineProps<{
  existingProductIds: string[]
}>()

const emit = defineEmits(['close', 'added'])
const { addToast } = useToast()

const shelf = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const checkingId = ref<string | null>(null)

// catalog (off-shelf) search
const catalog = ref<any[]>([])
const catalogLoading = ref(false)

// compatibility gate
const pendingItem = ref<any>(null) // { product_id, shelf_item_id }
const pendingWarnings = ref<any[]>([])

// add-to-storage gate (UC-17 A1)
const pendingStorageProduct = ref<any>(null)
const addingToStorage = ref(false)

const shelfProductIds = computed(() => new Set(shelf.value.map((i: any) => i.product_id)))

onMounted(async () => {
  try {
    const data = await getMyShelf()
    shelf.value = (data || []).filter(
      (item: any) => item.product_id && !props.existingProductIds.includes(item.product_id)
    )
  } catch {
    addToast('Failed to load your storage', 'error')
  } finally {
    loading.value = false
  }
})

const filteredShelf = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return shelf.value
  return shelf.value.filter((item: any) => {
    const p = item.products || {}
    return (p.name || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q)
  })
})

// Off-shelf catalog results = search hits that aren't in storage and aren't already routine steps.
const offShelfResults = computed(() =>
  catalog.value.filter(
    (p: any) => p.id && !shelfProductIds.value.has(p.id) && !props.existingProductIds.includes(p.id)
  )
)

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, (q) => {
  if (searchTimer) clearTimeout(searchTimer)
  if (!q.trim()) {
    catalog.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    catalogLoading.value = true
    try {
      const data = await searchProducts(q.trim())
      catalog.value = Array.isArray(data) ? data : data?.products || []
    } catch {
      catalog.value = []
    } finally {
      catalogLoading.value = false
    }
  }, 350)
})

// --- Add a product already in storage ---
const selectShelfItem = async (item: any) => {
  checkingId.value = item.id
  try {
    const result = await analyzeForRoutine(item.product_id)
    if (result.warnings && result.warnings.length > 0) {
      pendingItem.value = { product_id: item.product_id, shelf_item_id: item.id, name: item.products?.name }
      pendingWarnings.value = result.warnings
    } else {
      await doAdd(item.product_id, item.id)
    }
  } catch {
    addToast('Compatibility check failed', 'error')
  } finally {
    checkingId.value = null
  }
}

// --- Off-shelf product: ask to add to storage first (UC-17 A1) ---
const selectCatalogItem = (product: any) => {
  pendingStorageProduct.value = product
}

const confirmAddToStorage = async () => {
  const product = pendingStorageProduct.value
  if (!product) return
  addingToStorage.value = true
  try {
    // UC-05: add to storage as an active product.
    const shelfItem = await addToShelf({ product_id: product.id, usage_state: 'active' })
    pendingStorageProduct.value = null
    // Keep local storage list in sync.
    shelf.value.push({ id: shelfItem.id, product_id: product.id, products: product })
    // Then run the compatibility check and add to the routine.
    checkingId.value = product.id
    const result = await analyzeForRoutine(product.id)
    if (result.warnings && result.warnings.length > 0) {
      pendingItem.value = { product_id: product.id, shelf_item_id: shelfItem.id, name: product.name }
      pendingWarnings.value = result.warnings
    } else {
      await doAdd(product.id, shelfItem.id)
    }
  } catch {
    addToast('Could not add the product to your storage', 'error')
  } finally {
    addingToStorage.value = false
    checkingId.value = null
  }
}

// --- Shared add path ---
const doAdd = async (productId: string, shelfItemId: string) => {
  try {
    await addRoutineStep({ product_id: productId, shelf_item_id: shelfItemId })
    addToast('Added to routine', 'success')
    emit('added')
    emit('close')
  } catch {
    addToast('Failed to add to routine', 'error')
  }
}

const proceedAfterWarning = async () => {
  const item = pendingItem.value
  pendingItem.value = null
  pendingWarnings.value = []
  if (item) await doAdd(item.product_id, item.shelf_item_id)
}
</script>

<template>
  <div class="fixed inset-0 z-[85] flex items-center justify-center bg-stone-900/70 backdrop-blur-sm p-4 animate-fade-in" @click.self="emit('close')">
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-brand-surface-border dark:border-stone-800 animate-slide-up flex flex-col max-h-[85vh]">

      <div class="px-6 pt-6 pb-4 border-b border-brand-surface-border dark:border-stone-800 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-serif font-bold text-brand-text dark:text-white">Add to routine</h2>
          <p class="text-xs text-brand-text-muted mt-0.5">A safety check runs on each product you pick.</p>
        </div>
        <button @click="emit('close')" class="text-brand-text-muted hover:text-brand-text dark:hover:text-white transition-colors cursor-pointer">✕</button>
      </div>

      <div class="px-6 pt-4">
        <div class="relative">
          <svg class="absolute inset-y-0 left-3.5 my-auto w-4 h-4 text-brand-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input v-model="search" type="text" placeholder="Search your storage or the catalog…" class="w-full bg-brand-bg-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700 text-sm rounded-xl pl-10 p-3 outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all text-brand-text dark:text-white" />
        </div>
      </div>

      <div class="p-6 pt-4 overflow-y-auto hide-scrollbar space-y-4">
        <div v-if="loading" class="flex flex-col items-center py-10 text-brand-text-muted">
          <div class="w-8 h-8 border-4 border-brand-surface-border border-t-brand-primary rounded-full animate-spin mb-2"></div>
        </div>

        <template v-else>
          <!-- In storage -->
          <div>
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted mb-2">In your storage</h3>
            <div v-if="filteredShelf.length === 0" class="text-xs text-brand-text-muted py-3">No available products in storage.</div>
            <div v-else class="space-y-2">
              <button
                v-for="item in filteredShelf"
                :key="item.id"
                @click="selectShelfItem(item)"
                :disabled="checkingId !== null"
                class="w-full flex items-center gap-3 p-3 rounded-2xl border border-brand-surface-border dark:border-stone-700 hover:border-brand-primary bg-brand-surface-light dark:bg-stone-800/60 transition-all text-left cursor-pointer disabled:opacity-50"
              >
                <div class="w-10 h-10 shrink-0 bg-brand-bg-light dark:bg-stone-800 rounded-lg p-1 border border-brand-surface-border dark:border-stone-700 flex items-center justify-center">
                  <img v-if="item.products?.image_url" :src="item.products.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                  <svg v-else class="w-5 h-5 text-brand-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2" /></svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p v-if="item.products?.brand" class="text-[10px] font-bold text-brand-primary uppercase tracking-wider line-clamp-1">{{ item.products.brand }}</p>
                  <p class="text-sm font-bold text-brand-text dark:text-stone-100 line-clamp-1">{{ item.products?.name || 'Product' }}</p>
                </div>
                <div v-if="checkingId === item.product_id" class="w-5 h-5 border-2 border-brand-surface-border border-t-brand-primary rounded-full animate-spin shrink-0"></div>
                <svg v-else class="w-5 h-5 text-brand-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>
          </div>

          <!-- From catalog (off-shelf) -->
          <div v-if="search.trim()">
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted mb-2">From catalog</h3>
            <div v-if="catalogLoading" class="flex items-center gap-2 text-xs text-brand-text-muted py-3">
              <div class="w-4 h-4 border-2 border-brand-surface-border border-t-brand-primary rounded-full animate-spin"></div>
              Searching…
            </div>
            <div v-else-if="offShelfResults.length === 0" class="text-xs text-brand-text-muted py-3">No other matching products.</div>
            <div v-else class="space-y-2">
              <button
                v-for="p in offShelfResults"
                :key="p.id"
                @click="selectCatalogItem(p)"
                :disabled="checkingId !== null"
                class="w-full flex items-center gap-3 p-3 rounded-2xl border border-dashed border-brand-surface-border dark:border-stone-700 hover:border-brand-primary bg-brand-bg-light/50 dark:bg-stone-800/40 transition-all text-left cursor-pointer disabled:opacity-50"
              >
                <div class="w-10 h-10 shrink-0 bg-brand-surface-light dark:bg-stone-800 rounded-lg p-1 border border-brand-surface-border dark:border-stone-700 flex items-center justify-center">
                  <img v-if="p.image_url" :src="p.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                  <svg v-else class="w-5 h-5 text-brand-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2" /></svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p v-if="p.brand" class="text-[10px] font-bold text-brand-primary uppercase tracking-wider line-clamp-1">{{ p.brand }}</p>
                  <p class="text-sm font-bold text-brand-text dark:text-stone-100 line-clamp-1">{{ p.name || 'Product' }}</p>
                  <p class="text-[10px] text-brand-text-muted">Not in your storage yet</p>
                </div>
                <svg class="w-5 h-5 text-brand-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Add-to-storage confirm (UC-17 A1 / UC-05) -->
    <div v-if="pendingStorageProduct" class="fixed inset-0 z-[95] flex items-center justify-center bg-stone-900/70 backdrop-blur-sm p-4 animate-fade-in" @click.self="pendingStorageProduct = null">
      <div class="bg-brand-surface-light dark:bg-brand-surface-dark w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden border border-brand-surface-border dark:border-stone-800 animate-slide-up">
        <div class="p-6 text-center">
          <div class="w-14 h-14 rounded-full bg-brand-primary-light dark:bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto mb-3">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <h3 class="text-base font-bold text-brand-text dark:text-white">Not in your storage</h3>
          <p class="text-sm text-brand-text-muted mt-1 leading-relaxed">
            <span class="font-bold text-brand-text dark:text-stone-200">{{ pendingStorageProduct.name }}</span> isn't in your storage yet. Add it, then continue?
          </p>
        </div>
        <div class="p-4 grid grid-cols-2 gap-3 border-t border-brand-surface-border dark:border-stone-800">
          <button @click="pendingStorageProduct = null" :disabled="addingToStorage" class="py-3 rounded-xl font-bold text-sm text-brand-text dark:text-stone-300 bg-brand-bg-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700 hover:bg-brand-surface-border/50 dark:hover:bg-stone-700 transition-colors disabled:opacity-50">Cancel</button>
          <button @click="confirmAddToStorage" :disabled="addingToStorage" class="py-3 rounded-xl font-bold text-sm text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors shadow-sm active:scale-[0.98] disabled:opacity-60">{{ addingToStorage ? 'Adding…' : 'Add it' }}</button>
        </div>
      </div>
    </div>

    <!-- Compatibility gate (UC-06 / UC-17) -->
    <SafetyWarningModal
      v-if="pendingItem"
      :warnings="pendingWarnings"
      @cancel="pendingItem = null; pendingWarnings = []"
      @proceed="proceedAfterWarning"
    />
  </div>
</template>

<style scoped>
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
</style>
