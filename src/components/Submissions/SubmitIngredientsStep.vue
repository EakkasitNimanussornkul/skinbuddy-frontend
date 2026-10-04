<script setup lang="ts">
import { computed, inject, reactive, ref, useId } from 'vue'
import {
  matchIngredients,
  splitIngredientList,
  MATCH_MAX_NAMES,
  type IngredientHit,
} from '../../api/ingredientsApi'
import { INGREDIENT_ROLES, SUBMISSION_LIMITS, type IngredientRole } from '../../api/submissionsApi'
import {
  DRAFT_CONTEXT,
  countIngredients,
  describeIngredientCounts,
  ingredientFromMatch,
  isAlreadyListed,
  knownIngredient,
  moveItem,
  newIngredient,
  type DraftIngredient,
} from './submissionDraft'
import IngredientCombobox from './IngredientCombobox.vue'
import ChoiceChip from './ChoiceChip.vue'
import FieldError from './FieldError.vue'

// Step 2: the ingredient list, in pack order. Search and add one at a time, or
// paste the whole list and have it matched; then reorder, remove, and say what
// you know about any ingredient that is new to us.
const { draft, errors } = inject(DRAFT_CONTEXT)!
const uid = useId()

const announcement = ref('')
const counts = computed(() => countIngredients(draft.ingredients))
const listedIds = computed(() => draft.ingredients.map((item) => item.id).filter((id): id is string => !!id))

const clearListError = () => {
  delete errors.ingredients
}

const add = (item: DraftIngredient) => {
  if (isAlreadyListed(draft.ingredients, item)) {
    announcement.value = `${item.name} is already in your list.`
    return
  }
  draft.ingredients.push(item)
  clearListError()
  announcement.value = `Added ${item.name}. ${draft.ingredients.length} ${draft.ingredients.length === 1 ? 'ingredient' : 'ingredients'}.`
}

const onPickKnown = (hit: IngredientHit) => add(knownIngredient(hit))
const onPickNew = (name: string) => add(newIngredient(name))

const clearRowErrors = (item: DraftIngredient) => {
  for (const field of ['name', 'knownFor', 'sourceUrl']) delete errors[`ing.${item.key}.${field}`]
}

const remove = (index: number) => {
  const [item] = draft.ingredients.splice(index, 1)
  if (!item) return
  clearRowErrors(item)
  announcement.value = `Removed ${item.name}.`
}

const move = (index: number, by: -1 | 1) => {
  const item = draft.ingredients[index]
  moveItem(draft.ingredients, index, index + by)
  if (item) announcement.value = `${item.name} moved to position ${draft.ingredients.indexOf(item) + 1}.`
}

/** Settle a row in place: an ambiguous paste, or one of ours the server no longer knows. */
const resolveKnown = (index: number, hit: IngredientHit) => {
  const current = draft.ingredients[index]
  if (!current) return
  if (draft.ingredients.some((item, i) => i !== index && item.id === hit.id)) {
    announcement.value = `${hit.name} is already in your list.`
    return
  }
  clearRowErrors(current)
  draft.ingredients.splice(index, 1, knownIngredient(hit))
  announcement.value = `${current.name} is now ${hit.name}, from our list.`
}

const resolveNew = (index: number, name?: string) => {
  const current = draft.ingredients[index]
  if (!current) return
  clearRowErrors(current)
  const replacement = newIngredient(name || current.name)
  draft.ingredients.splice(index, 1, replacement)
  announcement.value = `${replacement.name} will be added as a new ingredient.`
}

// --- Paste the full list ----------------------------------------------------

const pasteOpen = ref(false)
const pasteText = ref('')
const pasteState = ref<'idle' | 'matching'>('idle')
const pasteMessage = ref('')
const pasteFailed = ref(false)

