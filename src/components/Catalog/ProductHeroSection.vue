<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { addToShelf, analyzeProduct } from '../../api/shelfapi'
import {
  describeMatchAvailability,
  MATCH_SCORE_BASIS,
  MATCH_METHOD_PATH,
  MATCH_SCORE_DISCLAIMER,
  NOT_ENOUGH_INFO,
  describeLimitedMatch,
  describeMatchWorking,
  describeNotEnoughToScore,
  describeVerifiedCount,
  describeNothingToScore,
  describeWholeMatch,
  displayMatchPercent,
  readMatchBreakdown,
  resolveMatchAvailability,
  resolveMatchBand,
} from '../../api/products'
import { toLocalDateString } from '../../api/dates'
import {
  resolveSafety,
  showsDuplicates,
  type DuplicateMatch,
  type SafetyOutcome,
  type SafetyStatus,
} from '../../api/safety'
import { useToast } from '../../composables/useToast'
import { useAuthStore } from '../../stores/auth'
import { readProductSourceUrl } from '../../api/sources'
import SafetyCheckModal from '../Shared/SafetyCheckModal.vue'
import SafetyWarningModal from '../Shelf/SafetyWarningModal.vue'

const props = defineProps<{
  product: any
  mode?: 'explore' | 'shelf' | 'detail'
}>()

const emit = defineEmits(['open-compare-selector', 'shelf-updated', 'close'])
const { addToast } = useToast()
const authStore = useAuthStore()

// 🌟 Smart description with ingredient fallback
// The product's own entry on the public database it was checked against, when
// one is recorded (products.source_url, backend feat/data-sources). Named by
// that database, and worded as a place to check the product - not as the
// source of every detail here, which the How % Match works page sets out.
const productSourceUrl = computed(() => readProductSourceUrl(props.product))
const productSourceLabel = computed(() =>
  productSourceUrl.value?.includes('openbeautyfacts.org')
    ? 'See this product on Open Beauty Facts'
    : "See this product's public database entry",
)

const productDescription = computed(() => {
  if (props.product?.description && props.product.description.trim().length > 0) {
    return props.product.description
  }
  const ingredients = props.product?.product_ingredients || []
  if (ingredients.length > 0) {
    const list = ingredients.map((pi: any) => pi.ingredients?.name).filter(Boolean).slice(0, 4)
    if (list.length > 0) {
      return `Targeted formulation featuring ${list.join(', ')}${ingredients.length > 4 ? ', and key barrier support actives' : ''}.`
    }
  }
  return 'Active daily skincare formulation.'
})

