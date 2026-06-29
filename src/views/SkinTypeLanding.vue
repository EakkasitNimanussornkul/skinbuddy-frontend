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

    if (!authStore.isAuthenticated() || !authStore.user) {
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
  <div class="max-w-md mx-auto p-6 mt-10 animate-fade-in">
    <!-- Friendly Welcome Header -->
    <div class="text-center mb-10">
      <div class="w-20 h-20 bg-brand-primary/10 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-5 border border-brand-primary/20 dark:border-orange-900/50 shadow-inner">
        <svg class="w-10 h-10 text-brand-primary dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      </div>
      <h1 class="text-3xl font-serif font-bold text-brand-text dark:text-white mb-3">Welcome to SkinBuddy!</h1>
      <p class="text-sm text-stone-600 dark:text-stone-400 leading-relaxed max-w-[280px] mx-auto">
        To keep your skin safe and provide smart routine alerts, we need to know your unique skin profile.
      </p>
    </div>

    <div class="space-y-5">
      <!-- Path A: Recommended for Beginners (The Quiz) -->
      <div class="relative">
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-full z-10 shadow-sm">
          Recommended
        </div>
        <button
          @click="router.push('/quiz')"
          class="w-full p-6 pt-7 bg-white dark:bg-stone-900 border-2 border-brand-primary/30 dark:border-orange-500/30 rounded-3xl text-left hover:border-brand-primary dark:hover:border-orange-500 hover:shadow-lg transition-all group"
        >
          <span class="block font-bold text-xl text-brand-text dark:text-white mb-2 group-hover:translate-x-1 transition-transform flex items-center justify-between">
            Help me find my skin type
            <svg class="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </span>
          <span class="text-sm text-stone-500 dark:text-stone-400">Take our quick 16-question scientific assessment to discover your exact needs.</span>
        </button>
      </div>

      <div class="flex items-center gap-4 my-2 opacity-60">
        <div class="h-px bg-stone-300 dark:bg-stone-700 flex-1"></div>
        <span class="text-xs font-bold text-stone-400 uppercase tracking-widest">OR</span>
        <div class="h-px bg-stone-300 dark:bg-stone-700 flex-1"></div>
      </div>

      <!-- Path B: Advanced Users (Express Entry) -->
      <button
        @click="showSelector = true"
        class="w-full p-5 bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-3xl text-left hover:bg-stone-100 dark:hover:bg-stone-800 transition-all group"
      >
        <span class="block text-brand-text dark:text-stone-300 font-bold text-md mb-1 group-hover:translate-x-1 transition-transform">I already know my Baumann type &rarr;</span>
        <span class="text-xs text-stone-400 dark:text-stone-500">Skip the quiz and select your 4-letter classification directly.</span>
      </button>
    </div>

    <!-- The Extracted Modal Component -->
    <ExpressSkinSelectorModal
      :is-open="showSelector"
      :is-saving="isSaving"
      @close="showSelector = false"
      @confirm="handleExpressConfirm"
    />
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
