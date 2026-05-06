<script setup lang="ts">
import { ref, computed } from 'vue'
import { useShelfStore, type ShelfItem } from '../stores/shelfStore'
import { useQuizStore } from '../stores/quizStore'

const shelfStore = useShelfStore()
const quizStore = useQuizStore()

// --- STATE ---
const searchQuery = ref('')
const selectedProduct = ref<ShelfItem | null>(null)
const isCompareListOpen = ref(false)
const comparingProduct = ref<ShelfItem | null>(null)

// Add Form State
const isAddModalOpen = ref(false)
const addConflictWarning = ref(false)
const form = ref({ brand: '', name: '', category: 'Cleanser', status: 'active' as 'active' | 'wishlist' })

// --- COMPUTED ---
const filteredShelf = computed(() => {
  if (!searchQuery.value) return shelfStore.items
  const lowerQuery = searchQuery.value.toLowerCase()
  return shelfStore.items.filter(item => item.name.toLowerCase().includes(lowerQuery) || item.brand.toLowerCase().includes(lowerQuery))
})

const compareList = computed(() => {
  if (!selectedProduct.value) return []
  const categoryMatches = shelfStore.productDatabase.filter(p => p.category === selectedProduct.value?.category && p.id !== selectedProduct.value?.id)
  return categoryMatches.sort((a, b) => (isOwned(a.name) ? -1 : 1) - (isOwned(b.name) ? -1 : 1))
})

// --- MOCK CONFLICT LOGIC ---
const checkConflicts = (product: ShelfItem | null) => {
  if (!product || !product.ingredients) return []
  const skinType = quizStore.finalSkinType || ''
  const conflicts: string[] = []
  const ingString = product.ingredients.join(', ').toLowerCase()

  if (skinType.includes('S') && (ingString.includes('fragrance') || ingString.includes('alcohol'))) {
    conflicts.push('Contains potential irritants for Sensitive (S) skin.')
  }
  if (skinType.includes('D') && (ingString.includes('salicylic') || ingString.includes('bha'))) {
    conflicts.push('Strong exfoliants may exacerbate Dry (D) skin.')
  }
  return conflicts
}

// --- HANDLERS: ADD PRODUCT ---
const closeAddModal = () => {
  isAddModalOpen.value = false
  addConflictWarning.value = false
  form.value = { brand: '', name: '', category: 'Cleanser', status: 'active' }
}

const handleAddSubmit = () => {
  const isSensitive = quizStore.finalSkinType.includes('S')
  if (isSensitive && form.value.category === 'Toner') addConflictWarning.value = true
  else forceAddProduct()
}

const forceAddProduct = () => {
  shelfStore.addProduct({ ...form.value })
  closeAddModal()
}

// --- HANDLERS: SHELF & COMPARE ---
const openDetails = (product: ShelfItem) => { selectedProduct.value = product }
const openCompareList = () => { isCompareListOpen.value = true }
const startSideBySide = (product: ShelfItem) => { comparingProduct.value = product }
const closeCompare = () => { comparingProduct.value = null; isCompareListOpen.value = false }
const removeAndClose = (id: string) => { shelfStore.removeProduct(id); selectedProduct.value = null }
const isOwned = (productName: string) => shelfStore.items.some(item => item.name === productName)

