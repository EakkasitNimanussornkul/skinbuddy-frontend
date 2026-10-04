<script setup lang="ts">
import { computed, inject, ref, useId } from 'vue'
import { SOURCE_CLAIM_LABEL } from '../../api/sources'
import { PAO_MONTHS, SUBMISSION_LIMITS, SUBMISSION_SOURCE_CLAIMS, type PaoMonths } from '../../api/submissionsApi'
import { DRAFT_CONTEXT, checkBenefit, emptySource, summariseExtras, type DraftSource, type StepNumber } from './submissionDraft'
import ChoiceChip from './ChoiceChip.vue'
import FieldError from './FieldError.vue'

// Step 3: everything optional - price, period after opening, the pack's
// benefits and concerns, where it was seen, a note - then a summary to check
// before sending.
defineProps<{
  concernTags: string[]
  concernTagsState: 'loading' | 'ready' | 'failed'
}>()
const emit = defineEmits<{ edit: [step: StepNumber]; retryConcernTags: [] }>()

const { draft, errors } = inject(DRAFT_CONTEXT)!
const uid = useId()

const clear = (field: string) => {
  delete errors[field]
}
const described = (field: string) => (errors[field] ? `${uid}-${field}-err` : undefined)
const fieldClass = (field: string) => [
  'h-11 px-3 rounded-xl bg-brand-surface-light dark:bg-stone-800 text-sm text-stone-800 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/50',
  errors[field] ? 'border-2 border-red-800 dark:border-red-300' : 'border-[1.5px] border-brand-surface-border dark:border-stone-600',
]

// --- Period after opening: 6 / 12 / 24, or "Not printed" (null) ---------------
// "Not printed" sends the same null as choosing nothing; it is remembered only
// so the chip stays pressed. Pressing a chip that is on turns it off.
const choosePao = (months: PaoMonths | null) => {
  if (months === null) {
    draft.paoNotPrinted = !draft.paoNotPrinted
    draft.paoMonths = null
    return
  }
  draft.paoMonths = draft.paoMonths === months ? null : months
  draft.paoNotPrinted = false
}

// --- Benefits ----------------------------------------------------------------
const benefitInput = ref('')
const benefitError = ref('')
const addBenefit = () => {
  const problem = checkBenefit(draft.benefits, benefitInput.value)
  if (problem) {
    benefitError.value = problem
    return
  }
  draft.benefits.push(benefitInput.value.trim())
  benefitInput.value = ''
  benefitError.value = ''
  clear('benefits')
}
const removeBenefit = (index: number) => {
  draft.benefits.splice(index, 1)
  benefitError.value = ''
}

// --- Good for ----------------------------------------------------------------
const toggleConcern = (tag: string) => {
  draft.goodFor = draft.goodFor.includes(tag) ? draft.goodFor.filter((t) => t !== tag) : [...draft.goodFor, tag]
  clear('goodFor')
}

// --- Links -------------------------------------------------------------------
const addSource = () => {
  if (draft.sources.length >= SUBMISSION_LIMITS.sources) return
  draft.sources.push(emptySource())
}
const removeSource = (index: number) => {
  const [source] = draft.sources.splice(index, 1)
  if (source) for (const part of ['url', 'title', 'claims']) clear(`source.${source.key}.${part}`)
}
const toggleClaim = (source: DraftSource, claim: (typeof SUBMISSION_SOURCE_CLAIMS)[number]) => {
  source.claims = source.claims.includes(claim) ? source.claims.filter((c) => c !== claim) : [...source.claims, claim]
  clear(`source.${source.key}.claims`)
}

const extrasSummary = computed(() => summariseExtras(draft))
const productLine = computed(() => [draft.brand.trim(), draft.name.trim()].filter(Boolean).join(' '))
</script>

