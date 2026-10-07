<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/themeStore'
import { useToast } from '../composables/useToast'
import { useConsent } from '../composables/useConsent'
import { useAdmin } from '../composables/useAdmin'
import { updateUserSkinType } from '../api/authApi'
import { withdrawHealthConsent } from '../api/consentApi'
import { readApiProblem } from '../api/apiProblem'
import { formatDay } from '../api/dates'
import { DELETION_UNAVAILABLE, startAccountDeletion } from '../api/accountDeletion'
import { consentRefusalMessage } from '../components/Consent/consentMessages'
import ExpressSkinSelectorModal from '../components/Quiz/ExpressSkinSelectorModal.vue'
import AlertDialog from '../components/Shared/AlertDialog.vue'

/**
 * Settings (feat/24, owner-approved layout): one responsive page of cards in
 * place of the old desktop tabs and the separate phone markup. Two columns
 * where there is room (each 380px or more), so beside the sidebar at 1024 it
 * is one. Links that went nowhere (Help Center) and the Language row are gone;
 * Notifications says plainly that it is not available.
 *
 * feat/25 adds the Privacy card (the weekly check-in consent with Withdraw,
 * and the Privacy Policy and Terms, which now exist) and Delete account, both
 * from the owner-approved ConsentSettings and AccountDelete designs. The
 * privacy links sit in the Privacy card, as the design has them, so Help
 * keeps its name.
 */

const themeStore = useThemeStore()
const authStore = useAuthStore()
const router = useRouter()
const { addToast } = useToast()
const { consent, ensureConsent, setConsent } = useConsent()
const { isAdmin, ensureRole } = useAdmin()

onMounted(() => {
  ensureConsent()
  ensureRole()
})

const APP_VERSION = '0.1.2'

const showSelector = ref(false)
const isSaving = ref(false)

const skinType = computed(() => authStore.user?.skin_type || null)

const handleLogout = () => {
  authStore.logout()
  router.push('/explore')
}

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
    console.error("Settings Update Error:", error)
    addToast('Failed to update skin profile. Please try again.', 'error')
  } finally {
    isSaving.value = false
  }
}

// --- Privacy: the weekly check-in consent -------------------------------------
// Given while it has a date and has not been withdrawn. Withdrawing deletes
// nothing: the check-ins already sent stay until the account is deleted.
const healthGiven = computed(() => !!consent.value?.health_consent_at && !consent.value?.health_consent_withdrawn_at)
const healthStatus = computed(() => {
  if (!healthGiven.value) return 'Not given'
  const day = formatDay(consent.value?.health_consent_at ?? null)
  return day ? `Given on ${day}` : 'Given'
})

const showWithdraw = ref(false)
const withdrawing = ref(false)
const withdrawError = ref<string | null>(null)
const giveConsentLink = ref<{ $el: HTMLElement } | null>(null)

const openWithdraw = () => {
  withdrawError.value = null
  showWithdraw.value = true
}

const confirmWithdraw = async () => {
  withdrawing.value = true
  withdrawError.value = null
  try {
    setConsent(await withdrawHealthConsent())
    showWithdraw.value = false
    addToast('Weekly check-in consent withdrawn.', 'success')
    // The Withdraw button that opened the dialog is gone; focus the link that
    // replaced it.
    await nextTick()
    giveConsentLink.value?.$el.focus()
  } catch (error) {
    withdrawError.value = consentRefusalMessage(readApiProblem(error))
  } finally {
    withdrawing.value = false
  }
}

// --- Delete account ------------------------------------------------------------
// The backend refuses an admin (409 admin_account) before calling LINE; the
// button is off for one here so they are not sent through LINE for nothing.
const showDelete = ref(false)
const understood = ref(false)
const deleteError = ref<string | null>(null)

const openDelete = () => {
  if (isAdmin.value) return
  understood.value = false
  deleteError.value = null
  showDelete.value = true
}

const confirmDelete = () => {
  if (!understood.value || isAdmin.value) return
  deleteError.value = null
  if (!startAccountDeletion()) deleteError.value = DELETION_UNAVAILABLE
}