// FE-DEF-12: this card had no banding at all - background, border, heading,
// score ring, divider and reason text were emerald for any non-null score, so a
// 20% match read exactly as confidently as a 95% one. Thresholds come from
// resolveMatchBand so this cannot drift from ExploreProductCard and
// CompareIdentityHeader again.
const matchBand = computed(() => {
  // A withheld score (see isScoreWithheld) is drawn in the neutral palette, so
  // the card does not colour a verdict it is not showing.
  const band = isScoreWithheld.value ? 'unavailable' : resolveMatchBand(props.product?.skin_match_score)

  if (band === 'strong') {
    return {
      card: 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/20 dark:border-emerald-800/40',
      heading: 'text-emerald-900 dark:text-emerald-200',
      body: 'text-emerald-700 dark:text-emerald-400',
      ring: 'border-emerald-500 text-emerald-800 dark:text-emerald-200',
      divider: 'border-emerald-500/20 dark:border-emerald-800/40',
      reason: 'text-emerald-900 dark:text-emerald-200',
      dot: 'bg-emerald-500',
      arc: 'stroke-emerald-500',
      verdict: 'Great match',
    }
  }

  // Teal, a green, not amber (owner decision): amber read as a warning, and a
  // score in this band usually means the product suits the user well.
  if (band === 'moderate') {
    return {
      card: 'bg-teal-500/10 dark:bg-teal-950/20 border-teal-500/20 dark:border-teal-800/40',
      heading: 'text-teal-900 dark:text-teal-200',
      body: 'text-teal-700 dark:text-teal-300',
      ring: 'border-teal-500 text-teal-800 dark:text-teal-200',
      divider: 'border-teal-500/20 dark:border-teal-800/40',
      reason: 'text-teal-900 dark:text-teal-200',
      dot: 'bg-teal-500',
      arc: 'stroke-teal-500',
      verdict: 'Good match',
    }
  }

  if (band === 'weak') {
    return {
      card: 'bg-semantic-error/5 dark:bg-semantic-error/10 border-semantic-error/20',
      heading: 'text-semantic-error',
      body: 'text-semantic-error/80',
      ring: 'border-semantic-error text-semantic-error',
      divider: 'border-semantic-error/20',
      reason: 'text-brand-text dark:text-stone-200',
      dot: 'bg-semantic-error',
      arc: 'stroke-semantic-error',
      verdict: 'Low match, use with care',
    }
  }

  // Unavailable. Neutral, because a score that was never computed must not be
  // painted as any verdict - good or bad.
  return {
    card: 'bg-brand-bg-light dark:bg-stone-900 border-brand-surface-border dark:border-stone-800',
    heading: 'text-brand-text dark:text-stone-200',
    body: 'text-brand-text-muted',
    ring: 'border-stone-300 dark:border-stone-700 text-brand-text-muted',
    divider: 'border-brand-surface-border dark:border-stone-800',
    reason: 'text-brand-text-muted dark:text-stone-400',
    dot: 'bg-brand-text-muted',
    arc: 'stroke-brand-text-muted',
    verdict: '',
  }
})

const hasMatchScore = computed(() => resolveMatchBand(props.product?.skin_match_score) !== 'unavailable')

// Both sides of the score. match_reasons name what suits the viewer's skin;
// caution_reasons, from backend feat/percentage-skin-match, name each
// ingredient that counted against it ("Phenoxyethanol: Preservative
// Sensitivity (Medium)"), most serious first. A low score often has no
// match_reasons at all, so reading only those left "Why this score" empty
// exactly when the user most needs it. Read defensively: an older response
// carries no caution_reasons.
const matchReasons = computed<string[]>(() =>
  Array.isArray(props.product?.match_reasons) ? props.product.match_reasons : [],
)
const cautionReasons = computed<string[]>(() =>
  Array.isArray(props.product?.caution_reasons) ? props.product.caution_reasons : [],
)

// The working behind the score (backend feat/percentage-skin-match), shown so
// the number is not taken on trust - owner request. Absent from an older
// response, which then reads as before.
const matchBreakdown = computed(() => readMatchBreakdown(props.product?.match_breakdown))

// Owner decision: a score resting on fewer than three relevant ingredients is
// withheld by default - a 100% built on one ingredient is not trustworthy,
// flagged or not - and shown only if the user asks for it. Reset for each
// product, so asking once does not reveal the next product's thin score.
const isLimitedScore = computed(() => hasMatchScore.value && matchBreakdown.value?.limited === true)
const revealLimitedScore = ref(false)
watch(() => props.product?.id, () => { revealLimitedScore.value = false })
const isScoreWithheld = computed(() => isLimitedScore.value && !revealLimitedScore.value)

// The score as a whole number and as the length of the ring's arc, held to
// 0-100 so a stray value cannot draw more than a full circle.
const matchPercent = computed(() =>
  hasMatchScore.value ? displayMatchPercent(props.product.skin_match_score) : 0,
)

// A score at either end is said as its counts, never "100%" or "0%" (owner
// decision): "All 11 relevant ingredients suit your skin type."
const matchWhole = computed(() =>
  hasMatchScore.value ? describeWholeMatch(props.product.skin_match_score, matchBreakdown.value) : null,
)

