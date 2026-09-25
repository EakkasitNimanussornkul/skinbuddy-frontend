<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  MATCH_BAND_MODERATE,
  MATCH_BAND_STRONG,
  MATCH_SCORE_BASIS,
  MATCH_SCORE_DISCLAIMER,
} from '../api/products'

/**
 * How % Match works, and where the data behind it comes from.
 *
 * Owner request: be open about the score and name the sources of what the app
 * shows. Everything here states what is true today. The product data does come
 * from Open Beauty Facts and the skin types from the Baumann system; the
 * ingredient notes, benefits, "good for" tags and concerns are the team's own,
 * written from general knowledge and not yet checked against a published
 * source - the backend's ingredients.source field says exactly that - so they
 * are labelled as such rather than credited to references that do not back
 * them yet. The references named for that check are where sources are being
 * looked for, not what the data rests on.
 */
const router = useRouter()

// Grade weights for an ingredient that may not suit the skin type. They mirror
// the backend's (feat/percentage-skin-match) and are stated here, not derived,
// because the page explains the rule rather than applying it.
const CONCERN_WEIGHTS = [
  { grade: 'High', weight: '1' },
  { grade: 'Moderate', weight: '0.6' },
  { grade: 'Low', weight: '0.3' },
]

const BANDS = [
  { label: 'Great match', range: `${MATCH_BAND_STRONG}% and above`, swatch: 'bg-emerald-500' },
  { label: 'Good match', range: `${MATCH_BAND_MODERATE}% to ${MATCH_BAND_STRONG - 1}%`, swatch: 'bg-teal-500' },
  { label: 'Low match, use with care', range: `below ${MATCH_BAND_MODERATE}%`, swatch: 'bg-semantic-error' },
]

interface DataSource {
  what: string
  from: string
  status: 'credited' | 'unverified' | 'in-progress'
  detail: string
  links: { label: string; href: string }[]
}

