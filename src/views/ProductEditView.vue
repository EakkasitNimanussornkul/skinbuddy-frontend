<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { getProductBySlug, resolveRequestFailure } from '../api/products'
import { updateProduct, uploadProductPhoto, PRODUCT_EDIT_LIMITS } from '../api/productAdminApi'
import { getCategories, getConcernTags } from '../api/metaApi'
import { readApiProblem } from '../api/apiProblem'
import { PAO_MONTHS, type DuplicateCandidate } from '../api/submissionsApi'
import { NO_SOURCE_YET, SOURCE_CLAIM_LABEL, type ProductSourceClaim } from '../api/sources'
import type { IngredientHit } from '../api/ingredientsApi'
import { useToast } from '../composables/useToast'
import {
  PRODUCT_CLAIM_ORDER,
  buildProductPatch,
  checkSourceLink,
  cloneForm,
  formFromProduct,
  loadedUpdatedAt,
  photoUploadMessage,
  productChanges,
  readEditProblem,
  removeClaimSource,
  setClaimSource,
  sourceForClaim,
  sourcesWithoutLink,
  validateProductForm,
  type ProductChanges,
  type ProductForm,
} from '../components/Submissions/productEdit'
import { readErrorCandidates } from '../components/Submissions/adminReview'
import { checkBenefit, checkPhotoFile, isHttpUrl, moveItem, nextKey, type FieldErrors } from '../components/Submissions/submissionDraft'
import IngredientCombobox from '../components/Submissions/IngredientCombobox.vue'
import ChoiceChip from '../components/Submissions/ChoiceChip.vue'
import FieldError from '../components/Submissions/FieldError.vue'
import ConfirmDialog from '../components/Submissions/ConfirmDialog.vue'
import AdminForbidden from '../components/Submissions/AdminForbidden.vue'

/**
 * Edit a product (admin only; owner-approved design, 2026-10-04). Changes go
 * live on save.
 *
 * The save sends only the fields that changed, plus the `updated_at` the
 * product was loaded with - kept as the exact string, never parsed, or every
 * save would read as stale. If someone else saved first, the backend says so
 * (409 "stale") and the edits stay on screen until the admin reloads.
 * A brand or name change gives the product a new address, and the old one no
 * longer works, so the page moves to the address the save returns.
 */
const route = useRoute()
const router = useRouter()
const { addToast } = useToast()

const state = ref<'loading' | 'ready' | 'missing' | 'failed'>('loading')
const forbidden = ref(false)
const productId = ref('')
const updatedAt = ref<string | null>(null)
const original = ref<ProductForm | null>(null)
const form = reactive<ProductForm>({
  name: '',
  brand: '',
  category: '',
  description: '',
  priceThb: '',
  priceUsd: '',
  paoMonths: null,
  photo: { kind: 'none' },
  ingredients: [],
  goodFor: [],
  benefits: [],
  sources: [],
})
const errors = reactive<FieldErrors>({})
const unknownIds = ref<string[]>([])

const saving = ref(false)
const uploading = ref(false)
const saved = ref(false)
const stale = ref(false)
const clash = ref<DuplicateCandidate[] | null>(null)
const banner = ref('')
const photoError = ref('')

const categories = ref<string[]>([])
const concernTags = ref<string[]>([])

const replaceErrors = (next: FieldErrors) => {
  for (const key of Object.keys(errors)) delete errors[key]
  Object.assign(errors, next)
}

