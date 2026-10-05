<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getAdminQueue, type AdminQueueRow, type SubmissionStatus } from '../../api/submissionsApi'
import { readApiProblem } from '../../api/apiProblem'
import { ADMIN_TABS, CHIP_TONE, describeQueueRow, queueFlagChips } from './adminReview'
import RevealedText from './RevealedText.vue'

/**
 * The review queue (owner-approved design, 2026-10-04): status tabs with
 * counts, Waiting first, each list oldest first as the backend sends it. A
 * card opens the review - beside the queue on a wide screen, as its own page
 * on a phone (the view decides which). The sender's name, brand and product
 * name show any hidden character as a visible marker (RevealedText).
 */
defineProps<{ selectedId: string | null }>()
const emit = defineEmits<{ forbidden: [] }>()

const tab = ref<SubmissionStatus>('pending')
const rows = ref<AdminQueueRow[]>([])
const counts = ref<Record<SubmissionStatus, number> | null>(null)
const state = ref<'loading' | 'ready' | 'failed'>('loading')
const failure = ref('')
// Each load is numbered, so a slow answer for an earlier tab cannot land on a later one.
let latest = 0

const load = async () => {
  const ticket = ++latest
  state.value = 'loading'
  try {
    const queue = await getAdminQueue(tab.value)
    if (ticket !== latest) return
    rows.value = queue.submissions
    counts.value = queue.counts
    state.value = 'ready'
  } catch (error: unknown) {
    if (ticket !== latest) return
    const { status } = readApiProblem(error)
    if (status === 403) {
      emit('forbidden')
      return
    }
    failure.value =
      status === 401
        ? 'Your sign-in has expired. Sign in again to see the queue.'
        : status === null
          ? "We couldn't reach SkinBuddy. Check your connection and try again."
          : "We couldn't load the queue. Try again in a moment."
    state.value = 'failed'
  }
}

const choose = (next: SubmissionStatus) => {
  if (tab.value === next) return
  tab.value = next
  load()
}

onMounted(load)
defineExpose({ reload: load })

// The ARIA tabs pattern with automatic activation, as on My submissions.
const onTabKey = async (event: KeyboardEvent, index: number) => {
  const last = ADMIN_TABS.length - 1
  const next =
    event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
        : event.key === 'Home' ? 0
          : event.key === 'End' ? last
            : null
  if (next === null) return
  event.preventDefault()
  choose(ADMIN_TABS[next]!.id)
  await nextTick()
  document.getElementById(`admin-tab-${ADMIN_TABS[next]!.id}`)?.focus()
}

const EMPTY_TAB_TEXT: Record<SubmissionStatus, string> = {
  pending: '',
  approved: 'Nothing has been published from a submission yet.',
  rejected: 'No submission has been turned down.',
}
</script>