const matchPasted = async () => {
  pasteMessage.value = ''
  pasteFailed.value = false
  const names = splitIngredientList(pasteText.value)
  if (names.length === 0) {
    pasteFailed.value = true
    pasteMessage.value = 'Paste the ingredient list first, separated by commas or new lines.'
    return
  }
  if (names.length > MATCH_MAX_NAMES) {
    pasteFailed.value = true
    pasteMessage.value = `That's ${names.length} ingredients. Paste up to ${MATCH_MAX_NAMES} at a time.`
    return
  }

  pasteState.value = 'matching'
  try {
    const matches = await matchIngredients(names)
    let added = 0
    let skipped = 0
    for (const match of matches) {
      const item = ingredientFromMatch(match)
      if (isAlreadyListed(draft.ingredients, item)) {
        skipped += 1
        continue
      }
      draft.ingredients.push(item)
      added += 1
    }
    if (added > 0) clearListError()
    const now = countIngredients(draft.ingredients)
    const parts = [`Added ${added}`]
    if (skipped) parts.push(`${skipped} already in your list`)
    if (now.ambiguous) parts.push(`${now.ambiguous} to pick from several matches`)
    pasteMessage.value = `${parts.join(', ')}.`
    pasteText.value = ''
  } catch {
    pasteFailed.value = true
    pasteMessage.value = "We couldn't check the list right now. Try again, or add them one at a time."
  } finally {
    pasteState.value = 'idle'
  }
}

// --- New ingredient details -------------------------------------------------

const detailsOpen = reactive<Record<string, boolean>>({})
const newItems = computed(() => draft.ingredients.filter((item) => item.kind === 'new'))
const hasDetailError = (item: DraftIngredient) => !!(errors[`ing.${item.key}.knownFor`] || errors[`ing.${item.key}.sourceUrl`])
const isDetailsOpen = (item: DraftIngredient) => !!detailsOpen[item.key] || hasDetailError(item)

const toggleRole = (item: DraftIngredient, role: IngredientRole) => {
  item.roles = item.roles.includes(role) ? item.roles.filter((r) => r !== role) : [...item.roles, role]
}

const described = (field: string) => (errors[field] ? `${uid}-${field}-err` : undefined)
const clear = (field: string) => {
  delete errors[field]
}