const revokePreview = () => {
  if (form.photo.kind === 'new' && form.photo.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(form.photo.previewUrl)
}

const show = (product: unknown) => {
  const loaded = formFromProduct(product)
  revokePreview()
  original.value = cloneForm(loaded)
  Object.assign(form, cloneForm(loaded))
  updatedAt.value = loadedUpdatedAt(product)
  productId.value = String((product as { id?: unknown } | null)?.id ?? '')
  replaceErrors({})
  unknownIds.value = []
  stale.value = false
  clash.value = null
  banner.value = ''
  photoError.value = ''
}

const load = async (identifier: string) => {
  state.value = 'loading'
  try {
    show(await getProductBySlug(identifier))
    state.value = 'ready'
  } catch (error: unknown) {
    state.value = resolveRequestFailure(error) === 'not-found' ? 'missing' : 'failed'
  }
}

const slug = computed(() => (typeof route.params.slug === 'string' ? route.params.slug : ''))
onMounted(() => {
  load(slug.value)
  getCategories().then((list) => (categories.value = list)).catch(() => {})
  getConcernTags().then((list) => (concernTags.value = list)).catch(() => {})
})
watch(slug, (next, previous) => {
  if (next && next !== previous && !saved.value) load(next)
})

// --- Changes -----------------------------------------------------------------
const changes = computed<ProductChanges>(() => (original.value ? productChanges(original.value, form) : {}))
const changeCount = computed(() => Object.keys(changes.value).length)
const changed = (key: keyof ProductChanges) => key in changes.value
const title = computed(() => [original.value?.brand, original.value?.name].filter(Boolean).join(' ') || 'This product')
const unlinked = computed(() => sourcesWithoutLink(form.sources))

const discard = () => {
  if (!original.value) return
  revokePreview()
  Object.assign(form, cloneForm(original.value))
  replaceErrors({})
  unknownIds.value = []
  banner.value = ''
  clash.value = null
  photoError.value = ''
}

// --- Photo -------------------------------------------------------------------
const photoInput = ref<HTMLInputElement | null>(null)
const photoUrl = computed(() =>
  form.photo.kind === 'current' ? form.photo.url : form.photo.kind === 'new' ? form.photo.previewUrl : null,
)

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
  uploading.value = true
  photoError.value = ''
  try {
    // Stored now, so a refused file is said at once; the product changes only on save.
    const uploaded = await uploadProductPhoto(productId.value, file)
    revokePreview()
    const preview = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : uploaded.public_url
    form.photo = { kind: 'new', imagePath: uploaded.image_path, previewUrl: preview }
  } catch (error: unknown) {
    const { status } = readApiProblem(error)
    if (status === 403) forbidden.value = true
    photoError.value = photoUploadMessage(status)
  } finally {
    uploading.value = false
  }
}

const removePhoto = () => {
  revokePreview()
  form.photo = { kind: 'none' }
}

// --- Ingredients ---------------------------------------------------------------
const listedIds = computed(() => form.ingredients.flatMap((i) => (i.id ? [i.id] : [])))
const addKnown = (hit: IngredientHit) => {
  if (form.ingredients.some((i) => i.id === hit.id)) return
  form.ingredients.push({ key: nextKey('ping'), id: hit.id, name: hit.name, functionalGroup: hit.functional_group })
}
const addNew = (name: string) => {
  const key = name.trim().toLowerCase()
  if (!key || form.ingredients.some((i) => !i.id && i.name.trim().toLowerCase() === key)) return
  form.ingredients.push({ key: nextKey('ping'), id: null, name: name.trim(), functionalGroup: null })
}
const removeIngredient = (index: number) => form.ingredients.splice(index, 1)

// --- Benefits ------------------------------------------------------------------
const benefitDraft = ref('')
const benefitError = ref('')
const addBenefit = () => {
  const refused = checkBenefit(form.benefits, benefitDraft.value)
  benefitError.value = refused ?? ''
  if (refused) return
  form.benefits.push(benefitDraft.value.trim())
  benefitDraft.value = ''
}
const toggleConcern = (tag: string) => {
  const at = form.goodFor.indexOf(tag)
  if (at >= 0) form.goodFor.splice(at, 1)
  else form.goodFor.push(tag)
}

// --- Sources, one per fact ---------------------------------------------------------
const editingClaim = ref<ProductSourceClaim | null>(null)
const linkDraft = reactive({ url: '', title: '' })
const linkErrors = reactive<FieldErrors>({})

const openClaim = (claim: ProductSourceClaim) => {
  const current = sourceForClaim(form.sources, claim)
  editingClaim.value = editingClaim.value === claim ? null : claim
  linkDraft.url = current?.url ?? ''
  linkDraft.title = current?.title ?? ''
  for (const key of Object.keys(linkErrors)) delete linkErrors[key]
}
const saveClaim = () => {
  if (!editingClaim.value) return
  const found = checkSourceLink(linkDraft)
  for (const key of Object.keys(linkErrors)) delete linkErrors[key]
  Object.assign(linkErrors, found)
  if (Object.keys(found).length) return
  form.sources = setClaimSource(form.sources, editingClaim.value, linkDraft)
  editingClaim.value = null
}
const unlinkClaim = (claim: ProductSourceClaim) => {
  form.sources = removeClaimSource(form.sources, claim)
  if (editingClaim.value === claim) editingClaim.value = null
}

// --- Saving --------------------------------------------------------------------
const focusFirstError = async () => {
  await nextTick()
  document.querySelector<HTMLElement>('.product-edit [aria-invalid="true"]')?.focus()
}

