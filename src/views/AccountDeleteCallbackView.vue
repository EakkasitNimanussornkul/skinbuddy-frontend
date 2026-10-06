<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { completeAccountDeletion, deletionFailureMessage } from '../api/accountDeletion'

/**
 * Where LINE sends the user back after confirming an account deletion
 * (/account/delete/callback). The code goes to the backend once, and only when
 * the state matches the one this browser stored within the last 10 minutes
 * (api/accountDeletion.ts); otherwise nothing is sent and nothing is deleted.
 *
 * On success the session ends and the public /account/deleted page says what
 * happened, including whether the user still has to remove SkinBuddy in LINE.
 */

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

type Shown = 'working' | 'not-sent' | 'failed'
const shown = ref<Shown>('working')
const message = ref('')

onMounted(async () => {
  const outcome = await completeAccountDeletion({
    code: route.query.code,
    state: route.query.state,
    error: route.query.error,
  })

  if (outcome.kind === 'deleted') {
    authStore.logout()
    await router.replace({ path: '/account/deleted', query: { line: outcome.lineDeauthorized ? '1' : '0' } })
    return
  }
  if (outcome.kind === 'not-sent') {
    shown.value = 'not-sent'
    message.value =
      outcome.reason === 'line-error'
        ? "LINE didn't confirm it was you, so nothing was sent to SkinBuddy."
        : "This confirmation from LINE was missing, didn't match, or was more than 10 minutes old, so nothing was sent to SkinBuddy."
    return
  }
  shown.value = 'failed'
  message.value = deletionFailureMessage(outcome.problem)
})
</script>

<template>
  <div class="delete-callback min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-200 transition-colors duration-300 motion-reduce:transition-none">
    <main class="w-full max-w-md mx-auto min-h-screen px-5 pt-10 pb-6 flex flex-col gap-4">
      <template v-if="shown === 'working'">
        <h1 class="m-0 font-serif text-[28px] font-bold text-stone-800 dark:text-white">Deleting your account</h1>
        <p role="status" class="delete-working m-0 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">Please keep this page open. This takes a few seconds.</p>
      </template>

      <template v-else>
        <span class="w-[52px] h-[52px] rounded-2xl bg-red-50 dark:bg-red-900/40 flex items-center justify-center">
          <svg class="w-[26px] h-[26px] text-red-700 dark:text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
        </span>
        <h1 class="delete-heading m-0 font-serif text-[28px] font-bold text-stone-800 dark:text-white">
          {{ shown === 'not-sent' ? 'Nothing was deleted' : "Your account wasn't deleted" }}
        </h1>
        <p role="alert" class="delete-message m-0 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">{{ message }}</p>
        <RouterLink
          to="/settings"
          class="delete-back min-h-[52px] rounded-2xl flex items-center justify-center bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white dark:bg-brand-primary dark:hover:bg-brand-primary-hover dark:text-stone-900 text-base font-extrabold transition-colors motion-reduce:transition-none"
        >
          Back to Settings
        </RouterLink>
      </template>
    </main>
  </div>
</template>
