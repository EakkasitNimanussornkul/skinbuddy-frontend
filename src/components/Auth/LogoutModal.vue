<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const countdown = ref(3)
let timer: ReturnType<typeof setInterval> | null = null

const handleConfirmLogoutClose = () => {
  stopCountdown()
  authStore.showLogoutPopup = false
  router.push('/')
}

const startCountdown = () => {
  countdown.value = 3
  stopCountdown() // Clear any existing interval

  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      handleConfirmLogoutClose()
    }
  }, 1000)
}

const stopCountdown = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

// Watch for when the modal becomes visible to start the timer
watch(
  () => authStore.showLogoutPopup,
  (isOpen) => {
    if (isOpen) {
      startCountdown()
    } else {
      stopCountdown()
    }
  }
)

onUnmounted(() => {
  stopCountdown()
})
</script>

<template>
  <Transition name="popup">
    <div
      v-if="authStore.showLogoutPopup"
      class="fixed inset-0 bg-stone-900/60 backdrop-blur-md flex justify-center items-center z-[9999] p-4"
    >
      <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] p-8 text-center max-w-sm w-full shadow-2xl border border-brand-surface-border dark:border-stone-800 transition-colors duration-300 space-y-5 animate-slide-up">

        <!-- Clean SVG Checkmark Icon (0 Emojis) -->
        <div class="w-16 h-16 mx-auto flex items-center justify-center bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full border border-emerald-500/20 text-emerald-500">
          <svg class="w-8 h-8 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h2 class="font-serif text-2xl font-bold text-brand-text dark:text-stone-100">
            You've successfully logged out!
          </h2>
          <p class="text-xs text-brand-text-muted dark:text-stone-400 mt-2 leading-relaxed">
            Your session has been safely closed. Redirecting to home page in
            <span class="font-bold text-brand-primary font-mono text-sm">{{ countdown }}</span> seconds...
          </p>
        </div>

        <button
          @click="handleConfirmLogoutClose"
          class="w-full py-3.5 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs rounded-2xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          Return to Home Page Now ({{ countdown }}s)
        </button>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.popup-enter-active, .popup-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.popup-enter-from, .popup-leave-to { opacity: 0; transform: scale(0.95); }
</style>
