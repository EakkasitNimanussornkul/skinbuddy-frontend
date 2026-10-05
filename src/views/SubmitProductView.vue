<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, reactive, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { getCategories, getConcernTags } from '../api/metaApi'
import { createSubmission } from '../api/submissionsApi'
import { detailSentence, plainDetail, rateLimitMessage, readApiProblem, type ApiProblem } from '../api/apiProblem'
import { releasePreview } from '../utils/safeImages'
import {
  DRAFT_CONTEXT,
  buildSubmissionBody,
  emptyDraft,
  isDraftDirty,
  readServerErrors,
  validateBasics,
  validateExtras,
  validateIngredients,
  type FieldErrors,
  type StepNumber,
} from '../components/Submissions/submissionDraft'
import SubmitStepIndicator from '../components/Submissions/SubmitStepIndicator.vue'
import SubmitBasicsStep from '../components/Submissions/SubmitBasicsStep.vue'
import SubmitIngredientsStep from '../components/Submissions/SubmitIngredientsStep.vue'
import SubmitExtrasStep from '../components/Submissions/SubmitExtrasStep.vue'
import SubmitDone from '../components/Submissions/SubmitDone.vue'
import LeaveDraftDialog from '../components/Submissions/LeaveDraftDialog.vue'

/**
 * Submit a product (owner-approved design, 2026-10-04): three steps in one
 * view - basics, ingredients, extras - then a done state.
 *
 * Full screen like the quiz: App.vue hides the site navigation here, so this
 * view draws its own way out. The draft lives in memory only; leaving with
 * anything entered asks first, and closing the tab gets the browser's own
 * warning. Nothing is published by sending - the team reviews it first.
 */

const router = useRouter()

const draft = reactive(emptyDraft())
const errors = reactive<FieldErrors>({})
provide(DRAFT_CONTEXT, { draft, errors })

const step = ref<StepNumber>(1)
const uploading = ref(false)
const sending = ref(false)
const banner = ref('')
const sent = ref<{ brand: string; name: string } | null>(null)

const stepRoot = ref<HTMLElement | null>(null)
const heading = ref<HTMLElement | null>(null)

// --- The backend's lists ---------------------------------------------------
type ListState = 'loading' | 'ready' | 'failed'
const categories = ref<string[]>([])
const categoriesState = ref<ListState>('loading')
const concernTags = ref<string[]>([])
const concernTagsState = ref<ListState>('loading')

const loadCategories = async () => {
  categoriesState.value = 'loading'
  try {
    categories.value = await getCategories()
    categoriesState.value = categories.value.length ? 'ready' : 'failed'
  } catch {
    categoriesState.value = 'failed'
  }
}

const loadConcernTags = async () => {
  concernTagsState.value = 'loading'
  try {
    concernTags.value = await getConcernTags()
    concernTagsState.value = 'ready'
  } catch {
    concernTagsState.value = 'failed'
  }
}

// --- Steps -------------------------------------------------------------------
const STEP_COPY: Record<StepNumber, { title: string; intro: string }> = {
  1: { title: "What's the product?", intro: 'Copy these from the packaging. Fields marked * are needed.' },
  2: {
    title: "What's in it? *",
    intro: 'Search our ingredient list and add each one, in the order printed on the pack. We need at least one.',
  },
  3: { title: 'Anything else you know?', intro: 'All optional. It helps, and our team checks it before anything is shown.' },
}

const summaries = computed<[string, string, string]>(() => [
  [draft.name.trim(), draft.category].filter(Boolean).join(' · ') || 'Name, brand and category',
  draft.ingredients.length ? `${draft.ingredients.length} added` : 'At least one',
  'All optional',
])

const replaceErrors = (next: FieldErrors) => {
  for (const key of Object.keys(errors)) delete errors[key]
  Object.assign(errors, next)
}

// The first invalid field gets focus, so a keyboard or screen reader user lands
// on what needs fixing. Fields that are not inputs fall back to their control.
const FALLBACK_FOCUS: Record<string, string> = {
  category: 'sub-category',
  ingredients: 'sub-ingredient-search',
}
const focusFirstError = async () => {
  await nextTick()
  const invalid = stepRoot.value?.querySelector<HTMLElement>('[aria-invalid="true"]')
  const fallback = Object.keys(FALLBACK_FOCUS).find((key) => errors[key])
  ;(invalid ?? (fallback ? document.getElementById(FALLBACK_FOCUS[fallback]!) : null))?.focus()
}