// Worded to what the catalogue actually holds, as the backend traced it: the
// original products were entered by hand, Open Beauty Facts supplied photos for
// three of them, and the rest have no recorded origin. Crediting Open Beauty
// Facts with the ingredient lists would claim a source they did not come from.
const DATA_SOURCES: DataSource[] = [
  {
    what: 'Some product photos',
    from: 'Open Beauty Facts',
    status: 'credited',
    detail: 'An open, community-built database of cosmetic products, available under the Open Database License. It supplied the photos of some of our products.',
    links: [
      { label: 'Open Beauty Facts', href: 'https://world.openbeautyfacts.org/' },
      { label: 'Open Database License', href: 'https://opendatacommons.org/licenses/odbl/1-0/' },
    ],
  },
  {
    what: 'Product names, descriptions and ingredient lists',
    from: 'The SkinBuddy team',
    status: 'unverified',
    detail:
      "Entered by our team. Where each product's details were taken from has not been recorded yet, so check the ingredient list on the product's own packaging if it matters to you.",
    links: [],
  },
  {
    what: 'Skin types',
    from: 'The Baumann Skin Type system',
    status: 'credited',
    detail: "The 16 four-letter skin types come from dermatologist Dr Leslie Baumann's book The Skin Type Solution (2006). Your type comes from the skin quiz you took.",
    links: [],
  },
  {
    what: 'Ingredient notes, benefits, "good for" tags and concerns',
    from: 'The SkinBuddy team',
    status: 'in-progress',
    detail:
      'Written from general cosmetic-chemistry knowledge, and being checked against published sources one by one. Where a source has been checked, it is linked under the ingredient, concern or warning it backs. Where it says "No published source linked yet", the note is still our own general reference. The references we are checking against:',
    links: [
      { label: 'CosIng, the EU cosmetic ingredient database', href: 'https://ec.europa.eu/growth/tools-databases/cosing/' },
      { label: 'Cosmetic Ingredient Review (CIR)', href: 'https://www.cir-safety.org/' },
      { label: 'PubChem', href: 'https://pubchem.ncbi.nlm.nih.gov/' },
    ],
  },
]
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans transition-colors duration-300 pb-28 pt-6">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col gap-6">

      <button
        type="button"
        class="self-start flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:underline cursor-pointer"
        @click="router.back()"
      >
        <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <header class="space-y-2">
        <h1 class="text-2xl sm:text-3xl font-serif font-bold dark:text-white">How % Match works</h1>
        <p class="method-basis text-sm text-brand-text-muted dark:text-stone-400 leading-relaxed">{{ MATCH_SCORE_BASIS }}</p>
      </header>

      <!-- 1. What is counted -->
      <section class="method-section bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl border border-brand-surface-border dark:border-stone-800 p-5 sm:p-6 space-y-3">
        <h2 class="text-lg font-serif font-bold dark:text-white">What we count</h2>
        <p class="text-sm text-brand-text-muted dark:text-stone-400 leading-relaxed">
          Each of the product's ingredients is checked against your four-letter skin type from the quiz: oily or dry, sensitive or resistant, prone to dark spots or not, and prone to wrinkles or not.
        </p>
        <ul class="space-y-2 text-sm">
          <li class="flex items-start gap-2.5">
            <svg class="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
            <span><span class="font-bold">Suits your skin:</span> an ingredient tagged as good for one of your skin traits.</span>
          </li>
          <li class="flex items-start gap-2.5">
            <svg class="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>
              <span class="font-bold">May not suit it:</span> an ingredient flagged for one of your skin traits, counted by how serious the concern is:
              <span v-for="(w, i) in CONCERN_WEIGHTS" :key="w.grade" class="method-weight font-mono">{{ w.grade }} {{ w.weight }}<template v-if="i < CONCERN_WEIGHTS.length - 1">, </template></span>.
            </span>
          </li>
          <li class="flex items-start gap-2.5 text-brand-text-muted dark:text-stone-400">
            <svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" /></svg>
            <span>Every other ingredient, such as water or one tagged for all skin types, is left out.</span>
          </li>
        </ul>
      </section>

      <!-- 2. The calculation -->
      <section class="method-section bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl border border-brand-surface-border dark:border-stone-800 p-5 sm:p-6 space-y-3">
        <h2 class="text-lg font-serif font-bold dark:text-white">The calculation</h2>
        <p class="method-formula text-sm font-mono bg-brand-bg-light dark:bg-stone-900 rounded-xl px-4 py-3 border border-brand-surface-border dark:border-stone-800">
          % Match = ingredients that suit you ÷ (ingredients that suit you + weighted concerns)
        </p>
        <p class="method-example text-sm text-brand-text-muted dark:text-stone-400 leading-relaxed">
          For example, 6 ingredients that suit you and 1 Moderate concern: 6 ÷ (6 + 0.6) = 91%. Next to each score you will see what it is built on, such as "6 of 7 suit you".
        </p>
        <p class="method-whole text-sm text-brand-text-muted dark:text-stone-400 leading-relaxed">
          We never show 100%. When every relevant ingredient suits you we say so instead, for example "All 11 relevant ingredients suit your skin type", because a perfect score would suggest more certainty than ingredient tags can give.
        </p>
        <p class="method-limited text-sm text-brand-text-muted dark:text-stone-400 leading-relaxed">
          If fewer than 3 of a product's ingredients relate to your skin type, there is too little to judge, so we show "Not enough info" instead of a percentage. You can still choose to see it on the product page.
        </p>
        <ul class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <li v-for="band in BANDS" :key="band.label" class="method-band flex items-center gap-2 text-xs font-bold bg-brand-bg-light dark:bg-stone-900 rounded-xl px-3 py-2 border border-brand-surface-border dark:border-stone-800">
            <span :class="['w-2.5 h-2.5 rounded-full shrink-0', band.swatch]"></span>
            <span>{{ band.label }} <span class="font-mono font-normal text-brand-text-muted">({{ band.range }})</span></span>
          </li>
        </ul>
      </section>

      <!-- 3. Limits -->
      <section class="method-section bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl border border-brand-surface-border dark:border-stone-800 p-5 sm:p-6 space-y-3">
        <h2 class="text-lg font-serif font-bold dark:text-white">What it can't tell you</h2>
        <ul class="method-limits list-disc pl-5 space-y-1.5 text-sm text-brand-text-muted dark:text-stone-400 leading-relaxed">
          <li>It counts which ingredients are in a product, not how much of each. A trace ingredient counts the same as the main active one.</li>
          <li>It is only as good as our ingredient tags, and they are uneven: far more ingredients are tagged for dry skin than for oily skin, so some skin types score lower across the board.</li>
          <li>It knows your skin type from the quiz, not your allergies, your other products or how your skin is today.</li>
        </ul>
      </section>

      <!-- 4. Where the data comes from -->
      <section class="method-section bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl border border-brand-surface-border dark:border-stone-800 p-5 sm:p-6 space-y-4">
        <h2 class="text-lg font-serif font-bold dark:text-white">Where our data comes from</h2>
        <div v-for="source in DATA_SOURCES" :key="source.what" class="method-source space-y-1.5 border-t first:border-t-0 first:pt-0 pt-4 border-brand-surface-border dark:border-stone-800">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-sm font-bold dark:text-stone-100">{{ source.what }}</h3>
            <span
              :class="[
                'method-status text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                source.status === 'credited'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50'
                  : source.status === 'in-progress'
                    ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800/50'
                    : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50',
              ]"
            >
              {{ source.status === 'credited' ? 'Source credited' : source.status === 'in-progress' ? 'Being checked' : 'Not yet checked' }}
            </span>
          </div>
          <p class="text-xs text-brand-text-muted dark:text-stone-400"><span class="font-semibold">From:</span> {{ source.from }}</p>
          <p class="text-sm text-brand-text-muted dark:text-stone-400 leading-relaxed">{{ source.detail }}</p>
          <ul v-if="source.links.length" class="flex flex-wrap gap-x-4 gap-y-1">
            <li v-for="link in source.links" :key="link.href">
              <a :href="link.href" target="_blank" rel="noopener noreferrer" class="method-link inline-flex items-center gap-1 text-xs font-bold text-brand-primary hover:underline">
                {{ link.label }}
                <svg class="w-3 h-3 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </li>
          </ul>
        </div>
      </section>

      <!-- 5. The disclaimer -->
      <p class="method-disclaimer flex items-start gap-2.5 text-sm leading-relaxed rounded-2xl px-4 py-3 bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/20 text-brand-text dark:text-stone-200">
        <svg class="w-5 h-5 shrink-0 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>{{ MATCH_SCORE_DISCLAIMER }}</span>
      </p>
    </div>
  </div>
</template>
