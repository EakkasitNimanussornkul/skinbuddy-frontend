<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useConsent } from '../composables/useConsent'
import { postTermsConsent } from '../api/consentApi'
import { readApiProblem } from '../api/apiProblem'
import { safeNext } from '../router/guard'
import { CONSENT_VERSION_MISSING, consentRefusalMessage } from '../components/Consent/consentMessages'

/**
 * "Before you start" (owner-approved ConsentWelcome design): agreeing to the
 * terms and confirming the age of 18, recorded on the server. The router sends
 * a signed-in user here from any signed-in page until both are recorded
 * (router/guard.ts), carrying where they were going in `next`.
 *
 * The version agreed to is the one the server asks for (consent
 * current_terms_version), never one written here, so a policy change on the
 * backend re-prompts everyone without a frontend change. The two ticks are
 * separate: an age confirmation is not an agreement, and neither is implied.
 */

const POINTS = [
  { title: 'Your LINE name and picture', body: 'Copied from LINE when you sign in and kept until you delete your account. Never your email or phone number.' },
  { title: 'Your skin type, shelf and routine', body: 'So the app can remember them for you.' },
  { title: 'Questions to SkinBuddy AI', body: 'Sent to Google Gemini with your skin type and shelf product names, never your name. Google may use them to improve its products, and people at Google may read them. Not stored on our server.' },
  { title: 'Weekly skin check-ins', body: 'Only if you choose to use them. We ask you separately first.' },
]

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { ensureConsent, refreshConsent, setConsent } = useConsent()

const ageConfirmed = ref(false)
const termsAgreed = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)

const canContinue = computed(() => ageConfirmed.value && termsAgreed.value && !busy.value)

onMounted(() => {
  ensureConsent()
})

const submit = async () => {
  if (!ageConfirmed.value || !termsAgreed.value || busy.value) return
  error.value = null
  busy.value = true
  try {
    const version = (await ensureConsent())?.current_terms_version
    if (!version) {
      error.value = CONSENT_VERSION_MISSING
      return
    }
    const saved = await postTermsConsent(version, true)
    setConsent(saved)
    await router.replace(safeNext(route.query.next))
  } catch (caught) {
    const problem = readApiProblem(caught)
    // The terms changed while this page was open: read the new version, and
    // ask for both ticks again, since they were given to the old one.
    if (problem.code === 'policy_version_changed') {
      ageConfirmed.value = false
      termsAgreed.value = false
      await refreshConsent()
    }
    error.value = consentRefusalMessage(problem)
  } finally {
    busy.value = false
  }
}

const signOut = () => {
  authStore.logout()
  router.push('/explore')
}

const checkboxRow = 'min-h-[52px] flex gap-3 items-center px-3.5 py-2.5 rounded-[14px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-[15px] font-bold text-stone-800 dark:text-stone-100 cursor-pointer'
const checkbox = 'w-[22px] h-[22px] shrink-0 accent-brand-primary-strong dark:accent-brand-primary cursor-pointer'
const policyLink = 'font-extrabold text-brand-primary-strong dark:text-brand-primary underline-offset-2 hover:underline'
</script>

<template>
  <div class="consent-welcome min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-200 transition-colors duration-300 motion-reduce:transition-none">
    <main class="w-full max-w-md mx-auto min-h-screen px-5 pt-7 pb-6 flex flex-col gap-[18px]">
      <img src="/images/jelly.png" alt="" class="w-16 h-16 object-contain" />
      <div class="flex flex-col gap-2">
        <h1 class="m-0 font-serif text-[30px] font-bold text-stone-800 dark:text-white">Before you start</h1>
        <p class="m-0 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">SkinBuddy is a student project. Here's what it keeps when you use it.</p>
      </div>

      <ul class="welcome-points list-none m-0 p-0 flex flex-col gap-2.5">
        <li v-for="point in POINTS" :key="point.title" class="flex gap-3 items-start rounded-2xl border border-brand-surface-border dark:border-stone-700 bg-brand-surface-light dark:bg-brand-surface-dark px-3.5 py-3">
          <span class="w-8 h-8 shrink-0 rounded-[10px] bg-brand-primary-light dark:bg-brand-primary/15 flex items-center justify-center">
            <svg class="w-4 h-4 text-brand-primary-strong dark:text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
          </span>
          <span class="flex flex-col gap-0.5">
            <span class="text-[15px] font-extrabold text-stone-800 dark:text-stone-100">{{ point.title }}</span>
            <span class="text-sm leading-normal text-stone-600 dark:text-stone-300">{{ point.body }}</span>
          </span>
        </li>
      </ul>

      <p class="m-0 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
        SkinBuddy gives guidance, not medical advice. Read the full
        <RouterLink to="/privacy" :class="['privacy-link', policyLink]">Privacy Policy</RouterLink>
        and
        <RouterLink to="/terms" :class="['terms-link', policyLink]">Terms of Service</RouterLink>.
      </p>

      <fieldset class="border-0 m-0 p-0 flex flex-col gap-2.5">
        <legend class="sr-only">Confirm to continue</legend>
        <label :class="checkboxRow">
          <input v-model="ageConfirmed" type="checkbox" class="age-check" :class="checkbox" :disabled="busy" />
          I'm 18 or older
        </label>
        <label :class="checkboxRow">
          <input v-model="termsAgreed" type="checkbox" class="terms-check" :class="checkbox" :disabled="busy" />
          I agree to the Terms of Service and Privacy Policy
        </label>
      </fieldset>

      <p v-if="error" role="alert" class="welcome-error m-0 rounded-[14px] px-3.5 py-3 text-sm font-semibold leading-relaxed bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-900">
        {{ error }}
      </p>

      <div class="mt-auto flex flex-col gap-2">
        <button
          type="button"
          class="welcome-continue min-h-[52px] rounded-2xl text-base font-extrabold transition-colors motion-reduce:transition-none bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white dark:bg-brand-primary dark:hover:bg-brand-primary-hover dark:text-stone-900 disabled:bg-brand-surface-border disabled:text-stone-600 dark:disabled:bg-stone-600 dark:disabled:text-stone-300 disabled:cursor-not-allowed"
          :disabled="!canContinue"
          :aria-busy="busy ? 'true' : undefined"
          @click="submit"
        >
          {{ busy ? 'Saving...' : 'Continue' }}
        </button>
        <button type="button" class="welcome-sign-out min-h-[46px] rounded-[14px] bg-transparent text-[15px] font-bold text-stone-600 dark:text-stone-300 hover:text-stone-800 dark:hover:text-white" @click="signOut">
          Not now, sign me out
        </button>
      </div>
    </main>
  </div>
</template>
