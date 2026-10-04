<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  REVIEW_NOTE_LIMIT,
  PAO_MONTHS,
  approveSubmission,
  editAdminSubmission,
  getAdminSubmission,
  rejectSubmission,
  uploadSubmissionImage,
  type AdminSubmission,
  type DuplicateCandidate,
  type SubmissionEdit,
  type SubmissionIngredient,
} from '../../api/submissionsApi'
import { getCategories, getFunctionalGroups } from '../../api/metaApi'
import { readApiProblem } from '../../api/apiProblem'
import { SOURCE_CLAIM_LABEL } from '../../api/sources'
import { useToast } from '../../composables/useToast'
import {
  buildApproveBody,
  convertIngredients,
  correctionChanges,
  correctionsFrom,
  describeReviewMeta,
  initialDecision,
  initialTicks,
  isLegacyPayload,
  matchState,
  newIngredients,
  publishBlockers,
  readErrorCandidates,
  readReviewPayload,
  readReviewProblem,
  replaceIngredientAt,
  uploadedImageUrl,
  validateCorrections,
  type Corrections,
  type DecisionDraft,
  type PublishTicks,
  type ReviewAction,
  type ReviewPayload,
  type ReviewProblem,
} from './adminReview'
import { checkPhotoFile, type FieldErrors } from './submissionDraft'
import { formatDay, statusChip } from './submissionStatus'
import AdminIngredientDecision from './AdminIngredientDecision.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import FieldError from './FieldError.vue'

/**
 * One submission under review (owner-approved design, 2026-10-04): correct its
 * details, check it is not already in the catalogue, decide on each new
 * ingredient, tick the extras to publish, then publish it or turn it down.
 *
 * Publishing creates a NEW product only and never changes an existing product
 * or ingredient (backend approve_submission). Every rule shown here is also
 * enforced there; this screen says why before Publish, not after.
 */
const props = defineProps<{ id: string }>()
const emit = defineEmits<{ forbidden: []; reviewed: [] }>()

const router = useRouter()
const { addToast } = useToast()

const detail = ref<AdminSubmission | null>(null)
const payload = ref<ReviewPayload | null>(null)
const state = ref<'loading' | 'ready' | 'failed'>('loading')
const loadFailure = ref('')

const corrections = reactive<Corrections>({ name: '', brand: '', category: '', priceThb: '', priceUsd: '', paoMonths: null, imagePath: null })
const baseline = ref<Corrections>({ ...corrections })
const correctionErrors = reactive<FieldErrors>({})
const photoPreview = ref<string | null>(null)
const photoError = ref('')

const decisions = reactive<Record<number, DecisionDraft>>({})
const ticks = reactive<PublishTicks>({ benefits: [], goodFor: [], sourceUrls: [] })
const notes = ref('')

const busy = ref<'save' | 'resolve' | 'photo' | 'approve' | 'reject' | null>(null)
const problem = ref<ReviewProblem | null>(null)
// Candidates a refused approve named, shown with the detail's own.
const refusedCandidates = ref<DuplicateCandidate[]>([])
const dialog = ref<'publish' | 'reject' | null>(null)

const categories = ref<string[]>([])
const functionalGroups = ref<string[]>([])
const groupsFailed = ref(false)

const replace = <T extends object>(target: T, next: T) => {
  for (const key of Object.keys(target)) delete (target as Record<string, unknown>)[key]
  Object.assign(target, next)
}

const revokePreview = () => {
  if (photoPreview.value?.startsWith('blob:')) URL.revokeObjectURL(photoPreview.value)
}

/**
 * Show a detail. A fresh one (another submission) starts clean; the same one
 * answered again after a save keeps the admin's decisions and ticks where they
 * still apply, so saving a correction does not undo the rest of the review.
 */
const apply = (next: AdminSubmission, fresh: boolean) => {
  const before = detail.value
  detail.value = next
  payload.value = readReviewPayload(next.submission)
  replace(corrections, correctionsFrom(payload.value))
  baseline.value = { ...corrections }
  replace(correctionErrors, {})
  revokePreview()
  photoPreview.value = uploadedImageUrl(corrections.imagePath)
  photoError.value = ''

  const kept: Record<number, DecisionDraft> = {}
  for (const ingredient of newIngredients(next)) {
    const previous = fresh ? undefined : decisions[ingredient.position]
    const sameName = before?.ingredients.find((i) => i.position === ingredient.position)?.name === ingredient.name
    kept[ingredient.position] = previous && sameName ? previous : initialDecision(ingredient)
  }
  replace(decisions, kept)

  const start = initialTicks(payload.value)
  if (fresh) {
    replace(ticks, start)
  } else {
    replace(ticks, {
      benefits: ticks.benefits.filter((b) => start.benefits.includes(b)),
      goodFor: ticks.goodFor.filter((g) => start.goodFor.includes(g)),
      sourceUrls: ticks.sourceUrls.filter((u) => payload.value!.sources.some((s) => s.url === u)),
    })
  }
}

