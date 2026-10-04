<script setup lang="ts">
import { computed, useId } from 'vue'
import type { IngredientHit } from '../../api/ingredientsApi'
import type { IngredientDecision, ReviewIngredient, SubmissionIngredient } from '../../api/submissionsApi'
import { decisionOptions, matchState, type DecisionDraft } from './adminReview'
import { isHttpUrl } from './submissionDraft'
import IngredientCombobox from './IngredientCombobox.vue'
import FieldError from './FieldError.vue'

/**
 * What to do with one new ingredient (owner-approved design, 2026-10-04).
 *
 * - No match in our list: add it with the sender's details (the functional
 *   group is the admin's pick from the list approve accepts, and the benefits
 *   line starts as what the sender said it is known for), add the name only,
 *   or drop it.
 * - One match: approve links that row whatever is chosen, so it is link or drop.
 * - Several: approve refuses to guess (SBAMB), so the admin picks the right
 *   one, which saves the choice to the submission first.
 *
 * The sender's details are shown as theirs and unchecked; nothing here is
 * published unless chosen.
 */
const props = defineProps<{
  ingredient: ReviewIngredient
  draft: DecisionDraft
  submitter: string | null
  functionalGroups: string[]
  groupsFailed: boolean
  busy: boolean
}>()
const emit = defineEmits<{ update: [patch: Partial<DecisionDraft>]; resolve: [replacement: SubmissionIngredient] }>()

const uid = useId()
const state = computed(() => matchState(props.ingredient))
const options = computed(() => decisionOptions(props.ingredient, props.submitter))
const name = computed(() => props.ingredient.name ?? 'Unnamed ingredient')
const whose = computed(() => (props.submitter ? `${props.submitter}'s details` : "The sender's details"))
const groupMissing = computed(() => props.draft.decision === 'with_details' && !props.draft.functionalGroup)

const pick = (decision: IngredientDecision) => emit('update', { decision })
const pickKnown = (hit: IngredientHit) => emit('resolve', { ingredient_id: hit.id })
const pickNew = (typed: string) => emit('resolve', { new_name: typed })
</script>