<template>
  <section aria-labelledby="admin-queue-h" class="admin-queue flex flex-col">
    <h1 id="admin-queue-h" class="mt-3 lg:mt-0 font-serif text-[26px] font-bold text-stone-800 dark:text-white">Review submissions</h1>
    <p class="mt-1.5 text-sm text-stone-500 dark:text-stone-400">Oldest first, so nothing waits too long.</p>

    <div role="tablist" aria-label="Filter by status" class="mt-4 flex gap-1.5 overflow-x-auto lg:flex-wrap pb-1">
      <button
        v-for="(t, i) in ADMIN_TABS"
        :id="`admin-tab-${t.id}`"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="tab === t.id ? 'true' : 'false'"
        aria-controls="admin-queue-panel"
        :tabindex="tab === t.id ? 0 : -1"
        :class="[
          'admin-tab shrink-0 min-h-11 px-3.5 rounded-full border-[1.5px] text-sm font-bold transition-colors',
          tab === t.id
            ? 'border-brand-primary-strong bg-brand-primary-light text-brand-primary-strong-hover dark:border-brand-primary dark:bg-brand-primary/20 dark:text-brand-primary-accent'
            : 'border-brand-surface-border bg-brand-surface-light text-brand-text dark:border-stone-600 dark:bg-brand-surface-dark dark:text-stone-200',
        ]"
        @click="choose(t.id)"
        @keydown="onTabKey($event, i)"
      >
        {{ counts ? `${t.label} ${counts[t.id]}` : t.label }}
      </button>
    </div>

    <div id="admin-queue-panel" role="tabpanel" :aria-labelledby="`admin-tab-${tab}`" tabindex="0" class="mt-3.5 focus:outline-none">
      <div v-if="state === 'loading'" class="flex flex-col gap-2.5" role="status" aria-busy="true">
        <span class="sr-only">Loading the queue</span>
        <div
          v-for="n in 3"
          :key="n"
          class="h-28 rounded-[18px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark animate-pulse motion-reduce:animate-none"
          aria-hidden="true"
        />
      </div>

      <section
        v-else-if="state === 'failed'"
        class="queue-failed rounded-3xl border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark px-6 py-8 flex flex-col items-center text-center"
        role="alert"
      >
        <svg class="w-8 h-8 text-amber-600 dark:text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>
        <h2 class="mt-3 font-serif text-xl font-bold text-stone-800 dark:text-white">Couldn't load the queue</h2>
        <p class="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{{ failure }}</p>
        <button
          type="button"
          class="retry mt-5 min-h-12 px-6 rounded-2xl bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white font-bold transition-colors"
          @click="load"
        >
          Try again
        </button>
      </section>

      <!-- Nothing waiting: the designed all-clear -->
      <section
        v-else-if="rows.length === 0 && tab === 'pending'"
        aria-labelledby="admin-clear-h"
        class="queue-empty mt-3.5 rounded-3xl border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark px-[22px] py-[34px] flex flex-col items-center text-center"
      >
        <span class="w-[72px] h-[72px] rounded-full bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center">
          <svg class="w-8 h-8 text-emerald-800 dark:text-emerald-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
        </span>
        <h2 id="admin-clear-h" class="mt-[18px] font-serif text-[22px] font-bold text-stone-800 dark:text-white">Nothing waiting</h2>
        <p class="mt-2 text-[15px] leading-relaxed text-stone-500 dark:text-stone-400">
          Every submission has been reviewed. New ones show up here, oldest first.
        </p>
        <button
          type="button"
          class="see-published mt-[18px] min-h-12 px-[18px] rounded-[14px] border-[1.5px] border-brand-surface-border dark:border-stone-600 text-stone-800 dark:text-white text-[15px] font-bold"
          @click="choose('approved')"
        >
          See what was published
        </button>
      </section>

      <p
        v-else-if="rows.length === 0"
        class="empty-tab px-4 py-8 rounded-[18px] border border-dashed border-stone-300 dark:border-stone-500 text-sm text-center text-stone-500 dark:text-stone-400"
      >
        {{ EMPTY_TAB_TEXT[tab] }}
      </p>

      <ul v-else class="list-none m-0 p-0 flex flex-col gap-2.5">
        <li v-for="row in rows" :key="row.id">
          <RouterLink
            :to="`/admin/submissions/${encodeURIComponent(row.id)}`"
            :aria-current="row.id === selectedId ? 'page' : undefined"
            :class="[
              'queue-card block rounded-[18px] px-4 py-3.5 transition-colors',
              row.id === selectedId
                ? 'border-2 border-brand-primary-strong bg-brand-primary-light dark:border-brand-primary dark:bg-brand-primary/15'
                : 'border border-brand-surface-border bg-brand-surface-light hover:border-brand-primary-strong dark:border-stone-600 dark:bg-brand-surface-dark dark:hover:border-brand-primary',
            ]"
          >
            <span class="flex justify-between gap-2.5">
              <span class="flex flex-col gap-[3px] min-w-0">
                <span v-if="row.summary.brand" class="text-xs font-extrabold uppercase tracking-[0.08em] text-brand-primary-strong-hover dark:text-brand-primary-accent break-words"><RevealedText :text="row.summary.brand" /></span>
                <span class="queue-name text-[15px] font-extrabold text-stone-800 dark:text-white break-words"><RevealedText :text="row.summary.name || 'Unnamed product'" /></span>
              </span>
              <svg class="w-[18px] h-[18px] mt-1 shrink-0 text-stone-500 dark:text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
            </span>
            <span class="queue-meta block mt-1.5 text-[13px] text-stone-500 dark:text-stone-400"><RevealedText :text="describeQueueRow(row)" /></span>
            <span class="mt-2.5 flex flex-wrap gap-1.5">
              <span
                v-for="chip in queueFlagChips(row.flags)"
                :key="chip.text"
                :class="['queue-flag px-[9px] py-1 rounded-full text-xs font-extrabold', CHIP_TONE[chip.tone]]"
              >{{ chip.text }}</span>
            </span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </section>
</template>
