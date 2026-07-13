<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getProductComparison } from '../../api/products'
import { useAuthStore } from '../../stores/auth'

const props = defineProps<{
  productA: any
  productB: any
}>()

const emit = defineEmits(['close', 'select-product'])
const authStore = useAuthStore()

const isLoading = ref(true)
const compareData = ref<any>(null)
const errorMsg = ref('')
const activeTab = ref<'overview' | 'ingredients'>('overview')

onMounted(async () => {
  isLoading.value = true
  try {
    const res = await getProductComparison(props.productA.id, props.productB.id)
    compareData.value = res
  } catch (err: any) {
    console.error("Comparison analysis error:", err)
    errorMsg.value = "Failed to run chemical comparison analysis."
  } finally {
    isLoading.value = false
  }
})

// --- Helper for compatibility badges ---
const getMatchBadge = (product: any) => {
  const score = product?.skin_match_score || 85
  if (score >= 85) return { label: `${score}% Match`, class: 'bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300 border-green-300 dark:border-green-800' }
  if (score >= 60) return { label: `${score}% Match`, class: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800' }
  return { label: `${score}% Caution`, class: 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border-red-300 dark:border-red-800' }
}

// --- Simulated side-by-side safety matrix ---
const safetyChecklist = [
  { label: 'Alcohol-free', key: 'alcohol_free' },
  { label: 'Fragrance-free', key: 'fragrance_free' },
  { label: 'Paraben-free', key: 'paraben_free' },
  { label: 'Silicone-free', key: 'silicone_free' },
  { label: 'Sulfate-free', key: 'sulfate_free' },
  { label: 'Fungal-acne safe', key: 'fungal_safe' },
]
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-md p-0 sm:p-4 animate-fade-in" @click.self="emit('close')">

    <!-- Responsive Containment Box -->
    <div class="bg-brand-surface-light dark:bg-brand-surface-dark w-full max-w-5xl rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[92vh] overflow-hidden animate-slide-up">

      <!-- Top Navigation & Tab Bar -->
      <div class="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between flex-shrink-0 bg-stone-50/80 dark:bg-stone-900/80 backdrop-blur-md z-10">
        <div class="flex items-center gap-3">
          <span class="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            Formula Versus
          </span>

          <!-- View Switcher -->
          <div v-if="compareData" class="hidden sm:flex bg-stone-200/60 dark:bg-stone-800 p-1 rounded-xl gap-1">
            <button @click="activeTab = 'overview'" :class="['px-3 py-1 text-xs font-bold rounded-lg transition-all', activeTab === 'overview' ? 'bg-white dark:bg-stone-900 text-brand-primary shadow-xs' : 'text-stone-500']">
              Side-by-Side Overview
            </button>
            <button @click="activeTab = 'ingredients'" :class="['px-3 py-1 text-xs font-bold rounded-lg transition-all', activeTab === 'ingredients' ? 'bg-white dark:bg-stone-900 text-brand-primary shadow-xs' : 'text-stone-500']">
              Ingredients Matrix
            </button>
          </div>
        </div>

        <button @click="emit('close')" class="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 hover:text-brand-primary transition-colors">
          <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="p-20 flex flex-col items-center justify-center text-stone-400 animate-pulse flex-1">
        <div class="w-12 h-12 border-4 border-stone-200 border-t-brand-primary rounded-full animate-spin mb-4"></div>
        <p class="text-xs font-bold uppercase tracking-widest">Running Side-by-Side Formula Analysis...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="errorMsg" class="p-16 text-center text-red-500 font-bold text-sm flex-1">
        {{ errorMsg }}
      </div>

      <!-- Main Scrollable Content Container -->
      <div v-else-if="compareData" class="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 hide-scrollbar">

        <!-- Mobile Tab Switcher -->
        <div class="sm:hidden flex bg-stone-100 dark:bg-stone-900 p-1 rounded-xl gap-1">
          <button @click="activeTab = 'overview'" :class="['flex-1 py-2 text-xs font-bold rounded-lg transition-all', activeTab === 'overview' ? 'bg-white dark:bg-stone-800 text-brand-primary shadow-xs' : 'text-stone-500']">Overview</button>
          <button @click="activeTab = 'ingredients'" :class="['flex-1 py-2 text-xs font-bold rounded-lg transition-all', activeTab === 'ingredients' ? 'bg-white dark:bg-stone-800 text-brand-primary shadow-xs' : 'text-stone-500']">Ingredients</button>
        </div>

        <!-- 🌟 HERO VERSUS HEADER (Skinsort Image 1 Top) 🌟 -->
        <div class="relative grid grid-cols-2 gap-4 sm:gap-8 pb-8 border-b border-stone-200 dark:border-stone-800">

          <!-- Floating Central VS Badge -->
          <div class="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 z-10 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-black text-xs px-3.5 py-1.5 rounded-full shadow-lg border-2 border-brand-surface-light dark:border-brand-surface-dark font-mono uppercase tracking-widest">
            VS
          </div>

          <!-- Product A Header -->
          <div class="flex flex-col items-center text-center space-y-3">
            <div class="w-28 h-28 sm:w-40 sm:h-40 rounded-3xl bg-stone-50 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 p-3 flex items-center justify-center relative shadow-sm">
              <img v-if="compareData.product_a.image_url" :src="compareData.product_a.image_url" class="w-full h-full object-contain drop-shadow-md" />
              <svg v-else class="w-12 h-12 text-stone-300 stroke-[1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div>
              <p class="text-[10px] font-bold text-brand-primary uppercase tracking-widest">{{ compareData.product_a.brand }}</p>
              <h4 class="font-serif font-bold text-sm sm:text-lg text-brand-text dark:text-white line-clamp-2 mt-0.5">{{ compareData.product_a.name }}</h4>
            </div>
            <span :class="['text-[11px] font-black px-3 py-1 rounded-full border shadow-2xs font-mono', getMatchBadge(compareData.product_a).class]">
              {{ getMatchBadge(compareData.product_a).label }}
            </span>
          </div>

          <!-- Product B Header -->
          <div class="flex flex-col items-center text-center space-y-3">
            <div class="w-28 h-28 sm:w-40 sm:h-40 rounded-3xl bg-stone-50 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 p-3 flex items-center justify-center relative shadow-sm">
              <img v-if="compareData.product_b.image_url" :src="compareData.product_b.image_url" class="w-full h-full object-contain drop-shadow-md" />
              <svg v-else class="w-12 h-12 text-stone-300 stroke-[1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div>
              <p class="text-[10px] font-bold text-brand-primary uppercase tracking-widest">{{ compareData.product_b.brand }}</p>
              <h4 class="font-serif font-bold text-sm sm:text-lg text-brand-text dark:text-white line-clamp-2 mt-0.5">{{ compareData.product_b.name }}</h4>
            </div>
            <span :class="['text-[11px] font-black px-3 py-1 rounded-full border shadow-2xs font-mono', getMatchBadge(compareData.product_b).class]">
              {{ getMatchBadge(compareData.product_b).label }}
            </span>
          </div>

        </div>

        <!-- Chemical Interaction Alert Box -->
        <div v-if="compareData.conflicts?.length" class="bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 rounded-3xl p-5">
          <div class="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold text-sm mb-2">
            <svg class="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>Chemical Interaction Warning Detected</span>
          </div>
          <ul class="space-y-1 pl-7 list-disc text-xs text-red-600 dark:text-red-300">
            <li v-for="(alert, i) in compareData.conflicts" :key="i">{{ alert.message }}</li>
          </ul>
        </div>

        <!-- TAB 1: SIDE-BY-SIDE OVERVIEW & SAFETY CHECKLIST -->
        <div v-if="activeTab === 'overview'" class="space-y-8">

          <!-- General Specs Table -->
          <div class="bg-stone-50 dark:bg-stone-900/60 rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div class="grid grid-cols-2 text-center text-xs font-bold border-b border-stone-200 dark:border-stone-800 py-3.5 bg-stone-100/60 dark:bg-stone-800/40 text-stone-500 uppercase tracking-wider">
              <span>{{ compareData.product_a.category || 'Formula A' }}</span>
              <span>{{ compareData.product_b.category || 'Formula B' }}</span>
            </div>

            <div class="grid grid-cols-2 text-center text-xs sm:text-sm font-semibold divide-x divide-stone-200 dark:divide-stone-800 py-4">
              <div><span class="font-mono font-bold text-brand-primary">{{ compareData.product_a.product_ingredients?.length || 0 }}</span> Total Ingredients</div>
              <div><span class="font-mono font-bold text-brand-primary">{{ compareData.product_b.product_ingredients?.length || 0 }}</span> Total Ingredients</div>
            </div>

            <div class="border-t border-stone-200 dark:border-stone-800 p-4 text-center bg-stone-100/30 dark:bg-stone-800/20 flex items-center justify-center gap-3">
              <span class="text-xs font-bold text-stone-500 uppercase tracking-wider">Formula Similarity Overlap:</span>
              <span class="text-sm font-black text-brand-primary font-mono bg-brand-primary/10 px-3 py-1 rounded-lg border border-brand-primary/20">{{ compareData.similarity_score }}% Match</span>
            </div>
          </div>

          <!-- Skinsort Style Safety Checklist Table (Image 1 Bottom) -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-widest text-stone-400 pl-1">Safety Checklist Comparison</h4>

            <div class="bg-stone-50 dark:bg-stone-900/40 rounded-3xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-200/80 dark:divide-stone-800">
              <div v-for="item in safetyChecklist" :key="item.key" class="grid grid-cols-12 items-center py-3.5 px-4 sm:px-6 text-xs font-semibold">

                <!-- Product A Check -->
                <div class="col-span-3 flex justify-center sm:justify-start">
                  <span class="w-6 h-6 rounded-full bg-green-100 dark:bg-green-950/80 text-green-600 dark:text-green-400 flex items-center justify-center shadow-2xs">
                    <svg class="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span>
                </div>

                <!-- Metric Label -->
                <div class="col-span-6 text-center font-bold text-stone-700 dark:text-stone-300">
                  {{ item.label }}
                </div>

                <!-- Product B Check -->
                <div class="col-span-3 flex justify-center sm:justify-end">
                  <span class="w-6 h-6 rounded-full bg-green-100 dark:bg-green-950/80 text-green-600 dark:text-green-400 flex items-center justify-center shadow-2xs">
                    <svg class="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span>
                </div>

              </div>
            </div>
          </div>

        </div>

        <!-- TAB 2: INGREDIENTS MATRIX (Skinsort Image 3) -->
        <div v-if="activeTab === 'ingredients'" class="space-y-6 animate-fade-in">

          <!-- Shared Active Ingredients Highlight -->
          <div class="bg-brand-primary/5 dark:bg-orange-950/20 border-2 border-brand-primary/30 rounded-3xl p-6 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-bold uppercase tracking-widest text-brand-primary">Shared Overlap Actives ({{ compareData.shared_ingredients?.length || 0 }})</h4>
              <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-primary text-white">Identical Actives</span>
            </div>

            <div class="flex flex-wrap gap-2 pt-1">
              <span v-for="ing in compareData.shared_ingredients" :key="ing.id" class="px-3.5 py-2 bg-white dark:bg-stone-900 text-brand-text dark:text-stone-100 rounded-2xl text-xs font-bold border border-stone-200 dark:border-stone-800 shadow-2xs flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-green-500"></span>
                <span>{{ ing.name }}</span>
              </span>
              <p v-if="!compareData.shared_ingredients?.length" class="text-xs text-stone-400 italic">No identical active ingredients overlap between these two formulations.</p>
            </div>
          </div>

          <!-- Unique Active Breakdowns Side-by-Side -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">

            <!-- Unique to Product A -->
            <div class="space-y-3">
              <h5 class="text-xs font-bold uppercase tracking-widest text-stone-400 pl-1">Unique to {{ compareData.product_a.brand }}</h5>
              <div class="bg-stone-50 dark:bg-stone-900/50 rounded-3xl p-4 border border-stone-200 dark:border-stone-800 space-y-2.5 max-h-72 overflow-y-auto pr-1 hide-scrollbar">
                <div v-for="(item, idx) in (compareData.product_a.product_ingredients || []).slice(0, 8)" :key="idx" class="p-3 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <span class="text-xs font-bold text-stone-700 dark:text-stone-200 truncate pr-2">{{ item.ingredients?.name || 'Formula Active' }}</span>
                  <span class="text-[9px] font-semibold text-stone-400 uppercase flex-shrink-0">{{ item.ingredients?.role || 'Component' }}</span>
                </div>
              </div>
            </div>

            <!-- Unique to Product B -->
            <div class="space-y-3">
              <h5 class="text-xs font-bold uppercase tracking-widest text-stone-400 pl-1">Unique to {{ compareData.product_b.brand }}</h5>
              <div class="bg-stone-50 dark:bg-stone-900/50 rounded-3xl p-4 border border-stone-200 dark:border-stone-800 space-y-2.5 max-h-72 overflow-y-auto pr-1 hide-scrollbar">
                <div v-for="(item, idx) in (compareData.product_b.product_ingredients || []).slice(0, 8)" :key="idx" class="p-3 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <span class="text-xs font-bold text-stone-700 dark:text-stone-200 truncate pr-2">{{ item.ingredients?.name || 'Formula Active' }}</span>
                  <span class="text-[9px] font-semibold text-stone-400 uppercase flex-shrink-0">{{ item.ingredients?.role || 'Component' }}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

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