<template>
  <div class="ingredient-decision mt-3 rounded-[14px] border-[1.5px] border-amber-200 dark:border-amber-800 p-3">
    <div class="flex flex-wrap items-center gap-2">
      <span class="px-2 py-[3px] rounded-full bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-[11px] font-extrabold">New ingredient</span>
      <span class="decision-name text-[15px] font-extrabold text-stone-800 dark:text-white break-words">{{ name }}</span>
    </div>

    <p v-if="state === 'one'" class="match-one mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-200">
      Already in our list as <strong>{{ ingredient.existing_matches[0]!.name }}</strong>. Publishing links that one; nothing new is added.
    </p>

    <div class="mt-2.5 px-3 py-2.5 rounded-xl bg-brand-bg-light dark:bg-stone-800">
      <span class="block text-xs font-extrabold text-stone-500 dark:text-stone-400">{{ whose }} (not checked)</span>
      <template v-if="ingredient.details">
        <span v-if="ingredient.details.roles.length" class="block mt-1 text-sm leading-relaxed text-stone-800 dark:text-white">What it does: {{ ingredient.details.roles.join(', ') }}</span>
        <span v-if="ingredient.details.known_for" class="block text-sm leading-relaxed text-stone-800 dark:text-white break-words">Known for: {{ ingredient.details.known_for }}</span>
        <!-- A link only for a web address: what the sender typed is not trusted to be one. -->
        <a
          v-if="ingredient.details.source_url && isHttpUrl(ingredient.details.source_url)"
          :href="ingredient.details.source_url"
          target="_blank"
          rel="noopener noreferrer"
          class="ingredient-source-link block text-[13px] text-brand-primary-strong-hover dark:text-brand-primary-accent underline break-all"
        >{{ ingredient.details.source_url }}</a>
        <span v-else-if="ingredient.details.source_url" class="ingredient-source-text block text-[13px] text-stone-700 dark:text-stone-200 break-all">{{ ingredient.details.source_url }} (not a web link)</span>
        <span v-else class="block text-[13px] text-stone-500 dark:text-stone-400">No link given</span>
      </template>
      <span v-else class="block mt-1 text-sm text-stone-500 dark:text-stone-400">No details given</span>
    </div>

    <!-- Several matches: pick one before anything else -->
    <div v-if="state === 'several'" class="match-several mt-3">
      <p class="m-0 text-sm font-bold text-amber-800 dark:text-amber-200">Matches several in our list, so pick the right one.</p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="match in ingredient.existing_matches"
          :key="match.id"
          type="button"
          class="use-match min-h-11 px-3.5 rounded-xl border-[1.5px] border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-sm font-bold text-stone-800 dark:text-white hover:border-brand-primary-strong dark:hover:border-brand-primary disabled:opacity-60"
          :disabled="busy"
          @click="emit('resolve', { ingredient_id: match.id })"
        >
          Use {{ match.name }}
        </button>
      </div>
      <div class="mt-3">
        <IngredientCombobox :label="`Or search our list for ${name}`" :input-id="`${uid}-search`" @pick-known="pickKnown" @pick-new="pickNew" />
      </div>
    </div>

    <template v-else>
      <fieldset class="mt-2.5 border-0 p-0 m-0 flex flex-col">
        <legend class="p-0 text-[13px] font-extrabold text-stone-800 dark:text-white">Add it to our list</legend>
        <label
          v-for="option in options"
          :key="option.value"
          class="flex items-center gap-2.5 min-h-11 text-sm text-brand-text dark:text-stone-200 cursor-pointer"
        >
          <input
            type="radio"
            :name="`${uid}-decision`"
            :value="option.value"
            :checked="draft.decision === option.value"
            class="decision-option w-5 h-5 accent-brand-primary-strong dark:accent-brand-primary"
            @change="pick(option.value)"
          />
          {{ option.label }}
        </label>
      </fieldset>

      <div v-if="draft.decision === 'with_details'" class="with-details mt-2 flex flex-col gap-3">
        <div class="flex flex-col gap-1.5">
          <label :for="`${uid}-group`" class="text-[13px] font-bold text-stone-500 dark:text-stone-400">Functional group *</label>
          <select
            :id="`${uid}-group`"
            :value="draft.functionalGroup"
            :aria-invalid="groupMissing ? 'true' : 'false'"
            :aria-describedby="groupMissing ? `${uid}-group-error` : undefined"
            class="functional-group h-11 px-2.5 rounded-xl border-[1.5px] border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-stone-800 text-sm text-stone-800 dark:text-white"
            @change="emit('update', { functionalGroup: ($event.target as HTMLSelectElement).value })"
          >
            <option value="">Choose one</option>
            <option v-for="group in functionalGroups" :key="group" :value="group">{{ group }}</option>
          </select>
          <FieldError
            :id="`${uid}-group-error`"
            :message="groupMissing ? (groupsFailed ? 'The list of groups could not be loaded. Reload the page to try again.' : 'Choose the group it belongs to') : undefined"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label :for="`${uid}-benefits`" class="text-[13px] font-bold text-stone-500 dark:text-stone-400">What it does, as shown on product pages</label>
          <textarea
            :id="`${uid}-benefits`"
            :value="draft.benefits"
            rows="2"
            class="benefits-text px-3 py-2.5 rounded-xl border-[1.5px] border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-stone-800 text-sm text-stone-800 dark:text-white resize-y"
            @input="emit('update', { benefits: ($event.target as HTMLTextAreaElement).value })"
          />
          <span class="text-xs text-stone-500 dark:text-stone-400">Starts as what {{ submitter ?? 'the sender' }} wrote. Leave it empty to show nothing.</span>
        </div>
        <label v-if="ingredient.details?.source_url" class="flex items-center gap-2.5 min-h-11 text-sm text-brand-text dark:text-stone-200 cursor-pointer">
          <input
            type="checkbox"
            :checked="draft.publishSource"
            class="publish-ingredient-source w-5 h-5 accent-brand-primary-strong dark:accent-brand-primary"
            @change="emit('update', { publishSource: ($event.target as HTMLInputElement).checked })"
          />
          I opened the link and it backs this
        </label>
      </div>
    </template>
  </div>
</template>
