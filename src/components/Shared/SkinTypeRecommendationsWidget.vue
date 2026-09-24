<script setup lang="ts">
import { computed, useId } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '../Shared/EmptyState.vue'
import CollapseTransition from './CollapseTransition.vue'
import { describeMatchBadge } from '../Catalog/matchBadge'

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
  // Lets the user fold the section away. Opt-in, so a host where the widget is
  // the page's subject keeps it permanently open. Starts expanded: folding is
  // something the user chooses, not a default that hides what they came for.
  collapsible?: boolean
}>()

const emit = defineEmits(['retry'])

const router = useRouter()

// A model rather than private state, so a host can shrink the frame it draws
// around the widget when the widget is folded - the frame is the host's, and
// most of a folded section's height was that frame's padding. A host that does
// not bind it still gets a working fold: defineModel keeps a local value.
const isCollapsed = defineModel<boolean>('collapsed', { default: false })
const contentId = useId()

// A fold only exists where the host asked for one, so a non-collapsible widget
// can never end up hidden.
const isContentVisible = computed(() => !props.collapsible || !isCollapsed.value)
const isFolded = computed(() => !isContentVisible.value)

// The padding goes with the rule. It is there to hold the heading off the line,
// so keeping it once the line is gone leaves a gap with nothing above it.
//
// No vertical rhythm while folded. The hidden region is display:none, but the
// spacing utility still puts its gap under the heading block, which would
// leave the folded bar taller than the one line it is.
const rootClass = computed(() => [
  'w-full',
  isFolded.value ? '' : props.compact ? 'space-y-4' : 'space-y-6',
  props.hideDivider ? '' : 'pt-8 border-t border-brand-surface-border dark:border-stone-800',
])

// Folded, the heading drops from a serif title to a single small label, so the
// bar is one line the user can pass over on the way to the filtered grid.
const headingClass = computed(() => {
  if (isFolded.value) return 'text-xs sm:text-sm font-bold text-brand-text dark:text-stone-200'
  return props.compact
    ? 'text-base sm:text-lg font-serif font-bold text-brand-text dark:text-white'
    : 'text-xl sm:text-2xl font-serif font-bold text-brand-text dark:text-white'
})

// How many picks are behind the fold, shown only while folded and only when
// that number is a result. A count during loading or after a failure would be
// a figure nobody computed.
const foldedCount = computed(() =>
  isFolded.value && !props.loading && !props.failed && props.products?.length
    ? props.products.length
    : null,
)

const gridClass = computed(() => [
  'grid grid-cols-2 sm:grid-cols-4',
  props.compact ? 'gap-3' : 'gap-4 sm:gap-6',
])

const cardClass = computed(() => (props.compact ? 'p-3' : 'p-4 sm:p-5'))

// The single biggest contributor to the widget's height, so it is the one that
// moves most: 144/176px down to 96/112px.
const thumbClass = computed(() => (props.compact ? 'h-24 sm:h-28' : 'h-36 sm:h-44'))

// Both hosts pass pickTopRecommendations' output, which is ordered by match
// score, best first - so a card's position is its rank. The badge is the Explore
// card's, so the same score reads the same way on both.
const matchOf = (prod: { skin_match_score?: number | null }) => describeMatchBadge(prod?.skin_match_score)
</script>

<template>
  <div :class="rootClass">
    <div>
      <!-- Collapsible: the heading itself is the toggle, so the target is the
           whole title row rather than a small icon. The button sits inside the
           h3 rather than around it - a heading is not valid content for a
           button - which keeps the section in the document outline either way. -->
      <h3 v-if="collapsible" :class="headingClass">
        <button
          type="button"
          :aria-expanded="!isCollapsed"
          :aria-controls="contentId"
          class="w-full flex items-center justify-between gap-3 text-left cursor-pointer group"
          @click="isCollapsed = !isCollapsed"
        >
          <span class="flex items-center gap-2 min-w-0">
            <span class="truncate">{{ heading || 'Recommended products for you' }}</span>
            <span
              v-if="foldedCount !== null"
              class="shrink-0 font-sans text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
            >
              {{ foldedCount }}
            </span>
          </span>
          <span class="flex items-center gap-1.5 shrink-0 font-sans text-[11px] font-bold text-brand-primary group-hover:underline">
            {{ isCollapsed ? 'Show' : 'Hide' }}
            <svg
              :class="['w-4 h-4 stroke-[2.5] transition-transform duration-200', isCollapsed ? '' : 'rotate-180']"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
      </h3>
      <h3 v-else :class="headingClass">
        {{ heading || 'Recommended products for you' }}
      </h3>
      <CollapseTransition>
        <div v-show="isContentVisible">
          <p class="text-xs sm:text-sm text-brand-text-muted pt-1">
            {{ subheading || 'Biocompatible skincare curation optimized to reinforce your current barrier profile metrics.' }}
          </p>
        </div>
      </CollapseTransition>
    </div>

    <!-- v-show rather than v-if, so folding and unfolding keeps the loaded
         recommendations rather than tearing the cards down and rebuilding them.
         The request is the host's and is not repeated either way. -->
    <CollapseTransition>
      <div v-show="isContentVisible" :id="contentId" :class="compact ? 'space-y-4' : 'space-y-6'">

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
          v-for="(prod, idx) in products"
          :key="prod.id"
          :class="['bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl border border-brand-surface-border dark:border-stone-800 flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg hover:border-brand-primary/40 transition-all duration-300 group', cardClass]"
        >
          <router-link :to="`/product/${prod.slug}`" :class="compact ? 'space-y-2 block' : 'space-y-3 block'">
            <div :class="['relative w-full bg-brand-bg-light dark:bg-stone-900 rounded-2xl p-3 flex items-center justify-center border border-brand-surface-border/50 dark:border-stone-800 overflow-hidden', thumbClass]">
              <span
                class="rec-rank absolute top-2 left-2 z-10 min-w-6 h-6 px-1.5 rounded-full bg-brand-primary text-white text-[11px] font-black font-mono flex items-center justify-center shadow-sm"
                :aria-label="`Rank ${idx + 1}`"
              >
                #{{ idx + 1 }}
              </span>
              <span
                v-if="matchOf(prod).percent !== null"
                :class="['rec-match absolute top-2 right-2 z-10 text-[10px] sm:text-[11px] font-black font-mono px-2 py-0.5 rounded-full border shadow-sm backdrop-blur-sm', matchOf(prod).class]"
              >
                {{ matchOf(prod).label }}
              </span>
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


        </div>
      </div>

      <!-- Clean Empty State Render Block.
           The action is withheld under `hideCatalogLink`, which is what that prop
           was declared for and had stopped doing. Its comment says it suppresses a
           catalogue link that "would navigate back to the page the user is already
           on" - but the per-card link it once hid is gone from this template, and
           the prop was left reading nothing. The one catalogue link that survived
           is this button, and ExploreView is the only host that passes the prop,
           so on Explore an empty ranking offered "Explore Global Catalog" as a way
           to reach the page it was drawn on. EmptyState draws no button when it is
           given no label, and the message still points at the catalogue, which on
           that host is directly below. -->
      <div v-else class="py-8 flex justify-center items-center w-full">
        <EmptyState
          title="No Curated Items Ready"
          message="There are currently no products indexed matching your exact diagnostic profile properties. Use our catalog search tool to explore alternative formulas manually."
          :action-label="hideCatalogLink ? undefined : 'Explore Global Catalog'"
          @action="router.push('/explore')"
        />
      </div>
      </div>
    </CollapseTransition>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