let latest = 0
const load = async () => {
  const ticket = ++latest
  state.value = 'loading'
  problem.value = null
  refusedCandidates.value = []
  dialog.value = null
  notes.value = ''
  try {
    const next = await getAdminSubmission(props.id)
    if (ticket !== latest) return
    apply(next, true)
    state.value = 'ready'
  } catch (error: unknown) {
    if (ticket !== latest) return
    const read = readReviewProblem(readApiProblem(error), 'load')
    if (read.forbidden) emit('forbidden')
    loadFailure.value = read.message
    state.value = 'failed'
  }
}

watch(() => props.id, load, { immediate: true })
onBeforeUnmount(revokePreview)

getCategories()
  .then((list) => (categories.value = list))
  .catch(() => {})
getFunctionalGroups()
  .then((list) => (functionalGroups.value = list))
  .catch(() => (groupsFailed.value = true))

// --- Derived ---------------------------------------------------------------
const isPending = computed(() => detail.value?.status === 'pending')
const correctionEdit = computed<SubmissionEdit>(() => correctionChanges(baseline.value, corrections))
const correctionsDirty = computed(() => Object.keys(correctionEdit.value).length > 0)
const reviewState = computed(() =>
  detail.value && payload.value
    ? { detail: detail.value, payload: payload.value, decisions, ticks, correctionsDirty: correctionsDirty.value }
    : null,
)
const blockers = computed(() => (reviewState.value ? publishBlockers(reviewState.value) : []))
const legacy = computed(() => (payload.value ? isLegacyPayload(payload.value) : false))
const title = computed(() => [payload.value?.brand, payload.value?.name].filter(Boolean).join(' ') || 'Unnamed product')
const submitter = computed(() => detail.value?.submitter_name ?? null)

const candidates = computed<DuplicateCandidate[]>(() => {
  const all = [...refusedCandidates.value, ...(detail.value?.duplicate_candidates ?? [])]
  return all.filter((c, i) => all.findIndex((o) => o.id === c.id) === i)
})
const exact = computed(() => candidates.value.filter((c) => c.exact))
const close = computed(() => candidates.value.filter((c) => !c.exact))

const knownCount = computed(() => detail.value?.ingredients.filter((i) => i.status === 'known').length ?? 0)
const newCount = computed(() => (detail.value?.ingredients.length ?? 0) - knownCount.value)

const productLink = (c: DuplicateCandidate) => `/product/${encodeURIComponent(c.slug ?? c.id)}`
const editLink = (c: DuplicateCandidate) => `/products/${encodeURIComponent(c.slug ?? c.id)}/edit`

const ingredientNote = (position: number): string => {
  const ingredient = detail.value?.ingredients.find((i) => i.position === position)
  if (!ingredient) return ''
  if (ingredient.status === 'known') return 'In our list'
  const s = matchState(ingredient)
  if (s === 'one') return `Will link to ${ingredient.existing_matches[0]!.name}`
  if (s === 'several') return 'Matches several, pick one'
  return 'Not in our list yet'
}

const toggle = (list: string[], item: string, on: boolean) => {
  const at = list.indexOf(item)
  if (on && at < 0) list.push(item)
  if (!on && at >= 0) list.splice(at, 1)
}

// --- Actions ---------------------------------------------------------------
const fail = (error: unknown, action: ReviewAction) => {
  const read = readReviewProblem(readApiProblem(error), action, readErrorCandidates(error))
  if (read.forbidden) emit('forbidden')
  if (read.candidates.length) refusedCandidates.value = read.candidates
  if (Object.keys(read.fields).length) Object.assign(correctionErrors, read.fields)
  problem.value = read
}

const patch = async (edit: SubmissionEdit, action: 'save' | 'resolve') => {
  busy.value = action
  problem.value = null
  try {
    apply(await editAdminSubmission(props.id, edit), false)
    addToast(action === 'save' ? 'Corrections saved' : 'Ingredient updated', 'success')
  } catch (error: unknown) {
    fail(error, 'save')
  } finally {
    busy.value = null
  }
}