const getCategoryEmoji = (category: string) => {
  const emojis: Record<string, string> = { Cleanser: '🧼', Toner: '💧', Serum: '🧪', Moisturizer: '🧴', Sunscreen: '☀️' }
  return emojis[category] || '📦'
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 pt-6 pb-28 sm:pb-20 font-sans relative">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      <div class="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div class="flex-grow">
          <h1 class="text-2xl sm:text-3xl font-serif text-slate-900 mb-1 sm:mb-2">My Shelf</h1>
          <p class="text-slate-500 text-xs sm:text-sm mb-4">Manage your current routine and tracked products.</p>
          <div class="relative max-w-md">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">🔍</span>
            <input v-model="searchQuery" type="text" placeholder="Search your products..." class="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none shadow-sm transition-all">
          </div>
        </div>
        <button @click="isAddModalOpen = true" class="hidden sm:flex bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors shadow-sm items-center flex-shrink-0">
          <span class="mr-2 text-lg leading-none">+</span> Add Product
        </button>
      </div>

      <div v-if="filteredShelf.length === 0" class="text-center py-20 text-slate-500">
        <p>{{ searchQuery ? 'No products match your search.' : 'Your shelf is empty. Add some products!' }}</p>
      </div>

      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
        <div v-for="product in filteredShelf" :key="product.id" @click="openDetails(product)" class="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:border-blue-300 transition-all duration-200 cursor-pointer hover:shadow-md group active:scale-95 relative">
          <div class="aspect-square bg-slate-50 rounded-xl mb-3 sm:mb-4 flex items-center justify-center text-3xl sm:text-4xl border border-slate-100 transition-colors">
            {{ getCategoryEmoji(product.category) }}
          </div>
          <div class="flex-grow">
            <span class="text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-0.5">{{ product.brand }}</span>
            <h3 class="text-xs sm:text-sm font-semibold text-slate-800 leading-snug line-clamp-2 pr-4">{{ product.name }}</h3>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
            <span class="text-[8px] sm:text-[9px] font-bold px-2 py-1 rounded-md tracking-wide w-fit" :class="product.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'">
              {{ product.status === 'active' ? 'IN ROUTINE' : 'WISHLIST' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <button @click="isAddModalOpen = true" class="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-700 text-white rounded-full shadow-lg shadow-blue-700/30 flex items-center justify-center text-3xl hover:bg-blue-800 active:scale-95 transition-all z-40">
      <span class="leading-none mb-1">+</span>
    </button>

    <div v-if="isAddModalOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="closeAddModal"></div>
      <div class="bg-white w-full sm:w-[400px] rounded-t-3xl sm:rounded-2xl p-6 sm:p-8 relative z-10 animate-slide-up sm:animate-fade-in">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-serif font-semibold text-slate-900">Add to Shelf</h2>
          <button @click="closeAddModal" class="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
        </div>

        <form @submit.prevent="handleAddSubmit" class="flex flex-col gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Brand</label>
            <input v-model="form.brand" required type="text" class="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Product Name</label>
            <input v-model="form.name" required type="text" class="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
              <select v-model="form.category" class="w-full border border-slate-300 rounded-lg p-3 text-sm bg-white outline-none">
                <option>Cleanser</option><option>Toner</option><option>Serum</option><option>Moisturizer</option><option>Sunscreen</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
              <select v-model="form.status" class="w-full border border-slate-300 rounded-lg p-3 text-sm bg-white outline-none">
                <option value="active">In Routine</option><option value="wishlist">Wishlist</option>
              </select>
            </div>
          </div>

          <div v-if="addConflictWarning" class="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start">
            <span class="text-amber-500 text-lg mr-3 leading-none">⚠️</span>
            <div>
              <h4 class="text-sm font-bold text-amber-800 mb-1">Warning</h4>
              <p class="text-xs text-amber-700 mb-3">Your profile indicates <b>Sensitive (S)</b> skin. Toners often contain astringents.</p>
              <div class="flex gap-3">
                <button type="button" @click="forceAddProduct" class="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg">Add Anyway</button>
              </div>
            </div>
          </div>

          <button v-if="!addConflictWarning" type="submit" class="w-full bg-blue-700 text-white font-semibold py-3.5 rounded-xl mt-4 hover:bg-blue-800">Analyze & Save</button>
        </form>
      </div>
    </div>

    <div v-if="selectedProduct && !isCompareListOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="selectedProduct = null"></div>
      <div class="bg-white w-full sm:w-[450px] rounded-t-3xl sm:rounded-3xl p-6 relative z-10 animate-slide-up max-h-[85vh] overflow-y-auto">
        <button @click="selectedProduct = null" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center text-xl">&times;</button>

        <div class="flex items-center gap-4 mb-4 pt-2">
          <div class="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-4xl border border-slate-100 flex-shrink-0">
            {{ getCategoryEmoji(selectedProduct.category) }}
          </div>
          <div>
            <span class="text-xs font-bold text-blue-600 uppercase tracking-wider">{{ selectedProduct.brand }}</span>
            <h2 class="text-lg font-serif font-semibold text-slate-900 leading-tight mt-1">{{ selectedProduct.name }}</h2>
            <p class="text-sm text-slate-500 mt-1">{{ selectedProduct.category }} • {{ selectedProduct.routine_step || 'Anytime' }}</p>
          </div>
        </div>

        <p v-if="selectedProduct.description" class="text-sm text-slate-600 leading-relaxed mb-6 border-b border-slate-100 pb-6">
          {{ selectedProduct.description }}
        </p>

        <div class="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
          <h4 class="text-xs font-bold text-slate-500 uppercase mb-2">Key Ingredients</h4>
          <div class="flex flex-wrap gap-2">
            <span v-for="ing in selectedProduct.ingredients" :key="ing" class="bg-white border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-md shadow-sm">
              {{ ing }}
            </span>
            <span v-if="!selectedProduct.ingredients?.length" class="text-sm text-slate-400 italic">No ingredient data available.</span>
          </div>
        </div>

        <div class="flex gap-3 mt-8">
          <button @click="openCompareList" class="flex-1 bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold py-3.5 rounded-xl hover:bg-indigo-100 transition-colors">Compare Alternatives</button>
          <button @click="removeAndClose(selectedProduct.id)" class="bg-red-50 text-red-600 border border-red-100 px-4 rounded-xl hover:bg-red-100 transition-colors">Remove</button>
        </div>
      </div>
    </div>

    <div v-if="isCompareListOpen && !comparingProduct" class="fixed inset-0 z-60 bg-white flex flex-col animate-slide-up">
      <div class="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div>
          <h2 class="text-lg font-serif font-semibold text-slate-900">Select to Compare</h2>
          <p class="text-xs text-slate-500">Comparing with {{ selectedProduct?.name }}</p>
        </div>
        <button @click="isCompareListOpen = false" class="text-slate-500 hover:text-slate-800 font-bold px-3 py-1 bg-slate-200 rounded-lg">Cancel</button>
      </div>
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
        <div class="max-w-2xl mx-auto flex flex-col gap-4">
          <div v-for="item in compareList" :key="item.id" @click="startSideBySide(item)" class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4 cursor-pointer hover:border-indigo-400 active:scale-95">
            <div class="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center text-3xl border border-slate-100 flex-shrink-0">{{ getCategoryEmoji(item.category) }}</div>
            <div class="flex-grow">
              <span class="text-[10px] font-bold text-slate-500 uppercase">{{ item.brand }}</span>
              <h3 class="text-sm font-semibold text-slate-800 leading-snug mt-1">{{ item.name }}</h3>
            </div>
            <div class="flex items-center"><span class="text-indigo-600 text-sm font-bold bg-indigo-50 px-3 py-1 rounded-lg">Select</span></div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="comparingProduct" class="fixed inset-0 z-[70] bg-white flex flex-col animate-slide-up">
      <div class="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <h2 class="text-lg font-serif font-semibold text-slate-900">Side-by-Side Analysis</h2>
        <button @click="closeCompare" class="text-blue-700 font-bold px-4 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg">Done</button>
      </div>
      <div class="flex-1 overflow-y-auto bg-slate-50">
        <div class="grid grid-cols-2 divide-x divide-slate-200 min-h-full">
          <div class="p-4 flex flex-col bg-white">
            <div class="mx-auto w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-4xl border border-slate-100 mb-4">{{ getCategoryEmoji(selectedProduct!.category) }}</div>
            <span class="text-center text-[10px] font-bold text-blue-600 uppercase">{{ selectedProduct?.brand }}</span>
            <h3 class="text-center text-sm font-bold text-slate-800 mt-1 mb-4 h-10">{{ selectedProduct?.name }}</h3>
            <div class="border-t border-slate-100 pt-4 mb-4">
              <span class="text-xs font-bold text-slate-500 uppercase block mb-2">Ingredients</span>
              <p class="text-xs text-slate-600">{{ selectedProduct?.ingredients?.join(', ') || 'Data unavailable' }}</p>
            </div>
            <div class="border-t border-slate-100 pt-4">
              <span class="text-xs font-bold text-slate-500 uppercase block mb-2">Conflicts</span>
              <ul class="space-y-2">
                <li v-if="checkConflicts(selectedProduct).length === 0" class="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-md">✅ Safe</li>
                <li v-for="conflict in checkConflicts(selectedProduct)" :key="conflict" class="text-xs text-red-600 bg-red-50 p-2 rounded-md">⚠️ {{ conflict }}</li>
              </ul>
            </div>
          </div>
          <div class="p-4 flex flex-col bg-white relative">
            <div class="absolute top-10 -left-6 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10 shadow-md">VS</div>
            <div class="mx-auto w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-4xl border border-slate-100 mb-4">{{ getCategoryEmoji(comparingProduct.category) }}</div>
            <span class="text-center text-[10px] font-bold text-blue-600 uppercase">{{ comparingProduct.brand }}</span>
            <h3 class="text-center text-sm font-bold text-slate-800 mt-1 mb-4 h-10">{{ comparingProduct.name }}</h3>
            <div class="border-t border-slate-100 pt-4 mb-4">
              <span class="text-xs font-bold text-slate-500 uppercase block mb-2">Ingredients</span>
              <p class="text-xs text-slate-600">{{ comparingProduct.ingredients?.join(', ') || 'Data unavailable' }}</p>
            </div>
            <div class="border-t border-slate-100 pt-4">
              <span class="text-xs font-bold text-slate-500 uppercase block mb-2">Conflicts</span>
              <ul class="space-y-2">
                <li v-if="checkConflicts(comparingProduct).length === 0" class="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-md">✅ Safe</li>
                <li v-for="conflict in checkConflicts(comparingProduct)" :key="conflict" class="text-xs text-red-600 bg-red-50 p-2 rounded-md">⚠️ {{ conflict }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
