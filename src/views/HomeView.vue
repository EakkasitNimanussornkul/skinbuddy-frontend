<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { updateUserSkinType } from '../api/authApi'
import ExpressSkinSelectorModal from '../components/Quiz/ExpressSkinSelectorModal.vue'
import { useToast } from '../composables/useToast'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const { addToast } = useToast()

const currentSkinType = computed(() => authStore.user?.skin_type || 'Unknown Skin Type')

const showSelector = ref(false)
const isSaving = ref(false)

const handleExpressConfirm = async (selectedType: string) => {
  isSaving.value = true
  try {
    if (!authStore.isAuthenticated || !authStore.user) {
      throw new Error("No user logged in locally.")
    }

    await updateUserSkinType(selectedType)
    authStore.updateSkinType(selectedType)

    addToast(`Skin profile successfully updated to ${selectedType}.`, 'success')
    showSelector.value = false
  } catch (error) {
    console.error("HomeView Update Error:", error)
    addToast('Failed to update skin profile. Please try again.', 'error')
  } finally {
    isSaving.value = false
  }
}

const quickActions = [
  {
    label: 'AI Skin Consulter',
    sublabel: 'Instant skin analysis & active ingredient advice',
    icon: 'sparkles',
    route: '/chat',
    highlight: true
  },
  {
    label: 'Skincare Check',
    sublabel: 'Check ingredient compatibility & PAO timers',
    icon: 'checkShield',
    route: '/shelf',
    highlight: false
  },
  {
    label: 'Explore Catalog',
    sublabel: 'Compare products tailored to your barrier',
    icon: 'search',
    route: '/explore',
    highlight: false
  },
  {
    label: 'Daily Regimen',
    sublabel: 'Step-by-step AM/PM schedules',
    icon: 'routine',
    route: '/routine',
    highlight: false
  },
]

const icons: Record<string, string> = {
  sparkles: 'm12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z',
  checkShield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  routine: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  skin: 'M12 2.69l5.66 5.66a8 8 0 11-11.31 0z',
}

const heroIngredients = [
  { name: 'Ceramide NP', role: 'Hero Active', desc: 'Rebuilds lipid barrier & locks moisture.', type: 'hero' },
  { name: 'Niacinamide', role: 'Hero Active', desc: 'Calms redness & balances oil production.', type: 'hero' },
  { name: 'Centella Asiatica', role: 'Hero Active', desc: 'Soothes inflammation & speeds healing.', type: 'hero' },
  { name: 'Denatured Alcohol', role: 'Avoid Inside', desc: 'Strips moisture barrier & causes dryness.', type: 'avoid' },
  { name: 'Synthetic Fragrance', role: 'Avoid Inside', desc: 'High risk of contact dermatitis.', type: 'avoid' },
]

