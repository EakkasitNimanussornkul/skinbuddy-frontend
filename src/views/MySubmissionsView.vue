<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getMySubmissions, type MySubmission } from '../api/submissionsApi'
import { readApiProblem } from '../api/apiProblem'
import {
  SUBMISSION_TABS,
  countByTab,
  describeSubmission,
  filterByTab,
  statusChip,
  type SubmissionTab,
} from '../components/Submissions/submissionStatus'

/**
 * The products the signed-in user has sent, with where each one stands
 * (owner-approved design, 2026-10-04). Tabs filter by status; a published one
 * links to its product page, and one that was not added shows the team's note.
 */

const router = useRouter()

const rows = ref<MySubmission[]>([])
const state = ref<'loading' | 'ready' | 'failed'>('loading')
const failure = ref('')
const tab = ref<SubmissionTab>('all')

const load = async () => {
  state.value = 'loading'
  try {
    rows.value = await getMySubmissions()
    state.value = 'ready'
  } catch (error: unknown) {
    const { status } = readApiProblem(error)
    failure.value =
      status === 401
        ? 'Your sign-in has expired. Sign in again to see your submissions.'
        : status === null
          ? "We couldn't reach SkinBuddy. Check your connection and try again."
          : "We couldn't load your submissions. Try again in a moment."
    state.value = 'failed'
  }
}

onMounted(load)

const counts = computed(() => countByTab(rows.value))
const shown = computed(() => filterByTab(rows.value, tab.value))

// Tabs: arrow keys move between them and select, Home and End jump (the ARIA
// tabs pattern, with automatic activation).
const onTabKey = async (event: KeyboardEvent, index: number) => {
  const last = SUBMISSION_TABS.length - 1
  const next =
    event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
        : event.key === 'Home' ? 0
          : event.key === 'End' ? last
            : null
  if (next === null) return
  event.preventDefault()
  tab.value = SUBMISSION_TABS[next]!.id
  await nextTick()
  document.getElementById(`subs-tab-${SUBMISSION_TABS[next]!.id}`)?.focus()
}

const goBack = () => {
  if (window.history.state?.back) router.back()
  else router.push('/explore')
}

const EMPTY_TAB_TEXT: Record<SubmissionTab, string> = {
  all: '',
  pending: 'Nothing is waiting for review.',
  approved: 'None of your products has been published yet.',
  rejected: 'Nothing here. Every product you sent was added, or is still waiting.',
}
</script>

