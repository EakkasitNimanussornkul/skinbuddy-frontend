<script setup lang="ts">
import { ref, computed } from 'vue'
import KeyActivesGrid from './KeyActivesGrid.vue'
import CustomDatePicker from '../Shared/CustomDatePicker.vue'

const props = defineProps<{
  product: any
  isAnalyzing: boolean
}>()

const emit = defineEmits(['cancel', 'save'])

const isOpened = ref(true)
const selectedPao = ref<number | null>(null)
const expirationDate = ref('')
const showPaoTooltip = ref(false)

const paoOptions = [1, 3, 6, 9, 12, 18, 24, 36]
const todayString = computed(() => new Date().toISOString().split('T')[0])

const setPAO = (months: number) => {
  selectedPao.value = months
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  expirationDate.value = d.toISOString().split('T')[0] ?? ''
}

const handleSave = () => {
  emit('save', {
    isOpened: isOpened.value,
    selectedPao: selectedPao.value,
    expirationDate: expirationDate.value
  })
}
</script>

<template>
  <div class="space-y-6 animate-fade-in w-full max-w-2xl mx-auto pb-10">

    <!-- Mobile-only back button -->
    <div class="flex lg:hidden items-center gap-3 mb-2">
      <button @click="emit('cancel')" class="p-2 -ml-2 rounded-full hover:bg-brand-surface-border/40 dark:hover:bg-stone-800 text-brand-text-muted transition-colors">
        <svg class="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path></svg>
      </button>
      <h3 class="text-sm font-bold text-brand-text-muted uppercase tracking-wider">Back to Search</h3>
    </div>

    <!-- Product Details Card -->
    <div class="bg-brand-bg-light dark:bg-stone-900 rounded-2xl border border-brand-surface-border dark:border-stone-800 p-5 flex items-start gap-4 mb-2">
      <div class="w-16 h-16 sm:w-20 sm:h-20 bg-brand-surface-light dark:bg-stone-950 rounded-xl p-1 border border-brand-surface-border dark:border-stone-700 flex items-center justify-center flex-shrink-0">
        <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal p-1" />
        <svg v-else class="w-8 h-8 text-brand-text-muted stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
      </div>
      <div>
        <p class="text-xs text-brand-primary font-bold uppercase tracking-wider">{{ product.brand }}</p>
        <p class="text-base sm:text-lg font-bold text-brand-text dark:text-white leading-tight mb-1.5">{{ product.name }}</p>
        <span class="text-[10px] sm:text-xs bg-brand-surface-light dark:bg-stone-800 border border-brand-surface-border/50 dark:border-stone-700 text-brand-text-muted dark:text-stone-300 px-2 py-0.5 rounded-md font-semibold">{{ product.category }}</span>
      </div>
    </div>

    <div class="px-1">
      <p class="text-sm text-brand-text-muted dark:text-stone-400 leading-relaxed font-medium">
        {{ product.description || 'No description available for this product.' }}
      </p>
    </div>

    <!-- Actives Component (will handle its own v-if) -->
    <KeyActivesGrid :ingredients="product.product_ingredients" />

    <hr class="border-brand-surface-border dark:border-stone-800 my-6" />

    <!-- Open Status Match -->
    <div class="p-5 rounded-2xl border border-brand-surface-border dark:border-stone-800 mb-6 bg-brand-bg-light dark:bg-stone-800/30 transition-all">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-bold text-brand-text dark:text-white">Have you opened this product?</h4>
        <div class="flex items-center gap-3">
          <span class="text-xs font-bold w-6 text-right" :class="isOpened ? 'text-brand-primary' : 'text-brand-text-muted'">{{ isOpened ? 'YES' : 'NO' }}</span>
          <button @click="isOpened = !isOpened" class="w-12 h-6 rounded-full relative transition-colors shadow-inner" :class="isOpened ? 'bg-brand-primary' : 'bg-stone-300 dark:bg-stone-700'">
            <div class="w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow-sm" :class="isOpened ? 'right-1' : 'left-1'"></div>
          </button>
        </div>
      </div>
      <div v-if="!isOpened" class="mt-4 border-t border-brand-surface-border dark:border-stone-700 pt-4 flex items-start gap-2 animate-fade-in">
        <svg class="w-4 h-4 text-brand-text-muted flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        <p class="flex-1 text-xs text-brand-text-muted dark:text-stone-400 leading-relaxed font-medium">
          <strong class="text-brand-text dark:text-stone-300">Keep it sealed!</strong> Select the PAO below. We will save it as "Unopened" and start the countdown when you activate it.
        </p>
      </div>
    </div>

    <!-- PAO Selection -->
    <div class="flex items-center gap-2 mb-3 relative">
      <label class="text-sm font-semibold text-brand-text dark:text-white">Period After Opening (PAO)</label>
      <button
        type="button"
        @click.prevent="showPaoTooltip = !showPaoTooltip"
        @mouseenter="showPaoTooltip = true"
        @mouseleave="showPaoTooltip = false"
        class="text-brand-text-muted hover:text-brand-primary transition-colors focus:outline-none p-1 -ml-1"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </button>

      <Transition name="fade">
        <div v-if="showPaoTooltip" class="absolute bottom-full left-0 mb-2 w-64 p-3 bg-brand-surface-dark dark:bg-stone-800 text-xs text-white dark:text-stone-200 leading-relaxed rounded-xl shadow-xl z-50 pointer-events-none border border-stone-700">
          Look for the small open-jar symbol on the back of your physical product.
          <br><br>
          <span class="font-bold text-brand-primary-accent">"6M"</span> means it is safe for 6 months after opening.
          <div class="absolute top-full left-6 border-[6px] border-transparent border-t-brand-surface-dark dark:border-t-stone-800"></div>
        </div>
      </Transition>
    </div>

    <div class="mb-4 transition-all">
      <div class="flex overflow-x-auto gap-3 pb-3 snap-x hide-scrollbar -mx-1 px-1">
        <button
          v-for="months in paoOptions"
          :key="months"
          type="button"
          @click="setPAO(months)"
          :class="[
            'snap-start shrink-0 px-6 py-2.5 rounded-xl border text-sm font-bold transition-all shadow-sm',
            selectedPao === months
              ? 'bg-brand-primary text-white dark:text-brand-text border-brand-primary shadow-md'
              : 'bg-brand-bg-light dark:bg-stone-900 text-brand-text-muted border-brand-surface-border dark:border-stone-700 hover:border-brand-primary/50'
          ]"
        >
          {{ months }}M
        </button>
      </div>

      <div v-if="isOpened" class="animate-fade-in relative z-20 mt-3">
        <label class="block text-xs font-bold text-brand-text-muted dark:text-stone-400 uppercase tracking-wider mb-2">Custom Expiration Date</label>
        <CustomDatePicker v-model="expirationDate" :min-date="todayString" />
      </div>
    </div>

    <div class="pt-6">
      <button @click="handleSave" class="w-full bg-brand-primary hover:bg-brand-primary-hover text-white dark:text-brand-text font-bold py-4 rounded-xl shadow-md active:scale-[0.98] transition-all text-sm sm:text-base flex items-center justify-center gap-2">
        <svg v-if="isAnalyzing" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        {{ isAnalyzing ? 'Analyzing Safety...' : 'Save to My Shelf' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(4px); }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
</style>