const save = async () => {
  if (!original.value || !updatedAt.value || saving.value || uploading.value) return
  const found = validateProductForm(form, categories.value)
  replaceErrors(found)
  if (Object.keys(found).length) {
    banner.value = 'Some fields need a fix before this can be saved.'
    await focusFirstError()
    return
  }
  if (changeCount.value === 0) return

  saving.value = true
  banner.value = ''
  clash.value = null
  stale.value = false
  unknownIds.value = []
  try {
    const result = await updateProduct(productId.value, buildProductPatch(updatedAt.value, changes.value))
    saved.value = true
    addToast('Saved. The changes are live.', 'success')
    // The returned slug: after a rename the old address no longer resolves.
    await router.push(`/product/${encodeURIComponent(result.slug)}`)
  } catch (error: unknown) {
    const read = readEditProblem(readApiProblem(error), readErrorCandidates(error))
    if (read.kind === 'stale') stale.value = true
    else if (read.kind === 'duplicate') clash.value = read.candidates
    else if (read.kind === 'forbidden') forbidden.value = true
    else {
      banner.value = read.message
      replaceErrors(read.fields)
      unknownIds.value = read.unknownIds
      await focusFirstError()
    }
  } finally {
    saving.value = false
  }
}

/** Their version, read by id: a rename by the other admin would have changed the slug. */
const reloadTheirs = () => load(productId.value || slug.value)

// --- Leaving -------------------------------------------------------------------
const needsLeaveWarning = () => !saved.value && changeCount.value > 0
const leaveOpen = ref(false)
let settleLeave: ((leave: boolean) => void) | null = null

onBeforeRouteLeave(() => {
  if (!needsLeaveWarning()) return true
  leaveOpen.value = true
  return new Promise<boolean>((resolve) => {
    settleLeave = resolve
  })
})
const answerLeave = (leave: boolean) => {
  leaveOpen.value = false
  settleLeave?.(leave)
  settleLeave = null
}
const cancel = () => {
  if (window.history.state?.back) router.back()
  else router.push(slug.value ? `/product/${encodeURIComponent(slug.value)}` : '/explore')
}

const onBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!needsLeaveWarning()) return
  event.preventDefault()
  event.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  revokePreview()
})

const field = 'h-11 px-3 rounded-xl border-[1.5px] bg-brand-surface-light dark:bg-stone-800 text-sm text-stone-800 dark:text-white'
const border = (key: string) => (errors[key] ? 'border-red-700 dark:border-red-300' : 'border-brand-surface-border dark:border-stone-600')
const card = 'rounded-[18px] lg:rounded-[22px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark p-4 lg:p-[22px]'
</script>