<template>
  <div class="my-submissions min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-200 pb-32 lg:pb-16">
    <div class="w-full max-w-2xl mx-auto px-5 pt-5 lg:pt-10">
      <div class="flex items-center justify-between h-11">
        <button
          type="button"
          aria-label="Go back"
          class="w-11 h-11 -ml-2 flex items-center justify-center text-brand-text dark:text-stone-200"
          @click="goBack"
        >
          <svg class="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span class="text-[13px] font-bold text-stone-800 dark:text-white">My submissions</span>
        <span class="w-11" />
      </div>

      <!-- Loading -->
      <div v-if="state === 'loading'" class="mt-6 flex flex-col gap-2.5" role="status" aria-busy="true">
        <span class="sr-only">Loading your submissions</span>
        <div
          v-for="n in 3"
          :key="n"
          class="h-24 rounded-[18px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark animate-pulse motion-reduce:animate-none"
          aria-hidden="true"
        />
      </div>

      <!-- Failed -->
      <section
        v-else-if="state === 'failed'"
        class="load-failed rise-in mt-10 rounded-3xl border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark px-6 py-8 flex flex-col items-center text-center"
        role="alert"
      >
        <svg class="w-8 h-8 text-amber-600 dark:text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>
        <h1 class="mt-3 font-serif text-xl font-bold text-stone-800 dark:text-white">Couldn't load your submissions</h1>
        <p class="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{{ failure }}</p>
        <button
          type="button"
          class="retry mt-5 min-h-12 px-6 rounded-2xl bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white font-bold transition-colors"
          @click="load"
        >
          Try again
        </button>
      </section>

      <!-- Nothing sent yet -->
      <template v-else-if="rows.length === 0">
        <section
          aria-labelledby="subs-empty-h"
          class="submissions-empty rise-in mt-10 rounded-3xl border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark px-[22px] py-8 flex flex-col items-center text-center"
        >
          <span class="w-[72px] h-[72px] rounded-[22px] border-2 border-dashed border-stone-300 dark:border-stone-500 flex items-center justify-center">
            <svg class="w-[30px] h-[30px] text-brand-primary-strong dark:text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6v4l2 3v10a1 1 0 01-1 1H8a1 1 0 01-1-1V10l2-3z" /><path d="M12 12v5M9.5 14.5h5" /></svg>
          </span>
          <h1 id="subs-empty-h" class="mt-[18px] font-serif text-2xl font-bold text-stone-800 dark:text-white">You haven't sent any products yet</h1>
          <p class="mt-2.5 text-[15px] leading-relaxed text-stone-500 dark:text-stone-400">
            Can't find a product in SkinBuddy? Send us its details, and you'll follow its review here.
          </p>
          <RouterLink
            to="/submissions/new"
            class="mt-5 min-h-[52px] px-[22px] rounded-2xl bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white text-base font-bold inline-flex items-center gap-2 transition-colors"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Submit a product
          </RouterLink>
        </section>
        <section aria-labelledby="subs-how-h" style="--rise-delay: 50ms" class="subs-how rise-in mt-3.5 rounded-[20px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark px-[18px] py-4">
          <h2 id="subs-how-h" class="m-0 mb-2.5 text-[13px] font-extrabold text-stone-800 dark:text-white">How it works</h2>
          <ol class="list-none m-0 p-0 flex flex-col gap-3">
            <li v-for="(line, i) in ['You send the product and its ingredients', 'Our team checks the details', 'It appears in Explore, with its % Match']" :key="i" class="flex gap-3 items-center">
              <span class="w-7 h-7 rounded-full bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary-strong-hover dark:text-brand-primary-accent text-[13px] font-extrabold flex items-center justify-center shrink-0" aria-hidden="true">{{ i + 1 }}</span>
              <span class="text-sm font-semibold">{{ line }}</span>
            </li>
          </ol>
        </section>
      </template>

      <!-- The list -->
      <template v-else>
        <!-- The blocks fade up in order as the screen opens (rise-in in style.css). -->
        <h1 class="rise-in mt-3 font-serif text-[26px] font-bold text-stone-800 dark:text-white">Products you sent</h1>
        <RouterLink
          to="/submissions/new"
          style="--rise-delay: 50ms"
          class="rise-in mt-3 min-h-12 rounded-[14px] border-[1.5px] border-brand-primary-strong dark:border-brand-primary text-brand-primary-strong-hover dark:text-brand-primary-accent text-[15px] font-extrabold flex items-center justify-center gap-2"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Submit a product
        </RouterLink>

        <div role="tablist" aria-label="Filter by status" style="--rise-delay: 100ms" class="rise-in mt-4 flex gap-1.5 overflow-x-auto pb-1">
          <button
            v-for="(t, i) in SUBMISSION_TABS"
            :id="`subs-tab-${t.id}`"
            :key="t.id"
            type="button"
            role="tab"
            :aria-selected="tab === t.id ? 'true' : 'false'"
            aria-controls="subs-panel"
            :tabindex="tab === t.id ? 0 : -1"
            :class="[
              'status-tab shrink-0 min-h-11 px-3.5 rounded-full border-[1.5px] text-sm font-bold transition-colors',
              tab === t.id
                ? 'border-brand-primary-strong bg-brand-primary-light text-brand-primary-strong-hover dark:border-brand-primary dark:bg-brand-primary/20 dark:text-brand-primary-accent'
                : 'border-brand-surface-border bg-brand-surface-light text-brand-text dark:border-stone-600 dark:bg-brand-surface-dark dark:text-stone-200',
            ]"
            @click="tab = t.id"
            @keydown="onTabKey($event, i)"
          >
            {{ t.label }} {{ counts[t.id] }}
          </button>
        </div>

        <div id="subs-panel" role="tabpanel" :aria-labelledby="`subs-tab-${tab}`" tabindex="0" style="--rise-delay: 150ms" class="rise-in mt-3.5 focus:outline-none">
          <ul v-if="shown.length" class="list-none m-0 p-0 flex flex-col gap-2.5">
            <li
              v-for="row in shown"
              :key="row.id"
              class="submission-card rounded-[18px] border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark px-4 py-3.5"
            >
              <div class="flex justify-between gap-2.5 items-start">
                <span class="flex flex-col gap-0.5 min-w-0">
                  <span v-if="row.summary.brand" class="text-xs font-extrabold uppercase tracking-[0.08em] text-brand-primary-strong-hover dark:text-brand-primary-accent break-words">{{ row.summary.brand }}</span>
                  <span class="text-[15px] font-extrabold text-stone-800 dark:text-white break-words">{{ row.summary.name || 'Unnamed product' }}</span>
                </span>
                <span :class="['status-chip shrink-0 px-2.5 py-1 rounded-full text-xs font-extrabold', statusChip(row.status).tone]">{{ statusChip(row.status).text }}</span>
              </div>
              <p class="mt-2 text-[13px] text-stone-500 dark:text-stone-400">{{ describeSubmission(row) }}</p>
              <RouterLink
                v-if="row.status === 'approved' && row.product_slug"
                :to="`/product/${encodeURIComponent(row.product_slug)}`"
                class="view-product mt-1.5 min-h-11 inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-primary-strong-hover dark:text-brand-primary-accent"
              >
                View product
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </RouterLink>
              <div v-if="row.status === 'rejected' && row.review_notes" class="review-note mt-2.5 px-3 py-2.5 rounded-xl bg-brand-bg-light dark:bg-stone-800">
                <span class="block text-xs font-extrabold text-stone-500 dark:text-stone-400">Note from our team</span>
                <span class="block mt-1 text-sm leading-relaxed text-stone-800 dark:text-white whitespace-pre-line">{{ row.review_notes }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="empty-tab px-4 py-8 rounded-[18px] border border-dashed border-stone-300 dark:border-stone-500 text-sm text-center text-stone-500 dark:text-stone-400">
            {{ EMPTY_TAB_TEXT[tab] }}
          </p>
        </div>
      </template>
    </div>
  </div>
</template>
