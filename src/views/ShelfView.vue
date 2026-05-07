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
const form = ref({
  brand: '',
  name: '',
  category: 'Cleanser',
  status: 'active' as 'active' | 'wishlist',
  opened_date: new Date().toISOString().split('T')[0],
  expiration_type: '6',
  custom_expiration_date: ''
})

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

// --- MOCK CONFLICT & EXPIRATION LOGIC ---
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

// NEW: Expiration Status Calculator (Checks if expired, or expiring in < 30 days)
const getExpirationStatus = (expDate: string | null | undefined) => {
  if (!expDate) return 'safe'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiry = new Date(expDate)
  expiry.setHours(0, 0, 0, 0)

  const diffTime = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'expired'
  if (diffDays <= 30) return 'warning'
  return 'safe'
}

// --- HANDLERS ---
const closeAddModal = () => {
  isAddModalOpen.value = false
  addConflictWarning.value = false
  form.value = { brand: '', name: '', category: 'Cleanser', status: 'active', opened_date: new Date().toISOString().split('T')[0], expiration_type: '6', custom_expiration_date: '' }
}

const handleAddSubmit = () => {
  const isSensitive = quizStore.finalSkinType.includes('S')
  if (isSensitive && form.value.category === 'Toner') addConflictWarning.value = true
  else forceAddProduct()
}