const goTo = async (next: StepNumber) => {
  step.value = next
  banner.value = ''
  try {
    window.scrollTo({ top: 0 })
  } catch {
    // jsdom has no scrolling; nothing to do.
  }
  await nextTick()
  heading.value?.focus()
}

const checkStep = (n: StepNumber): FieldErrors => {
  if (n === 1) return validateBasics(draft, categories.value)
  if (n === 2) return validateIngredients(draft)
  return validateExtras(draft, concernTags.value)
}

const continueFrom = async (n: StepNumber) => {
  const found = checkStep(n)
  replaceErrors(found)
  if (Object.keys(found).length > 0) {
    await focusFirstError()
    return
  }
  await goTo((n + 1) as StepNumber)
}

const goBack = () => {
  if (step.value > 1) goTo((step.value - 1) as StepNumber)
}

// --- Sending -----------------------------------------------------------------
// The rate limit and the cap on submissions waiting for review (429) and a
// refusal no field is named for (422) say why in the backend's own words when
// it gave some; a 422 that names a field is put on it by readServerErrors.
const failureMessage = (problem: ApiProblem): string => {
  const { status } = problem
  const limited = rateLimitMessage(problem)
  if (limited) return limited
  if (status === null) return "We couldn't reach SkinBuddy, so it wasn't sent. Check your connection and try again."
  if (status === 401) return "Your sign-in has expired, so it wasn't sent. Sign in again to send it."
  if (status === 422 && plainDetail(problem)) return `It wasn't sent. ${detailSentence(plainDetail(problem)!)}`
  if (status === 422) return "Something in the form wasn't accepted. Check the details and try again."
  return "Something went wrong on our side, so it wasn't sent. Try again in a moment."
}

const send = async () => {
  // Every step again: an earlier one can have changed since it was passed.
  for (const n of [1, 2, 3] as StepNumber[]) {
    const found = checkStep(n)
    if (Object.keys(found).length > 0) {
      replaceErrors(found)
      if (n !== step.value) await goTo(n)
      await focusFirstError()
      return
    }
  }

  sending.value = true
  banner.value = ''
  try {
    await createSubmission(buildSubmissionBody(draft))
    sent.value = { brand: draft.brand.trim(), name: draft.name.trim() }
    releasePreview(draft.photo?.previewUrl)
    Object.assign(draft, emptyDraft())
    replaceErrors({})
  } catch (error: unknown) {
    const problem = readApiProblem(error)
    const reading = readServerErrors(problem, draft)
    if (reading) {
      replaceErrors(reading.errors)
      if (reading.step !== step.value) await goTo(reading.step)
      banner.value = reading.message
      await focusFirstError()
    } else {
      banner.value = failureMessage(problem)
    }
  } finally {
    sending.value = false
  }
}

// The draft was emptied when it was sent.
const startAnother = () => {
  replaceErrors({})
  sent.value = null
  step.value = 1
}

// --- Leaving -----------------------------------------------------------------
// Sending empties the draft, so a sent submission never asks.
const needsLeaveWarning = () => isDraftDirty(draft)
const leaveDialogOpen = ref(false)
let settleLeave: ((leave: boolean) => void) | null = null

onBeforeRouteLeave(() => {
  if (!needsLeaveWarning()) return true
  leaveDialogOpen.value = true
  return new Promise<boolean>((resolve) => {
    settleLeave = resolve
  })
})

const answerLeave = (leave: boolean) => {
  leaveDialogOpen.value = false
  settleLeave?.(leave)
  settleLeave = null
}

const leave = () => {
  // Back where they came from when there is somewhere to go back to.
  if (window.history.state?.back) router.back()
  else router.push('/explore')
}

const onBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!needsLeaveWarning()) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  window.addEventListener('beforeunload', onBeforeUnload)
  loadCategories()
  loadConcernTags()
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  // The photo preview lives with the draft, not the step that made it.
  releasePreview(draft.photo?.previewUrl)
})
</script>

