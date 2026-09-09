<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '../Shared/EmptyState.vue'

// loading and failed are optional so the existing prop contract still holds for
// any caller that only passes userSkinType and products.
const props = defineProps<{
  userSkinType: string
  products: any[]
  loading?: boolean
  failed?: boolean
  // Suppresses the per-card catalog link. On the Explore page that link would
  // navigate back to the page the user is already on.
  hideCatalogLink?: boolean
  // Optional override so each host can title its own section.
  heading?: string
  subheading?: string
  // Smaller cards and tighter spacing. For a host where this is one section
  // among several competing for the fold rather than the page's own subject.
  compact?: boolean
  // Drops the rule above the heading. Separation from what precedes the widget
  // is the host's business, not the widget's: a host that already draws its own
  // container gets a line inside a box, which is what this exists to turn off.
  hideDivider?: boolean
}>()

const emit = defineEmits(['retry'])

const router = useRouter()

// The padding goes with the rule. It is there to hold the heading off the line,
// so keeping it once the line is gone leaves a gap with nothing above it.
const rootClass = computed(() => [
  'w-full',
  props.compact ? 'space-y-4' : 'space-y-6',
  props.hideDivider ? '' : 'pt-8 border-t border-brand-surface-border dark:border-stone-800',
])

const headingClass = computed(() =>
  props.compact
    ? 'text-base sm:text-lg font-serif font-bold text-brand-text dark:text-white'
    : 'text-xl sm:text-2xl font-serif font-bold text-brand-text dark:text-white',
)

const gridClass = computed(() => [
  'grid grid-cols-2 sm:grid-cols-4',
  props.compact ? 'gap-3' : 'gap-4 sm:gap-6',
])

const cardClass = computed(() => (props.compact ? 'p-3' : 'p-4 sm:p-5'))

// The single biggest contributor to the widget's height, so it is the one that
// moves most: 144/176px down to 96/112px.
const thumbClass = computed(() => (props.compact ? 'h-24 sm:h-28' : 'h-36 sm:h-44'))
</script>

<template>
  <div :class="rootClass">
    <div>
      <h3 :class="headingClass">
        {{ heading || 'Recommended products for you' }}
      </h3>
      <p class="text-xs sm:text-sm text-brand-text-muted mt-1">
        {{ subheading || 'Biocompatible skincare curation optimized to reinforce your current barrier profile metrics.' }}
      </p>
    </div>

    <!-- Loading State: a real pending request, not a decorative delay. Without
         this the empty state renders for the duration of the fetch and reads as
         "we found nothing for you", which is the exact bug this widget had. -->
    <div v-if="loading" :class="gridClass">
      <div
        v-for="n in 4"
        :key="n"
        :class="['bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl border border-brand-surface-border dark:border-stone-800 animate-pulse', cardClass]"
      >
        <!-- Same thumbnail height as a real card, so the layout does not jump
             when the request lands. -->
        <div :class="['w-full bg-brand-bg-light dark:bg-stone-900 rounded-2xl', thumbClass]"></div>
        <div class="h-2.5 bg-brand-bg-light dark:bg-stone-900 rounded-full mt-4 w-1/2"></div>
        <div class="h-3 bg-brand-bg-light dark:bg-stone-900 rounded-full mt-2.5 w-4/5"></div>
        <div class="h-9 bg-brand-bg-light dark:bg-stone-900 rounded-xl mt-4"></div>
      </div>
    </div>

    <!-- Failure State: deliberately distinct from the empty state below. A
         failed request is not the same fact as "no products matched you", and
         showing the latter for the former tells the user something untrue. -->
    <div v-else-if="failed" class="py-8 flex justify-center items-center w-full">
      <EmptyState
        title="Couldn't Load Recommendations"
        message="We couldn't reach the catalog just now, so we can't say what suits your profile yet. This is a connection problem, not an empty result."
        action-label="Try Again"
        @action="emit('retry')"
      />
    </div>

    <!-- Active Grid Render State -->
    <div v-else-if="products && products.length > 0" :class="[gridClass, 'animate-fade-in']">
      <div
        v-for="prod in products"
        :key="prod.id"
        :class="['bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl border border-brand-surface-border dark:border-stone-800 flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg hover:border-brand-primary/40 transition-all duration-300 group', cardClass]"
      >
        <router-link :to="`/product/${prod.slug}`" :class="compact ? 'space-y-2 block' : 'space-y-3 block'">
          <div :class="['w-full bg-brand-bg-light dark:bg-stone-900 rounded-2xl p-3 flex items-center justify-center border border-brand-surface-border/50 dark:border-stone-800 overflow-hidden', thumbClass]">
            <img v-if="prod.image_url" :src="prod.image_url" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition-transform" />
            <svg v-else class="w-8 h-8 text-brand-text-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <span class="text-[10px] font-bold text-brand-primary uppercase tracking-wider block truncate">{{ prod.brand }}</span>
            <h4 class="font-serif font-bold text-xs sm:text-sm text-brand-text dark:text-white line-clamp-2 mt-0.5 group-hover:text-brand-primary transition-colors">
              {{ prod.name }}
            </h4>
          </div>
        </router-link>

        <button
          v-if="!hideCatalogLink"
          @click="router.push('/explore')"
          class="w-full mt-4 py-2.5 bg-brand-bg-light dark:bg-stone-800 hover:bg-brand-primary hover:text-white dark:hover:bg-brand-primary text-brand-text dark:text-stone-200 font-bold text-xs rounded-xl border border-brand-surface-border dark:border-stone-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
        >
          View Skin Sorting Specs
        </button>
      </div>
    </div>

    <!-- Clean Empty State Render Block -->
    <div v-else class="py-8 flex justify-center items-center w-full">
      <EmptyState
        title="No Curated Items Ready"
        message="There are currently no products indexed matching your exact diagnostic profile properties. Use our catalog search tool to explore alternative formulas manually."
        action-label="Explore Global Catalog"
        @action="router.push('/explore')"
      />
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
