<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { searchIngredients, SEARCH_MAX_LENGTH, type IngredientHit } from '../../api/ingredientsApi'

/**
 * Search our ingredient list and pick a row, or add what was typed as new.
 *
 * The ARIA 1.2 combobox pattern: the input owns a listbox, the active option is
 * named by aria-activedescendant, arrows move, Enter picks, Escape closes. The
 * last option is always 'Add "<what you typed>" as a new ingredient', so a
 * name we do not have is never a dead end - and a failed search still offers it.
 */
const props = withDefaults(
  defineProps<{
    label: string
    /** Ids already listed: shown as such, and not picked twice. */
    listedIds?: string[]
    initialQuery?: string
    inputId?: string
  }>(),
  { listedIds: () => [], initialQuery: '', inputId: undefined },
)
const emit = defineEmits<{ pickKnown: [hit: IngredientHit]; pickNew: [name: string] }>()

/** How long typing must pause before a search is sent. */
const SEARCH_DEBOUNCE_MS = 250

const uid = useId()
const fieldId = computed(() => props.inputId ?? `${uid}-input`)
const listId = `${uid}-list`
const optionId = (i: number) => `${uid}-opt-${i}`

const query = ref(props.initialQuery)
const hits = ref<IngredientHit[]>([])
const state = ref<'idle' | 'loading' | 'ready' | 'failed'>('idle')
const open = ref(false)
const active = ref(0)

let timer: ReturnType<typeof setTimeout> | null = null
// Each search is numbered, and only the latest one's answer is shown: a slow
// answer for "ni" must not land on top of the answer for "niac".
let latest = 0

const trimmed = computed(() => query.value.trim())

interface Option {
  kind: 'hit' | 'new'
  hit?: IngredientHit
  listed?: boolean
}

const options = computed<Option[]>(() => {
  if (!trimmed.value) return []
  const rows: Option[] = hits.value.map((hit) => ({ kind: 'hit', hit, listed: props.listedIds.includes(hit.id) }))
  rows.push({ kind: 'new' })
  return rows
})

const expanded = computed(() => open.value && options.value.length > 0)

const runSearch = async (text: string) => {
  const ticket = ++latest
  state.value = 'loading'
  try {
    const found = await searchIngredients(text)
    if (ticket !== latest) return
    hits.value = found
    state.value = 'ready'
  } catch {
    if (ticket !== latest) return
    hits.value = []
    state.value = 'failed'
  }
  active.value = 0
}

watch(query, (text) => {
  if (timer) clearTimeout(timer)
  active.value = 0
  if (!text.trim()) {
    latest += 1
    hits.value = []
    state.value = 'idle'
    return
  }
  open.value = true
  timer = setTimeout(() => {
    timer = null
    runSearch(text.trim())
  }, SEARCH_DEBOUNCE_MS)
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})

// A prefilled query (resolving a pasted name) searches straight away.
if (props.initialQuery.trim()) runSearch(props.initialQuery.trim())

const choose = (index: number) => {
  const option = options.value[index]
  if (!option) return
  if (option.kind === 'hit' && option.hit) {
    if (option.listed) return
    emit('pickKnown', option.hit)
  } else {
    emit('pickNew', trimmed.value)
  }
  query.value = ''
  open.value = false
}

const onKeydown = (event: KeyboardEvent) => {
  const count = options.value.length
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!count) return
    if (!open.value) open.value = true
    else active.value = (active.value + 1) % count
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!count) return
    open.value = true
    active.value = (active.value - 1 + count) % count
  } else if (event.key === 'Enter') {
    if (!expanded.value) return
    event.preventDefault()
    // Not until the search has answered: Enter straight after typing
    // "glycerin" would otherwise add it as new before our Glycerin arrived.
    if (timer !== null || state.value === 'loading') return
    choose(active.value)
  } else if (event.key === 'Escape') {
    if (expanded.value) {
      event.preventDefault()
      event.stopPropagation()
      open.value = false
    }
  }
}

const secondLine = (option: Option): string => {
  const hit = option.hit!
  if (option.listed) return 'Already in your list'
  const parts = [hit.matched_alias ? `Matches "${hit.matched_alias}"` : '', hit.functional_group ?? '', 'in our list']
  const line = parts.filter(Boolean).join(' · ')
  return line.charAt(0).toUpperCase() + line.slice(1)
}

