<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { searchProducts, pickTopRecommendations, type ScoredProduct } from '../api/products'
import { skinProfiles } from '../data/skinprofiles'
import { typologyDetails, type TraitDetail } from '../data/typologydata'
import TypologyComparisonModal from '../components/Quiz/TypologyComparisonModal.vue'
import SkinTypeRecommendationsWidget from '../components/Quiz/SkinTypeRecommendationsWidget.vue'

const router = useRouter()
const authStore = useAuthStore()

const userSkinType = computed(() => authStore.user?.skin_type || 'ORNT')
const profileData = computed(() => (skinProfiles[userSkinType.value] || skinProfiles['OSPW'])!)

const scrollContainer = ref<HTMLElement | null>(null)
const activeMobileIndex = ref(0)

const handleMobileScroll = (event: Event) => {
  const container = event.target as HTMLElement
  const scrollLeft = container.scrollLeft
  const cardWidth = container.scrollWidth / 4
  activeMobileIndex.value = Math.round(scrollLeft / cardWidth)
}

const scrollToAxisCard = (index: number) => {
  if (!scrollContainer.value) return
  const container = scrollContainer.value
  const cardWidth = container.scrollWidth / 4

  container.scrollTo({
    left: cardWidth * index,
    behavior: 'smooth'
  })
  activeMobileIndex.value = index
}

const axes = computed(() => {
  const type = userSkinType.value
  return [
    { letter: type[0], name: type[0] === 'O' ? 'Oily' : 'Dry', opposite: type[0] === 'O' ? 'Dry' : 'Oily', oppositeLetter: type[0] === 'O' ? 'D' : 'O' },
    { letter: type[1], name: type[1] === 'S' ? 'Sensitive' : 'Resistant', opposite: type[1] === 'S' ? 'Resistant' : 'Sensitive', oppositeLetter: type[1] === 'S' ? 'R' : 'S' },
    { letter: type[2], name: type[2] === 'P' ? 'Pigmented' : 'Non-Pigmented', opposite: type[2] === 'P' ? 'Non-Pigmented' : 'Pigmented', oppositeLetter: type[2] === 'P' ? 'N' : 'P' },
    { letter: type[3], name: type[3] === 'W' ? 'Wrinkle-Prone' : 'Tight', opposite: type[3] === 'W' ? 'Tight' : 'Wrinkle-Prone', oppositeLetter: type[3] === 'W' ? 'T' : 'W' }
  ]
})

const isModalOpen = ref(false)
const selectedActiveTrait = ref<TraitDetail | null>(null)
const selectedOppositeTrait = ref<TraitDetail | null>(null)

const openTypologyModal = (axis: any) => {
  selectedActiveTrait.value = typologyDetails[axis.letter] ?? null
  selectedOppositeTrait.value = typologyDetails[axis.oppositeLetter] ?? null
  isModalOpen.value = true
}

// Recommendations come from the live catalog, scored per user by the backend.
// They used to be read from the static skinProfiles dictionary, which never
// assigned the field - so the widget received [] for every user on every load
// and the empty state was the only state it could ever reach.
const recommendedProducts = ref<ScoredProduct[]>([])
const recommendationsLoading = ref(true)
const recommendationsFailed = ref(false)

const loadRecommendations = async () => {
  recommendationsLoading.value = true
  recommendationsFailed.value = false

  try {
    const results = await searchProducts()
    recommendedProducts.value = pickTopRecommendations(results)
  } catch (error) {
    console.error('Failed to load recommended products:', error)
    recommendedProducts.value = []
    recommendationsFailed.value = true
  } finally {
    recommendationsLoading.value = false
  }
}

