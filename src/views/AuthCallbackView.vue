<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '../api'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const errorMessage = ref('')

onMounted(async () => {
  const code = route.query.code as string
  if (code) {
    try {
      const response = await apiClient.post('/auth/line', { code })
      const data = response.data
      if (data.access_token) {
        authStore.setAuth(data.access_token, data.user)
        if (!data.user.skin_type) {
          router.push('/setup-profile')
        } else {
          // Returning user -> always land on Home view first
          router.push('/')
        }
      }
    } catch (error) {
      console.error('Authentication failed:', error)
      errorMessage.value = 'Failed to log in. Please try again.'
      setTimeout(() => router.push('/'), 3000)
    }
  } else {
    router.push({ path: '/error', query: { message: 'Failed to log in. Please try again.' } })
  }
})
</script>

<template>
  <div
    class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-brand-bg-light dark:bg-brand-bg-dark transition-colors duration-300">

    <template v-if="!errorMessage">

      <div class="mb-8">
        <img src="/images/jelly.png" alt="Loading" class="w-28 h-28 jellyfish-bounce" />
      </div>

      <p class="font-serif text-2xl font-bold text-brand-text dark:text-stone-100 tracking-tight mb-2">
        SkinBuddy
      </p>

      <div class="flex items-center gap-2.5 mt-4">
        <svg class="w-4 h-4 text-brand-primary dark:text-orange-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <span
          class="text-xs font-bold tracking-widest uppercase text-brand-text-muted dark:text-stone-400 animate-pulse">
          Authenticating
        </span>
      </div>

      <div class="mt-8 w-16 h-px bg-brand-primary/30 dark:bg-orange-400/20 rounded-full" />
    </template>

    <template v-else>
      <div
        class="mb-8 w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center border border-red-200 dark:border-red-800">
        <svg class="w-10 h-10 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>

      <p class="font-serif text-2xl font-bold text-brand-text dark:text-stone-100 mb-2">
        Login Failed
      </p>
      <p class="text-sm text-brand-text-muted dark:text-stone-400 max-w-[240px] text-center leading-relaxed mb-6">
        {{ errorMessage }}
      </p>

      <div class="flex items-center gap-2 text-xs text-brand-text-muted dark:text-stone-500">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Redirecting you shortly…</span>
      </div>
    </template>

  </div>
</template>

<style scoped>
.jellyfish-bounce {
  animation: gentleBounce 2s infinite ease-in-out;
}

@keyframes gentleBounce {
  0%,
  100% {
    transform: translateY(-5%);
  }
  50% {
    transform: translateY(5%);
  }
}
</style>