const BADGE = {
  known: { text: 'In our list', tone: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  new: { text: 'New', tone: 'bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  ambiguous: { text: 'Pick one', tone: 'bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
} as const
</script>

<template>
  <div class="flex flex-col">
    <IngredientCombobox
      class="mt-[18px]"
      label="Find an ingredient"
      input-id="sub-ingredient-search"
      :listed-ids="listedIds"
      @pick-known="onPickKnown"
      @pick-new="onPickNew"
    />

    <!-- Paste the whole list -->
    <div class="mt-3">
      <button
        type="button"
        class="paste-toggle min-h-11 inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-primary-strong-hover dark:text-brand-primary-accent"
        :aria-expanded="pasteOpen ? 'true' : 'false'"
        :aria-controls="`${uid}-paste`"
        @click="pasteOpen = !pasteOpen"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h10M4 17h7" /></svg>
        Have the full list? Paste it instead
      </button>
      <div v-show="pasteOpen" :id="`${uid}-paste`" class="mt-2 flex flex-col gap-2">
        <label :for="`${uid}-paste-text`" class="text-[13px] font-bold text-stone-600 dark:text-stone-300">
          The ingredient list, as printed (commas or new lines between them)
        </label>
        <textarea
          :id="`${uid}-paste-text`"
          v-model="pasteText"
          rows="4"
          placeholder="Water, Glycerin, Niacinamide, ..."
          class="px-3 py-2.5 rounded-xl border-[1.5px] border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-stone-800 text-sm text-stone-800 dark:text-white placeholder:text-stone-400 resize-y focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
        />
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="paste-match min-h-11 px-4 rounded-xl bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary-strong-hover dark:text-brand-primary-accent text-sm font-extrabold disabled:opacity-60"
            :disabled="pasteState === 'matching'"
            @click="matchPasted"
          >
            {{ pasteState === 'matching' ? 'Checking the list...' : 'Check and add them' }}
          </button>
          <p
            v-if="pasteMessage"
            :class="['paste-message text-[13px]', pasteFailed ? 'font-semibold text-red-800 dark:text-red-300' : 'text-stone-600 dark:text-stone-300']"
            role="status"
          >
            {{ pasteMessage }}
          </p>
        </div>
      </div>
    </div>

    <!-- The list -->
    <div class="mt-3.5 flex items-baseline justify-between gap-3">
      <span class="ingredient-count text-sm font-extrabold text-stone-800 dark:text-white">
        {{ counts.total }} {{ counts.total === 1 ? 'ingredient' : 'ingredients' }}
      </span>
      <span class="ingredient-breakdown text-xs text-stone-500 dark:text-stone-400">{{ describeIngredientCounts(counts) }}</span>
    </div>
    <FieldError id="ingredients-err" :message="errors.ingredients" class="mt-1.5" />

    <ol
      v-if="draft.ingredients.length"
      id="sub-ingredient-list"
      class="mt-2.5 list-none p-0 rounded-2xl border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark overflow-hidden"
      :aria-describedby="errors.ingredients ? 'ingredients-err' : undefined"
    >
      <li
        v-for="(item, index) in draft.ingredients"
        :key="item.key"
        class="ingredient-row border-t first:border-t-0 border-brand-surface-border dark:border-stone-600"
      >
        <div class="flex items-center gap-2 min-h-12 pl-3 pr-1">
          <span class="w-5 text-xs font-extrabold text-stone-500 dark:text-stone-400 shrink-0">{{ index + 1 }}</span>
          <span class="ingredient-name flex-grow min-w-0 text-sm font-bold text-stone-800 dark:text-white break-words py-2">{{ item.name }}</span>
          <span :class="['ingredient-badge px-2 py-0.5 rounded-full text-[11px] font-extrabold shrink-0', BADGE[item.kind].tone]">{{ BADGE[item.kind].text }}</span>
          <button
            type="button"
            class="move-up w-11 h-11 flex items-center justify-center rounded-lg text-stone-500 dark:text-stone-400 hover:text-brand-primary-strong dark:hover:text-brand-primary disabled:opacity-30"
            :aria-label="`Move ${item.name} up`"
            :disabled="index === 0"
            @click="move(index, -1)"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
          </button>
          <button
            type="button"
            class="move-down w-11 h-11 flex items-center justify-center rounded-lg text-stone-500 dark:text-stone-400 hover:text-brand-primary-strong dark:hover:text-brand-primary disabled:opacity-30"
            :aria-label="`Move ${item.name} down`"
            :disabled="index === draft.ingredients.length - 1"
            @click="move(index, 1)"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <button
            type="button"
            class="remove-ingredient w-11 h-11 flex items-center justify-center rounded-lg text-stone-500 dark:text-stone-400 hover:text-red-800 dark:hover:text-red-300"
            :aria-label="`Remove ${item.name}`"
            @click="remove(index)"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <!-- A row that needs the user: several matches, or an id we no longer know. -->
        <div v-if="errors[`ing.${item.key}.name`]" class="row-problem px-3 pb-3 flex flex-col gap-2">
          <FieldError :id="`${uid}-ing.${item.key}.name-err`" :message="errors[`ing.${item.key}.name`]" />
          <IngredientCombobox
            v-if="item.kind === 'ambiguous'"
            :label="`Find ${item.name} in our list`"
            :initial-query="item.name"
            :listed-ids="listedIds"
            @pick-known="resolveKnown(index, $event)"
            @pick-new="resolveNew(index, $event)"
          />
          <button
            v-if="item.kind !== 'new'"
            type="button"
            class="add-as-new self-start min-h-11 text-sm font-extrabold text-brand-primary-strong-hover dark:text-brand-primary-accent"
            @click="resolveNew(index)"
          >
            Add "{{ item.name }}" as a new ingredient instead
          </button>
        </div>
      </li>
    </ol>
    <p v-else class="mt-2.5 px-4 py-5 rounded-2xl border border-dashed border-stone-300 dark:border-stone-500 text-sm text-center text-stone-500 dark:text-stone-400">
      No ingredients yet. Search above, or paste the full list.
    </p>

    <!-- What the user knows about each new one -->
    <section
      v-for="item in newItems"
      :key="`details-${item.key}`"
      class="new-details mt-3.5 rounded-[18px] border-[1.5px] border-amber-200 dark:border-amber-800 bg-brand-surface-light dark:bg-brand-surface-dark px-4 py-3.5"
      :aria-labelledby="`${uid}-${item.key}-h`"
    >
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">New</span>
        <h2 :id="`${uid}-${item.key}-h`" class="m-0 text-[15px] font-extrabold text-stone-800 dark:text-white break-words">{{ item.name }}</h2>
      </div>
      <p class="mt-1.5 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
        It's not in our list yet, so it's added as written and waits for our team to approve it.
      </p>
      <button
        type="button"
        class="details-toggle mt-1 min-h-11 inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-primary-strong-hover dark:text-brand-primary-accent"
        :aria-expanded="isDetailsOpen(item) ? 'true' : 'false'"
        :aria-controls="`${uid}-${item.key}-details`"
        @click="detailsOpen[item.key] = !isDetailsOpen(item)"
      >
        Tell us about it (optional)
        <svg :class="['w-4 h-4 transition-transform motion-reduce:transition-none', isDetailsOpen(item) ? 'rotate-180' : '']" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>

      <div v-show="isDetailsOpen(item)" :id="`${uid}-${item.key}-details`" class="mt-2 flex flex-col gap-2.5">
        <fieldset class="border-0 p-0 m-0 flex flex-col gap-1.5">
          <legend class="p-0 text-[13px] font-bold text-stone-600 dark:text-stone-300">What it does</legend>
          <div class="flex flex-wrap gap-1.5 mt-1.5">
            <ChoiceChip
              v-for="role in INGREDIENT_ROLES"
              :key="role"
              :label="role"
              :pressed="item.roles.includes(role)"
              @toggle="toggleRole(item, role)"
            />
          </div>
        </fieldset>
        <div class="flex flex-col gap-1.5">
          <label :for="`${uid}-${item.key}-known`" class="text-[13px] font-bold text-stone-600 dark:text-stone-300">What it's known for</label>
          <input
            :id="`${uid}-${item.key}-known`"
            v-model="item.knownFor"
            type="text"
            :maxlength="SUBMISSION_LIMITS.knownFor + 20"
            :aria-invalid="errors[`ing.${item.key}.knownFor`] ? 'true' : undefined"
            :aria-describedby="[described(`ing.${item.key}.knownFor`), `${uid}-${item.key}-known-count`].filter(Boolean).join(' ')"
            :class="[
              'h-11 px-3 rounded-xl bg-brand-surface-light dark:bg-stone-800 text-sm text-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50',
              errors[`ing.${item.key}.knownFor`] ? 'border-2 border-red-800 dark:border-red-300' : 'border-[1.5px] border-brand-surface-border dark:border-stone-600',
            ]"
            @input="clear(`ing.${item.key}.knownFor`)"
          />
          <span :id="`${uid}-${item.key}-known-count`" class="text-xs text-stone-500 dark:text-stone-400">{{ item.knownFor.trim().length }} of {{ SUBMISSION_LIMITS.knownFor }} characters</span>
          <FieldError :id="`${uid}-ing.${item.key}.knownFor-err`" :message="errors[`ing.${item.key}.knownFor`]" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label :for="`${uid}-${item.key}-link`" class="text-[13px] font-bold text-stone-600 dark:text-stone-300">Where you read that</label>
          <input
            :id="`${uid}-${item.key}-link`"
            v-model="item.sourceUrl"
            type="url"
            inputmode="url"
            placeholder="A link, if you have one"
            :aria-invalid="errors[`ing.${item.key}.sourceUrl`] ? 'true' : undefined"
            :aria-describedby="described(`ing.${item.key}.sourceUrl`)"
            :class="[
              'h-11 px-3 rounded-xl bg-brand-surface-light dark:bg-stone-800 text-sm text-stone-800 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/50',
              errors[`ing.${item.key}.sourceUrl`] ? 'border-2 border-red-800 dark:border-red-300' : 'border-[1.5px] border-brand-surface-border dark:border-stone-600',
            ]"
            @input="clear(`ing.${item.key}.sourceUrl`)"
          />
          <FieldError :id="`${uid}-ing.${item.key}.sourceUrl-err`" :message="errors[`ing.${item.key}.sourceUrl`]" />
        </div>
      </div>
    </section>

    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
  </div>
</template>
