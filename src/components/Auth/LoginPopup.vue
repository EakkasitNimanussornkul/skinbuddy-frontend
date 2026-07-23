<script setup lang="ts">
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

const handleLineLogin = () => {
  authStore.loginWithLine()
}

const closePopup = () => {
  authStore.showLoginPopup = false
}
</script>

<template>
  <Transition name="popup">
    <div
      v-if="authStore.showLoginPopup"
      class="fixed inset-0 bg-stone-900/60 backdrop-blur-md flex justify-center items-center z-[9999] p-4"
      @click.self="closePopup"
    >
      <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] p-8 text-center max-w-sm w-full shadow-2xl border border-brand-surface-border dark:border-stone-800 transition-colors duration-300 relative animate-slide-up">

        <!-- Close Button -->
        <button
          @click="closePopup"
          class="absolute top-5 right-5 w-8 h-8 rounded-full bg-brand-bg-light dark:bg-stone-800 flex items-center justify-center text-brand-text-muted hover:text-brand-primary transition-colors border border-brand-surface-border dark:border-stone-700 cursor-pointer"
        >
          <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <!-- Mascot Logo -->
        <div class="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <img src="/images/jelly.png" alt="SkinBuddy" class="w-full h-full object-contain drop-shadow-md" />
        </div>

        <!-- Heading -->
        <h2 class="font-serif text-2xl font-bold text-brand-text dark:text-stone-100 mb-2 leading-snug">
          Sign in to SkinBuddy
        </h2>

        <!-- Context-Aware Dynamic Subtitle -->
        <p class="text-xs text-brand-text-muted dark:text-stone-400 mb-6 leading-relaxed max-w-[260px] mx-auto font-medium">
          {{ authStore.popupReason }}
        </p>

        <!-- Divider -->
        <div class="flex items-center gap-3 mb-6">
          <div class="flex-1 h-px bg-brand-surface-border dark:bg-stone-800" />
          <span class="text-[10px] font-bold tracking-widest uppercase text-brand-text-muted">Continue with</span>
          <div class="flex-1 h-px bg-brand-surface-border dark:bg-stone-800" />
        </div>

        <!-- LINE Login Button -->
        <button
          @click="handleLineLogin"
          class="w-full flex items-center justify-center gap-3 bg-[#06C755] hover:bg-[#05b34c] active:scale-[0.98] text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md cursor-pointer"
        >
          <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.952 12.356c0-4.313-4.324-7.821-9.638-7.821S.676 8.043.676 12.356c0 3.866 3.428 7.104 8.058 7.716.314.068.741.207.849.476.097.244.063.626.031.874l-.137.822c-.042.244-.194.954.836.52 1.03-.435 5.559-3.275 7.586-5.606 1.399-1.534 2.053-3.09 2.053-4.802z" />
          </svg>
          Log in with LINE
        </button>

        <!-- Terms Footer -->
        <p class="mt-6 text-[10px] text-brand-text-muted leading-relaxed">
          By continuing you agree to our <span class="underline cursor-pointer hover:text-brand-primary transition-colors">Terms</span> & <span class="underline cursor-pointer hover:text-brand-primary transition-colors">Privacy Policy</span>.
        </p>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.popup-enter-active, .popup-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.popup-enter-from, .popup-leave-to { opacity: 0; transform: scale(0.95); }
</style>