// FE-DEF-31, applied here. The card below renders only for a signed-in user, so
// it looked as though it had already caught the case CompareIdentityHeader was
// missing - but signing in is not the same as having a profile. The backend
// returns skin_match_score: null whenever it has no Baumann type to score
// against, which is the ordinary state for every authenticated user who has not
// finished the quiz, and this card reported it as "Failed to calculate score"
// and then blamed the catalogue: "This product may have incomplete ingredient
// metadata". Both sentences were about a product that is fine, shown to a user
// whose profile is simply empty.
//
// 'signed-out' cannot occur here - the v-else branch further down owns that
// case - so only the remaining three are worded.
const matchAvailability = computed(() =>
  resolveMatchAvailability(
    props.product?.skin_match_score,
    authStore.isAuthenticated,
    authStore.user?.skin_type,
  ),
)

// Short enough for the chip that sits where the score ring would be. Same
// vocabulary as CompareIdentityHeader's badge, so the two screens name the same
// state the same way.
const matchBadgeLabel = computed(() =>
  matchAvailability.value === 'no-profile' ? 'Take the skin quiz' : 'Not scored',
)

// The detail line under the rule. Only 'not-scored' may mention the catalogue:
// a profile exists, the quiz is done, and the score still came back empty, so
// incomplete ingredient data is a real candidate. For 'no-profile' the cause is
// known and is not the product, so naming the product at all would be a guess
// pointed at the wrong thing.
//
// With the backend's breakdown, 'not-scored' has a known cause too: when none
// of the ingredients says anything about the viewer's type there is nothing to
// score, and the catalogue is not at fault either.
const matchDetail = computed(() => {
  if (matchAvailability.value === 'no-profile') {
    return 'Your match is worked out from your skin type, which is not on file yet. Nothing about this product failed.'
  }
  if (matchBreakdown.value?.considered === 0) return describeNothingToScore(matchBreakdown.value)
  return 'This formula could not be scored against your profile. It may have incomplete ingredient metadata in the catalog.'
})

const isConfiguringAdd = ref(false)
const isSaving = ref(false)
const isOpened = ref(true)
const selectedPao = ref('12M')
const paoOptions = ['3M', '6M', '12M', '18M', '24M', '36M']
// The opened_date this screen sends. Local calendar day, not the UTC one -
// toISOString() recorded the product as opened yesterday for the whole local
// morning east of UTC, which then shifted every expiry derived from it.
const customDate = ref(toLocalDateString())

const isSafetyModalOpen = ref(false)
const showWarningModal = ref(false)
const isAnalyzing = ref(false)
const hasCheckedSafety = ref(false)
const backendWarnings = ref<any[]>([])
// Null until a check resolves. The whole status, not a boolean for "it failed":
// the modal words a check that never ran and a check that returned no verdict
// differently, and only one of the two is worth retrying (FE-DEF-29).
const safetyStatus = ref<SafetyStatus | null>(null)
// Already filtered through showsDuplicates() below, so anything in here is
// known to have come from a check that produced an answer. The modal can render
// it on length alone.
const backendDuplicates = ref<DuplicateMatch[]>([])

// Returns the outcome rather than only setting warnings. Callers previously
// branched on backendWarnings.length, which is empty both when the product is
// clear and when the check never ran - so a failure opened the add flow as if
// the product had been cleared.
const runBackendAnalysis = async () => {
  if (!props.product?.id) {
    return { status: 'unavailable', warnings: [], duplicates: [] } as SafetyOutcome
  }

  isAnalyzing.value = true
  const outcome = await resolveSafety(() => analyzeProduct(props.product.id))
  isAnalyzing.value = false

  backendWarnings.value = outcome.warnings
  safetyStatus.value = outcome.status
  backendDuplicates.value = showsDuplicates(outcome) ? outcome.duplicates : []

  return outcome
}

/**
 * The two non-verdict statuses, worded for the add flow.
 *
 * Worded identically to AddProductModal, which runs the same check through the
 * same resolveSafety for the same purpose. The two screens had different
 * sentences for the same two statuses, so which explanation a user got depended
 * on where they happened to be adding from. FE-DEF-17 is the same fault for the
 * shelf's delete wording, and the reason it matters beyond tidiness: the
 * use-case documents quote interface strings verbatim, so two strings for one
 * outcome become two claims in the SRS.
 *
 * These sentences used to live inside runBackendAnalysis, which is shared with
 * the manual Safety Check below - where nothing is being added. That is the
 * whole reason they moved out: sharing a sentence is right when the purpose is
 * shared, and these two purposes are not. The check is shared; what it is being
 * used to decide is not.
 */
