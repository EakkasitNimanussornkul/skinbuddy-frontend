<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProductComparison } from '../api/products'
import { useToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const { addToast } = useToast()

const isLoading = ref(true)
const compareData = ref<any | null>(null)
const errorMsg = ref('')
const activeTab = ref<'overview' | 'ingredients'>('overview')

const getMatchBadge = (product: any) => {
  const score = product?.skin_match_score || 85
  if (score >= 85) return { label: `${score}% Match`, class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' }
  if (score >= 60) return { label: `${score}% Match`, class: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' }
  return { label: `${score}% Caution`, class: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800/50' }
}

const loadComparison = async () => {
  const slugA = route.query.a as string
  const slugB = route.query.b as string

  if (!slugA || !slugB) {
    errorMsg.value = "Please select two products from the Explore catalog to run a comparison."
    isLoading.value = false
    return
  }

  isLoading.value = true
  errorMsg.value = ''
  try {
    const res = await getProductComparison(slugA, slugB)
    if (!res || !res.product_a || !res.product_b) {
      throw new Error("Could not parse formula matrix from server.")
    }
    compareData.value = res
  } catch (err: any) {
    console.error("❌ Comparison analysis error:", err)
    errorMsg.value = err.message || "Failed to run chemical comparison analysis."
    addToast("Could not load formula comparison.", "error")
  } finally {
    isLoading.value = false
  }
}

onMounted(() => loadComparison())
watch(() => route.query, () => { if (route.query.a && route.query.b) loadComparison() })

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
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 pb-36 transition-colors duration-300">

    <div class="sticky top-0 z-40 bg-brand-bg-light/80 dark:bg-brand-bg-dark/80 backdrop-blur-md pt-4 pb-4 px-4 sm:px-6 flex items-center gap-4 border-b border-stone-200/50 dark:border-stone-800/50">
      <button
        @click="router.back()"
        class="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-white dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 hover:text-brand-primary dark:hover:text-brand-primary hover:border-brand-primary/30 dark:hover:border-brand-primary/40 transition-all shadow-sm active:scale-95"
        aria-label="Go back"
      >
        <svg class="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <h1 class="text-lg font-bold text-brand-text dark:text-stone-100 tracking-tight line-clamp-1">
        Formula Comparison
      </h1>
    </div>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 space-y-6 pt-6 animate-fade-in">

      <div v-if="compareData && !isLoading" class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-brand-surface-dark p-6 rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-sm">
        <nav class="flex items-center gap-2 text-xs font-semibold text-stone-400">
          <router-link to="/explore" class="hover:text-brand-primary transition-colors">Explore</router-link>
          <span>/</span>
          <span class="text-brand-text dark:text-stone-200 font-bold truncate">Matrix Analysis</span>
        </nav>

        <div class="flex bg-stone-100 dark:bg-stone-900 p-1 rounded-xl gap-1 overflow-x-auto hide-scrollbar">
          <button @click="activeTab = 'overview'" :class="['whitespace-nowrap px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer', activeTab === 'overview' ? 'bg-white dark:bg-stone-800 text-brand-primary shadow-xs' : 'text-stone-500 hover:text-brand-text dark:hover:text-stone-300']">
            Side-by-Side Overview
          </button>
          <button @click="activeTab = 'ingredients'" :class="['whitespace-nowrap px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer', activeTab === 'ingredients' ? 'bg-white dark:bg-stone-800 text-brand-primary shadow-xs' : 'text-stone-500 hover:text-brand-text dark:hover:text-stone-300']">
            Ingredients Matrix
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="py-32 flex flex-col items-center justify-center text-stone-400 animate-pulse bg-white dark:bg-brand-surface-dark rounded-[2.5rem] border border-stone-200 dark:border-stone-800">
        <div class="w-12 h-12 border-4 border-stone-200 border-t-brand-primary rounded-full animate-spin mb-4"></div>
        <p class="text-xs font-bold uppercase tracking-widest">Running Analysis...</p>
      </div>

      <div v-else-if="errorMsg || !compareData" class="py-24 text-center bg-white dark:bg-brand-surface-dark rounded-[2.5rem] border border-stone-200 dark:border-stone-800 p-8 space-y-4">
        <p class="text-sm font-bold text-rose-500">{{ errorMsg || 'Could not generate matrix.' }}</p>
        <button @click="router.back()" class="inline-block px-6 py-3 bg-brand-primary text-white font-bold text-xs rounded-xl shadow-md hover:bg-brand-primary-hover transition-all">
          Go Back
        </button>
      </div>

      <div v-else class="bg-white dark:bg-brand-surface-dark rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden p-6 sm:p-10 space-y-10">

        <div class="relative grid grid-cols-2 gap-4 sm:gap-12 pb-10 border-b border-stone-200 dark:border-stone-800">

          <div class="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 z-10 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-black text-xs px-4 py-1.5 rounded-full shadow-xl border-4 border-white dark:border-brand-surface-dark font-mono uppercase tracking-widest">
            VS
          </div>

          <div class="flex flex-col items-center text-center space-y-3">
            <div class="w-32 h-32 sm:w-44 sm:h-44 rounded-3xl bg-stone-50 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 p-4 flex items-center justify-center shadow-sm relative mix-blend-multiply dark:mix-blend-normal">
              <img v-if="compareData.product_a?.image_url" :src="compareData.product_a.image_url" class="w-full h-full object-contain" />
              <svg v-else class="w-16 h-16 text-stone-300 stroke-[1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div>
              <span class="text-[10px] font-bold text-brand-primary uppercase tracking-widest">{{ compareData.product_a?.brand || 'Brand' }}</span>
              <h2 class="font-serif font-bold text-base sm:text-xl text-brand-text dark:text-white mt-0.5 line-clamp-2">{{ compareData.product_a?.name || 'Product A' }}</h2>
            </div>
            <div class="flex items-center gap-2 flex-wrap justify-center">
              <span :class="['text-[10px] font-black px-3 py-1 rounded-full border font-mono', getMatchBadge(compareData.product_a).class]">
                {{ getMatchBadge(compareData.product_a).label }}
              </span>
            </div>
          </div>

          <div class="flex flex-col items-center text-center space-y-3">
            <div class="w-32 h-32 sm:w-44 sm:h-44 rounded-3xl bg-stone-50 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 p-4 flex items-center justify-center shadow-sm relative mix-blend-multiply dark:mix-blend-normal">
              <img v-if="compareData.product_b?.image_url" :src="compareData.product_b.image_url" class="w-full h-full object-contain" />
              <svg v-else class="w-16 h-16 text-stone-300 stroke-[1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div>
              <span class="text-[10px] font-bold text-brand-primary uppercase tracking-widest">{{ compareData.product_b?.brand || 'Brand' }}</span>
              <h2 class="font-serif font-bold text-base sm:text-xl text-brand-text dark:text-white mt-0.5 line-clamp-2">{{ compareData.product_b?.name || 'Product B' }}</h2>
            </div>
            <div class="flex items-center gap-2 flex-wrap justify-center">
              <span :class="['text-[10px] font-black px-3 py-1 rounded-full border font-mono', getMatchBadge(compareData.product_b).class]">
                {{ getMatchBadge(compareData.product_b).label }}
              </span>
            </div>
          </div>

        </div>

        <div v-if="compareData.conflicts?.length" class="bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/20 rounded-3xl p-5 animate-fade-in shadow-sm">
          <div class="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm mb-3">
            <svg class="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>Chemical Interaction Warning Detected</span>
          </div>
          <ul class="space-y-2 pl-7 list-disc text-sm font-medium text-stone-700 dark:text-stone-300">
            <li v-for="(alert, i) in compareData.conflicts" :key="i">{{ alert.message }}</li>
          </ul>
        </div>

        <div v-if="activeTab === 'overview'" class="space-y-8 animate-fade-in">
          <div class="bg-stone-50 dark:bg-stone-900/60 rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div class="grid grid-cols-2 text-center text-xs font-bold border-b border-stone-200 dark:border-stone-800 py-3.5 bg-stone-100/60 dark:bg-stone-800/40 text-stone-500 uppercase tracking-wider">
              <span>{{ compareData.product_a?.category || 'Formula A' }}</span>
              <span>{{ compareData.product_b?.category || 'Formula B' }}</span>
            </div>

            <div class="grid grid-cols-2 text-center text-xs sm:text-sm font-semibold divide-x divide-stone-200 dark:divide-stone-800 py-4">
              <div><span class="font-mono font-bold text-brand-primary">{{ compareData.product_a?.product_ingredients?.length || 0 }}</span> Total Ingredients</div>
              <div><span class="font-mono font-bold text-brand-primary">{{ compareData.product_b?.product_ingredients?.length || 0 }}</span> Total Ingredients</div>
            </div>

            <div class="border-t border-stone-200 dark:border-stone-800 p-4 text-center bg-stone-100/30 dark:bg-stone-800/20 flex flex-col sm:flex-row items-center justify-center gap-3">
              <span class="text-xs font-bold text-stone-500 uppercase tracking-wider">Formula Similarity Overlap:</span>
              <span class="text-sm font-black text-brand-primary font-mono bg-brand-primary-light dark:bg-brand-primary/10 px-3 py-1 rounded-lg border border-brand-primary/20">{{ compareData.similarity_score }}% Match</span>
            </div>
          </div>

          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-widest text-stone-400 pl-1">Safety Checklist Comparison</h4>
            <div class="bg-stone-50 dark:bg-stone-900/40 rounded-3xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-200/80 dark:divide-stone-800">
              <div v-for="item in safetyChecklist" :key="item.key" class="grid grid-cols-12 items-center py-3.5 px-4 sm:px-6 text-xs font-semibold">
                <div class="col-span-3 flex justify-center sm:justify-start">
                  <span class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center shadow-sm">
                    <svg class="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span>
                </div>
                <div class="col-span-6 text-center font-bold text-stone-700 dark:text-stone-300">{{ item.label }}</div>
                <div class="col-span-3 flex justify-center sm:justify-end">
                  <span class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center shadow-sm">
                    <svg class="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'ingredients'" class="space-y-6 animate-fade-in">
          <div class="bg-brand-primary-light/50 dark:bg-brand-primary/5 border border-brand-primary/20 rounded-3xl p-6 space-y-4 shadow-sm">
            <div class="flex items-center justify-between border-b border-brand-primary/10 pb-3">
              <h4 class="text-xs font-bold uppercase tracking-widest text-brand-primary">Shared Overlap ({{ compareData.shared_ingredients?.length || 0 }})</h4>
            </div>
            <div class="flex flex-wrap gap-2 pt-1">
              <span v-for="ing in compareData.shared_ingredients" :key="ing.id" class="px-3.5 py-2 bg-white dark:bg-stone-900 text-brand-text dark:text-stone-100 rounded-2xl text-xs font-bold border border-stone-200 dark:border-stone-800 shadow-sm flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500 shadow-sm"></span>
                <span>{{ ing.name }}</span>
              </span>
              <p v-if="!compareData.shared_ingredients?.length" class="text-xs text-stone-400 italic font-medium">No identical active ingredients overlap between these two formulations.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div class="space-y-3">
              <h5 class="text-xs font-bold uppercase tracking-widest text-stone-400 pl-1">Unique to {{ compareData.product_a?.brand || 'A' }}</h5>
              <div class="bg-stone-50 dark:bg-stone-900/50 rounded-3xl p-4 border border-stone-200 dark:border-stone-800 space-y-2.5 max-h-72 overflow-y-auto pr-1 hide-scrollbar">
                <div v-for="(item, idx) in (compareData.product_a?.product_ingredients || [])" :key="idx" class="p-3 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-between shadow-sm">
                  <span class="text-xs font-bold text-stone-700 dark:text-stone-200 truncate pr-2">{{ item.ingredients?.name || 'Active' }}</span>
                  <span class="text-[9px] font-bold text-stone-400 uppercase tracking-wider">{{ item.ingredients?.benefits ? 'Active' : 'Base' }}</span>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h5 class="text-xs font-bold uppercase tracking-widest text-stone-400 pl-1">Unique to {{ compareData.product_b?.brand || 'B' }}</h5>
              <div class="bg-stone-50 dark:bg-stone-900/50 rounded-3xl p-4 border border-stone-200 dark:border-stone-800 space-y-2.5 max-h-72 overflow-y-auto pr-1 hide-scrollbar">
                <div v-for="(item, idx) in (compareData.product_b?.product_ingredients || [])" :key="idx" class="p-3 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-between shadow-sm">
                  <span class="text-xs font-bold text-stone-700 dark:text-stone-200 truncate pr-2">{{ item.ingredients?.name || 'Active' }}</span>
                  <span class="text-[9px] font-bold text-stone-400 uppercase tracking-wider">{{ item.ingredients?.benefits ? 'Active' : 'Base' }}</span>
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
.animate-fade-in { animation: fadeIn 0.25s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