/** Read out after each search, since the list itself is not announced. */
const status = computed(() => {
  if (!trimmed.value || !open.value) return ''
  if (state.value === 'loading') return 'Searching'
  if (state.value === 'failed') return 'Search is not working right now. You can still add it as a new ingredient.'
  if (state.value === 'ready') {
    const n = hits.value.length
    return n === 0 ? 'Nothing in our list matches. You can add it as a new ingredient.' : `${n} ${n === 1 ? 'match' : 'matches'} in our list`
  }
  return ''
})
</script>

<template>
  <div class="relative">
    <label :for="fieldId" class="text-sm font-bold text-stone-800 dark:text-white">{{ label }}</label>
    <div
      class="mt-1.5 flex items-center gap-2 h-[50px] px-3 rounded-[14px] border-2 bg-brand-surface-light dark:bg-stone-800 border-brand-surface-border dark:border-stone-600 focus-within:border-brand-primary-strong dark:focus-within:border-brand-primary"
    >
      <svg class="w-[18px] h-[18px] text-stone-500 dark:text-stone-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
      <input
        :id="fieldId"
        v-model="query"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="expanded ? 'true' : 'false'"
        :aria-controls="listId"
        :aria-activedescendant="expanded ? optionId(active) : undefined"
        :maxlength="SEARCH_MAX_LENGTH"
        placeholder="Type a name, like niacinamide"
        class="flex-grow min-w-0 h-full border-0 outline-none bg-transparent text-[15px] text-stone-800 dark:text-white placeholder:text-stone-400"
        @keydown="onKeydown"
        @focus="open = true"
        @blur="open = false"
      />
    </div>

    <ul
      v-show="expanded"
      :id="listId"
      role="listbox"
      :aria-label="`${label}: results`"
      class="mt-1.5 p-1.5 list-none rounded-2xl border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark shadow-lg"
    >
      <li
        v-for="(option, i) in options"
        :id="optionId(i)"
        :key="option.kind === 'hit' ? option.hit!.id : 'new'"
        role="option"
        :aria-selected="i === active ? 'true' : 'false'"
        :aria-disabled="option.listed ? 'true' : undefined"
        :class="[
          'flex items-center gap-2.5 min-h-12 px-2.5 rounded-[10px] cursor-pointer',
          i === active ? 'bg-brand-primary-light dark:bg-brand-primary/15' : '',
          option.listed ? 'opacity-60 cursor-default' : '',
        ]"
        @mousedown.prevent="choose(i)"
        @mousemove="active = i"
      >
        <template v-if="option.kind === 'hit'">
          <span class="flex-grow flex flex-col min-w-0 py-1">
            <span :class="['text-[15px] font-bold', i === active ? 'text-brand-primary-strong-hover dark:text-brand-primary-accent' : 'text-stone-800 dark:text-white']">{{ option.hit!.name }}</span>
            <span :class="['text-xs', i === active ? 'text-brand-primary-strong-hover dark:text-brand-primary-accent' : 'text-stone-500 dark:text-stone-400']">{{ secondLine(option) }}</span>
          </span>
          <span v-if="!option.listed" class="text-[13px] font-extrabold text-brand-primary-strong-hover dark:text-brand-primary-accent" aria-hidden="true">Add</span>
        </template>
        <template v-else>
          <span class="flex-grow flex flex-col min-w-0 py-1">
            <span class="option-new text-[15px] font-bold text-stone-800 dark:text-white break-words">Add "{{ trimmed }}" as a new ingredient</span>
            <span class="text-xs text-stone-500 dark:text-stone-400">Not in our list? Our team checks new ones</span>
          </span>
          <svg class="w-4 h-4 text-stone-500 dark:text-stone-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </template>
      </li>
    </ul>

    <p class="sr-only" role="status" aria-live="polite">{{ status }}</p>
    <p v-if="expanded && state === 'failed'" class="search-failed mt-1.5 text-xs text-stone-600 dark:text-stone-300">
      Search isn't working right now. You can still add it as a new ingredient.
    </p>
  </div>
</template>