const recommendedProducts = [
  { name: 'Barrier Relief Cream', brand: 'SkinBuddy Lab', match: '98% Match', tag: 'Deep Nourish' },
  { name: 'Soothing Centella Toner', brand: 'PureDerma', match: '95% Match', tag: 'Calming' },
  { name: 'Hyaluronic Hydration Boost', brand: 'HydraCare', match: '92% Match', tag: 'Plumping' },
]
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans pb-28 pt-4 lg:pt-8 transition-colors duration-300">
    <div class="max-w-md md:max-w-3xl lg:max-w-[1400px] mx-auto px-4 sm:px-6 flex flex-col gap-8">

      <!-- Main Layout Grid (Desktop Split) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

        <!-- Left Column: Core Feed -->
        <div class="lg:col-span-8 flex flex-col gap-8 w-full">

          <!-- Hero Banner -->
          <div class="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-brand-primary to-brand-primary-hover shadow-md border border-brand-primary-accent/30 min-h-[160px] sm:min-h-[280px]">
            <div class="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/30 pointer-events-none" />
            <div class="absolute -bottom-10 -right-4 w-28 h-28 rounded-full bg-white/20 pointer-events-none" />

            <div class="relative z-10 px-6 sm:px-12 py-6 sm:py-12 flex items-center justify-between h-full">
              <div class="max-w-[70%] sm:max-w-[60%]">
                <span class="inline-block bg-brand-text/10 dark:bg-brand-bg-dark/20 text-brand-text dark:text-brand-bg-dark text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 border border-brand-text/10 shadow-sm">
                  Active Profile: {{ currentSkinType }}
                </span>
                <h2 class="text-brand-text font-serif text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-1.5 sm:mb-3">Your Skin Dashboard</h2>
                <p class="hidden sm:block text-brand-text/90 text-sm leading-relaxed font-medium max-w-md">
                  Let AI Consulter inspect your regimen compatibility or discover tailored formulas designed strictly for your barrier.
                </p>
              </div>

              <div class="w-20 h-20 sm:w-40 sm:h-40 flex-shrink-0 drop-shadow-md">
                <img src="/images/jelly.png" alt="SkinBuddy Mascot" class="w-full h-full object-contain animate-jelly-float" />
              </div>
            </div>
          </div>

          <!-- Action Cards -->
          <div>
            <h3 class="text-[11px] font-bold text-brand-text-muted uppercase tracking-widest mb-3 px-1">Core Actions</h3>
            <div class="grid grid-cols-2 gap-4">
              <button
                v-for="action in quickActions"
                :key="action.route"
                @click="router.push(action.route)"
                :class="[
                  'border rounded-3xl p-5 text-left transition-all group flex flex-col justify-between min-h-[140px] bg-brand-surface-light dark:bg-brand-surface-dark',
                  action.highlight
                    ? 'border-brand-primary/40 shadow-sm hover:-translate-y-1'
                    : 'border-brand-surface-border dark:border-stone-800 hover:border-brand-primary/40 hover:-translate-y-1 hover:shadow-sm'
                ]"
              >
                <div>
                  <div class="w-11 h-11 rounded-2xl bg-brand-primary-light/50 dark:bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mb-3 group-hover:bg-brand-primary/20 transition-colors text-brand-primary">
                    <svg class="w-5 h-5 stroke-[1.8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" :d="icons[action.icon]" />
                    </svg>
                  </div>
                  <p class="text-sm font-bold text-brand-text dark:text-stone-100 leading-tight">{{ action.label }}</p>
                </div>
                <p class="text-[11px] text-brand-text-muted mt-2 leading-snug">{{ action.sublabel }}</p>
              </button>
            </div>
          </div>

          <!-- Featured Matches -->
          <div>
            <div class="flex items-end justify-between mb-4 px-1">
              <div>
                <span class="text-[10px] bg-brand-primary-light/50 dark:bg-brand-primary/10 text-brand-primary font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-brand-primary/20">Featured Match</span>
                <h3 class="text-lg sm:text-xl font-serif font-bold text-brand-text dark:text-white mt-1.5">Tailored For {{ currentSkinType }}</h3>
              </div>
              <button @click="router.push('/explore')" class="text-xs font-bold text-brand-primary hover:text-brand-primary-hover transition-colors flex items-center gap-1 mb-1">
                <span>Browse All</span>
                <svg class="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>

            <div class="flex overflow-x-auto sm:grid sm:grid-cols-3 gap-4 pb-4 sm:pb-0 snap-x snap-mandatory hide-scrollbar">
              <div
                v-for="(prod, i) in recommendedProducts"
                :key="i"
                @click="router.push('/explore')"
                class="w-[75vw] sm:w-auto shrink-0 snap-center bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 rounded-2xl p-5 cursor-pointer hover:border-brand-primary/50 hover:shadow-lg transition-all flex flex-col group"
              >
                <div class="flex items-center justify-between mb-4">
                  <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800/50">{{ prod.match }}</span>
                  <span class="text-[10px] text-brand-text-muted uppercase font-bold tracking-wider">{{ prod.tag }}</span>
                </div>
                <div class="mb-4">
                  <h4 class="text-sm font-bold text-brand-text dark:text-white line-clamp-1 group-hover:text-brand-primary transition-colors">{{ prod.name }}</h4>
                  <p class="text-[11px] font-medium text-brand-text-muted mt-1">{{ prod.brand }}</p>
                </div>
                <div class="mt-auto pt-3 border-t border-brand-surface-border dark:border-stone-800 flex items-center justify-between text-xs font-bold text-brand-primary">
                  <span>Inspect Breakdown</span>
                  <svg class="w-4 h-4 stroke-[2.5] transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Ingredients Summary -->
          <div>
            <div class="mb-4 px-1">
              <h3 class="text-[11px] font-bold text-brand-text-muted uppercase tracking-widest mb-1.5">Active Ingredients Summary</h3>
              <p class="text-lg font-serif font-bold text-brand-text dark:text-white">Hero Support vs. Formulas To Avoid</p>
            </div>

            <div class="flex overflow-x-auto sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4 sm:pb-0 snap-x snap-mandatory hide-scrollbar">
              <div
                v-for="(ing, idx) in heroIngredients"
                :key="idx"
                class="w-[70vw] sm:w-auto shrink-0 snap-center rounded-2xl p-5 border flex flex-col shadow-sm bg-brand-surface-light dark:bg-brand-surface-dark transition-all hover:-translate-y-1"
                :class="[
                  ing.type === 'hero' ? 'border-emerald-200 dark:border-emerald-800/40 hover:shadow-emerald-500/10 hover:shadow-lg' : 'border-semantic-error/30 dark:border-semantic-error/20 hover:shadow-semantic-error/10 hover:shadow-lg'
                ]"
              >
                <span :class="[
                  'text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border inline-block mb-3 self-start',
                  ing.type === 'hero' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400' : 'bg-semantic-error/10 text-semantic-error border-semantic-error/20'
                ]">
                  {{ ing.role }}
                </span>
                <h4 class="text-sm font-bold text-brand-text dark:text-white">{{ ing.name }}</h4>
                <p class="text-xs font-medium text-brand-text-muted mt-1.5 leading-relaxed">{{ ing.desc }}</p>
              </div>
            </div>
          </div>

        </div>

        <!-- Desktop Right Column -->
        <div class="hidden lg:flex lg:col-span-4 flex-col gap-6 w-full lg:sticky lg:top-28">

          <!-- Desktop AI Spotlight -->
          <div class="bg-brand-surface-dark text-white rounded-[2rem] p-8 border border-stone-800 shadow-2xl relative overflow-hidden group">
            <div class="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-brand-primary/20 blur-2xl pointer-events-none transition-transform group-hover:scale-110 duration-700" />
            <div class="flex items-center gap-2 text-brand-primary mb-4">
              <svg class="w-5 h-5 animate-pulse stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" :d="icons.sparkles"/></svg>
              <span class="text-xs font-bold uppercase tracking-wider">AI Skin Consulter</span>
            </div>
            <h4 class="font-serif font-bold text-2xl leading-snug mb-3">Need an expert second opinion?</h4>
            <p class="text-sm text-stone-400 leading-relaxed font-medium mb-8">Let our AI Consulter cross-reference your exact routine against potential active clashing or seasonal barrier degradation.</p>
            <button @click="router.push('/chat')" class="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm py-4 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
              <span>Launch Consultation</span>
              <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          </div>

          <!-- Desktop Profile Control -->
          <div class="bg-gradient-to-br from-brand-surface-light to-brand-bg-light dark:from-brand-surface-dark dark:to-brand-bg-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 shadow-sm p-8 flex flex-col gap-6">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-full bg-brand-primary-light/50 dark:bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center flex-shrink-0">
                <svg class="w-6 h-6 text-brand-primary stroke-[1.8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="icons.skin" />
                </svg>
              </div>
              <div>
                <p class="text-[11px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">Active Diagnosis</p>
                <p class="text-xl font-serif font-bold text-brand-text dark:text-stone-100">{{ currentSkinType }}</p>
              </div>
            </div>

            <div class="flex flex-col gap-3 pt-6 border-t border-brand-surface-border dark:border-stone-800">
              <button @click="showSelector = true" class="w-full text-xs font-bold text-brand-text dark:text-white bg-brand-bg-light dark:bg-stone-800 hover:border-brand-primary/50 py-3.5 rounded-xl transition-all border border-brand-surface-border dark:border-stone-700 shadow-sm active:scale-95">
                Quick Update Skin Type
              </button>
              <button @click="router.push('/quiz')" class="w-full text-xs font-bold text-brand-primary bg-brand-primary/10 hover:bg-brand-primary hover:text-white py-3.5 rounded-xl transition-all border border-brand-primary/20 shadow-sm active:scale-95">
                {{ authStore.user?.skin_type ? 'Retake Baumann Quiz' : 'Take Skin Quiz' }}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>

    <ExpressSkinSelectorModal :is-open="showSelector" :is-saving="isSaving" @close="showSelector = false" @confirm="handleExpressConfirm" />
  </div>
</template>

<style scoped>
.animate-jelly-float {
  animation: jellyFloat 3s infinite ease-in-out;
}
@keyframes jellyFloat {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-4px) scale(1.02); }
}

.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