<template>
  <div class="product-edit min-h-screen flex flex-col bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-200">
    <div v-if="forbidden" class="w-full max-w-2xl mx-auto px-5 pt-10">
      <AdminForbidden />
    </div>

    <div v-else-if="state === 'loading'" class="py-32 text-center" role="status" aria-busy="true">
      <span class="text-sm font-bold text-stone-500 dark:text-stone-400">Loading the product</span>
    </div>

    <section v-else-if="state === 'missing' || state === 'failed'" class="edit-failed w-full max-w-md mx-auto px-5 pt-16 flex flex-col items-center text-center" role="alert">
      <h1 class="font-serif text-2xl font-bold text-stone-800 dark:text-white">{{ state === 'missing' ? "This product isn't in the catalogue" : "Couldn't load this product" }}</h1>
      <p class="mt-2 text-[15px] leading-relaxed text-stone-500 dark:text-stone-400">
        {{ state === 'missing' ? 'Its address may have changed after a rename. Find it in Explore.' : "We couldn't reach the catalogue. It may still exist; this is a connection problem." }}
      </p>
      <button v-if="state === 'failed'" type="button" class="retry mt-5 min-h-12 px-6 rounded-2xl bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white font-bold" @click="load(slug)">Try again</button>
      <RouterLink v-else to="/explore" class="mt-5 min-h-12 px-6 rounded-2xl border-[1.5px] border-brand-primary-strong dark:border-brand-primary text-brand-primary-strong-hover dark:text-brand-primary-accent font-bold inline-flex items-center">Go to Explore</RouterLink>
    </section>

    <div v-else class="flex flex-col flex-grow">
      <!-- The save bar: sticky at the top on a wide screen, at the bottom on a phone -->
      <div class="save-bar order-last lg:order-first sticky bottom-0 lg:top-0 z-30 border-t lg:border-t-0 lg:border-b border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark">
        <div class="w-full max-w-[1200px] mx-auto px-5 lg:px-8 py-3 lg:py-3 flex items-center gap-2.5 lg:gap-4">
          <span class="hidden lg:flex flex-col gap-0.5 flex-grow min-w-0">
            <span class="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-brand-primary-strong-hover dark:text-brand-primary-accent">
              <svg class="w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>
              Edit product
            </span>
            <span class="font-serif text-xl font-bold text-stone-800 dark:text-white truncate">{{ title }}</span>
          </span>
          <span class="change-count flex-grow lg:flex-grow-0 text-[13px] font-bold text-brand-primary-strong-hover dark:text-brand-primary-accent" aria-live="polite">
            {{ changeCount === 0 ? 'No changes yet' : changeCount === 1 ? '1 unsaved change' : `${changeCount} unsaved changes` }}
          </span>
          <button type="button" class="discard min-h-12 lg:min-h-11 px-4 rounded-[14px] lg:rounded-xl border-[1.5px] border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-sm font-bold text-stone-800 dark:text-white disabled:opacity-50" :disabled="changeCount === 0 || saving" @click="discard">
            Discard
          </button>
          <button type="button" class="save min-h-12 lg:min-h-11 px-[18px] rounded-[14px] lg:rounded-xl bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white text-[15px] lg:text-sm font-extrabold disabled:opacity-50" :disabled="changeCount === 0 || saving || uploading" :aria-busy="saving ? 'true' : undefined" @click="save">
            {{ saving ? 'Saving' : 'Save changes' }}
          </button>
        </div>
      </div>

      <div class="flex-grow w-full max-w-md mx-auto px-5 pt-5 pb-6 lg:max-w-[1200px] lg:px-8 lg:pt-6 lg:pb-10 flex flex-col gap-3 lg:gap-5">
        <!-- Phone header -->
        <div class="flex items-center justify-between h-11 lg:hidden">
          <button type="button" class="cancel-edit min-h-11 text-[15px] font-bold text-brand-text dark:text-stone-200" @click="cancel">Cancel</button>
          <span class="inline-flex items-center gap-1.5 text-[13px] font-bold text-stone-800 dark:text-white">
            <svg class="w-[15px] h-[15px] text-brand-primary-strong dark:text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>
            Edit product
          </span>
          <span class="w-[52px]" />
        </div>
        <div>
          <h1 class="m-0 font-serif text-2xl leading-tight font-bold text-stone-800 dark:text-white lg:sr-only">{{ title }}</h1>
          <p class="mt-1.5 mb-0 text-[13px] text-stone-500 dark:text-stone-400">Changes go live as soon as you save.</p>
        </div>

        <div v-if="stale" class="stale-banner flex flex-col sm:flex-row gap-3 items-start p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-100" role="alert">
          <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9 16H3z" /><path d="M12 10v4M12 17h.01" /></svg>
          <span class="flex-grow text-sm leading-relaxed"><strong>Someone else saved this product while you were editing.</strong> Your changes are still here. Reload to see theirs, then save again.</span>
          <button type="button" class="reload-theirs shrink-0 min-h-11 px-3.5 rounded-[10px] border-[1.5px] border-amber-800 dark:border-amber-100 text-[13px] font-extrabold" @click="reloadTheirs">Reload their version</button>
        </div>

        <div v-if="clash" class="clash-banner p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-100 text-sm leading-relaxed" role="alert">
          <template v-if="clash.length">
            <strong>Another product already has this brand and name:</strong>
            <template v-for="(c, i) in clash" :key="c.id">{{ i ? ',' : '' }} {{ c.brand }} {{ c.name }}</template>.
            Change the brand or name, or edit that product instead.
            <span class="mt-2 flex flex-wrap gap-2">
              <RouterLink v-for="c in clash" :key="c.id" :to="`/product/${encodeURIComponent(c.slug ?? c.id)}`" class="min-h-11 px-3 rounded-xl bg-brand-surface-light dark:bg-brand-surface-dark text-stone-800 dark:text-white text-[13px] font-extrabold inline-flex items-center">Open {{ c.brand }} {{ c.name }}</RouterLink>
            </span>
          </template>
          <template v-else><strong>Another product already has this brand and name.</strong> Change the brand or name, then save again.</template>
        </div>

        <p v-if="banner" class="edit-banner m-0 p-3.5 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm leading-relaxed" role="alert">{{ banner }}</p>

        <div class="flex flex-col lg:flex-row lg:flex-wrap gap-3 lg:gap-5 lg:items-start">
          <div class="lg:flex-[999_1_520px] min-w-0 flex flex-col gap-3 lg:gap-4">
            <!-- Details -->
            <section aria-labelledby="edit-details-h" :class="[card, 'flex flex-col gap-3']">
              <h2 id="edit-details-h" class="m-0 text-[15px] lg:text-base font-extrabold text-stone-800 dark:text-white">Details</h2>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div class="flex flex-col gap-1.5 min-w-0">
                  <label for="e-name" class="text-[13px] font-bold text-stone-500 dark:text-stone-400">Product name</label>
                  <input id="e-name" v-model="form.name" type="text" :maxlength="PRODUCT_EDIT_LIMITS.name" :class="[field, border('name')]" :aria-invalid="errors.name ? 'true' : 'false'" :aria-describedby="errors.name ? 'e-name-error' : undefined" />
                  <FieldError id="e-name-error" :message="errors.name" />
                  <span v-if="changed('name')" class="text-xs font-bold text-brand-primary-strong-hover dark:text-brand-primary-accent">Changed. The product's address changes too.</span>
                </div>
                <div class="flex flex-col gap-1.5 min-w-0">
                  <label for="e-brand" class="text-[13px] font-bold text-stone-500 dark:text-stone-400">Brand</label>
                  <input id="e-brand" v-model="form.brand" type="text" :maxlength="PRODUCT_EDIT_LIMITS.brand" :class="[field, border('brand')]" :aria-invalid="errors.brand ? 'true' : 'false'" :aria-describedby="errors.brand ? 'e-brand-error' : undefined" />
                  <FieldError id="e-brand-error" :message="errors.brand" />
                  <span v-if="changed('brand')" class="text-xs font-bold text-brand-primary-strong-hover dark:text-brand-primary-accent">Changed. The product's address changes too.</span>
                </div>
              </div>
              <div class="flex flex-col gap-1.5">
                <label for="e-desc" class="text-[13px] font-bold text-stone-500 dark:text-stone-400">Description</label>
                <textarea
                  id="e-desc"
                  v-model="form.description"
                  rows="3"
                  :aria-invalid="errors.description ? 'true' : 'false'"
                  aria-describedby="e-desc-count e-desc-error"
                  :class="['px-3 py-2.5 rounded-xl bg-brand-surface-light dark:bg-stone-800 text-sm leading-relaxed text-stone-800 dark:text-white resize-y', changed('description') && !errors.description ? 'border-2 border-brand-primary-strong dark:border-brand-primary' : ['border-[1.5px]', border('description')]]"
                />
                <span id="e-desc-count" class="text-xs text-stone-500 dark:text-stone-400">{{ form.description.trim().length }} of {{ PRODUCT_EDIT_LIMITS.description }} characters<template v-if="changed('description')"> · <strong class="text-brand-primary-strong-hover dark:text-brand-primary-accent">Changed</strong></template></span>
                <FieldError id="e-desc-error" :message="errors.description" />
              </div>
              <div class="grid grid-cols-3 lg:grid-cols-4 gap-2.5 lg:gap-3">
                <div class="col-span-3 lg:col-span-1 flex flex-col gap-1.5 min-w-0">
                  <label for="e-cat" class="text-[13px] font-bold text-stone-500 dark:text-stone-400">Category</label>
                  <select id="e-cat" v-model="form.category" :class="[field, border('category'), 'px-2.5']" :aria-invalid="errors.category ? 'true' : 'false'" :aria-describedby="errors.category ? 'e-cat-error' : undefined">
                    <option v-if="!categories.includes(form.category)" :value="form.category">{{ form.category || 'Choose one' }}</option>
                    <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
                  </select>
                  <FieldError id="e-cat-error" :message="errors.category" />
                </div>
                <div class="flex flex-col gap-1.5 min-w-0">
                  <label for="e-thb" class="text-[13px] font-bold text-stone-500 dark:text-stone-400">THB</label>
                  <input id="e-thb" v-model="form.priceThb" type="text" inputmode="decimal" :class="[field, border('priceThb')]" :aria-invalid="errors.priceThb ? 'true' : 'false'" :aria-describedby="errors.priceThb ? 'e-thb-error' : undefined" />
                </div>
                <div class="flex flex-col gap-1.5 min-w-0">
                  <label for="e-usd" class="text-[13px] font-bold text-stone-500 dark:text-stone-400">USD</label>
                  <input id="e-usd" v-model="form.priceUsd" type="text" inputmode="decimal" :class="[field, border('priceUsd')]" :aria-invalid="errors.priceUsd ? 'true' : 'false'" :aria-describedby="errors.priceUsd ? 'e-usd-error' : undefined" />
                </div>
                <div class="flex flex-col gap-1.5 min-w-0">
                  <label for="e-pao" class="text-[13px] font-bold text-stone-500 dark:text-stone-400">Use within</label>
                  <select id="e-pao" v-model="form.paoMonths" :class="[field, 'px-2 border-brand-surface-border dark:border-stone-600']">
                    <option :value="null">Not printed</option>
                    <option v-for="m in PAO_MONTHS" :key="m" :value="m">{{ m }} months</option>
                  </select>
                </div>
              </div>
              <FieldError id="e-thb-error" :message="errors.priceThb" />
              <FieldError id="e-usd-error" :message="errors.priceUsd" />
            </section>

            <!-- Ingredients -->
            <section aria-labelledby="edit-ings-h" :class="card">
              <div class="flex justify-between items-baseline gap-2">
                <h2 id="edit-ings-h" class="m-0 text-[15px] lg:text-base font-extrabold text-stone-800 dark:text-white">Ingredients</h2>
                <span class="text-[13px] font-bold text-stone-500 dark:text-stone-400">{{ form.ingredients.length }}</span>
              </div>
              <FieldError id="e-ings-error" :message="errors.ingredients" />
              <ol class="mt-2 list-none p-0 m-0">
                <li v-for="(ing, i) in form.ingredients" :key="ing.key" :class="['edit-ingredient flex items-center gap-1.5 min-h-[46px] border-t border-brand-surface-border dark:border-stone-600', ing.id && unknownIds.includes(ing.id) ? 'bg-red-50 dark:bg-red-900/30' : '']">
                  <span class="flex-grow flex flex-col min-w-0 py-1">
                    <span class="edit-ingredient-name text-sm font-bold text-stone-800 dark:text-white break-words">{{ ing.name }}</span>
                    <span v-if="!ing.id" class="text-xs text-amber-800 dark:text-amber-200">New: added by name only</span>
                    <span v-else-if="unknownIds.includes(ing.id)" class="text-xs text-red-800 dark:text-red-300">No longer in our list</span>
                  </span>
                  <button type="button" :aria-label="`Move ${ing.name} up`" class="move-up w-11 h-11 flex items-center justify-center text-stone-500 dark:text-stone-400 disabled:opacity-30" :disabled="i === 0" @click="moveItem(form.ingredients, i, i - 1)">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6" /></svg>
                  </button>
                  <button type="button" :aria-label="`Move ${ing.name} down`" class="move-down w-11 h-11 flex items-center justify-center text-stone-500 dark:text-stone-400 disabled:opacity-30" :disabled="i === form.ingredients.length - 1" @click="moveItem(form.ingredients, i, i + 1)">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  <button type="button" :aria-label="`Remove ${ing.name}`" class="remove-ingredient w-11 h-11 flex items-center justify-center text-stone-500 dark:text-stone-400" @click="removeIngredient(i)">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </li>
              </ol>
              <div class="mt-3 max-w-[420px]">
                <IngredientCombobox label="Add an ingredient" input-id="e-add" :listed-ids="listedIds" @pick-known="addKnown" @pick-new="addNew" />
              </div>
              <p class="mt-2.5 mb-0 text-xs leading-relaxed text-stone-500 dark:text-stone-400">Changing this list changes the product's % Match and safety checks. A new name is added to our list by name only.</p>
            </section>
          </div>

          <div class="lg:flex-[1_1_320px] min-w-0 flex flex-col gap-3 lg:gap-4">
            <!-- Photo -->
            <section aria-labelledby="edit-photo-h" :class="card">
              <h2 id="edit-photo-h" class="m-0 text-[15px] lg:text-base font-extrabold text-stone-800 dark:text-white">Photo</h2>
              <div class="mt-2.5 flex gap-3.5 items-center">
                <span class="w-[84px] h-[84px] shrink-0 rounded-2xl overflow-hidden bg-brand-bg-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-600 flex items-center justify-center">
                  <img v-if="photoUrl" :src="photoUrl" alt="" class="photo-preview w-full h-full object-contain" />
                  <svg v-else class="w-7 h-7 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M21 17l-5-5-9 7" /></svg>
                </span>
                <span class="flex flex-col gap-1.5 items-start">
                  <button type="button" class="replace-photo min-h-11 px-3.5 rounded-xl border-[1.5px] border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-sm font-extrabold text-stone-800 dark:text-white disabled:opacity-60" :disabled="uploading" @click="photoInput?.click()">
                    {{ uploading ? 'Uploading' : photoUrl ? 'Replace photo' : 'Add a photo' }}
                  </button>
                  <button v-if="photoUrl" type="button" class="remove-photo min-h-11 text-[13px] font-extrabold text-red-800 dark:text-red-300" @click="removePhoto">Remove photo</button>
                  <span class="text-xs text-stone-500 dark:text-stone-400">JPG, PNG or WebP, up to 5 MB{{ form.photo.kind === 'new' ? '. Shown once you save.' : '' }}</span>
                </span>
                <input ref="photoInput" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" tabindex="-1" aria-hidden="true" @change="onPhotoChosen" />
              </div>
              <FieldError id="e-photo-error" :message="photoError || errors.photo" />
            </section>

            <!-- Good for and benefits -->
            <section aria-labelledby="edit-goodfor-h" :class="card">
              <h2 id="edit-goodfor-h" class="m-0 text-[15px] lg:text-base font-extrabold text-stone-800 dark:text-white">Good for</h2>
              <div class="mt-2.5 flex flex-wrap gap-2">
                <ChoiceChip v-for="tag in concernTags" :key="tag" :label="tag" :pressed="form.goodFor.includes(tag)" @toggle="toggleConcern(tag)" />
                <span v-if="concernTags.length === 0" class="text-sm text-stone-500 dark:text-stone-400">The list of concerns couldn't be loaded.</span>
              </div>
              <FieldError id="e-goodfor-error" :message="errors.goodFor" />

              <h2 class="mt-4 mb-0 text-[15px] lg:text-base font-extrabold text-stone-800 dark:text-white">Key benefits</h2>
              <ul class="mt-2 list-none p-0 m-0">
                <li v-for="(b, i) in form.benefits" :key="`${i}-${b}`" class="edit-benefit flex items-center gap-2 min-h-11 border-t border-brand-surface-border dark:border-stone-600">
                  <span class="flex-grow text-sm text-stone-800 dark:text-white break-words">{{ b }}</span>
                  <button type="button" :aria-label="`Remove ${b}`" class="w-11 h-11 flex items-center justify-center text-stone-500 dark:text-stone-400" @click="form.benefits.splice(i, 1)">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </li>
              </ul>
              <div v-if="form.benefits.length < PRODUCT_EDIT_LIMITS.benefits" class="mt-2 flex gap-2">
                <label for="e-benefit" class="sr-only">Add a benefit</label>
                <input id="e-benefit" v-model="benefitDraft" type="text" :maxlength="PRODUCT_EDIT_LIMITS.benefit" placeholder="Add a benefit" :class="[field, 'flex-1 min-w-0', benefitError ? 'border-red-700 dark:border-red-300' : 'border-brand-surface-border dark:border-stone-600']" :aria-invalid="benefitError ? 'true' : 'false'" :aria-describedby="benefitError ? 'e-benefit-error' : undefined" @keydown.enter.prevent="addBenefit" />
                <button type="button" class="add-benefit min-h-11 px-3.5 rounded-xl bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary-strong-hover dark:text-brand-primary-accent text-sm font-extrabold" @click="addBenefit">Add</button>
              </div>
              <FieldError id="e-benefit-error" :message="benefitError || errors.benefits" />
            </section>

            <!-- Sources, one per fact -->
            <section aria-labelledby="edit-sources-h" :class="card">
              <h2 id="edit-sources-h" class="m-0 text-[15px] lg:text-base font-extrabold text-stone-800 dark:text-white">Where the details come from</h2>
              <ul class="mt-2.5 list-none p-0 m-0 flex flex-col gap-2">
                <li v-for="claim in PRODUCT_CLAIM_ORDER" :key="claim" class="claim-row px-3 py-2.5 rounded-xl bg-brand-bg-light dark:bg-stone-800">
                  <div class="flex items-center gap-2.5">
                    <span class="flex-grow flex flex-col gap-0.5 min-w-0">
                      <span class="text-xs font-extrabold text-stone-500 dark:text-stone-400">{{ SOURCE_CLAIM_LABEL[claim] }}</span>
                      <!-- A link only for a web address: the stored URL is not trusted to be one. -->
                      <a v-if="isHttpUrl(sourceForClaim(form.sources, claim)?.url ?? '')" :href="sourceForClaim(form.sources, claim)!.url" target="_blank" rel="noopener noreferrer" class="claim-source text-sm font-bold text-stone-800 dark:text-white underline break-words">{{ sourceForClaim(form.sources, claim)!.title || sourceForClaim(form.sources, claim)!.url }}</a>
                      <span v-else-if="sourceForClaim(form.sources, claim)" class="claim-source text-sm font-bold text-stone-800 dark:text-white break-words">{{ sourceForClaim(form.sources, claim)!.title || sourceForClaim(form.sources, claim)!.url }}</span>
                      <span v-else class="claim-empty text-sm font-bold text-stone-500 dark:text-stone-400">{{ NO_SOURCE_YET }}</span>
                    </span>
                    <button
                      type="button"
                      class="claim-toggle min-h-11 px-1 text-[13px] font-extrabold text-brand-primary-strong-hover dark:text-brand-primary-accent"
                      :aria-expanded="editingClaim === claim ? 'true' : 'false'"
                      :aria-controls="`claim-${claim}`"
                      @click="openClaim(claim)"
                    >
                      {{ sourceForClaim(form.sources, claim) ? 'Change' : 'Add' }}<span class="sr-only"> the source for the {{ SOURCE_CLAIM_LABEL[claim].toLowerCase() }}</span>
                    </button>
                    <button v-if="sourceForClaim(form.sources, claim)" type="button" class="claim-remove min-h-11 px-1 text-[13px] font-extrabold text-red-800 dark:text-red-300" @click="unlinkClaim(claim)">
                      Remove<span class="sr-only"> the source for the {{ SOURCE_CLAIM_LABEL[claim].toLowerCase() }}</span>
                    </button>
                  </div>
                  <div v-if="editingClaim === claim" :id="`claim-${claim}`" class="claim-editor mt-2 flex flex-col gap-2">
                    <label :for="`claim-${claim}-url`" class="text-xs font-bold text-stone-500 dark:text-stone-400">Web link</label>
                    <input :id="`claim-${claim}-url`" v-model="linkDraft.url" type="url" placeholder="https://" :class="[field, linkErrors.url ? 'border-red-700 dark:border-red-300' : 'border-brand-surface-border dark:border-stone-600']" :aria-invalid="linkErrors.url ? 'true' : 'false'" :aria-describedby="linkErrors.url ? `claim-${claim}-url-error` : undefined" />
                    <FieldError :id="`claim-${claim}-url-error`" :message="linkErrors.url" />
                    <label :for="`claim-${claim}-title`" class="text-xs font-bold text-stone-500 dark:text-stone-400">What it is</label>
                    <input :id="`claim-${claim}-title`" v-model="linkDraft.title" type="text" :maxlength="PRODUCT_EDIT_LIMITS.sourceTitle" placeholder="Brand product page" :class="[field, linkErrors.title ? 'border-red-700 dark:border-red-300' : 'border-brand-surface-border dark:border-stone-600']" :aria-invalid="linkErrors.title ? 'true' : 'false'" :aria-describedby="linkErrors.title ? `claim-${claim}-title-error` : undefined" />
                    <FieldError :id="`claim-${claim}-title-error`" :message="linkErrors.title" />
                    <div class="flex gap-2">
                      <button type="button" class="claim-save min-h-11 px-4 rounded-xl bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white text-sm font-extrabold" @click="saveClaim">Use this link</button>
                      <button type="button" class="min-h-11 px-4 rounded-xl border-[1.5px] border-brand-surface-border dark:border-stone-600 text-sm font-bold text-stone-800 dark:text-white" @click="editingClaim = null">Cancel</button>
                    </div>
                  </div>
                </li>
              </ul>
              <p class="mt-2.5 mb-0 text-xs leading-relaxed text-stone-500 dark:text-stone-400">Add a link only after opening it and checking it shows this.</p>
              <p v-if="unlinked.length" class="unlinked-note mt-1.5 mb-0 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                {{ unlinked.map((s) => s.title || 'A source').join(', ') }} {{ unlinked.length === 1 ? 'has' : 'have' }} no web link, so {{ unlinked.length === 1 ? 'it' : 'they' }} can't be kept if you change this section.
              </p>
              <FieldError id="e-sources-error" :message="errors.sources" />
            </section>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-if="leaveOpen"
      title="Leave without saving?"
      :text="changeCount === 1 ? 'Your change to this product isn\'t saved, so it will be lost.' : `Your ${changeCount} changes to this product aren't saved, so they will be lost.`"
      confirm-label="Leave and lose them"
      cancel-label="Keep editing"
      tone="danger"
      @confirm="answerLeave(true)"
      @cancel="answerLeave(false)"
    />
  </div>
</template>