onMounted(loadRecommendations)
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark pb-28 pt-4 lg:pt-8 text-brand-text dark:text-stone-100 font-sans transition-colors duration-300 overflow-hidden relative">
    <div class="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-brand-primary/10 blur-3xl" />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-6 lg:gap-8 relative z-10">

      <!-- Header Navigation -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button @click="router.back()" class="w-10 h-10 rounded-full bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 flex items-center justify-center text-brand-text-muted hover:text-brand-primary hover:border-brand-primary/40 transition-all shadow-sm active:scale-95">
            <svg class="w-5 h-5 pr-0.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 class="text-xl lg:text-2xl font-serif font-bold text-brand-text dark:text-white leading-tight">Skin Profile Report</h1>
            <p class="text-[10px] lg:text-xs font-bold text-brand-text-muted uppercase tracking-widest mt-0.5">Diagnostic Breakdown</p>
          </div>
        </div>

        <button @click="router.push('/chat')" class="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-brand-primary-light/50 dark:bg-brand-primary/10 hover:bg-brand-primary hover:text-white text-brand-primary rounded-xl text-[10px] sm:text-xs font-bold transition-all border border-brand-primary/20 shadow-sm active:scale-95">
          <svg class="w-4 h-4 stroke-[2] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          <span class="hidden sm:inline">Result Inaccurate? Consult AI</span>
          <span class="inline sm:hidden">Consult AI</span>
        </button>
      </div>

      <!-- Profile content -->
      <div class="flex flex-col gap-6 lg:gap-8 animate-staggered-in">

        <!-- Hero Banner Panel -->
        <div class="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-brand-primary via-brand-primary-hover to-brand-primary-accent shadow-lg p-6 sm:p-8 flex flex-col justify-center min-h-[160px] border border-white/20 dark:border-white/5">
          <div class="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/20 blur-3xl pointer-events-none" />
          <div class="relative z-10 w-full flex flex-col gap-2">
            <div class="flex flex-wrap gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-bold uppercase tracking-widest border border-white/20 backdrop-blur-md shadow-sm">
                Type {{ userSkinType }}
              </span>
              <span class="px-2.5 py-0.5 rounded-full bg-black/20 text-white text-[9px] font-bold uppercase tracking-widest border border-black/10 backdrop-blur-md shadow-sm">
                {{ profileData.maintenanceLevel }} Maintenance
              </span>
            </div>
            <h2 class="text-white font-serif text-2xl lg:text-3xl font-bold leading-tight drop-shadow-md">
              {{ profileData.subtitle }}
            </h2>
            <p class="text-white/90 text-xs sm:text-sm leading-relaxed font-medium max-w-3xl">
              {{ profileData.desc }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">

          <!-- COLUMN 1: Typology Breakdown Panel -->
          <div class="lg:col-span-4 bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-between border-t-4 border-t-brand-primary">
            <div>
              <h3 class="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-4 px-1">Typology Elements</h3>
              <div ref="scrollContainer" class="flex overflow-x-auto lg:grid lg:grid-cols-1 gap-3 pb-4 lg:pb-0 mobile-snap-row hide-scrollbar" @scroll="handleMobileScroll">
                <div v-for="axis in axes" :key="axis.letter" @click="openTypologyModal(axis)" class="bg-brand-bg-light dark:bg-stone-900/60 border-2 border-brand-surface-border dark:border-stone-800/80 rounded-2xl p-4 flex-shrink-0 w-[75vw] lg:w-full flex items-center justify-between hover:border-brand-primary/60 dark:hover:border-brand-primary/60 hover:shadow-md transition-all duration-300 cursor-pointer group active:scale-[0.99] snap-center">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-brand-primary text-white flex items-center justify-center font-mono font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
                      {{ axis.letter }}
                    </div>
                    <div>
                      <h4 class="text-sm font-bold text-brand-text dark:text-white group-hover:text-brand-primary transition-colors">{{ axis.name }}</h4>
                      <p class="text-[10px] font-bold text-brand-text-muted uppercase tracking-wide mt-0.5">vs. {{ axis.opposite }}</p>
                    </div>
                  </div>
                  <div class="w-8 h-8 rounded-full bg-brand-surface-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700 flex items-center justify-center text-brand-text-muted group-hover:text-brand-primary transition-colors shadow-2xs">
                    <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex lg:hidden justify-center items-center gap-2.5 pt-2">
              <button v-for="(_, i) in 4" :key="i" @click="scrollToAxisCard(i)" class="h-2 rounded-full transition-all duration-300 cursor-pointer" :class="[activeMobileIndex === i ? 'w-5 bg-brand-primary' : 'w-2 bg-brand-surface-border hover:bg-brand-primary/50']" />
            </div>
          </div>

          <!-- COLUMN 2: Deep Nourishment Strategy & Concerns -->
          <div class="lg:col-span-4 flex flex-col gap-6 lg:gap-8 justify-between">
            <div class="bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 rounded-[2.5rem] p-6 flex-1 shadow-sm">
              <h3 class="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-4">Deep Nourishment Strategy</h3>
              <h4 class="text-xl font-serif font-bold text-brand-text dark:text-white mb-2">{{ profileData.focusTitle }}</h4>
              <p class="text-xs font-medium text-brand-text-muted leading-relaxed mb-6">{{ profileData.focusDesc }}</p>

              <div class="space-y-4">
                <div class="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/50">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-xs font-bold text-emerald-900 dark:text-emerald-300">Hero Actives</span>
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    <span v-for="item in profileData.dos" :key="item" class="px-2 py-0.5 bg-white dark:bg-stone-900 rounded-lg text-[10px] font-bold text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 shadow-2xs">{{ item }}</span>
                  </div>
                </div>

                <div class="bg-semantic-error/5 dark:bg-semantic-error/10 p-4 rounded-2xl border border-semantic-error/20">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-xs font-bold text-semantic-error dark:text-rose-300">Avoid Inside</span>
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    <span v-for="item in profileData.donts" :key="item" class="px-2 py-0.5 bg-white dark:bg-stone-900 rounded-lg text-[10px] font-bold text-semantic-error dark:text-rose-400 border border-semantic-error/10 shadow-2xs">{{ item }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 rounded-[2.5rem] p-6 shadow-sm">
              <h3 class="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-3">Common Concerns</h3>
              <div class="flex flex-wrap gap-2">
                <span v-for="concern in profileData.commonConcerns" :key="concern" class="px-3 py-1.5 bg-brand-bg-light dark:bg-stone-900 rounded-xl text-[11px] font-bold text-brand-text dark:text-stone-200 border border-brand-surface-border dark:border-stone-800 shadow-2xs">
                  {{ concern }}
                </span>
              </div>
            </div>
          </div>

          <!-- COLUMN 3: Suggested Routine Blueprint -->
          <div class="lg:col-span-4 bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-5">
            <div>
              <h3 class="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-4">Routine Blueprint</h3>
              <div class="grid grid-cols-3 gap-2 mb-4">
                <div class="flex flex-col bg-brand-bg-light dark:bg-stone-900/50 p-2 rounded-xl border border-brand-surface-border dark:border-stone-800 text-center">
                  <span class="text-[9px] font-bold text-brand-text-muted uppercase">Cleanse</span>
                  <span class="text-[10px] font-bold text-brand-primary truncate mt-0.5">{{ profileData.idealTextures.cleanser }}</span>
                </div>
                <div class="flex flex-col bg-brand-bg-light dark:bg-stone-900/50 p-2 rounded-xl border border-brand-surface-border dark:border-stone-800 text-center">
                  <span class="text-[9px] font-bold text-brand-text-muted uppercase">Moist</span>
                  <span class="text-[10px] font-bold text-brand-primary truncate mt-0.5">{{ profileData.idealTextures.moisturizer }}</span>
                </div>
                <div class="flex flex-col bg-brand-bg-light dark:bg-stone-900/50 p-2 rounded-xl border border-brand-surface-border dark:border-stone-800 text-center">
                  <span class="text-[9px] font-bold text-brand-text-muted uppercase">SPF</span>
                  <span class="text-[10px] font-bold text-brand-primary truncate mt-0.5">{{ profileData.idealTextures.sunscreen }}</span>
                </div>
              </div>
            </div>

            <div class="space-y-4 overflow-y-auto pr-1">
              <div class="bg-brand-bg-light dark:bg-stone-900/50 p-4 rounded-2xl border border-brand-surface-border dark:border-stone-800/80">
                <div class="flex items-center gap-2 mb-3">
                  <svg class="w-4 h-4 text-brand-primary stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
                  <h4 class="font-bold text-brand-text dark:text-stone-200 text-xs">Morning Steps</h4>
                </div>
                <ol class="space-y-2 relative before:absolute before:inset-y-1.5 before:left-[5px] before:w-[1.5px] before:bg-brand-surface-border dark:before:bg-stone-700">
                  <li v-for="(step, index) in profileData.routineBlueprint.am" :key="index" class="flex items-start gap-2.5 relative z-10">
                    <span class="w-3 h-3 mt-0.5 flex-shrink-0 rounded-full bg-brand-surface-light dark:bg-stone-900 border-2 border-brand-primary flex items-center justify-center"></span>
                    <span class="text-[11px] text-brand-text dark:text-stone-300 font-medium leading-normal">{{ step }}</span>
                  </li>
                </ol>
              </div>

              <div class="bg-brand-bg-light dark:bg-stone-900/50 p-4 rounded-2xl border border-brand-surface-border dark:border-stone-800/80">
                <div class="flex items-center gap-2 mb-3">
                  <svg class="w-4 h-4 text-stone-400 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  <h4 class="font-bold text-brand-text dark:text-stone-200 text-xs">Evening Steps</h4>
                </div>
                <ol class="space-y-2 relative before:absolute before:inset-y-1.5 before:left-[5px] before:w-[1.5px] before:bg-brand-surface-border dark:before:bg-stone-700">
                  <li v-for="(step, index) in profileData.routineBlueprint.pm" :key="index" class="flex items-start gap-2.5 relative z-10">
                    <span class="w-3 h-3 mt-0.5 flex-shrink-0 rounded-full bg-brand-surface-light dark:bg-stone-900 border-2 border-stone-400 dark:border-stone-500 flex items-center justify-center"></span>
                    <span class="text-[11px] text-brand-text dark:text-stone-300 font-medium leading-normal">{{ step }}</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

        </div>

        <!-- Biocompatible Curation Widget -->
        <div>
          <SkinTypeRecommendationsWidget
            :user-skin-type="userSkinType"
            :products="recommendedProducts"
            :loading="recommendationsLoading"
            :failed="recommendationsFailed"
            @retry="loadRecommendations"
          />
        </div>

      </div>

    </div>

    <!-- Modals -->
    <Teleport to="body">
      <TypologyComparisonModal
        :is-open="isModalOpen"
        :active-trait="selectedActiveTrait"
        :opposite-trait="selectedOppositeTrait"
        @close="isModalOpen = false"
      />
    </Teleport>
  </div>
</template>

<style scoped>
@media (max-width: 1023px) {
  .mobile-snap-row {
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
  }
}
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }

/* Smooth fade-in without CSS override bugs */
@keyframes staggeredIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-staggered-in {
  animation: staggeredIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
