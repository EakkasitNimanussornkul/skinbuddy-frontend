<script setup lang="ts">
import { ref, computed } from 'vue'
import KeyActivesGrid from './KeyActivesGrid.vue'
import CustomDatePicker from '../Shared/CustomDatePicker.vue' // Adjust import path if needed

const props = defineProps<{
  product: any
  isAnalyzing: boolean
}>()

const emit = defineEmits(['cancel', 'save'])

// --- Local Configuration State ---
const isOpened = ref(true)
const selectedPao = ref<number | null>(null)
const expirationDate = ref('')
const showPaoTooltip = ref(false)

const paoOptions = [1, 3, 6, 9, 12, 18, 24, 36]

// Get today's date in YYYY-MM-DD for the CustomDatePicker bounds
const todayString = computed(() => new Date().toISOString().split('T')[0])

// --- Actions ---
const setPAO = (months: number) => {
  selectedPao.value = months
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  expirationDate.value = d.toISOString().split('T')[0]
}

const handleSave = () => {
  // Package the local form state and send it to the parent orchestrator
  emit('save', {
    isOpened: isOpened.value,
    selectedPao: selectedPao.value,
    expirationDate: expirationDate.value
  })
}
</script>

<template>
  <div class="space-y-6 animate-fade-in pb-10 max-w-md mx-auto w-full">

    <div class="flex items-center gap-3 mb-2">
      <button @click="emit('cancel')" class="p-2 -ml-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
      </button>
      <h3 class="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Configure Product</h3>
    </div>

    <div class="bg-white dark:bg-stone-900 rounded-2xl border border-brand-primary-light dark:border-stone-800 p-4 shadow-sm flex items-start gap-4">
      <div class="w-16 h-16 bg-stone-50 dark:bg-stone-800 rounded-xl p-1 border border-stone-200 dark:border-stone-700 flex items-center justify-center flex-shrink-0">
        <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal p-1" />
        <svg v-else class="w-8 h-8 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
      </div>
      <div>
        <p class="text-xs text-brand-primary dark:text-orange-400 font-bold uppercase tracking-wider">{{ product.brand }}</p>
        <p class="text-base font-bold text-brand-text dark:text-white leading-tight mb-1">{{ product.name }}</p>
        <span class="text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-md">{{ product.category }}</span>
      </div>
    </div>

    <div class="mb-4 px-1">
      <p class="text-sm sm:text-[15px] text-brand-text-muted dark:text-stone-400 leading-relaxed">
        {{ product.description || 'No description available for this product.' }}
      </p>
    </div>

    <KeyActivesGrid :ingredients="product.product_ingredients" />

    <hr class="border-stone-200 dark:border-stone-800 my-4" />

    <div class="p-4 rounded-xl border border-stone-200 dark:border-stone-700 mb-4 bg-brand-bg-light dark:bg-stone-800/50 transition-all">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-bold text-brand-text dark:text-white">Have you opened this product?</h4>
        <div class="flex items-center gap-3">
          <span class="text-xs font-bold w-6 text-right" :class="isOpened ? 'text-brand-primary dark:text-orange-400' : 'text-stone-400'">{{ isOpened ? 'YES' : 'NO' }}</span>
          <button @click="isOpened = !isOpened" class="w-12 h-6 rounded-full relative transition-colors" :class="isOpened ? 'bg-brand-primary' : 'bg-stone-300 dark:bg-stone-600'">
            <div class="w-4 h-4 bg-white rounded-full absolute top-1 transition-transform" :class="isOpened ? 'right-1' : 'left-1'"></div>
          </button>
        </div>
      </div>
      <div v-if="!isOpened" class="mt-3 border-t border-stone-200 dark:border-stone-700 pt-3 flex items-start gap-2 animate-fade-in">
        <svg class="w-4 h-4 text-stone-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
        </svg>
        <p class="flex-1 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
          <strong class="text-stone-700 dark:text-stone-300 whitespace-nowrap">Keep it sealed!</strong> Select the PAO below. We will save it as "Unopened" and you can start the countdown later.
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2 mb-3 relative">
      <label class="text-sm font-semibold text-brand-text dark:text-white">
        Period After Opening (PAO)
      </label>
      <button
        type="button"
        @click.prevent="showPaoTooltip = !showPaoTooltip"
        @mouseenter="showPaoTooltip = true"
        @mouseleave="showPaoTooltip = false"
        class="text-stone-400 hover:text-orange-500 transition-colors focus:outline-none p-1 -ml-1"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      <Transition name="fade">
        <div v-if="showPaoTooltip" class="absolute bottom-full left-0 mb-2 w-64 p-3 bg-stone-800 dark:bg-stone-700 text-xs text-white leading-relaxed rounded-xl shadow-xl z-50 pointer-events-none">
          Look for the small open-jar symbol on the back of your physical product.
          <br><br>
          <span class="font-bold text-orange-300">"6M"</span> means it is safe for 6 months after opening.
          <div class="absolute top-full left-6 border-[6px] border-transparent border-t-stone-800 dark:border-t-stone-700"></div>
        </div>
      </Transition>
    </div>

    <div class="mb-4 transition-all">
      <div class="flex overflow-x-auto gap-3 pb-2 snap-x hide-scrollbar -mx-1 px-1">
        <button
          v-for="months in paoOptions"
          :key="months"
          type="button"
          @click="setPAO(months)"
          :class="[
            'snap-start shrink-0 px-6 py-2.5 rounded-xl border text-sm font-bold transition-all shadow-sm',
            selectedPao === months
              ? 'bg-stone-800 text-white border-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100'
              : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500'
          ]"
        >
          {{ months }}M
        </button>
      </div>

      <div v-if="isOpened" class="animate-fade-in relative z-20 mt-3">
        <label class="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Custom Expiration Date</label>
        <CustomDatePicker
          v-model="expirationDate"
          :min-date="todayString"
        />
      </div>
    </div>

    <div class="pt-4 pb-10">
      <button @click="handleSave" class="w-full bg-brand-primary text-white font-bold py-4 rounded-xl shadow-lg hover:bg-orange-800 active:scale-[0.98] transition-all text-lg flex items-center justify-center gap-2">
        <svg v-if="isAnalyzing" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        {{ isAnalyzing ? 'Analyzing Safety...' : 'Save to My Shelf' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; transform: translateY(4px); }
</style>