const forceAddProduct = () => {
  let expDate = null;
  if (form.value.status === 'active') {
    if (form.value.expiration_type === 'custom') {
      expDate = form.value.custom_expiration_date || null
    } else if (form.value.expiration_type !== 'none') {
      const date = new Date(form.value.opened_date)
      date.setMonth(date.getMonth() + parseInt(form.value.expiration_type))
      expDate = date.toISOString().split('T')[0]
    }
  }

  shelfStore.addProduct({
    brand: form.value.brand,
    name: form.value.name,
    category: form.value.category,
    status: form.value.status,
    opened_date: form.value.status === 'active' ? form.value.opened_date : null,
    expiration_date: expDate
  })
  closeAddModal()
}

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
  <div class="min-h-screen bg-slate-50 dark:bg-clinical-bg pt-6 pb-28 sm:pb-20 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 relative">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      <div class="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div class="flex-grow">
          <h1 class="text-2xl sm:text-3xl font-serif text-slate-900 dark:text-white mb-1 sm:mb-2">My Shelf</h1>
          <p class="text-slate-500 dark:text-[#757682] text-xs sm:text-sm mb-4">Manage your current routine and tracked products.</p>
          <div class="relative max-w-md">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">🔍</span>
            <input v-model="searchQuery" type="text" placeholder="Search your products..." class="w-full pl-10 pr-4 py-3 bg-white dark:bg-clinical-surface border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-[#2E5BFF] outline-none shadow-sm dark:shadow-none transition-all placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-white">
          </div>
        </div>
        <button @click="isAddModalOpen = true" class="hidden sm:flex bg-[#2E5BFF] text-white px-5 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm items-center flex-shrink-0">
          <span class="mr-2 text-lg leading-none">+</span> Add Product
        </button>
      </div>

      <div v-if="filteredShelf.length === 0" class="text-center py-20 text-slate-500 dark:text-slate-400">
        <p>{{ searchQuery ? 'No products match your search.' : 'Your shelf is empty. Add some products!' }}</p>
      </div>

      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 mt-4">
        <div v-for="product in filteredShelf" :key="product.id" @click="openDetails(product)" class="bg-white dark:bg-clinical-surface p-3 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer group active:scale-95 relative mt-2">

          <div v-if="getExpirationStatus(product.expiration_date) === 'expired'" class="absolute -top-3 -right-2 bg-red-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-full shadow-md z-10 animate-pulse border-[3px] border-white dark:border-clinical-surface uppercase tracking-wider">
            Expired
          </div>
          <div v-else-if="getExpirationStatus(product.expiration_date) === 'warning'" class="absolute -top-3 -right-2 bg-amber-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-full shadow-md z-10 border-[3px] border-white dark:border-clinical-surface uppercase tracking-wider">
            Expiring Soon
          </div>

          <div class="aspect-square bg-slate-50 dark:bg-clinical-bg rounded-xl mb-3 sm:mb-4 flex items-center justify-center text-3xl sm:text-4xl border border-slate-100 dark:border-slate-800 transition-colors" :class="{'opacity-50 grayscale': getExpirationStatus(product.expiration_date) === 'expired'}">
            {{ getCategoryEmoji(product.category) }}
          </div>
          <div class="flex-grow">
            <span class="text-[9px] sm:text-[10px] font-bold text-blue-600 dark:text-[#2E5BFF] uppercase tracking-wider block mb-0.5" :class="{'text-slate-400 dark:text-slate-500': getExpirationStatus(product.expiration_date) === 'expired'}">{{ product.brand }}</span>
            <h3 class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 pr-4" :class="{'text-slate-500 dark:text-slate-400 line-through': getExpirationStatus(product.expiration_date) === 'expired'}">{{ product.name }}</h3>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
            <span class="text-[8px] sm:text-[9px] font-bold px-2 py-1 rounded-md tracking-wide w-fit" :class="product.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'">
              {{ product.status === 'active' ? 'IN ROUTINE' : 'WISHLIST' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <button @click="isAddModalOpen = true" class="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#2E5BFF] text-white rounded-full shadow-lg shadow-blue-700/30 dark:shadow-none flex items-center justify-center text-3xl hover:bg-blue-700 active:scale-95 transition-all z-40">
      <span class="leading-none mb-1">+</span>
    </button>

    <div v-if="isAddModalOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div class="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" @click="closeAddModal"></div>
      <div class="bg-white dark:bg-clinical-surface w-full sm:w-[400px] rounded-t-3xl sm:rounded-2xl p-6 sm:p-8 relative z-10 animate-slide-up sm:animate-fade-in border dark:border-slate-800">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-serif font-semibold text-slate-900 dark:text-white">Add to Shelf</h2>
          <button @click="closeAddModal" class="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <form @submit.prevent="handleAddSubmit" class="flex flex-col gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Brand</label>
            <input v-model="form.brand" required type="text" class="w-full bg-white dark:bg-clinical-bg border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#2E5BFF] outline-none text-slate-900 dark:text-white" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Product Name</label>
            <input v-model="form.name" required type="text" class="w-full bg-white dark:bg-clinical-bg border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#2E5BFF] outline-none text-slate-900 dark:text-white" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Category</label>
              <select v-model="form.category" class="w-full bg-white dark:bg-clinical-bg border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#2E5BFF] outline-none text-slate-900 dark:text-white">
                <option>Cleanser</option><option>Toner</option><option>Serum</option><option>Moisturizer</option><option>Sunscreen</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Status</label>
              <select v-model="form.status" class="w-full bg-white dark:bg-clinical-bg border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#2E5BFF] outline-none text-slate-900 dark:text-white">
                <option value="active">In Routine</option><option value="wishlist">Wishlist</option>
              </select>
            </div>
          </div>

          <div v-if="form.status === 'active'" class="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
            <div>
              <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Date Opened</label>
              <input v-model="form.opened_date" type="date" class="w-full bg-slate-50 dark:bg-clinical-bg border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none text-slate-900 dark:text-white" />
            </div>
            <div class="grid grid-cols-1 gap-4">
              <div>
                <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Expires After (PAO)</label>
                <select v-model="form.expiration_type" class="w-full bg-slate-50 dark:bg-clinical-bg border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none text-slate-900 dark:text-white">
                  <option value="none">No Expiration</option>
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="12">12 Months</option>
                  <option value="custom">Set Custom Date</option>
                </select>
              </div>
              <div v-if="form.expiration_type === 'custom'" class="animate-fade-in">
                <label class="block text-[10px] font-bold text-[#2E5BFF] uppercase mb-1">Custom Expiration Date</label>
                <input v-model="form.custom_expiration_date" type="date" class="w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5 text-sm outline-none text-blue-900 dark:text-blue-100" />
              </div>
            </div>
          </div>

          <div v-if="addConflictWarning" class="mt-2 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-start">
            <span class="text-amber-500 text-lg mr-3 leading-none">⚠️</span>
            <div>
              <h4 class="text-sm font-bold text-amber-800 dark:text-amber-400 mb-1">Warning</h4>
              <p class="text-xs text-amber-700 dark:text-amber-200/80 mb-3">Your profile indicates <b>Sensitive (S)</b> skin. Toners often contain astringents.</p>
              <div class="flex gap-3">
                <button type="button" @click="forceAddProduct" class="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-600/80 px-3 py-1.5 rounded-lg">Add Anyway</button>
              </div>
            </div>
          </div>

          <button v-if="!addConflictWarning" type="submit" class="w-full bg-[#2E5BFF] text-white font-semibold py-3.5 rounded-xl mt-4 hover:bg-blue-700 transition-colors">Analyze & Save</button>
        </form>
      </div>
    </div>

    <div v-if="selectedProduct && !isCompareListOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div class="absolute inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm" @click="selectedProduct = null"></div>
      <div class="bg-white dark:bg-clinical-surface w-full sm:w-[450px] rounded-t-3xl sm:rounded-3xl p-6 relative z-10 animate-slide-up max-h-[85vh] overflow-y-auto border dark:border-slate-800">
        <button @click="selectedProduct = null" class="absolute top-4 right-4 text-slate-400 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center text-xl transition-colors">&times;</button>

        <div class="flex items-center gap-4 mb-4 pt-2">
          <div class="w-20 h-20 bg-slate-50 dark:bg-clinical-bg rounded-2xl flex items-center justify-center text-4xl border border-slate-100 dark:border-slate-800 flex-shrink-0">
            {{ getCategoryEmoji(selectedProduct.category) }}
          </div>
          <div>
            <span class="text-xs font-bold text-blue-600 dark:text-[#2E5BFF] uppercase tracking-wider">{{ selectedProduct.brand }}</span>
            <h2 class="text-lg font-serif font-semibold text-slate-900 dark:text-white leading-tight mt-1">{{ selectedProduct.name }}</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ selectedProduct.category }} • {{ selectedProduct.routine_step || 'Anytime' }}</p>
          </div>
        </div>

        <div v-if="selectedProduct.status === 'active'" class="flex gap-3 mb-6">
          <div class="flex-1 bg-slate-50 dark:bg-clinical-bg p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">Opened On</span>
            <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ selectedProduct.opened_date || 'Unknown' }}</span>
          </div>
          <div class="flex-1 bg-slate-50 dark:bg-clinical-bg p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">Expires</span>
            <span class="text-sm font-semibold text-slate-700 dark:text-slate-200" :class="{'text-red-500 dark:text-red-400': getExpirationStatus(selectedProduct.expiration_date) === 'expired', 'text-amber-500 dark:text-amber-400': getExpirationStatus(selectedProduct.expiration_date) === 'warning'}">
              {{ selectedProduct.expiration_date || 'No Expiry' }}
            </span>
          </div>
        </div>

        <p v-if="selectedProduct.description" class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
          {{ selectedProduct.description }}
        </p>

        <div class="bg-slate-50 dark:bg-clinical-bg rounded-xl p-4 mb-6 border border-slate-100 dark:border-slate-800">
          <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Key Ingredients</h4>
          <div class="flex flex-wrap gap-2">
            <span v-for="ing in selectedProduct.ingredients" :key="ing" class="bg-white dark:bg-clinical-surface border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-1 rounded-md shadow-sm dark:shadow-none">
              {{ ing }}
            </span>
            <span v-if="!selectedProduct.ingredients?.length" class="text-sm text-slate-400 italic">No ingredient data available.</span>
          </div>
        </div>

        <div class="flex gap-3 mt-8">
          <button @click="openCompareList" class="flex-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 font-semibold py-3.5 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">Compare Alternatives</button>
          <button @click="removeAndClose(selectedProduct.id)" class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/50 px-4 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">Remove</button>
        </div>
      </div>
    </div>

    <div v-if="isCompareListOpen && !comparingProduct" class="fixed inset-0 z-60 bg-white dark:bg-clinical-surface flex flex-col animate-slide-up">
      <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-clinical-bg">
        <div>
          <h2 class="text-lg font-serif font-semibold text-slate-900 dark:text-white">Select to Compare</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Comparing with {{ selectedProduct?.name }}</p>
        </div>
        <button @click="isCompareListOpen = false" class="text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white font-bold px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-lg">Cancel</button>
      </div>
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-black/20">
        <div class="max-w-2xl mx-auto flex flex-col gap-4">
          <div v-for="item in compareList" :key="item.id" @click="startSideBySide(item)" class="bg-white dark:bg-clinical-surface p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none flex gap-4 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 active:scale-95 transition-colors">
            <div class="w-16 h-16 bg-slate-50 dark:bg-clinical-bg rounded-xl flex items-center justify-center text-3xl border border-slate-100 dark:border-slate-700 flex-shrink-0">{{ getCategoryEmoji(item.category) }}</div>
            <div class="flex-grow">
              <span class="text-[10px] font-bold text-slate-500 dark:text-[#2E5BFF] uppercase">{{ item.brand }}</span>
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug mt-1">{{ item.name }}</h3>
            </div>
            <div class="flex items-center"><span class="text-indigo-600 dark:text-indigo-300 text-sm font-bold bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 rounded-lg">Select</span></div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="comparingProduct" class="fixed inset-0 z-[70] bg-white dark:bg-clinical-surface flex flex-col animate-slide-up">
      <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-clinical-bg">
        <h2 class="text-lg font-serif font-semibold text-slate-900 dark:text-white">Side-by-Side Analysis</h2>
        <button @click="closeCompare" class="text-blue-700 dark:text-blue-300 font-bold px-4 py-1.5 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-800/60 rounded-lg transition-colors">Done</button>
      </div>
      <div class="flex-1 overflow-y-auto bg-slate-50 dark:bg-clinical-bg">
        <div class="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 min-h-full">
          <div class="p-4 flex flex-col bg-white dark:bg-clinical-surface">
            <div class="mx-auto w-20 h-20 bg-slate-50 dark:bg-clinical-bg rounded-2xl flex items-center justify-center text-4xl border border-slate-100 dark:border-slate-800 mb-4">{{ getCategoryEmoji(selectedProduct!.category) }}</div>
            <span class="text-center text-[10px] font-bold text-blue-600 dark:text-[#2E5BFF] uppercase">{{ selectedProduct?.brand }}</span>
            <h3 class="text-center text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 mb-4 h-10">{{ selectedProduct?.name }}</h3>
            <div class="border-t border-slate-100 dark:border-slate-800 pt-4 mb-4">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2">Ingredients</span>
              <p class="text-xs text-slate-600 dark:text-slate-300">{{ selectedProduct?.ingredients?.join(', ') || 'Data unavailable' }}</p>
            </div>
            <div class="border-t border-slate-100 dark:border-slate-800 pt-4">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2">Conflicts</span>
              <ul class="space-y-2">
                <li v-if="checkConflicts(selectedProduct).length === 0" class="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-md">✅ Safe</li>
                <li v-for="conflict in checkConflicts(selectedProduct)" :key="conflict" class="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-md">⚠️ {{ conflict }}</li>
              </ul>
            </div>
          </div>
          <div class="p-4 flex flex-col bg-white dark:bg-clinical-surface relative">
            <div class="absolute top-10 -left-6 bg-slate-800 dark:bg-black text-white text-[10px] font-bold px-2 py-1 rounded-full z-10 shadow-md">VS</div>
            <div class="mx-auto w-20 h-20 bg-slate-50 dark:bg-clinical-bg rounded-2xl flex items-center justify-center text-4xl border border-slate-100 dark:border-slate-800 mb-4">{{ getCategoryEmoji(comparingProduct.category) }}</div>
            <span class="text-center text-[10px] font-bold text-blue-600 dark:text-[#2E5BFF] uppercase">{{ comparingProduct.brand }}</span>
            <h3 class="text-center text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 mb-4 h-10">{{ comparingProduct.name }}</h3>
            <div class="border-t border-slate-100 dark:border-slate-800 pt-4 mb-4">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2">Ingredients</span>
              <p class="text-xs text-slate-600 dark:text-slate-300">{{ comparingProduct.ingredients?.join(', ') || 'Data unavailable' }}</p>
            </div>
            <div class="border-t border-slate-100 dark:border-slate-800 pt-4">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2">Conflicts</span>
              <ul class="space-y-2">
                <li v-if="checkConflicts(comparingProduct).length === 0" class="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-md">✅ Safe</li>
                <li v-for="conflict in checkConflicts(comparingProduct)" :key="conflict" class="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-md">⚠️ {{ conflict }}</li>
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