const reportAddBlocked = (outcome: SafetyOutcome) => {
  if (outcome.status === 'unavailable') {
    addToast('Failed to analyze product. Please try again.', 'error')
  }

  // Not phrased as a failure, because nothing failed. The check ran; there was
  // no verdict in it to report. The sentence names the consequence as well as
  // the state - "has not been assessed" alone leaves the user to guess why the
  // add did not happen.
  if (outcome.status === 'unassessed') {
    addToast('This product has not been assessed, so it cannot be added.', 'error')
  }
}

/**
 * The same two statuses, worded for a report the user asked to see.
 *
 * Nothing is being saved on this path, so the add flow's sentences were not
 * merely imprecise here - "so it cannot be added" named a consequence that does
 * not exist on this screen, about an action the user did not take. The panel
 * behind the toast already says the right thing in both cases ("Evaluation
 * Unavailable" and "Not Assessed"), and these are written to agree with it
 * rather than to compete with it.
 */
const reportCheckIncomplete = (outcome: SafetyOutcome) => {
  if (outcome.status === 'unavailable') {
    addToast('Could not complete the safety check. Please try again.', 'error')
  }

  if (outcome.status === 'unassessed') {
    addToast('This product has not been assessed, so it cannot be checked against your shelf.', 'error')
  }
}

const handleTriggerSafetyCheck = async () => {
  if (!authStore.isAuthenticated) {
    authStore.triggerLoginPopup('Sign in to perform routine safety checks on your skin barrier.')
    return
  }
  isSafetyModalOpen.value = true
  hasCheckedSafety.value = false
  const outcome = await runBackendAnalysis()
  hasCheckedSafety.value = true
  reportCheckIncomplete(outcome)
}

const handleOpenConfigurator = async () => {
  if (!authStore.isAuthenticated) {
    authStore.triggerLoginPopup('Sign in to save this product to your digital skincare shelf.')
    return
  }
  const outcome = await runBackendAnalysis()
  reportAddBlocked(outcome)

  // Only an explicit pass opens the configurator, and only a reported conflict
  // opens the warning modal. Written as two named statuses rather than as
  // "anything else warns", so splitting `unavailable` in FE-DEF-29 could not
  // route a status with no warnings in it into a modal that lists them: both
  // non-verdict statuses stop here, each having already said so in a toast.
  if (outcome.status === 'warned') {
    showWarningModal.value = true
  } else if (outcome.status === 'cleared') {
    isConfiguringAdd.value = true
  }
}

const handleCompareClick = () => {
  if (!authStore.isAuthenticated) {
    authStore.triggerLoginPopup('Sign in to compare skin formulas side-by-side.')
    return
  }
  emit('open-compare-selector', props.product)
}

// Opens the configurator rather than saving, and that is not the same gap as
// AddProductModal's one-step override.
//
// The two screens order the flow oppositely. AddProductModal collects the
// configuration first and runs the check on save, so by the time its warning
// modal appears there is a pendingPayload and "Proceed Anyway" has something to
// commit. Here the check runs first - handleOpenConfigurator only opens the
// configurator on an explicit pass - so at this point the user has not chosen a
// PAO, an opened state or a date. Committing directly would save isOpened: true
// with a 12-month period and today's date, none of which they picked, which is
// the same class of fault as reporting a value nobody computed.
//
// So the second step is not a redundant re-confirmation: it is the only
// configuration step this flow has. What is overridden is the block, after
// which the user configures exactly as the cleared path does.
const handleBypassProceed = () => {
  showWarningModal.value = false
  isConfiguringAdd.value = true
}