<template>
  <div class="flex flex-col">
    <!-- Price and period after opening -->
    <section class="mt-[18px] rounded-[18px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark p-4">
      <h2 class="m-0 text-[15px] font-extrabold text-stone-800 dark:text-white">Price</h2>
      <div class="grid grid-cols-2 gap-2.5 mt-2.5">
        <div class="flex flex-col gap-1.5">
          <label :for="`${uid}-thb`" class="text-[13px] font-bold text-stone-600 dark:text-stone-300">Thai baht</label>
          <input
            :id="`${uid}-thb`"
            v-model="draft.priceThb"
            type="text"
            inputmode="decimal"
            placeholder="e.g. 450"
            :aria-invalid="errors.priceThb ? 'true' : undefined"
            :aria-describedby="described('priceThb')"
            :class="fieldClass('priceThb')"
            @input="clear('priceThb')"
          />
          <FieldError :id="`${uid}-priceThb-err`" :message="errors.priceThb" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label :for="`${uid}-usd`" class="text-[13px] font-bold text-stone-600 dark:text-stone-300">US dollars</label>
          <input
            :id="`${uid}-usd`"
            v-model="draft.priceUsd"
            type="text"
            inputmode="decimal"
            placeholder="e.g. 12.50"
            :aria-invalid="errors.priceUsd ? 'true' : undefined"
            :aria-describedby="described('priceUsd')"
            :class="fieldClass('priceUsd')"
            @input="clear('priceUsd')"
          />
          <FieldError :id="`${uid}-priceUsd-err`" :message="errors.priceUsd" />
        </div>
      </div>

      <fieldset class="border-0 p-0 m-0 mt-3.5">
        <legend class="p-0 text-[13px] font-bold text-stone-600 dark:text-stone-300">Use within, after opening</legend>
        <div class="flex flex-wrap gap-2 mt-1.5">
          <ChoiceChip
            v-for="months in PAO_MONTHS"
            :key="months"
            :label="`${months} months`"
            :pressed="draft.paoMonths === months"
            @toggle="choosePao(months)"
          />
          <ChoiceChip label="Not printed" :pressed="draft.paoNotPrinted" @toggle="choosePao(null)" />
        </div>
        <FieldError :id="`${uid}-paoMonths-err`" :message="errors.paoMonths" />
      </fieldset>
    </section>

    <!-- Key benefits -->
    <section class="mt-3 rounded-[18px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark p-4">
      <h2 class="m-0 text-[15px] font-extrabold text-stone-800 dark:text-white">Key benefits</h2>
      <p class="mt-1 text-[13px] text-stone-500 dark:text-stone-400">What the pack says it does, in a few words each.</p>
      <ul v-if="draft.benefits.length" class="benefit-list list-none p-0 m-0 mt-2.5 flex flex-wrap gap-2">
        <li
          v-for="(benefit, index) in draft.benefits"
          :key="benefit"
          class="inline-flex items-center gap-0.5 min-h-9 pl-3 pr-0.5 rounded-full bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary-strong-hover dark:text-brand-primary-accent text-sm font-bold"
        >
          {{ benefit }}
          <button
            type="button"
            class="w-11 h-11 -my-1 flex items-center justify-center rounded-full"
            :aria-label="`Remove ${benefit}`"
            @click="removeBenefit(index)"
          >
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </li>
      </ul>
      <div class="flex gap-2 mt-2.5">
        <label :for="`${uid}-benefit`" class="sr-only">Add a benefit</label>
        <input
          :id="`${uid}-benefit`"
          v-model="benefitInput"
          type="text"
          placeholder="Add a benefit"
          :maxlength="SUBMISSION_LIMITS.benefit + 20"
          :disabled="draft.benefits.length >= SUBMISSION_LIMITS.benefits"
          :aria-invalid="benefitError ? 'true' : undefined"
          :aria-describedby="benefitError ? `${uid}-benefit-err` : `${uid}-benefit-hint`"
          :class="['flex-1 min-w-0 disabled:opacity-60', ...fieldClass(benefitError ? 'benefits' : '__none')]"
          @keydown.enter.prevent="addBenefit"
          @input="benefitError = ''"
        />
        <button
          type="button"
          class="add-benefit h-11 px-3.5 rounded-xl bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary-strong-hover dark:text-brand-primary-accent text-sm font-extrabold disabled:opacity-60"
          :disabled="draft.benefits.length >= SUBMISSION_LIMITS.benefits"
          @click="addBenefit"
        >
          Add
        </button>
      </div>
      <span :id="`${uid}-benefit-hint`" class="block mt-1.5 text-xs text-stone-500 dark:text-stone-400">
        {{ draft.benefits.length }} of {{ SUBMISSION_LIMITS.benefits }}, up to {{ SUBMISSION_LIMITS.benefit }} characters each
      </span>
      <FieldError :id="`${uid}-benefit-err`" :message="benefitError || errors.benefits" />
    </section>

    <!-- Good for -->
    <section class="mt-3 rounded-[18px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark p-4">
      <h2 class="m-0 text-[15px] font-extrabold text-stone-800 dark:text-white">Good for</h2>
      <p class="mt-1 text-[13px] text-stone-500 dark:text-stone-400">The skin concerns the pack says it's made for.</p>
      <div v-if="concernTagsState === 'loading'" class="flex flex-wrap gap-2 mt-2.5" aria-hidden="true">
        <span v-for="n in 5" :key="n" class="h-11 w-24 rounded-full bg-brand-surface-border/60 dark:bg-stone-700 animate-pulse motion-reduce:animate-none" />
      </div>
      <div v-else-if="concernTagsState === 'failed'" class="mt-2.5 flex flex-wrap items-center gap-3 text-sm text-stone-600 dark:text-stone-300">
        <span>We couldn't load the list of concerns.</span>
        <button
          type="button"
          class="min-h-11 px-4 rounded-xl border-[1.5px] border-brand-primary-strong dark:border-brand-primary text-brand-primary-strong-hover dark:text-brand-primary-accent font-bold"
          @click="emit('retryConcernTags')"
        >
          Try again
        </button>
      </div>
      <div v-else class="flex flex-wrap gap-2 mt-2.5" role="group" aria-label="Good for">
        <ChoiceChip
          v-for="tag in concernTags"
          :key="tag"
          :label="tag"
          :pressed="draft.goodFor.includes(tag)"
          @toggle="toggleConcern(tag)"
        />
      </div>
      <FieldError :id="`${uid}-goodFor-err`" :message="errors.goodFor" />
    </section>

    <!-- Where it was found -->
    <section class="mt-3 rounded-[18px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark p-4">
      <h2 class="m-0 text-[15px] font-extrabold text-stone-800 dark:text-white">Where you found it</h2>
      <p class="mt-1 text-[13px] text-stone-500 dark:text-stone-400">A link to the brand's page or a shop listing helps us check the details.</p>
      <div
        v-for="(source, index) in draft.sources"
        :key="source.key"
        class="source-card mt-2.5 p-3 rounded-[14px] bg-brand-bg-light dark:bg-stone-800/60 flex flex-col gap-2"
      >
        <div class="flex flex-col gap-1.5">
          <label :for="`${uid}-${source.key}-url`" class="text-[13px] font-bold text-stone-600 dark:text-stone-300">Link</label>
          <input
            :id="`${uid}-${source.key}-url`"
            v-model="source.url"
            type="url"
            inputmode="url"
            placeholder="https://"
            :aria-invalid="errors[`source.${source.key}.url`] ? 'true' : undefined"
            :aria-describedby="described(`source.${source.key}.url`)"
            :class="fieldClass(`source.${source.key}.url`)"
            @input="clear(`source.${source.key}.url`)"
          />
          <FieldError :id="`${uid}-source.${source.key}.url-err`" :message="errors[`source.${source.key}.url`]" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label :for="`${uid}-${source.key}-title`" class="text-[13px] font-bold text-stone-600 dark:text-stone-300">What it is</label>
          <input
            :id="`${uid}-${source.key}-title`"
            v-model="source.title"
            type="text"
            placeholder="e.g. Brand product page"
            :maxlength="SUBMISSION_LIMITS.sourceTitle + 20"
            :aria-invalid="errors[`source.${source.key}.title`] ? 'true' : undefined"
            :aria-describedby="described(`source.${source.key}.title`)"
            :class="fieldClass(`source.${source.key}.title`)"
            @input="clear(`source.${source.key}.title`)"
          />
          <FieldError :id="`${uid}-source.${source.key}.title-err`" :message="errors[`source.${source.key}.title`]" />
        </div>
        <fieldset class="border-0 p-0 m-0" :aria-describedby="described(`source.${source.key}.claims`)">
          <legend class="p-0 text-[13px] font-bold text-stone-600 dark:text-stone-300">It shows the</legend>
          <div class="flex flex-wrap gap-1.5 mt-1.5">
            <ChoiceChip
              v-for="claim in SUBMISSION_SOURCE_CLAIMS"
              :key="claim"
              :label="SOURCE_CLAIM_LABEL[claim]"
              :pressed="source.claims.includes(claim)"
              @toggle="toggleClaim(source, claim)"
            />
          </div>
          <FieldError :id="`${uid}-source.${source.key}.claims-err`" :message="errors[`source.${source.key}.claims`]" />
        </fieldset>
        <button
          type="button"
          class="remove-source self-start min-h-11 text-sm font-bold text-stone-600 dark:text-stone-300 hover:text-red-800 dark:hover:text-red-300"
          @click="removeSource(index)"
        >
          Remove this link
        </button>
      </div>
      <button
        v-if="draft.sources.length < SUBMISSION_LIMITS.sources"
        type="button"
        class="add-source mt-2.5 min-h-11 inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-primary-strong-hover dark:text-brand-primary-accent"
        @click="addSource"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        {{ draft.sources.length ? 'Add another link' : 'Add a link' }}
      </button>
      <FieldError :id="`${uid}-sources-err`" :message="errors.sources" />
    </section>

    <!-- Note -->
    <section class="mt-3 rounded-[18px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark p-4 flex flex-col gap-1.5">
      <label :for="`${uid}-note`" class="text-[15px] font-extrabold text-stone-800 dark:text-white">A note for our team</label>
      <textarea
        :id="`${uid}-note`"
        v-model="draft.note"
        rows="2"
        placeholder="e.g. new 2026 formula, the old one is still sold too"
        :maxlength="SUBMISSION_LIMITS.note + 50"
        :aria-invalid="errors.note ? 'true' : undefined"
        :aria-describedby="[described('note'), `${uid}-note-count`].filter(Boolean).join(' ')"
        :class="[
          'px-3 py-2.5 rounded-xl bg-brand-surface-light dark:bg-stone-800 text-sm text-stone-800 dark:text-white placeholder:text-stone-400 resize-y focus:outline-none focus:ring-2 focus:ring-brand-primary/50',
          errors.note ? 'border-2 border-red-800 dark:border-red-300' : 'border-[1.5px] border-brand-surface-border dark:border-stone-600',
        ]"
        @input="clear('note')"
      />
      <span :id="`${uid}-note-count`" class="text-xs text-stone-500 dark:text-stone-400">{{ draft.note.trim().length }} of {{ SUBMISSION_LIMITS.note }} characters</span>
      <FieldError :id="`${uid}-note-err`" :message="errors.note" />
    </section>

    <!-- Check before sending -->
    <section
      aria-labelledby="sub-check-h"
      class="check-summary mt-4 rounded-[18px] border-[1.5px] border-brand-primary-strong dark:border-brand-primary bg-brand-surface-light dark:bg-brand-surface-dark p-4"
    >
      <h2 id="sub-check-h" class="m-0 font-serif text-lg font-bold text-stone-800 dark:text-white">Check before sending</h2>
      <dl class="mt-2.5 grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-1 items-center text-sm">
        <dt class="text-stone-500 dark:text-stone-400">Product</dt>
        <dd class="m-0 font-bold text-stone-800 dark:text-white break-words">{{ productLine }}</dd>
        <button type="button" class="edit-basics min-h-11 px-1 text-[13px] font-extrabold text-brand-primary-strong-hover dark:text-brand-primary-accent underline" @click="emit('edit', 1)">
          Edit<span class="sr-only"> the product details</span>
        </button>
        <dt class="text-stone-500 dark:text-stone-400">Category</dt>
        <dd class="m-0 font-bold text-stone-800 dark:text-white">{{ draft.category }}</dd>
        <span />
        <dt class="text-stone-500 dark:text-stone-400">Ingredients</dt>
        <dd class="m-0 font-bold text-stone-800 dark:text-white">{{ draft.ingredients.length }}</dd>
        <button type="button" class="edit-ingredients min-h-11 px-1 text-[13px] font-extrabold text-brand-primary-strong-hover dark:text-brand-primary-accent underline" @click="emit('edit', 2)">
          Edit<span class="sr-only"> the ingredients</span>
        </button>
        <dt class="text-stone-500 dark:text-stone-400">Extras</dt>
        <dd class="extras-summary m-0 font-bold text-stone-800 dark:text-white">{{ extrasSummary }}</dd>
        <span />
      </dl>
    </section>
  </div>
</template>
