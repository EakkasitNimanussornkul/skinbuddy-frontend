<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '../composables/useToast'
import { updateUserSkinType } from '../api/authApi'
import ExpressSkinSelectorModal from '../components/Quiz/ExpressSkinSelectorModal.vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const { addToast } = useToast()
const authStore = useAuthStore()

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

    addToast(`Welcome to SkinBuddy! Profile set to ${selectedType}.`, 'success')
    showSelector.value = false
    router.push('/shelf')
  } catch (error) {
    console.error("Express Confirm Error:", error)
    addToast('Failed to save your skin profile. Please try again.', 'error')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-8">

    <div class="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">

      <div class="flex flex-col items-center lg:items-start text-center lg:text-left order-1 animate-fade-in-left">

        <div class="relative w-32 h-32 lg:w-48 lg:h-48 mb-8 group">
          <div class="absolute inset-0 bg-brand-primary/20 dark:bg-brand-primary/10 rounded-full blur-3xl group-hover:bg-brand-primary/30 transition-all duration-500"></div>
          <div class="relative w-full h-full bg-white dark:bg-brand-surface-dark rounded-full flex items-center justify-center border-2 border-brand-primary/20 dark:border-stone-800 shadow-xl overflow-hidden z-10">
            <img src="/images/jelly.png" alt="SkinBuddy Mascot" class="w-[80%] h-[80%] object-contain animate-jelly-float" />
          </div>
        </div>

        <h1 class="text-4xl lg:text-6xl font-serif font-bold text-brand-text dark:text-white tracking-tight mb-4 leading-tight">
          Welcome to <br class="hidden lg:block"/> <span class="text-brand-primary">SkinBuddy.</span>
        </h1>
        <p class="text-base lg:text-lg text-stone-600 dark:text-stone-300 leading-relaxed max-w-md font-medium">
          To protect your skin barrier and provide intelligent chemical conflict alerts, we first need to establish your unique dermatological profile.
        </p>
      </div>

      <div class="flex flex-col space-y-6 order-2 animate-fade-in-right">

        <div class="relative group">
          <div class="absolute -top-3.5 left-6 bg-brand-primary text-white text-[10px] font-bold uppercase tracking-widest py-1.5 px-4 rounded-full z-10 shadow-md shadow-brand-primary/30">
            Highly Recommended
          </div>

          <button
            @click="router.push('/quiz')"
            class="w-full text-left bg-white dark:bg-brand-surface-dark border-2 border-brand-primary/30 dark:border-brand-primary/40 rounded-[2rem] p-6 sm:p-8 pt-8 sm:pt-10 shadow-lg hover:shadow-2xl hover:border-brand-primary dark:hover:border-brand-primary transition-all duration-300 relative overflow-hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/20 active:scale-[0.98]"
          >
            <div class="absolute top-0 right-0 w-32 h-32 bg-brand-primary-light/50 dark:bg-brand-primary/10 rounded-bl-[100px] -z-0 transition-transform group-hover:scale-110"></div>

            <div class="relative z-10">
              <span class="flex items-center justify-between font-serif font-bold text-2xl text-brand-text dark:text-white mb-3 group-hover:translate-x-1 transition-transform duration-300">
                Find my skin type
                <div class="w-10 h-10 rounded-full bg-brand-primary-light dark:bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                  <svg class="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
                </div>
              </span>
              <p class="text-sm font-medium text-stone-500 dark:text-stone-400 leading-relaxed pr-8">
                Take our scientifically calibrated 16-question assessment to discover your exact Baumann baseline classification and needs.
              </p>
            </div>
          </button>
        </div>

        <div class="flex items-center gap-4 py-2 px-4 opacity-60">
          <div class="h-px bg-stone-300 dark:bg-stone-700 flex-1"></div>
          <span class="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Advanced Entry</span>
          <div class="h-px bg-stone-300 dark:bg-stone-700 flex-1"></div>
        </div>

        <button
          @click="showSelector = true"
          class="w-full text-left bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-[2rem] p-6 hover:bg-white dark:hover:bg-brand-surface-dark hover:border-brand-primary/30 dark:hover:border-stone-600 hover:shadow-md transition-all duration-300 group focus:outline-none focus-visible:ring-4 focus-visible:ring-stone-200 active:scale-[0.98]"
        >
          <span class="block text-brand-text dark:text-stone-200 font-bold text-base mb-1.5 group-hover:translate-x-1 transition-transform duration-300">
            I already know my 4-letter type &rarr;
          </span>
          <p class="text-xs font-medium text-stone-500 dark:text-stone-400">
            Skip the assessment and select your Baumann classification directly from the master list.
          </p>
        </button>

      </div>

    </div>

    <ExpressSkinSelectorModal
      :is-open="showSelector"
      :is-saving="isSaving"
      @close="showSelector = false"
      @confirm="handleExpressConfirm"
    />
  </div>
</template>

<style scoped>
.animate-fade-in-left { animation: fadeInLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-fade-in-right { animation: fadeInRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: 0.1s; }

@keyframes fadeInLeft {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes fadeInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
.animate-jelly-float {
  animation: float 4s ease-in-out infinite;
}
@keyframes float {
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(2deg); }
  100% { transform: translateY(0px) rotate(0deg); }
}
</style>