<template>
  <div class="submit-product min-h-screen flex flex-col bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-200">
    <!-- Desktop top bar -->
    <header class="hidden lg:flex min-h-16 px-8 items-center justify-between gap-4 border-b border-brand-surface-border dark:border-stone-700 bg-brand-surface-light dark:bg-brand-surface-dark">
      <span class="font-serif text-xl font-bold text-stone-800 dark:text-white">SkinBuddy</span>
      <button
        type="button"
        class="h-11 px-4 rounded-xl border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-sm font-bold text-stone-600 dark:text-stone-300 hover:border-brand-primary-strong dark:hover:border-brand-primary transition-colors"
        @click="leave"
      >
        {{ sent ? 'Close' : 'Leave without sending' }}
      </button>
    </header>

    <SubmitDone v-if="sent" :brand="sent.brand" :name="sent.name" @another="startAnother" />

    <div
      v-else
      class="flex-grow w-full max-w-md mx-auto px-5 pt-5 pb-6 flex flex-col lg:max-w-[1200px] lg:px-8 lg:py-9 lg:grid lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)] lg:gap-7 lg:items-start"
    >
      <!-- Phone header row -->
      <div class="flex items-center justify-between h-11 lg:hidden">
        <button
          v-if="step === 1"
          type="button"
          aria-label="Leave without submitting"
          class="w-11 h-11 -ml-2 flex items-center justify-center text-brand-text dark:text-stone-200"
          @click="leave"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <button
          v-else
          type="button"
          :aria-label="step === 2 ? 'Back to basics' : 'Back to ingredients'"
          class="w-11 h-11 -ml-2 flex items-center justify-center text-brand-text dark:text-stone-200"
          @click="goBack"
        >
          <svg class="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span class="text-[13px] font-bold text-stone-800 dark:text-white">Submit a product</span>
        <span class="w-11" />
      </div>

      <SubmitStepIndicator :current="step" :summaries="summaries" @go="goTo" />

      <main
        ref="stepRoot"
        class="flex-grow flex flex-col lg:rounded-[28px] lg:border lg:border-brand-surface-border lg:dark:border-stone-600 lg:bg-brand-surface-light lg:dark:bg-brand-surface-dark lg:px-9 lg:py-8"
      >
        <h1 ref="heading" tabindex="-1" class="step-title mt-[22px] lg:mt-0 font-serif text-[26px] lg:text-[32px] leading-tight font-bold text-stone-800 dark:text-white outline-none">
          {{ STEP_COPY[step].title }}
        </h1>
        <p class="mt-2 text-sm lg:text-[15px] leading-relaxed text-stone-500 dark:text-stone-400 max-w-[620px]">{{ STEP_COPY[step].intro }}</p>

        <p
          v-if="banner"
          role="alert"
          class="submit-banner mt-4 px-4 py-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm font-semibold text-red-800 dark:text-red-200"
        >
          {{ banner }}
        </p>

        <SubmitBasicsStep
          v-if="step === 1"
          v-model:uploading="uploading"
          :categories="categories"
          :categories-state="categoriesState"
          @retry-categories="loadCategories"
        />
        <SubmitIngredientsStep v-else-if="step === 2" />
        <SubmitExtrasStep
          v-else
          :concern-tags="concernTags"
          :concern-tags-state="concernTagsState"
          @edit="goTo"
          @retry-concern-tags="loadConcernTags"
        />

        <!-- Actions -->
        <div class="mt-auto pt-6 lg:pt-7">
          <div v-if="step === 1" class="flex flex-col gap-2.5 lg:items-end">
            <button
              type="button"
              class="continue h-[54px] lg:h-[50px] lg:px-7 rounded-2xl lg:rounded-[14px] bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white text-base font-bold transition-colors disabled:opacity-60"
              :disabled="uploading"
              @click="continueFrom(1)"
            >
              Continue to ingredients
            </button>
            <p class="lg:hidden m-0 text-center text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Our team checks every submission before it appears in the catalogue.
            </p>
          </div>
          <div v-else class="grid grid-cols-[1fr_2fr] gap-2.5 lg:flex lg:justify-between">
            <button
              type="button"
              class="back h-[54px] lg:h-[50px] lg:px-6 rounded-2xl lg:rounded-[14px] border-[1.5px] border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-[15px] font-bold text-stone-800 dark:text-white"
              @click="goBack"
            >
              Back
            </button>
            <button
              v-if="step === 2"
              type="button"
              class="continue h-[54px] lg:h-[50px] lg:px-7 rounded-2xl lg:rounded-[14px] bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white text-base font-bold transition-colors"
              @click="continueFrom(2)"
            >
              Continue to extras
            </button>
            <button
              v-else
              type="button"
              class="send h-[54px] lg:h-[50px] lg:px-7 rounded-2xl lg:rounded-[14px] bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white text-base font-bold transition-colors disabled:opacity-60"
              :disabled="sending"
              @click="send"
            >
              {{ sending ? 'Sending...' : 'Send for review' }}
            </button>
          </div>
        </div>
      </main>
    </div>

    <LeaveDraftDialog v-if="leaveDialogOpen" @stay="answerLeave(false)" @leave="answerLeave(true)" />
  </div>
</template>
