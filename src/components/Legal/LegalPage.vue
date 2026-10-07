<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getPolicyVersions, POLICY_VERSION_FALLBACK } from '../../api/metaApi'
import LegalPlaceholder from './LegalPlaceholder.vue'

/**
 * The frame of the Privacy Policy and the Terms of Service: Back, the title,
 * the date and version line, then the text. Both pages show the terms version,
 * since agreeing at "Before you start" covers both.
 *
 * The version comes from GET /meta/policy-versions. Until the backend has that
 * route (it answers 404), or whenever the request fails, the page shows
 * POLICY_VERSION_FALLBACK quietly: no error state, nothing in the console.
 */
defineProps<{ title: string }>()

const router = useRouter()
const version = ref(POLICY_VERSION_FALLBACK)

onMounted(() => {
  getPolicyVersions()
    .then((versions) => {
      if (versions.terms_version) version.value = versions.terms_version
    })
    .catch(() => {})
})

// Back where the reader came from, or to Explore when they opened the page directly.
const goBack = () => {
  if (router.options.history.state.back) router.back()
  else router.push('/explore')
}
</script>

<template>
  <div class="legal-page min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans transition-colors duration-300 motion-reduce:transition-none pb-28 pt-6">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col gap-6">
      <button
        type="button"
        class="legal-back self-start min-h-11 flex items-center gap-1.5 text-sm font-bold text-brand-primary-strong dark:text-brand-primary hover:underline cursor-pointer"
        @click="goBack"
      >
        <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <!-- The blocks fade up in order as the screen opens (rise-in in style.css). -->
      <header class="rise-in space-y-2">
        <h1 class="text-2xl sm:text-3xl font-serif font-bold text-stone-800 dark:text-white">{{ title }}</h1>
        <p class="legal-version text-sm text-stone-600 dark:text-stone-300">
          Last updated: <LegalPlaceholder /> · Version <span class="legal-version-number font-semibold">{{ version }}</span>
        </p>
      </header>

      <article style="--rise-delay: 50ms" class="legal-body rise-in bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl border border-brand-surface-border dark:border-stone-700 p-5 sm:p-7 flex flex-col gap-5 text-[15px] leading-relaxed text-stone-700 dark:text-stone-200">
        <slot />
      </article>
    </div>
  </div>
</template>