const saveCorrections = () => {
  const found = validateCorrections(corrections, categories.value)
  replace(correctionErrors, found)
  if (Object.keys(found).length) return
  patch(correctionEdit.value, 'save')
}

const undoCorrections = () => {
  replace(corrections, { ...baseline.value })
  replace(correctionErrors, {})
  revokePreview()
  photoPreview.value = uploadedImageUrl(corrections.imagePath)
  photoError.value = ''
}

const resolveIngredient = (position: number, replacement: SubmissionIngredient) => {
  if (!payload.value) return
  patch({ ingredients: replaceIngredientAt(payload.value.ingredients, position, replacement) }, 'resolve')
}

const convertLegacy = () => {
  if (!payload.value) return
  patch({ ingredients: convertIngredients(payload.value.ingredients) }, 'resolve')
}

const photoInput = ref<HTMLInputElement | null>(null)
const onPhotoChosen = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const refused = checkPhotoFile(file)
  if (refused) {
    photoError.value = refused
    return
  }
  busy.value = 'photo'
  photoError.value = ''
  try {
    const uploaded = await uploadSubmissionImage(file)
    corrections.imagePath = uploaded.image_path
    revokePreview()
    photoPreview.value = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : uploaded.public_url
  } catch (error: unknown) {
    const { status } = readApiProblem(error)
    photoError.value =
      status === 413 ? 'That photo is over 5 MB. Choose a smaller one.'
        : status === 415 ? "That file isn't a JPG, PNG or WebP image. Choose a photo in one of those."
          : "The photo couldn't be uploaded. Try again in a moment."
  } finally {
    busy.value = null
  }
}

const removePhoto = () => {
  corrections.imagePath = null
  revokePreview()
  photoPreview.value = null
}

const publish = async () => {
  if (!reviewState.value || blockers.value.length) return
  busy.value = 'approve'
  problem.value = null
  try {
    const done = await approveSubmission(props.id, buildApproveBody(reviewState.value))
    dialog.value = null
    addToast(`Published. ${title.value} is now in Explore.`, 'success', 5000)
    emit('reviewed')
    router.push(`/product/${encodeURIComponent(done.slug)}`)
  } catch (error: unknown) {
    dialog.value = null
    fail(error, 'approve')
  } finally {
    busy.value = null
  }
}

const reject = async () => {
  if (notes.value.trim().length > REVIEW_NOTE_LIMIT) return
  busy.value = 'reject'
  problem.value = null
  try {
    await rejectSubmission(props.id, notes.value.trim() || null)
    dialog.value = null
    addToast(`Marked as not added. ${submitter.value ?? 'The sender'} can see it in My submissions.`, 'success', 5000)
    emit('reviewed')
    router.push('/admin/submissions')
  } catch (error: unknown) {
    dialog.value = null
    fail(error, 'reject')
  } finally {
    busy.value = null
  }
}

const reloadAfterProblem = () => {
  emit('reviewed')
  load()
}

const notesTooLong = computed(() => notes.value.trim().length > REVIEW_NOTE_LIMIT)
const field = 'h-11 px-3 rounded-xl border-[1.5px] bg-brand-surface-light dark:bg-stone-800 text-sm text-stone-800 dark:text-white'
const fieldBorder = (key: string) =>
  correctionErrors[key] ? 'border-red-700 dark:border-red-300' : 'border-brand-surface-border dark:border-stone-600'
</script>

