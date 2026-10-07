<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useConsent } from '../composables/useConsent'
import { postHealthConsent } from '../api/consentApi'
import { readApiProblem } from '../api/apiProblem'
import { safeNext } from '../router/guard'
import { CONSENT_VERSION_MISSING, consentRefusalMessage } from '../components/Consent/consentMessages'

/**
 * The health information consent (owner-approved ConsentHealth design), asked
 * before the first weekly check-in. Thai law (the PDPA) treats check-ins as
 * sensitive data, which needs explicit consent separate from the terms. The
 * router sends a user without it here from /checkin (router/guard.ts); the
 * real gate is the server, which answers 403 health_consent_required.
 *
 * The version agreed to is the server's current_health_version. Saying no
 * leaves everything else working; withdrawing later is in Settings.
 */

const FACTS = [
  { label: 'What we keep', body: 'The symptoms you pick, how bad they are, where on your skin, your notes, and the weekly report made from them.' },
  { label: 'Who sees it', body: 'You, and Google. To make your report, we send Google Gemini this week and up to four earlier weeks, with your skin type and routine products, but never your name or LINE ID.' },
  { label: 'What Google does with it', body: 'We use the free version of Google Gemini. Google may use what we send to improve its products, and people at Google may read it. Google keeps it for 55 days to check for misuse, and may store it in any country.' },
  { label: 'How long we keep it', body: 'Until you delete your account in Settings.' },
  { label: 'If you say no', body: 'Everything else in SkinBuddy still works. Only the weekly check-in needs this.' },
]

const route = useRoute()
const router = useRouter()
const { ensureConsent, refreshConsent, setConsent } = useConsent()

const agreed = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)

const canAgree = computed(() => agreed.value && !busy.value)

onMounted(() => {
  ensureConsent()
})

const submit = async () => {
  if (!agreed.value || busy.value) return
  error.value = null
  busy.value = true
  try {
    const version = (await ensureConsent())?.current_health_version
    if (!version) {
      error.value = CONSENT_VERSION_MISSING
      return
    }
    const saved = await postHealthConsent(version)
    setConsent(saved)
    await router.replace(safeNext(route.query.next, '/checkin'))
  } catch (caught) {
    const problem = readApiProblem(caught)
    if (problem.code === 'policy_version_changed') {
      agreed.value = false
      await refreshConsent()
    }
    error.value = consentRefusalMessage(problem)
  } finally {
    busy.value = false
  }
}

// Back where the user came from, or to their reports when they arrived here
// directly (a link from outside, a reload).
const notNow = () => {
  if (router.options.history.state.back) router.back()
  else router.push('/analysis')
}
</script>

<template>
  <div class="consent-health min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-200 transition-colors duration-300 motion-reduce:transition-none">
    <main class="w-full max-w-md mx-auto min-h-screen px-5 pt-5 pb-6 flex flex-col gap-4">
      <button type="button" class="health-back min-h-11 w-max inline-flex items-center gap-1.5 text-[15px] font-bold text-stone-600 dark:text-stone-300 hover:text-stone-800 dark:hover:text-white" @click="notNow">
        <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        Back
      </button>

      <!-- The blocks fade up in order as the screen opens (rise-in in style.css). -->
      <span class="rise-in w-[52px] h-[52px] rounded-2xl bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center">
        <svg class="w-[26px] h-[26px] text-amber-800 dark:text-amber-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M12 9v4M12 16h.01" /></svg>
      </span>
      <div class="rise-in flex flex-col gap-2" style="--rise-delay: 50ms">
        <h1 class="m-0 font-serif text-[28px] font-bold leading-tight text-stone-800 dark:text-white">Your check-ins are health information</h1>
        <p class="m-0 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">Thai law treats this as sensitive, so we ask before you start.</p>
      </div>

      <section aria-label="What this consent covers" style="--rise-delay: 100ms" class="health-facts rise-in rounded-[20px] border border-brand-surface-border dark:border-stone-700 bg-brand-surface-light dark:bg-brand-surface-dark p-4 flex flex-col gap-3">
        <div v-for="fact in FACTS" :key="fact.label" class="health-fact flex flex-col gap-0.5">
          <span class="text-[13px] font-extrabold uppercase tracking-[0.08em] text-stone-600 dark:text-stone-300">{{ fact.label }}</span>
          <span class="text-[15px] leading-normal text-stone-800 dark:text-stone-100">{{ fact.body }}</span>
        </div>
      </section>

      <p class="rise-in m-0 text-sm leading-relaxed text-stone-600 dark:text-stone-300" style="--rise-delay: 150ms">
        The weekly report is a guide, not a diagnosis. You can withdraw this consent in Settings at any time. More in the
        <RouterLink to="/privacy" class="privacy-link font-extrabold text-brand-primary-strong dark:text-brand-primary underline-offset-2 hover:underline">Privacy Policy</RouterLink>.
      </p>

      <label class="rise-in min-h-14 flex gap-3 items-center px-3.5 py-3 rounded-[14px] border-2 border-brand-primary-strong dark:border-brand-primary bg-brand-surface-light dark:bg-brand-surface-dark text-[15px] font-bold leading-snug text-stone-800 dark:text-stone-100 cursor-pointer" style="--rise-delay: 200ms">
        <input v-model="agreed" type="checkbox" class="health-check w-[22px] h-[22px] shrink-0 accent-brand-primary-strong dark:accent-brand-primary cursor-pointer" :disabled="busy" />
        I agree that SkinBuddy may keep and analyse my check-ins as described above
      </label>

      <p v-if="error" role="alert" class="health-error m-0 rounded-[14px] px-3.5 py-3 text-sm font-semibold leading-relaxed bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-900">
        {{ error }}
      </p>

      <div class="rise-in mt-auto flex flex-col gap-2" style="--rise-delay: 250ms">
        <button
          type="button"
          class="health-agree min-h-[52px] rounded-2xl text-base font-extrabold transition-colors motion-reduce:transition-none bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white dark:bg-brand-primary dark:hover:bg-brand-primary-hover dark:text-stone-900 disabled:bg-brand-surface-border disabled:text-stone-600 dark:disabled:bg-stone-600 dark:disabled:text-stone-300 disabled:cursor-not-allowed"
          :disabled="!canAgree"
          :aria-busy="busy ? 'true' : undefined"
          @click="submit"
        >
          {{ busy ? 'Saving...' : 'Agree and start my check-in' }}
        </button>
        <button type="button" class="health-not-now min-h-[46px] rounded-[14px] bg-transparent text-[15px] font-bold text-stone-600 dark:text-stone-300 hover:text-stone-800 dark:hover:text-white" @click="notNow">
          Not now
        </button>
      </div>
    </main>
  </div>
</template>
