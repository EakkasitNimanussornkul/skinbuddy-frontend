<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AdminQueuePanel from '../components/Submissions/AdminQueuePanel.vue'
import AdminReviewPanel from '../components/Submissions/AdminReviewPanel.vue'
import AdminForbidden from '../components/Submissions/AdminForbidden.vue'

/**
 * Review submissions (owner-approved design, 2026-10-04), at
 * /admin/submissions and /admin/submissions/:id.
 *
 * On a wide screen the queue and the open review sit side by side. On a phone
 * the review is its own page: the queue shows without an id, the review with
 * one, and back returns to the queue. One route with an optional id, so the
 * queue keeps its tab and list while reviews open and close.
 *
 * The route is requiresAdmin, which only decides what is offered; the backend
 * answers 403 to anyone else, and that shows as the page's own state.
 */
const route = useRoute()
const router = useRouter()

const id = computed(() => {
  const value = route.params.id
  return typeof value === 'string' && value ? value : null
})
const forbidden = ref(false)
const queue = ref<InstanceType<typeof AdminQueuePanel> | null>(null)

const goBack = () => {
  if (window.history.state?.back) router.back()
  else router.push('/explore')
}
</script>

<template>
  <div class="admin-submissions min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-200 pb-32 lg:pb-16">
    <div v-if="forbidden" class="w-full max-w-2xl mx-auto px-5 pt-10">
      <AdminForbidden />
    </div>

    <div v-else class="w-full max-w-md mx-auto px-5 pt-5 lg:max-w-[1280px] lg:px-8 lg:pt-7 lg:flex lg:gap-6 lg:items-start">
      <!-- The queue: always on a wide screen, only without an id on a phone -->
      <div :class="['lg:block lg:flex-[1_1_320px] lg:max-w-[380px]', id ? 'hidden' : 'block']">
        <div class="flex items-center justify-between h-11 lg:hidden">
          <button type="button" aria-label="Go back" class="w-11 h-11 -ml-2 flex items-center justify-center text-brand-text dark:text-stone-200" @click="goBack">
            <svg class="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span class="inline-flex items-center gap-1.5 text-[13px] font-bold text-stone-800 dark:text-white">
            <svg class="w-[15px] h-[15px] text-brand-primary-strong dark:text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></svg>
            Admin
          </span>
          <span class="w-11" />
        </div>
        <AdminQueuePanel ref="queue" :selected-id="id" @forbidden="forbidden = true" />
      </div>

      <!-- The review: beside the queue on a wide screen, its own page on a phone -->
      <main :class="['lg:block lg:flex-[999_1_560px] min-w-0 lg:rounded-[28px] lg:border lg:border-brand-surface-border lg:dark:border-stone-600 lg:bg-brand-surface-light lg:dark:bg-brand-surface-dark lg:px-8 lg:py-7', id ? 'block' : 'hidden']">
        <template v-if="id">
          <div class="flex items-center justify-between h-11 lg:hidden">
            <RouterLink to="/admin/submissions" aria-label="Back to the queue" class="back-to-queue w-11 h-11 -ml-2 flex items-center justify-center text-brand-text dark:text-stone-200">
              <svg class="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            </RouterLink>
            <span class="text-[13px] font-bold text-stone-800 dark:text-white">Review submission</span>
            <span class="w-11" />
          </div>
          <AdminReviewPanel :id="id" class="mt-2.5 lg:mt-0" @forbidden="forbidden = true" @reviewed="queue?.reload()" />
        </template>
        <div v-else class="review-placeholder py-24 flex flex-col items-center text-center">
          <svg class="w-10 h-10 text-stone-400 dark:text-stone-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5h10M9 12h10M9 19h10M4 5h.01M4 12h.01M4 19h.01" /></svg>
          <p class="mt-3 text-[15px] text-stone-500 dark:text-stone-400">Choose a submission from the queue to review it.</p>
        </div>
      </main>
    </div>
  </div>
</template>