const handleCommitToShelf = async () => {
  if (!props.product) return
  isSaving.value = true
  try {
    const numericPao = parseInt(selectedPao.value.replace('M', '')) || 12
    await addToShelf({
      product_id: props.product.id,
      usage_state: isOpened.value ? 'active' : 'unopened',
      opened_date: isOpened.value ? customDate.value : null,
      expiration_date: null,
      pao: numericPao
    })
    addToast(`${props.product.name} added to routine!`, 'success')
    isConfiguringAdd.value = false
    emit('shelf-updated')
    if (props.mode !== 'detail') emit('close')
  } catch {
    addToast('Could not save product.', 'error')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-12 bg-brand-surface-light dark:bg-brand-surface-dark rounded-[2.5rem] border border-brand-surface-border dark:border-stone-800 shadow-xl overflow-hidden transition-colors duration-300">

    <!-- Left Image Showcase -->
    <div class="lg:col-span-5 bg-brand-bg-light dark:bg-stone-900/50 p-8 sm:p-12 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-brand-surface-border dark:border-stone-800">
      <div class="w-56 h-56 sm:w-72 sm:h-72 flex items-center justify-center relative mix-blend-multiply dark:mix-blend-normal">
        <div class="absolute inset-0 bg-brand-primary/5 dark:bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-contain drop-shadow-2xl relative z-10" />
        <svg v-else class="w-24 h-24 text-brand-text-muted/40 stroke-[1] relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
      </div>
    </div>

    <!-- Right Specification Panel -->
    <div class="lg:col-span-7 p-6 sm:p-10 space-y-5 flex flex-col justify-between">
      <div class="space-y-3">
        <span class="text-xs font-bold text-brand-primary uppercase tracking-widest">{{ product.brand }}</span>
        <h1 class="text-2xl sm:text-4xl font-serif font-bold text-brand-text dark:text-white mt-1">{{ product.name }}</h1>

        <div v-if="product.price_thb || product.price_usd" class="inline-flex items-center gap-2 bg-brand-bg-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800 px-4 py-2 rounded-2xl font-mono font-bold text-sm">
          <span v-if="product.price_thb" class="text-brand-primary">฿{{ product.price_thb }}</span>
          <span v-if="product.price_thb && product.price_usd" class="text-brand-surface-border dark:text-stone-700">|</span>
          <span v-if="product.price_usd" class="text-brand-text-muted dark:text-stone-400">${{ product.price_usd }}</span>
        </div>
        <div v-else class="inline-flex items-center gap-2 bg-brand-bg-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800 px-4 py-2 rounded-2xl font-mono font-bold text-sm text-brand-text-muted opacity-70">
          Price unavailable
        </div>

        <!-- Description Paragraph -->
        <p class="text-xs sm:text-sm text-brand-text-muted dark:text-stone-400 leading-relaxed font-medium pt-1">
          {{ productDescription }}
        </p>
        <a
          v-if="productSourceUrl"
          :href="productSourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="product-source-link inline-flex items-center gap-1 text-xs font-bold text-brand-primary hover:underline"
        >
          {{ productSourceLabel }}
          <svg class="w-3 h-3 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      <!-- Match Card: Authenticated User -->
      <div v-if="authStore.isAuthenticated" :class="['border-2 rounded-3xl p-6 space-y-4 shadow-2xs transition-colors', matchBand.card]">
        <!-- Scored: the circular score, as before, made larger and drawn as a ring
             that fills to the percentage in the band's colour - the owner kept
             the circle over a bar. Beside it the score is said in words and
             explained, because on the product page it is the subject rather
             than a badge. The ring's radius gives a circumference of 100, so
             the arc's dash length is the percentage itself. -->
        <div v-if="hasMatchScore && !isScoreWithheld" class="match-scored flex items-center gap-5">
          <div
            class="match-ring relative w-24 h-24 sm:w-28 sm:h-28 shrink-0"
            role="meter"
            aria-label="Skin match"
            :aria-valuenow="matchPercent"
            :aria-valuetext="matchWhole ? matchWhole.long : `${matchPercent}%`"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90" aria-hidden="true">
              <circle cx="18" cy="18" r="15.9155" fill="none" stroke-width="3.2" class="stroke-white/80 dark:stroke-stone-900/70" />
              <circle
                cx="18"
                cy="18"
                r="15.9155"
                fill="none"
                stroke-width="3.2"
                stroke-linecap="round"
                :stroke-dasharray="`${matchPercent} 100`"
                :class="['match-arc transition-[stroke-dasharray] duration-700 ease-out', matchBand.arc]"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span v-if="matchWhole" :class="['match-whole-mark font-black text-xl sm:text-2xl leading-none', matchBand.heading]">
                {{ matchPercent >= 100 ? 'All' : 'None' }}
              </span>
              <span v-else :class="['match-percent font-mono font-black text-2xl sm:text-3xl leading-none', matchBand.heading]">
                {{ matchPercent }}%
              </span>
              <!-- The fraction the percentage is built on (owner request). -->
              <span v-if="matchBreakdown" :class="['match-ring-fraction mt-1 font-mono text-[10px] font-bold', matchBand.body]">
                {{ matchBreakdown.helpful }} of {{ matchBreakdown.considered }}
              </span>
            </div>
          </div>

          <div class="min-w-0 space-y-2">
            <h4 :class="['text-base font-black', matchBand.heading]">Your Skin Match</h4>
            <span :class="['match-verdict inline-block text-xs sm:text-sm font-bold px-3 py-1 rounded-full border bg-white/70 dark:bg-stone-900/60', matchBand.ring]">
              {{ matchBand.verdict }}
            </span>
            <p v-if="matchWhole" :class="['match-whole text-sm font-bold leading-snug', matchBand.heading]">
              {{ matchWhole.long }}
            </p>
            <p :class="['match-basis flex items-start gap-2 text-xs leading-relaxed', matchBand.body]">
              <svg class="w-4 h-4 shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ MATCH_SCORE_BASIS }}</span>
            </p>
            <p v-if="matchBreakdown" :class="['match-working text-xs font-semibold leading-relaxed', matchBand.heading]">
              {{ describeMatchWorking(matchBreakdown) }}
            </p>
            <!-- How much of that rests on checked sources (owner request). -->
            <p v-if="matchBreakdown && describeVerifiedCount(matchBreakdown)" :class="['match-verified text-xs leading-relaxed', matchBand.body]">
              {{ describeVerifiedCount(matchBreakdown) }}
            </p>
            <!-- The owner chose to flag a thin score rather than hide it. -->
            <p
              v-if="matchBreakdown?.limited"
              class="match-limited flex items-start gap-2 text-xs leading-relaxed rounded-xl px-3 py-2 bg-white/70 dark:bg-stone-900/60 border border-brand-surface-border dark:border-stone-700 text-brand-text dark:text-stone-200"
            >
              <svg class="w-4 h-4 shrink-0 mt-px text-brand-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ describeLimitedMatch(matchBreakdown) }}</span>
            </p>
            <p class="match-disclaimer flex items-start gap-2 text-[11px] leading-relaxed text-brand-text-muted dark:text-stone-400">
              <svg class="w-3.5 h-3.5 shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>{{ MATCH_SCORE_DISCLAIMER }}</span>
            </p>
            <router-link :to="MATCH_METHOD_PATH" class="match-how-link inline-flex items-center gap-1 text-[11px] font-bold text-brand-primary hover:underline">
              How % Match is calculated, and our sources
              <svg class="w-3 h-3 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
            </router-link>
            <button
              v-if="isLimitedScore"
              type="button"
              class="match-hide text-xs font-bold text-brand-primary hover:underline cursor-pointer"
              @click="revealLimitedScore = false"
            >
              Hide the score
            </button>
          </div>
        </div>

        <!-- Withheld: a score resting on too few ingredients. No percentage by
             default, the reason instead, and the score one click away for a
             user who wants it anyway (owner decision). -->
        <div v-else-if="isScoreWithheld" class="match-withheld space-y-3">
          <div class="flex items-center justify-between gap-4">
            <h4 :class="['text-base font-black', matchBand.heading]">Your Skin Match</h4>
            <span class="match-withheld-badge inline-flex items-center gap-1.5 text-xs font-black font-mono px-3 py-1.5 rounded-full border bg-stone-100 text-brand-text-muted dark:bg-stone-800 dark:text-stone-400 border-brand-surface-border dark:border-stone-700">
              <svg class="w-3.5 h-3.5 stroke-[2.5] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ NOT_ENOUGH_INFO }}
            </span>
          </div>
          <p :class="['match-withheld-reason text-xs leading-relaxed', matchBand.body]">
            {{ describeNotEnoughToScore(matchBreakdown!) }}
          </p>
          <p class="match-disclaimer flex items-start gap-2 text-[11px] leading-relaxed text-brand-text-muted dark:text-stone-400">
            <svg class="w-3.5 h-3.5 shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>{{ MATCH_SCORE_DISCLAIMER }}</span>
          </p>
          <router-link :to="MATCH_METHOD_PATH" class="match-how-link inline-flex items-center gap-1 text-[11px] font-bold text-brand-primary hover:underline">
            How % Match is calculated, and our sources
            <svg class="w-3 h-3 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
          </router-link>
          <button
            type="button"
            class="match-reveal text-xs font-bold text-brand-primary hover:underline cursor-pointer"
            @click="revealLimitedScore = true"
          >
            Show the score anyway
          </button>
        </div>

        <div v-else class="flex items-center justify-between gap-4">
          <div>
            <h4 :class="['text-base font-black', matchBand.heading]">Compatibility Status</h4>
            <p :class="['text-xs mt-0.5', matchBand.body]">
              {{ describeMatchAvailability(matchAvailability) }}
            </p>
          </div>

          <div class="flex-shrink-0">
            <div
              class="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-brand-surface-light dark:bg-stone-800 text-[10px] font-bold font-mono text-brand-text-muted uppercase tracking-wider text-center"
            >
              {{ matchBadgeLabel }}
            </div>
          </div>
        </div>

        <!-- Match Reasons or Failure Explanation -->
        <div
          v-if="!hasMatchScore || matchReasons.length || cautionReasons.length"
          :class="['space-y-2 pt-3 border-t text-xs', matchBand.divider]"
        >
          <template v-if="hasMatchScore">
            <p :class="['match-why text-[11px] font-bold uppercase tracking-wider', matchBand.heading]">{{ isScoreWithheld ? 'What we found' : 'Why this score' }}</p>

            <!-- What suits the viewer's skin, then what counted against it. -->
            <ul v-if="matchReasons.length" class="match-helps space-y-2">
              <li v-for="(reason, i) in matchReasons" :key="i" class="flex items-start gap-2.5 text-brand-text dark:text-stone-200">
                <svg class="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <span class="leading-relaxed">{{ reason }}</span>
              </li>
            </ul>

            <template v-if="cautionReasons.length">
              <p class="match-watch-heading text-[11px] font-bold text-brand-text-muted dark:text-stone-400 pt-1">Watch out for</p>
              <ul class="match-cautions space-y-2">
                <li v-for="(reason, i) in cautionReasons" :key="i" class="flex items-start gap-2.5 text-brand-text dark:text-stone-200">
                  <svg class="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span class="leading-relaxed">{{ reason }}</span>
                </li>
              </ul>
            </template>
          </template>

          <div v-else class="text-brand-text-muted dark:text-stone-400 italic text-[11px]">
            {{ matchDetail }}
          </div>
        </div>
      </div>

      <!-- Match Card: Unregistered Visitor Preview -->
      <div v-else class="bg-brand-bg-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-800 rounded-3xl p-6 flex items-center justify-between gap-4">
        <div>
          <h4 class="text-sm font-bold text-brand-text dark:text-stone-200">Skin Compatibility Score</h4>
          <p class="text-xs text-brand-text-muted mt-0.5">Sign in and take the skin quiz to see how well this product suits your skin.</p>
        </div>
        <button
          @click="authStore.triggerLoginPopup('Sign in to view your personalized skin compatibility score.')"
          class="px-4 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer whitespace-nowrap transition-all active:scale-95"
        >
          Check Match
        </button>
      </div>

      <!-- Action Controllers -->
      <div class="pt-2">
        <div v-if="!isConfiguringAdd" class="flex flex-col sm:flex-row items-center gap-3">
          <button @click="handleOpenConfigurator" class="w-full sm:w-1/3 py-4 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95">
            <svg v-if="isAnalyzing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>Save To Shelf</span>
          </button>

          <button @click="handleTriggerSafetyCheck" class="w-full sm:w-1/3 py-4 bg-brand-primary-light dark:bg-stone-800 text-brand-primary dark:text-brand-primary-accent font-bold text-sm rounded-2xl border border-brand-primary/20 dark:border-stone-700 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 hover:bg-brand-primary dark:hover:bg-stone-700 hover:text-white">
            <span class="w-2 h-2 rounded-full bg-brand-primary" :class="isAnalyzing ? 'animate-ping' : 'animate-pulse'"></span>
            <span>Safety Check</span>
          </button>

          <button @click="handleCompareClick" class="w-full sm:w-1/3 py-4 bg-brand-bg-light dark:bg-stone-800/80 hover:bg-brand-surface-border dark:hover:bg-stone-700 text-brand-text dark:text-stone-200 dark:hover:text-white font-bold text-sm rounded-2xl border border-brand-surface-border dark:border-stone-700 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 active:scale-95">
            <span>Compare</span>
            <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </button>
        </div>

        <!-- Shelf Configurator Accordion -->
        <div v-else class="bg-brand-bg-light dark:bg-stone-900 p-6 rounded-3xl border border-brand-surface-border dark:border-stone-800 space-y-4 shadow-inner animate-fade-in">
          <div class="flex items-center justify-between border-b border-brand-surface-border dark:border-stone-800 pb-3">
            <span class="text-xs font-bold uppercase tracking-wider text-brand-primary">Configure Routine Item</span>
            <button @click="isConfiguringAdd = false" class="text-xs font-bold text-brand-text-muted hover:text-brand-text dark:hover:text-white cursor-pointer transition-colors">Cancel</button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <button @click="isOpened = true" :class="['py-3 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-sm', isOpened ? 'bg-brand-primary text-white border-brand-primary' : 'bg-brand-surface-light dark:bg-stone-800 border-brand-surface-border dark:border-stone-700 text-brand-text-muted']">
              Currently Opened
            </button>
            <button @click="isOpened = false" :class="['py-3 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-sm', !isOpened ? 'bg-brand-primary text-white border-brand-primary' : 'bg-brand-surface-light dark:bg-stone-800 border-brand-surface-border dark:border-stone-700 text-brand-text-muted']">
              Unopened / Sealed
            </button>
          </div>

          <div v-if="isOpened" class="space-y-2">
            <label class="block text-[10px] font-bold uppercase tracking-widest text-brand-text-muted">Period After Opening (PAO)</label>
            <div class="grid grid-cols-6 gap-2">
              <button v-for="pao in paoOptions" :key="pao" @click="selectedPao = pao" :class="['py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer', selectedPao === pao ? 'bg-brand-primary/10 dark:bg-brand-primary/20 border-brand-primary text-brand-primary' : 'bg-brand-surface-light dark:bg-stone-800 border-brand-surface-border dark:border-stone-700 text-brand-text-muted hover:border-brand-primary/50']">
                {{ pao }}
              </button>
            </div>
          </div>

          <button @click="handleCommitToShelf" :disabled="isSaving" class="w-full mt-2 py-4 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95">
            <svg v-if="isSaving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ isSaving ? 'Saving to Database...' : 'Confirm & Add To Shelf' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <SafetyCheckModal
      :is-open="isSafetyModalOpen"
      :product="product"
      :is-loading="isAnalyzing"
      :warnings="backendWarnings"
      :duplicates="backendDuplicates"
      :has-checked="hasCheckedSafety"
      :scan-status="safetyStatus"
      @close="isSafetyModalOpen = false"
    />

    <Teleport to="body">
      <SafetyWarningModal
        v-if="showWarningModal"
        :warnings="backendWarnings"
        @cancel="showWarningModal = false"
        @proceed="handleBypassProceed"
      />
    </Teleport>
  </div>
</template>