const cardClass ='bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 rounded-[22px] lg:rounded-3xl'
const headingClass = 'm-0 text-xs lg:text-[13px] font-extrabold uppercase tracking-[0.1em] text-stone-600 dark:text-stone-300'
const rowLinkClass = 'min-h-14 flex items-center gap-3 text-[15px] font-bold text-stone-800 dark:text-stone-100 hover:text-brand-primary-strong dark:hover:text-brand-primary-accent transition-colors'
</script>

<template>
  <div class="settings-page min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-200 pb-32 lg:pb-12 transition-colors duration-300">
    <main class="w-full max-w-[1040px] px-4 pt-5 sm:px-7 lg:pt-8 flex flex-col gap-4 lg:gap-[22px]">
      <!-- The cards fade up in reading order as the page opens, 40ms apart
           (rise-in in style.css). -->
      <h1 class="rise-in m-0 font-serif text-[30px] lg:text-4xl font-bold text-stone-800 dark:text-white">Settings</h1>

      <!-- Each column grows from 380px and wraps, so two sit side by side only
           where both fit. -->
      <div class="flex flex-wrap items-start gap-4 lg:gap-[22px]">
        <div class="flex-[1_1_380px] min-w-0 flex flex-col gap-4 lg:gap-[22px]">

          <section aria-labelledby="settings-account" style="--rise-delay: 40ms" :class="['settings-account rise-in p-[18px] lg:p-[22px] flex flex-col gap-3 lg:gap-4', cardClass]">
            <h2 id="settings-account" :class="headingClass">Account</h2>
            <div class="flex items-center gap-3.5 lg:gap-4">
              <span class="w-14 h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden shrink-0 bg-brand-surface-border dark:bg-stone-600 flex items-center justify-center">
                <img v-if="authStore.user?.picture" :src="authStore.user.picture" alt="" class="w-full h-full object-cover" />
                <svg v-else class="w-7 h-7 text-stone-600 dark:text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0114 0" /></svg>
              </span>
              <span class="flex flex-col gap-1.5 min-w-0">
                <span class="account-name font-serif text-xl lg:text-[22px] font-bold text-stone-800 dark:text-stone-100 break-words">{{ authStore.user?.name || 'Guest User' }}</span>
                <!-- LINE's own green is too light for text on its tint; these
                     greens keep the badge above 4.5:1 in both themes. -->
                <span class="line-badge inline-flex items-center gap-1.5 w-max px-2.5 py-0.5 rounded-lg bg-[#E6F7EC] text-[#0B7A3B] dark:bg-[#1C3A27] dark:text-[#7EE2A8] text-xs font-extrabold">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 10.304c0-5.369-5.383-9.738-12-9.738S0 4.935 0 10.304c0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.12.298.077.763.036 1.066l-.167 1.011c-.053.33-.243 1.189 1.042.646 1.284-.543 6.924-4.053 9.422-6.953A9.123 9.123 0 0024 10.304z" /></svg>
                  Signed in with LINE
                </span>
              </span>
            </div>
            <!-- On a phone Log out sits at the foot of the page instead. -->
            <button type="button" class="logout-desktop hidden lg:flex min-h-[46px] items-center justify-center rounded-[14px] border border-red-200 dark:border-red-900 bg-transparent text-red-700 dark:text-red-300 text-[15px] font-extrabold hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" @click="handleLogout">
              Log out
            </button>
          </section>

          <section aria-labelledby="settings-skin" style="--rise-delay: 80ms" :class="['settings-skin rise-in p-[18px] lg:p-[22px] flex flex-col gap-3 lg:gap-3.5', cardClass]">
            <h2 id="settings-skin" :class="headingClass">Your skin type</h2>
            <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span v-if="skinType" class="skin-type font-serif text-[30px] lg:text-[34px] font-bold text-stone-800 dark:text-white">{{ skinType }}</span>
              <span v-else class="skin-type font-serif text-2xl font-bold text-stone-800 dark:text-white">Not set yet</span>
              <RouterLink to="/profile" class="skin-profile-link min-h-11 inline-flex items-center gap-1 text-sm font-extrabold text-brand-primary-strong dark:text-brand-primary hover:underline">
                See your skin profile
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
              </RouterLink>
            </div>
            <p class="skin-note m-0 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              {{ skinType ? "From your skin quiz. It's a guide to what may suit you, not a diagnosis." : 'Take the skin quiz to find your type.' }}
            </p>
            <div class="flex flex-wrap gap-2.5">
              <button type="button" class="choose-type flex-[1_1_160px] min-h-12 rounded-[14px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-stone-800 dark:text-stone-100 text-[15px] font-extrabold hover:border-brand-primary-strong dark:hover:border-brand-primary transition-colors" @click="showSelector = true">
                Choose my type
              </button>
              <RouterLink to="/quiz" class="take-quiz flex-[1_1_160px] min-h-12 rounded-[14px] flex items-center justify-center bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white dark:bg-brand-primary dark:hover:bg-brand-primary-hover dark:text-stone-900 text-[15px] font-extrabold transition-colors">
                {{ skinType ? 'Retake the quiz' : 'Take the quiz' }}
              </RouterLink>
            </div>
            <RouterLink to="/routine" :class="['routine-link mt-0.5 px-1 border-t border-brand-surface-border dark:border-stone-700', rowLinkClass]">
              <svg class="w-5 h-5 shrink-0 text-stone-600 dark:text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
              Routine history
              <svg class="ml-auto w-4 h-4 shrink-0 text-stone-600 dark:text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
            </RouterLink>
          </section>

          <section aria-labelledby="settings-privacy" style="--rise-delay: 120ms" :class="['settings-privacy rise-in px-[18px] py-1.5 lg:px-[22px] lg:py-2 flex flex-col', cardClass]">
            <h2 id="settings-privacy" :class="[headingClass, 'mt-3 mb-1 lg:mt-3.5 lg:mb-1.5']">Privacy</h2>
            <!-- Given and Not given cross-fade: the old and new state share one
                 grid cell while they swap, so nothing jumps, and the new one is
                 in place at once for focus to move to. -->
            <div class="health-consent-row min-h-[72px] flex items-center gap-3 border-b border-brand-surface-border dark:border-stone-700">
              <span class="flex-grow flex flex-col gap-0.5">
                <span class="text-[15px] font-bold text-stone-800 dark:text-stone-100">Weekly check-in consent</span>
                <span class="consent-status-cell grid">
                  <Transition name="swap-fade">
                    <span :key="healthStatus" class="consent-status [grid-area:1/1] text-[13px] text-stone-600 dark:text-stone-300">{{ healthStatus }}</span>
                  </Transition>
                </span>
              </span>
              <span class="consent-action-cell grid shrink-0 justify-items-end">
                <Transition name="swap-fade">
                  <button
                    v-if="healthGiven"
                    type="button"
                    class="withdraw-consent [grid-area:1/1] min-h-11 px-3.5 rounded-xl border border-red-200 dark:border-red-900 bg-transparent text-red-700 dark:text-red-300 text-sm font-extrabold hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    @click="openWithdraw"
                  >
                    Withdraw
                  </button>
                  <RouterLink
                    v-else
                    ref="giveConsentLink"
                    :to="{ path: '/consent/health', query: { next: '/settings' } }"
                    class="give-consent [grid-area:1/1] min-h-11 px-3.5 rounded-xl inline-flex items-center border border-brand-primary-strong dark:border-brand-primary text-brand-primary-strong dark:text-brand-primary text-sm font-extrabold hover:bg-brand-primary-light dark:hover:bg-brand-primary/15 transition-colors"
                  >
                    Give consent
                  </RouterLink>
                </Transition>
              </span>
            </div>
            <RouterLink to="/privacy" :class="['privacy-link border-b border-brand-surface-border dark:border-stone-700', rowLinkClass]">
              Privacy Policy
              <svg class="ml-auto w-4 h-4 shrink-0 text-stone-600 dark:text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
            </RouterLink>
            <RouterLink to="/terms" :class="['terms-link', rowLinkClass]">
              Terms of Service
              <svg class="ml-auto w-4 h-4 shrink-0 text-stone-600 dark:text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
            </RouterLink>
          </section>
        </div>

        <div class="flex-[1_1_380px] min-w-0 flex flex-col gap-4 lg:gap-[22px]">
          <section aria-labelledby="settings-prefs" style="--rise-delay: 160ms" :class="['settings-prefs rise-in px-[18px] py-1.5 lg:px-[22px] lg:py-2 flex flex-col', cardClass]">
            <h2 id="settings-prefs" :class="[headingClass, 'mt-3 mb-1 lg:mt-3.5 lg:mb-1.5']">Preferences</h2>
            <div class="min-h-[60px] flex items-center gap-3 border-b border-brand-surface-border dark:border-stone-700">
              <svg class="w-5 h-5 shrink-0 text-stone-600 dark:text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 13A9 9 0 1111 3a7 7 0 0010 10z" /></svg>
              <span id="settings-dark-label" class="flex-grow text-[15px] font-bold text-stone-800 dark:text-stone-100">Dark mode</span>
              <!-- A 44px target around the 32px track. -->
              <button
                type="button"
                role="switch"
                class="dark-switch h-11 w-[60px] shrink-0 flex items-center justify-center rounded-full"
                :aria-checked="themeStore.isDark ? 'true' : 'false'"
                aria-labelledby="settings-dark-label"
                @click="themeStore.toggleTheme"
              >
                <span :class="['w-[52px] h-8 rounded-full p-[3px] flex transition-colors motion-reduce:transition-none', themeStore.isDark ? 'bg-brand-primary-strong' : 'bg-stone-500']">
                  <span :class="['w-[26px] h-[26px] rounded-full bg-white shadow transition-transform duration-200 motion-reduce:transition-none', themeStore.isDark ? 'translate-x-5' : 'translate-x-0']"></span>
                </span>
              </button>
            </div>
            <!-- Plain text: the old toggle here saved nothing. -->
            <div class="notifications-row min-h-[60px] flex items-center gap-3">
              <svg class="w-5 h-5 shrink-0 text-stone-600 dark:text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" /></svg>
              <span class="flex-grow flex flex-col">
                <span class="text-[15px] font-bold text-stone-800 dark:text-stone-100">Notifications</span>
                <span class="text-[13px] text-stone-600 dark:text-stone-300">Not available yet</span>
              </span>
            </div>
          </section>

          <!-- Phones only: on lg the sidebar carries these two links. -->
          <section aria-labelledby="settings-send" style="--rise-delay: 200ms" :class="['settings-send rise-in lg:hidden px-[18px] py-1.5 flex flex-col', cardClass]">
            <h2 id="settings-send" :class="[headingClass, 'mt-3 mb-1']">Products you send</h2>
            <RouterLink to="/submissions" :class="['my-submissions-link border-b border-brand-surface-border dark:border-stone-700', rowLinkClass]">
              My submissions
              <svg class="ml-auto w-4 h-4 shrink-0 text-stone-600 dark:text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
            </RouterLink>
            <RouterLink to="/submissions/new" class="submit-product-link min-h-14 flex items-center gap-3 text-[15px] font-extrabold text-brand-primary-strong dark:text-brand-primary hover:underline">
              Submit a product
              <svg class="ml-auto w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </RouterLink>
          </section>

          <!-- "Help and legal" once the privacy and terms pages exist. -->
          <section aria-labelledby="settings-help" style="--rise-delay: 240ms" :class="['settings-help rise-in px-[18px] py-1.5 lg:px-[22px] lg:py-2 flex flex-col', cardClass]">
            <h2 id="settings-help" :class="[headingClass, 'mt-3 mb-1 lg:mt-3.5 lg:mb-1.5']">Help</h2>
            <RouterLink to="/how-match-works" :class="['match-link border-b border-brand-surface-border dark:border-stone-700', rowLinkClass]">
              How % Match works
              <svg class="ml-auto w-4 h-4 shrink-0 text-stone-600 dark:text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
            </RouterLink>
            <div class="app-version min-h-14 flex items-center text-[15px] font-bold text-stone-800 dark:text-stone-100">
              SkinBuddy version
              <span class="ml-auto text-sm text-stone-600 dark:text-stone-300">{{ APP_VERSION }}</span>
            </div>
          </section>

          <section aria-labelledby="settings-delete" style="--rise-delay: 280ms" class="settings-delete rise-in p-[18px] lg:p-[22px] flex flex-col gap-2.5 bg-brand-surface-light dark:bg-brand-surface-dark border border-red-200 dark:border-red-900 rounded-[22px] lg:rounded-3xl">
            <h2 id="settings-delete" class="m-0 text-xs lg:text-[13px] font-extrabold uppercase tracking-[0.1em] text-red-700 dark:text-red-300">Delete account</h2>
            <p class="m-0 text-sm leading-relaxed text-stone-600 dark:text-stone-300">Removes your SkinBuddy account and everything in it, and ends the link with your LINE account.</p>
            <button
              type="button"
              class="delete-account min-h-12 rounded-[14px] border border-red-200 dark:border-red-900 bg-transparent text-red-700 dark:text-red-300 text-[15px] font-extrabold hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              :disabled="isAdmin"
              :aria-describedby="isAdmin ? 'settings-delete-admin' : undefined"
              @click="openDelete"
            >
              Delete my account
            </button>
            <p v-if="isAdmin" id="settings-delete-admin" class="admin-delete-note m-0 text-[13px] text-stone-600 dark:text-stone-300">Admin accounts can't be deleted here.</p>
          </section>
        </div>
      </div>

      <button type="button" style="--rise-delay: 320ms" class="logout-phone rise-in lg:hidden min-h-[52px] rounded-2xl border border-red-200 dark:border-red-900 bg-transparent text-red-700 dark:text-red-300 text-[15px] font-extrabold hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" @click="handleLogout">
        Log out
      </button>
    </main>

    <ExpressSkinSelectorModal
      :is-open="showSelector"
      :is-saving="isSaving"
      @close="showSelector = false"
      @confirm="handleExpressConfirm"
    />

    <AlertDialog
      :open="showWithdraw"
      title="Withdraw your consent?"
      cancel-label="Keep it"
      confirm-label="Withdraw"
      :busy="withdrawing"
      @cancel="showWithdraw = false"
      @confirm="confirmWithdraw"
    >
      <p class="withdraw-body m-0 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">You won't be able to add new weekly check-ins until you agree again. The check-ins you already sent stay saved until you delete your account.</p>
      <template #extra>
        <p v-if="withdrawError" role="alert" class="withdraw-error m-0 rounded-[14px] px-3.5 py-3 text-sm font-semibold bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-900">{{ withdrawError }}</p>
      </template>
    </AlertDialog>

    <AlertDialog
      :open="showDelete"
      title="Delete your account?"
      cancel-label="Keep my account"
      confirm-label="Delete my account"
      :confirm-disabled="!understood || isAdmin"
      @cancel="showDelete = false"
      @confirm="confirmDelete"
    >
      <div class="flex flex-col gap-1">
        <span class="text-[13px] font-extrabold uppercase tracking-[0.08em] text-stone-600 dark:text-stone-300">Deleted for good</span>
        <ul class="delete-list m-0 pl-[18px] list-disc text-[15px] leading-relaxed text-stone-800 dark:text-stone-100">
          <li>Your LINE name, picture and LINE ID</li>
          <li>Your skin type and quiz results</li>
          <li>Your shelf, routines and routine history</li>
          <li>Your weekly check-ins and reports</li>
          <li>Every product you sent, and its photo unless a product in the catalogue shows it</li>
        </ul>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-[13px] font-extrabold uppercase tracking-[0.08em] text-stone-600 dark:text-stone-300">Stays</span>
        <p class="m-0 text-[15px] leading-relaxed text-stone-800 dark:text-stone-100">Products that were added to the catalogue stay, with no name or note from you.</p>
      </div>
      <p class="m-0 text-sm leading-relaxed text-stone-600 dark:text-stone-300">Next, LINE will ask you to confirm it's you. LY Corporation will then be told, and the link between SkinBuddy and your LINE account will end. This can't be undone; if you sign in again later, you'll start with a new, empty account.</p>
      <template #extra>
        <label class="min-h-[52px] flex gap-3 items-center px-3.5 py-2.5 rounded-[14px] border border-brand-surface-border dark:border-stone-600 text-[15px] font-bold text-stone-800 dark:text-stone-100 cursor-pointer">
          <input v-model="understood" type="checkbox" class="delete-understood w-[22px] h-[22px] shrink-0 accent-[#B3261E] cursor-pointer" />
          I understand this can't be undone
        </label>
        <p v-if="deleteError" role="alert" class="delete-error m-0 rounded-[14px] px-3.5 py-3 text-sm font-semibold bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-900">{{ deleteError }}</p>
      </template>
    </AlertDialog>
  </div>
</template>
