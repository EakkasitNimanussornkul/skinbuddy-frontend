<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProductComparison } from '../api/products'
import { useToast } from '../composables/useToast'

import CompareIdentityHeader from '../components/Compare/CompareIdentityHeader.vue'
import CompareSafetyChecklist from '../components/Compare/CompareSafetyChecklist.vue'
import CompareActivesMatrix from '../components/Compare/CompareActivesMatrix.vue'
import CompareIngredientsGrid from '../components/Compare/CompareIngredientsGrid.vue'

const route = useRoute()
const router = useRouter()
const { addToast } = useToast()

const isLoading = ref(true)
const compareData = ref<any | null>(null)
const errorMsg = ref('')
const activeTab = ref<'overview' | 'ingredients'>('overview')

const loadComparison = async () => {
  const slugA = route.query.a as string
  const slugB = route.query.b as string

  if (!slugA || !slugB) {
    errorMsg.value = "Please select two formulations from the registry to run a side-by-side diagnostic check."
    isLoading.value = false
    return
  }

  isLoading.value = true
  errorMsg.value = ''
  try {
    const res = await getProductComparison(slugA, slugB)
    if (!res || !res.product_a || !res.product_b) {
      throw new Error("Could not parse formula matrix data structure from server.")
    }
    compareData.value = res
  } catch (err: any) {
    console.error("Comparison analysis error:", err)
    errorMsg.value = err.message || "Failed to execute chemical comparison matrix analytics."
    addToast("Could not load formula comparison layers.", "error")
  } finally {
    isLoading.value = false
  }
}

onMounted(() => loadComparison())
watch(() => route.query, () => { if (route.query.a && route.query.b) loadComparison() })
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 pb-36 transition-colors duration-300">

    <!-- Top Sticky Header Navigation Bar -->
    <div class="sticky top-0 z-40 bg-brand-bg-light/80 dark:bg-brand-bg-dark/80 backdrop-blur-md pt-4 pb-4 px-4 sm:px-6 flex items-center gap-4 border-b border-brand-surface-border dark:border-stone-800">
      <button
        @click="router.back()"
        class="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 text-brand-text-muted hover:text-brand-primary transition-all shadow-sm active:scale-95 cursor-pointer"
        aria-label="Go back"
      >
        <svg class="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div class="min-w-0">
        <span class="text-[10px] font-bold uppercase tracking-widest text-brand-primary block">Registry Analytics Matrix</span>
        <h1 class="text-sm font-bold text-brand-text dark:text-stone-200 tracking-tight truncate max-w-xl">
          {{ compareData ? `${compareData.product_a?.brand} ${compareData.product_a?.name} VS ${compareData.product_b?.brand} ${compareData.product_b?.name}` : 'Formula Comparison' }}
        </h1>
      </div>
    </div>

    <!-- Main Central Layout Constraints Viewport Wrapper -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 space-y-6 pt-6 animate-fade-in">

      <!-- Segment Selection Routing Toggle Bar -->
      <div v-if="compareData && !isLoading" class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-surface-light dark:bg-brand-surface-dark p-4 rounded-3xl border border-brand-surface-border dark:border-stone-800 shadow-sm">
        <nav class="flex items-center gap-2 text-xs font-semibold text-brand-text-muted">
          <router-link to="/explore" class="hover:text-brand-primary transition-colors">Explore</router-link>
          <span>/</span>
          <span class="text-brand-text dark:text-stone-200 font-bold">Cross Comparison</span>
        </nav>

        <div class="flex bg-brand-bg-light dark:bg-stone-900 p-1 rounded-xl gap-1">
          <button @click="activeTab = 'overview'" :class="['px-5 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer select-none', activeTab === 'overview' ? 'bg-brand-surface-light dark:bg-brand-surface-dark text-brand-primary shadow-sm' : 'text-brand-text-muted hover:text-brand-text dark:hover:text-stone-300']">
            Side-by-Side Overview
          </button>
          <button @click="activeTab = 'ingredients'" :class="['px-5 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer select-none', activeTab === 'ingredients' ? 'bg-brand-surface-light dark:bg-brand-surface-dark text-brand-primary shadow-sm' : 'text-brand-text-muted hover:text-brand-text dark:hover:text-stone-300']">
            Ingredients Matrix
          </button>
        </div>
      </div>

      <!-- Loading Frame Dashboard Viewport -->
      <div v-if="isLoading" class="py-32 flex flex-col items-center justify-center text-brand-text-muted animate-pulse bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800">
        <div class="w-12 h-12 border-4 border-brand-surface-border border-t-brand-primary rounded-full animate-spin mb-4"></div>
        <p class="text-xs font-bold uppercase tracking-widest text-brand-primary dark:text-brand-primary-accent">Generating Chemical Profile Matrix...</p>
      </div>

      <!-- Error / Fault Tolerance Viewport Box -->
      <div v-else-if="errorMsg || !compareData" class="py-24 text-center bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 p-8 space-y-4">
        <p class="text-sm font-bold text-semantic-error">{{ errorMsg || 'Could not map product comparison values.' }}</p>
        <button @click="router.back()" class="inline-block px-6 py-3 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer">
          Return to Registry
        </button>
      </div>

      <!-- Distributed Layout Wrapper Grid -->
      <div v-else class="space-y-6">

        <!-- Tab Context Target 1: Overview Breakdown Panels Structure Layout -->
        <div v-if="activeTab === 'overview'" class="space-y-6 animate-fade-in">
          <!-- Subcomponent 1: Product Main Identity Hero Row Grid -->
          <CompareIdentityHeader :data="compareData" />

          <!-- Subcomponent 2: Free-From Flags Properties Comparison Grid Sheet -->
          <CompareSafetyChecklist :data="compareData" />

          <!-- Subcomponent 3: Actives, Key Benefits, and Concerns Layout Grid Panel -->
          <CompareActivesMatrix :data="compareData" />
        </div>

        <!-- Tab Context Target 2: Ingredients Deep Side-by-side Structural Matrix Grid Block -->
        <div v-else class="animate-fade-in">
          <!-- Subcomponent 4: Ingredient Lists Deep-Dive Column View Grid -->
          <CompareIngredientsGrid :data="compareData" />
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.25s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