<template>
  <div class="admin-review">
    <div v-if="state === 'loading'" class="py-16 flex flex-col gap-3" role="status" aria-busy="true">
      <span class="sr-only">Loading the submission</span>
      <div v-for="n in 3" :key="n" class="h-24 rounded-[18px] bg-brand-bg-light dark:bg-stone-800 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
    </div>

    <section v-else-if="state === 'failed'" class="review-failed py-10 flex flex-col items-center text-center" role="alert">
      <h2 class="font-serif text-xl font-bold text-stone-800 dark:text-white">Couldn't open this submission</h2>
      <p class="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{{ loadFailure }}</p>
      <button type="button" class="retry mt-5 min-h-12 px-6 rounded-2xl bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white font-bold transition-colors" @click="load">
        Try again
      </button>
    </section>

    <template v-else-if="detail && payload">
      <div class="flex flex-wrap justify-between items-start gap-3">
        <div class="flex flex-col gap-1 min-w-0">
          <p class="review-meta m-0 text-[13px] text-stone-500 dark:text-stone-400">{{ describeReviewMeta(detail) }}</p>
          <h2 class="review-title m-0 font-serif text-2xl lg:text-[28px] leading-tight font-bold text-stone-800 dark:text-white break-words">{{ title }}</h2>
        </div>
        <span v-if="!isPending" :class="['status-chip shrink-0 px-2.5 py-1 rounded-full text-xs font-extrabold', statusChip(detail.status).tone]">{{ statusChip(detail.status).text }}</span>
        <span v-else-if="candidates.length === 0" class="no-duplicate shrink-0 px-[11px] py-[5px] rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-[13px] font-extrabold">No duplicate found</span>
      </div>

      <!-- Already reviewed: what happened, nothing to change -->
      <section v-if="!isPending" class="reviewed-summary mt-4 rounded-[18px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark p-4 flex flex-col gap-2">
        <p class="m-0 text-sm text-stone-700 dark:text-stone-200">
          {{ detail.status === 'approved' ? 'Published' : 'Reviewed' }}<template v-if="formatDay(detail.reviewed_at)"> on {{ formatDay(detail.reviewed_at) }}</template>.
          {{ payload.category }}<template v-if="detail.ingredients.length"> · {{ detail.ingredients.length }} ingredients</template>
        </p>
        <RouterLink
          v-if="detail.status === 'approved' && detail.product_id"
          :to="`/product/${encodeURIComponent(detail.product_id)}`"
          class="min-h-11 inline-flex items-center text-sm font-extrabold text-brand-primary-strong-hover dark:text-brand-primary-accent"
        >View the product</RouterLink>
        <div v-if="detail.review_notes" class="px-3 py-2.5 rounded-xl bg-brand-bg-light dark:bg-stone-800">
          <span class="block text-xs font-extrabold text-stone-500 dark:text-stone-400">Note sent to {{ submitter ?? 'the sender' }}</span>
          <span class="block mt-1 text-sm leading-relaxed text-stone-800 dark:text-white whitespace-pre-line">{{ detail.review_notes }}</span>
        </div>
      </section>

      <template v-else>
        <!-- Duplicates -->
        <div v-if="exact.length" class="duplicate-exact mt-3.5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-100" role="alert">
          <div class="flex gap-2.5 items-start">
            <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9 16H3z" /><path d="M12 10v4M12 17h.01" /></svg>
            <span class="text-sm leading-relaxed">
              <strong>Already in the catalogue.</strong>
              "{{ exact[0]!.brand }} {{ exact[0]!.name }}" has the same brand and name, so this can't be published as a new product.
            </span>
          </div>
          <div v-for="c in exact" :key="c.id" class="mt-2.5 flex flex-wrap gap-2">
            <RouterLink :to="productLink(c)" class="open-existing min-h-11 px-3 rounded-xl bg-brand-surface-light dark:bg-brand-surface-dark text-stone-800 dark:text-white text-[13px] font-extrabold inline-flex items-center">
              Open existing product<span v-if="exact.length > 1" class="sr-only">: {{ c.brand }} {{ c.name }}</span>
            </RouterLink>
            <RouterLink :to="editLink(c)" class="edit-existing min-h-11 px-3 rounded-xl border-[1.5px] border-amber-800 dark:border-amber-100 text-[13px] font-extrabold inline-flex items-center">
              Edit it instead<span v-if="exact.length > 1" class="sr-only">: {{ c.brand }} {{ c.name }}</span>
            </RouterLink>
          </div>
        </div>
        <div v-if="close.length" class="duplicate-close mt-3.5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-100">
          <div class="flex gap-2.5 items-start">
            <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9 16H3z" /><path d="M12 10v4M12 17h.01" /></svg>
            <span class="text-sm leading-relaxed">
              <strong>Possibly already in the catalogue.</strong>
              <template v-for="(c, i) in close" :key="c.id">{{ i ? ', ' : ' ' }}"{{ c.brand }} {{ c.name }}"</template>
              {{ close.length === 1 ? 'has' : 'have' }} the same brand and a very similar name. Check before publishing.
            </span>
          </div>
          <div v-for="c in close" :key="c.id" class="mt-2.5 flex flex-wrap gap-2">
            <RouterLink :to="productLink(c)" class="open-existing min-h-11 px-3 rounded-xl bg-brand-surface-light dark:bg-brand-surface-dark text-stone-800 dark:text-white text-[13px] font-extrabold inline-flex items-center">
              Open existing product<span v-if="close.length > 1" class="sr-only">: {{ c.brand }} {{ c.name }}</span>
            </RouterLink>
            <RouterLink :to="editLink(c)" class="edit-existing min-h-11 px-3 rounded-xl border-[1.5px] border-amber-800 dark:border-amber-100 text-[13px] font-extrabold inline-flex items-center">
              Edit it instead<span v-if="close.length > 1" class="sr-only">: {{ c.brand }} {{ c.name }}</span>
            </RouterLink>
          </div>
        </div>

        <div class="mt-3.5 flex flex-col lg:flex-row lg:flex-wrap gap-3 lg:gap-5">
          <!-- Corrections -->
          <section aria-labelledby="review-details-h" class="corrections lg:flex-[1_1_280px] min-w-0 rounded-[18px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark p-4 flex flex-col gap-3">
            <h3 id="review-details-h" class="m-0 text-[15px] font-extrabold text-stone-800 dark:text-white">
              Details <span class="font-medium text-stone-500 dark:text-stone-400">(you can correct them)</span>
            </h3>
            <div class="flex flex-col gap-1.5">
              <label for="r-name" class="text-[13px] font-bold text-stone-500 dark:text-stone-400">Product name</label>
              <input id="r-name" v-model="corrections.name" type="text" maxlength="200" :class="[field, fieldBorder('name')]" :aria-invalid="correctionErrors.name ? 'true' : 'false'" :aria-describedby="correctionErrors.name ? 'r-name-error' : undefined" />
              <FieldError id="r-name-error" :message="correctionErrors.name" />
            </div>
            <div class="grid grid-cols-2 gap-2.5">
              <div class="flex flex-col gap-1.5 min-w-0">
                <label for="r-brand" class="text-[13px] font-bold text-stone-500 dark:text-stone-400">Brand</label>
                <input id="r-brand" v-model="corrections.brand" type="text" maxlength="200" :class="[field, fieldBorder('brand')]" :aria-invalid="correctionErrors.brand ? 'true' : 'false'" :aria-describedby="correctionErrors.brand ? 'r-brand-error' : undefined" />
                <FieldError id="r-brand-error" :message="correctionErrors.brand" />
              </div>
              <div class="flex flex-col gap-1.5 min-w-0">
                <label for="r-cat" class="text-[13px] font-bold text-stone-500 dark:text-stone-400">Category</label>
                <select id="r-cat" v-model="corrections.category" :class="[field, fieldBorder('category'), 'px-2.5']" :aria-invalid="correctionErrors.category ? 'true' : 'false'" :aria-describedby="correctionErrors.category ? 'r-cat-error' : undefined">
                  <option v-if="!categories.includes(corrections.category)" :value="corrections.category">{{ corrections.category || 'Choose one' }}</option>
                  <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
                </select>
                <FieldError id="r-cat-error" :message="correctionErrors.category" />
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2.5">
              <div class="flex flex-col gap-1.5 min-w-0">
                <label for="r-thb" class="text-[13px] font-bold text-stone-500 dark:text-stone-400">THB</label>
                <input id="r-thb" v-model="corrections.priceThb" type="text" inputmode="decimal" :class="[field, fieldBorder('priceThb')]" :aria-invalid="correctionErrors.priceThb ? 'true' : 'false'" :aria-describedby="correctionErrors.priceThb ? 'r-thb-error' : undefined" />
              </div>
              <div class="flex flex-col gap-1.5 min-w-0">
                <label for="r-usd" class="text-[13px] font-bold text-stone-500 dark:text-stone-400">USD</label>
                <input id="r-usd" v-model="corrections.priceUsd" type="text" inputmode="decimal" :class="[field, fieldBorder('priceUsd')]" :aria-invalid="correctionErrors.priceUsd ? 'true' : 'false'" :aria-describedby="correctionErrors.priceUsd ? 'r-usd-error' : undefined" />
              </div>
              <div class="flex flex-col gap-1.5 min-w-0">
                <label for="r-pao" class="text-[13px] font-bold text-stone-500 dark:text-stone-400">Use within</label>
                <select id="r-pao" v-model="corrections.paoMonths" :class="[field, 'px-2 border-brand-surface-border dark:border-stone-600']">
                  <option :value="null">Not printed</option>
                  <option v-for="m in PAO_MONTHS" :key="m" :value="m">{{ m }} months</option>
                </select>
              </div>
            </div>
            <FieldError id="r-thb-error" :message="correctionErrors.priceThb" />
            <FieldError id="r-usd-error" :message="correctionErrors.priceUsd" />

            <div class="flex gap-3 items-center">
              <span class="w-16 h-16 shrink-0 rounded-[14px] overflow-hidden bg-brand-bg-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-600 flex items-center justify-center">
                <img v-if="photoPreview" :src="photoPreview" alt="" class="w-full h-full object-cover" />
                <svg v-else class="w-6 h-6 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M21 17l-5-5-9 7" /></svg>
              </span>
              <span class="flex flex-col gap-1">
                <span class="text-[13px] font-bold text-stone-800 dark:text-white">
                  {{ corrections.imagePath ? (corrections.imagePath === baseline.imagePath ? `Photo from ${submitter ?? 'the sender'}` : 'New photo, not saved yet') : 'No photo' }}
                </span>
                <span class="flex gap-3">
                  <button type="button" class="replace-photo min-h-11 text-[13px] font-extrabold text-brand-primary-strong-hover dark:text-brand-primary-accent disabled:opacity-60" :disabled="busy !== null" @click="photoInput?.click()">
                    {{ busy === 'photo' ? 'Uploading' : corrections.imagePath ? 'Replace' : 'Add a photo' }}
                  </button>
                  <button v-if="corrections.imagePath" type="button" class="remove-photo min-h-11 text-[13px] font-extrabold text-red-800 dark:text-red-300" @click="removePhoto">Remove</button>
                </span>
              </span>
              <input ref="photoInput" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" tabindex="-1" aria-hidden="true" @change="onPhotoChosen" />
            </div>
            <FieldError id="r-photo-error" :message="photoError || correctionErrors.photo" />

            <div v-if="correctionsDirty" class="flex flex-wrap gap-2.5">
              <button type="button" class="save-corrections min-h-11 px-4 rounded-xl bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white text-sm font-extrabold disabled:opacity-60" :disabled="busy !== null" @click="saveCorrections">
                {{ busy === 'save' ? 'Saving' : 'Save corrections' }}
              </button>
              <button type="button" class="undo-corrections min-h-11 px-4 rounded-xl border-[1.5px] border-brand-surface-border dark:border-stone-600 text-sm font-bold text-stone-800 dark:text-white" :disabled="busy !== null" @click="undoCorrections">
                Undo
              </button>
            </div>
            <p v-if="detail.has_edits" class="m-0 text-xs text-stone-500 dark:text-stone-400">Shows earlier corrections. What {{ submitter ?? 'the sender' }} sent is kept as it was.</p>
          </section>

          <!-- Ingredients -->
          <section aria-labelledby="review-ings-h" class="lg:flex-[1_1_260px] min-w-0 rounded-[18px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark p-4">
            <div class="flex justify-between items-baseline gap-2">
              <h3 id="review-ings-h" class="m-0 text-[15px] font-extrabold text-stone-800 dark:text-white">Ingredients</h3>
              <span class="ingredient-counts text-[13px] font-bold text-stone-500 dark:text-stone-400">
                {{ newCount === 0 && knownCount > 0 ? `All ${knownCount} known` : `${knownCount} known · ${newCount} new` }}
              </span>
            </div>

            <div v-if="legacy" class="legacy-note mt-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-100 text-sm leading-relaxed">
              This submission uses the old format, so it can't be published as it is. Convert it first; nothing else changes.
              <button type="button" class="convert-legacy mt-2 min-h-11 px-3.5 rounded-xl border-[1.5px] border-amber-800 dark:border-amber-100 font-extrabold disabled:opacity-60" :disabled="busy !== null" @click="convertLegacy">
                {{ busy === 'resolve' ? 'Converting' : 'Convert it now' }}
              </button>
            </div>

            <ul class="mt-2.5 list-none p-0 m-0 flex flex-col">
              <li v-for="ingredient in detail.ingredients" :key="ingredient.position" class="review-ingredient flex items-center gap-2.5 min-h-11 py-1 border-t border-brand-surface-border dark:border-stone-600">
                <span class="flex-grow flex flex-col min-w-0">
                  <span class="text-sm font-bold text-stone-800 dark:text-white break-words">{{ ingredient.name ?? 'Unnamed ingredient' }}</span>
                  <span class="ingredient-note text-xs text-stone-500 dark:text-stone-400">{{ ingredientNote(ingredient.position) }}</span>
                </span>
                <span
                  :class="[
                    'px-[9px] py-[3px] rounded-full text-xs font-extrabold shrink-0',
                    ingredient.status === 'known'
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                      : 'bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
                  ]"
                >{{ ingredient.status === 'known' ? 'Known' : 'New' }}</span>
              </li>
            </ul>
            <p class="mt-2.5 mb-0 text-xs leading-relaxed text-stone-500 dark:text-stone-400">Publishing never changes an existing ingredient.</p>

            <template v-if="!legacy">
              <AdminIngredientDecision
                v-for="ingredient in newIngredients(detail)"
                :key="`${ingredient.position}-${ingredient.name}`"
                :ingredient="ingredient"
                :draft="decisions[ingredient.position]!"
                :submitter="submitter"
                :functional-groups="functionalGroups"
                :groups-failed="groupsFailed"
                :busy="busy !== null"
                @update="Object.assign(decisions[ingredient.position]!, $event)"
                @resolve="resolveIngredient(ingredient.position, $event)"
              />
            </template>
          </section>
        </div>

        <!-- Extras to publish -->
        <section aria-labelledby="review-extras-h" class="mt-3 rounded-[18px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark p-4">
          <h3 id="review-extras-h" class="m-0 text-[15px] font-extrabold text-stone-800 dark:text-white">Extras from {{ submitter ?? 'the sender' }}</h3>
          <template v-if="payload.benefits.length || payload.goodFor.length || payload.sources.length">
            <p class="mt-1 mb-0 text-[13px] text-stone-500 dark:text-stone-400">Tick what you've checked. Only ticked items are published.</p>
            <fieldset v-if="payload.benefits.length" class="mt-2.5 border-0 p-0 m-0 flex flex-col">
              <legend class="p-0 text-[13px] font-extrabold text-stone-800 dark:text-white">Key benefits</legend>
              <label v-for="b in payload.benefits" :key="b" class="flex items-center gap-2.5 min-h-11 text-sm text-brand-text dark:text-stone-200 cursor-pointer">
                <input type="checkbox" class="tick-benefit w-5 h-5 accent-brand-primary-strong dark:accent-brand-primary" :checked="ticks.benefits.includes(b)" @change="toggle(ticks.benefits, b, ($event.target as HTMLInputElement).checked)" />
                {{ b }}
              </label>
            </fieldset>
            <fieldset v-if="payload.goodFor.length" class="mt-2 border-0 p-0 m-0 flex flex-col">
              <legend class="p-0 text-[13px] font-extrabold text-stone-800 dark:text-white">Good for</legend>
              <label v-for="g in payload.goodFor" :key="g" class="flex items-center gap-2.5 min-h-11 text-sm text-brand-text dark:text-stone-200 cursor-pointer">
                <input type="checkbox" class="tick-good-for w-5 h-5 accent-brand-primary-strong dark:accent-brand-primary" :checked="ticks.goodFor.includes(g)" @change="toggle(ticks.goodFor, g, ($event.target as HTMLInputElement).checked)" />
                {{ g }}
              </label>
            </fieldset>
            <div v-for="s in payload.sources" :key="s.url" class="mt-2 px-3 py-2.5 rounded-xl bg-brand-bg-light dark:bg-stone-800 flex flex-col gap-1">
              <span class="text-[13px] font-extrabold text-stone-800 dark:text-white">Source link</span>
              <a :href="s.url" target="_blank" rel="noopener noreferrer" class="text-[13px] text-brand-primary-strong-hover dark:text-brand-primary-accent underline break-all">{{ s.url }}</a>
              <span class="text-xs text-stone-500 dark:text-stone-400">{{ s.title || 'No title' }}<template v-if="s.claims.length"> · shows the {{ s.claims.map((c) => SOURCE_CLAIM_LABEL[c].toLowerCase()).join(', ') }}</template></span>
              <label class="flex items-center gap-2.5 min-h-11 text-sm text-brand-text dark:text-stone-200 cursor-pointer">
                <input type="checkbox" class="tick-source w-5 h-5 accent-brand-primary-strong dark:accent-brand-primary" :checked="ticks.sourceUrls.includes(s.url)" @change="toggle(ticks.sourceUrls, s.url, ($event.target as HTMLInputElement).checked)" />
                I opened it and it matches
              </label>
            </div>
          </template>
          <p v-else class="mt-1 mb-0 text-[13px] text-stone-500 dark:text-stone-400">No benefits, concerns or links were sent.</p>
          <div v-if="payload.note" class="mt-3 px-3 py-2.5 rounded-xl bg-brand-bg-light dark:bg-stone-800">
            <span class="block text-xs font-extrabold text-stone-500 dark:text-stone-400">Note from {{ submitter ?? 'the sender' }}</span>
            <span class="block mt-1 text-sm leading-relaxed text-stone-800 dark:text-white whitespace-pre-line">{{ payload.note }}</span>
          </div>
        </section>

        <!-- Note to the sender -->
        <section class="mt-3 rounded-[18px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark p-4 flex flex-col gap-1.5">
          <label for="r-note" class="text-[15px] font-extrabold text-stone-800 dark:text-white">
            Note to {{ submitter ?? 'the sender' }} <span class="font-medium text-stone-500 dark:text-stone-400">(shown if you don't add it)</span>
          </label>
          <textarea
            id="r-note"
            v-model="notes"
            rows="2"
            :aria-invalid="notesTooLong || correctionErrors.notes ? 'true' : 'false'"
            aria-describedby="r-note-count r-note-error"
            :class="['px-3 py-2.5 rounded-xl border-[1.5px] bg-brand-surface-light dark:bg-stone-800 text-sm text-stone-800 dark:text-white resize-y', notesTooLong ? 'border-red-700 dark:border-red-300' : 'border-brand-surface-border dark:border-stone-600']"
          />
          <span id="r-note-count" class="text-xs text-stone-500 dark:text-stone-400">{{ notes.trim().length }} of {{ REVIEW_NOTE_LIMIT }} characters</span>
          <FieldError id="r-note-error" :message="notesTooLong ? `Keep the note to ${REVIEW_NOTE_LIMIT} characters` : correctionErrors.notes" />
        </section>

        <div v-if="problem" class="action-problem mt-3 p-3.5 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm leading-relaxed" role="alert">
          {{ problem.message }}
          <button v-if="problem.reloadQueue" type="button" class="reload-queue mt-2 block min-h-11 px-3.5 rounded-xl border-[1.5px] border-red-800 dark:border-red-200 font-extrabold" @click="reloadAfterProblem">
            Reload
          </button>
        </div>

        <!-- Decision bar: sticky above the bottom navigation on a phone, closing the card on a wide screen -->
        <div class="review-actions sticky bottom-16 sm:bottom-20 lg:static -mx-5 lg:mx-0 mt-4 px-5 lg:px-0 pt-3 pb-5 lg:pb-0 bg-brand-surface-light dark:bg-brand-surface-dark lg:bg-transparent lg:dark:bg-transparent border-t border-brand-surface-border dark:border-stone-600 flex flex-col gap-2">
          <ul v-if="blockers.length" id="publish-blockers" class="publish-blockers m-0 pl-4 text-xs leading-relaxed text-amber-800 dark:text-amber-200" aria-live="polite">
            <li v-for="b in blockers" :key="b">{{ b }}</li>
          </ul>
          <div class="grid grid-cols-2 lg:flex lg:justify-end gap-2.5">
            <button
              type="button"
              class="reject-button min-h-[52px] lg:min-h-12 lg:px-5 rounded-2xl border-[1.5px] border-red-800 dark:border-red-300 bg-brand-surface-light dark:bg-brand-surface-dark text-red-800 dark:text-red-300 text-[15px] font-extrabold disabled:opacity-60"
              :disabled="busy !== null || notesTooLong"
              @click="dialog = 'reject'"
            >
              Don't add
            </button>
            <button
              type="button"
              class="publish-button min-h-[52px] lg:min-h-12 lg:px-6 rounded-2xl text-[15px] font-extrabold transition-colors disabled:bg-stone-200 disabled:text-stone-600 dark:disabled:bg-stone-700 dark:disabled:text-stone-300 bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white"
              :disabled="blockers.length > 0 || busy !== null"
              :aria-describedby="blockers.length ? 'publish-blockers' : undefined"
              @click="dialog = 'publish'"
            >
              Publish
            </button>
          </div>
        </div>
      </template>
    </template>

    <ConfirmDialog
      v-if="dialog === 'publish'"
      title="Publish this product?"
      :text="`${title} appears in Explore straight away, with the extras you ticked. You can edit it afterwards.`"
      confirm-label="Publish now"
      :busy="busy === 'approve'"
      @confirm="publish"
      @cancel="dialog = null"
    />
    <ConfirmDialog
      v-if="dialog === 'reject'"
      title="Don't add this product?"
      :text="notes.trim() ? `${submitter ?? 'The sender'} will see it as Not added in My submissions, with your note.` : `${submitter ?? 'The sender'} will see it as Not added in My submissions, with no note.`"
      confirm-label="Don't add it"
      cancel-label="Keep reviewing"
      tone="danger"
      :busy="busy === 'reject'"
      @confirm="reject"
      @cancel="dialog = null"
    />
  </div>
</template>
