<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import { updateUserSkinType } from '../api/authApi'
import { searchProducts, pickTopRecommendations, type ScoredProduct } from '../api/products'
import { skinProfiles } from '../data/skinprofiles'
import { typologyDetails } from '../data/typologydata'
import TypologyComparisonModal from '../components/Quiz/TypologyComparisonModal.vue'
import ExpressSkinSelectorModal from '../components/Quiz/ExpressSkinSelectorModal.vue'
import SkinTypeRecommendationsWidget from '../components/Shared/SkinTypeRecommendationsWidget.vue'
import '../components/Quiz/quizMotion.css'

// The user's skin type and what it means: the type, its four traits, what the
// skin needs, a routine to start from, and products ranked for it.
//
// Phone: one column, in document order, ending with the actions. From lg: the
// type and the actions in a card on the left, the rest on the right. The two
// wrappers are `display: contents` below lg, so their children join a single
// column there. Nothing is moved with CSS `order`, so the order a phone shows
// is the order a keyboard and a screen reader meet. The actions are therefore
// placed twice, once per layout, with only one set displayed at each width.

const router = useRouter()
const authStore = useAuthStore()
const { addToast } = useToast()

const storedType = computed<string>(() => authStore.user?.skin_type ?? '')

// The page shows guidance only for one of the sixteen codes it has guidance
// for. Anything else - no type yet, or a stored code that is not one of the
// sixteen (bad data, a truncated string, a code added server-side before the
// frontend knows it) - gets the empty state. It used to fall back to OSPW's
// profile for a bad code, which handed the user another type's routine and
// avoid-list as though it were theirs. hasOwnProperty, so a code such as
// "toString" cannot reach the dictionary's prototype.
const profileData = computed(() =>
  Object.prototype.hasOwnProperty.call(skinProfiles, storedType.value)
    ? skinProfiles[storedType.value]!
    : null,
)
const userSkinType = computed(() => (profileData.value ? storedType.value : ''))

/** Which empty state: no type on the account, or one the page cannot read. */
const emptyKind = computed<'none' | 'unreadable'>(() => (storedType.value ? 'unreadable' : 'none'))

/** Each position of the code, and the letter it is set against. */
const AXIS_LETTERS: [string, string][] = [['O', 'D'], ['S', 'R'], ['P', 'N'], ['W', 'T']]

const axes = computed(() =>
  AXIS_LETTERS.map(([first, second], i) => {
    const letter = userSkinType.value[i] ?? ''
    const oppositeLetter = letter === first ? second : first
    const trait = typologyDetails[letter]
    return {
      letter,
      oppositeLetter,
      name: trait?.name ?? letter,
      opposite: typologyDetails[oppositeLetter]?.name ?? oppositeLetter,
      line: trait?.points[0] ?? '',
    }
  }),
)

// The comparison sheet. The index stays put when the sheet closes, so its
// content does not blank out while it fades away.
const isModalOpen = ref(false)
const selectedIndex = ref(0)
const traitCards: HTMLElement[] = []

const selectedActiveTrait = computed(() => typologyDetails[axes.value[selectedIndex.value]?.letter ?? ''] ?? null)
const selectedOppositeTrait = computed(
  () => typologyDetails[axes.value[selectedIndex.value]?.oppositeLetter ?? ''] ?? null,
)
const sheetSteps = computed(() => axes.value.map((axis) => `${axis.name} vs ${axis.opposite}`))

/** The card that opened the sheet, which gets focus back when it closes. */
let openedFrom = 0

const openTypologyModal = (index: number) => {
  openedFrom = index
  selectedIndex.value = index
  isModalOpen.value = true
}

/** Prev / next in the sheet, wrapping round the four traits. */
const stepTrait = (direction: 1 | -1) => {
  const count = axes.value.length
  selectedIndex.value = (selectedIndex.value + direction + count) % count
}

const closeTypologyModal = async () => {
  isModalOpen.value = false
  await nextTick()
  traitCards[openedFrom]?.focus()
}

// The routine's Morning / Evening tabs, for the phone layout. From lg both
// columns show side by side and the tabs are hidden.
const ROUTINE_TABS = [
  { key: 'am', label: 'Morning' },
  { key: 'pm', label: 'Evening' },
] as const
type RoutineTab = (typeof ROUTINE_TABS)[number]['key']

const routineTab = ref<RoutineTab>('am')
const routineTabEls: HTMLElement[] = []

const routineSteps = computed(() => profileData.value?.routineBlueprint[routineTab.value] ?? [])

// Arrow keys move between the tabs and select as they go, Home and End jump to
// the ends: the keyboard pattern for a tablist.
const onRoutineTabKeydown = (event: KeyboardEvent, index: number) => {
  const last = ROUTINE_TABS.length - 1
  let next: number
  if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1
  else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = last
  else return
  event.preventDefault()
  routineTab.value = ROUTINE_TABS[next]!.key
  routineTabEls[next]?.focus()
}

/** The sections fade up one after another, this far apart. */
const SECTION_STAGGER_MS = 60
const rise = (index: number) => ({ animationDelay: `${index * SECTION_STAGGER_MS}ms` })

// Recommendations come from the live catalog, scored per user by the backend.
// They used to be read from the static skinProfiles dictionary, which never
// assigned the field - so the widget received [] for every user on every load
// and the empty state was the only state it could ever reach.
const recommendedProducts = ref<ScoredProduct[]>([])
const recommendationsLoading = ref(true)
const recommendationsFailed = ref(false)

const loadRecommendations = async () => {
  recommendationsLoading.value = true
  recommendationsFailed.value = false

  try {
    // Scores only, so the lean list.
    const results = await searchProducts(undefined, undefined, undefined, { view: 'card' })
    recommendedProducts.value = pickTopRecommendations(results)
  } catch (error) {
    console.error('Failed to load recommended products:', error)
    recommendedProducts.value = []
    recommendationsFailed.value = true
  } finally {
    recommendationsLoading.value = false
  }
}

// Only once there is a profile to rank against: the empty state asks for
// nothing, and choosing a type there fills the page in and loads them then.
const hasProfile = computed(() => profileData.value !== null)

onMounted(() => {
  if (hasProfile.value) loadRecommendations()
})

watch(hasProfile, (has) => {
  if (has) loadRecommendations()
})

// "I already know my type" in the empty state: the same selector and save the
// quiz's start screen and Settings use. On success the page fills in.
const showSelector = ref(false)
const isSaving = ref(false)

const handleExpressConfirm = async (selectedType: string) => {
  isSaving.value = true
  try {
    if (!authStore.isAuthenticated || !authStore.user) {
      throw new Error('No user logged in locally.')
    }
    await updateUserSkinType(selectedType)
    authStore.updateSkinType(selectedType)
    addToast(`Profile set to ${selectedType}.`, 'success')
    showSelector.value = false
  } catch (error) {
    console.error('Express Confirm Error:', error)
    addToast('Failed to save your skin profile. Please try again.', 'error')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark pb-28 lg:pb-12 text-brand-text dark:text-stone-100 font-sans">
    <div class="w-full max-w-md mx-auto px-5 pt-5 flex flex-col gap-[18px] lg:max-w-[1280px] lg:px-16 lg:pt-9">
      <!-- Header row -->
      <div class="flex items-center justify-between h-11">
        <!-- The control carries an icon and no text, so without a label it
             reaches assistive technology as an unnamed button. -->
        <button
          type="button"
          aria-label="Go back"
          class="w-11 h-11 -ml-2 flex items-center justify-center text-brand-text dark:text-stone-200 hover:text-brand-primary-strong dark:hover:text-brand-primary transition-colors"
          @click="router.back()"
        >
          <svg class="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span class="text-[13px] lg:text-sm font-bold text-brand-text dark:text-stone-100">Your skin profile</span>
        <span class="w-11" />
      </div>

      <!-- No type yet, or one the page cannot read -->
      <div v-if="!profileData" class="w-full max-w-md mx-auto flex flex-col" data-testid="profile-empty">
        <section aria-labelledby="profile-empty-heading" class="mt-2 rounded-[26px] bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 px-[22px] py-7 flex flex-col items-center text-center">
          <div class="grid grid-cols-4 gap-2" aria-hidden="true">
            <span
              v-for="i in 4"
              :key="i"
              class="quiz-rise w-11 h-[52px] rounded-[14px] border-2 border-dashed border-[#B8C6CA] dark:border-stone-500 flex items-center justify-center font-serif text-[22px] font-bold text-[#B8C6CA] dark:text-stone-500"
              :style="rise(i - 1)"
              data-testid="empty-tile"
            >?</span>
          </div>
          <h1 id="profile-empty-heading" class="mt-[22px] font-serif text-[26px] leading-tight font-bold text-stone-800 dark:text-white">
            {{ emptyKind === 'none' ? 'No skin type yet' : "We couldn't read your saved skin type" }}
          </h1>
          <p class="mt-2.5 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">
            <template v-if="emptyKind === 'none'">Take the skin quiz and this page fills in with your four-letter type and what it means for you.</template>
            <template v-else>The type saved on your account isn't one we recognise. Take the quiz again or pick your type, and this page fills in.</template>
          </p>
        </section>

        <section aria-labelledby="profile-empty-list" class="mt-3.5 rounded-[22px] bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 px-5 py-[18px]">
          <h2 id="profile-empty-list" class="mb-3 text-[13px] font-extrabold text-brand-text dark:text-stone-100">What you'll see here</h2>
          <ul class="flex flex-col gap-3">
            <li class="flex gap-3 items-center">
              <span class="w-8 h-8 shrink-0 rounded-[10px] bg-brand-primary-light dark:bg-brand-primary/15 flex items-center justify-center text-brand-primary-strong dark:text-brand-primary">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
              </span>
              <span class="text-sm font-semibold">Your four skin traits, and how each compares with its opposite</span>
            </li>
            <li class="flex gap-3 items-center">
              <span class="w-8 h-8 shrink-0 rounded-[10px] bg-brand-primary-light dark:bg-brand-primary/15 flex items-center justify-center text-brand-primary-strong dark:text-brand-primary">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8" /><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" /></svg>
              </span>
              <span class="text-sm font-semibold">Ingredients to look for, and ones best avoided</span>
            </li>
            <li class="flex gap-3 items-center">
              <span class="w-8 h-8 shrink-0 rounded-[10px] bg-brand-primary-light dark:bg-brand-primary/15 flex items-center justify-center text-brand-primary-strong dark:text-brand-primary">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2" /></svg>
              </span>
              <span class="text-sm font-semibold">A morning and evening routine to start from</span>
            </li>
          </ul>
        </section>

        <div class="mt-6 flex flex-col gap-2.5">
          <RouterLink
            to="/quiz"
            class="h-[54px] rounded-2xl bg-brand-primary-strong hover:bg-brand-primary-strong-hover text-white text-base font-bold flex items-center justify-center transition-colors"
          >
            Take the skin quiz
          </RouterLink>
          <button
            type="button"
            class="h-12 rounded-2xl text-[15px] font-bold text-brand-primary-strong dark:text-brand-primary hover:text-brand-primary-strong-hover dark:hover:text-brand-primary-accent transition-colors"
            @click="showSelector = true"
          >
            I already know my type
          </button>
          <p class="text-center text-xs text-stone-600 dark:text-stone-400">About 3 minutes. You can retake it any time.</p>
        </div>
      </div>

      <!-- The profile -->
      <div v-else class="flex flex-col gap-[18px] lg:grid lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-8 lg:items-start" data-testid="profile-report">
        <!-- Left on desktop: the type and the actions -->
        <div class="contents lg:flex lg:flex-col lg:gap-3.5 lg:sticky lg:top-24 lg:rounded-[28px] lg:bg-brand-surface-light lg:dark:bg-brand-surface-dark lg:border lg:border-brand-surface-border lg:dark:border-stone-700 lg:px-7 lg:py-8">
          <section
            aria-label="Your skin type"
            class="quiz-rise rounded-[26px] bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 px-[22px] py-6 lg:rounded-none lg:bg-transparent lg:dark:bg-transparent lg:border-0 lg:p-0"
            :style="rise(0)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-primary-strong dark:text-brand-primary">Your type</span>
              <span class="px-2.5 py-1 rounded-full bg-brand-bg-light dark:bg-brand-bg-dark border border-brand-surface-border dark:border-stone-600 text-xs font-bold" data-testid="maintenance">{{ profileData.maintenanceLevel }} maintenance</span>
            </div>
            <span class="block mt-2 lg:mt-3.5 font-serif text-[56px] lg:text-[72px] leading-none font-bold tracking-[0.04em] text-brand-primary-strong-hover dark:text-brand-primary" data-testid="profile-code">{{ userSkinType }}</span>
            <h1 class="mt-3 lg:mt-3.5 font-serif text-2xl lg:text-[26px] font-bold text-stone-800 dark:text-white">{{ profileData.subtitle }}</h1>
            <p class="mt-2 lg:mt-3.5 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">{{ profileData.desc }}</p>
            <p class="mt-3.5 px-3.5 py-3 lg:px-4 lg:py-3.5 rounded-[14px] lg:rounded-2xl bg-brand-primary-light dark:bg-brand-primary/15 font-serif italic text-sm lg:text-[15px] leading-normal text-brand-primary-strong-hover dark:text-brand-primary-accent" data-testid="profile-quote">{{ profileData.quote }}</p>
          </section>

          <!-- The actions from lg, under the type. A phone gets its own copy at
               the end of the page. -->
          <div class="hidden lg:flex flex-col gap-2.5 lg:mt-2" data-testid="profile-actions-desktop">
            <RouterLink
              to="/quiz"
              class="h-[50px] rounded-2xl border-[1.5px] border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-[15px] font-bold text-brand-primary-strong dark:text-brand-primary hover:border-brand-primary-strong dark:hover:border-brand-primary flex items-center justify-center text-center px-3 transition-colors"
            >
              Doesn't sound like you? Retake the quiz
            </RouterLink>
            <button
              type="button"
              class="h-12 rounded-2xl bg-brand-primary-light dark:bg-brand-primary/15 text-[15px] font-bold text-brand-primary-strong-hover dark:text-brand-primary hover:bg-brand-primary-accent/60 dark:hover:bg-brand-primary/25 transition-colors"
              @click="router.push('/chat')"
            >
              Ask SkinBuddy AI about it
            </button>
            <p class="mt-1 text-left text-xs leading-relaxed text-stone-600 dark:text-stone-400">
              A starting point for your routine, not a diagnosis. For a skin condition, see a dermatologist.
            </p>
          </div>
        </div>

        <!-- Right on desktop: the traits, the needs and routine, the products
             (and, on a phone only, the actions after them) -->
        <div class="contents lg:flex lg:flex-col lg:gap-6 lg:min-w-0">
          <section aria-labelledby="profile-traits-heading" class="quiz-rise" :style="rise(1)">
            <div class="flex items-baseline justify-between gap-3">
              <h2 id="profile-traits-heading" class="font-serif text-xl lg:text-2xl font-bold text-stone-800 dark:text-white">Your four traits</h2>
              <span class="text-xs lg:text-[13px] text-stone-600 dark:text-stone-400">
                <span class="lg:hidden">Tap one to compare</span>
                <span class="hidden lg:inline">Select one to compare it with its opposite</span>
              </span>
            </div>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3.5 mt-3 lg:mt-3.5">
              <button
                v-for="(axis, i) in axes"
                :key="axis.letter"
                :ref="(el) => { if (el) traitCards[i] = el as HTMLElement }"
                type="button"
                aria-haspopup="dialog"
                class="text-left flex flex-col gap-2 min-h-[132px] lg:min-h-[176px] rounded-[20px] lg:rounded-[22px] p-3.5 lg:p-[18px] bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 hover:border-brand-primary-strong dark:hover:border-brand-primary transition-colors"
                data-testid="trait-card"
                @click="openTypologyModal(i)"
              >
                <span class="w-10 h-10 lg:w-11 lg:h-11 rounded-xl lg:rounded-[14px] bg-brand-primary-strong text-white flex items-center justify-center font-serif font-bold text-xl lg:text-[22px]" data-testid="trait-letter">{{ axis.letter }}</span>
                <span class="text-[15px] lg:text-[17px] font-extrabold text-stone-800 dark:text-white" data-testid="trait-name">{{ axis.name }}</span>
                <span class="text-xs lg:text-[13px] leading-snug text-stone-600 dark:text-stone-300" data-testid="trait-line">{{ axis.line }}</span>
                <span class="mt-auto text-xs lg:text-[13px] font-bold text-brand-primary-strong dark:text-brand-primary" data-testid="trait-opposite">vs {{ axis.opposite }}</span>
              </button>
            </div>
          </section>

          <div class="contents lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start">
            <section
              aria-labelledby="profile-needs-heading"
              class="quiz-rise rounded-[22px] bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 p-5 lg:p-6"
              :style="rise(2)"
            >
              <span class="text-xs font-extrabold uppercase tracking-[0.1em] text-stone-600 dark:text-stone-400">What your skin needs</span>
              <h2 id="profile-needs-heading" class="mt-1.5 font-serif text-xl lg:text-[22px] font-bold text-stone-800 dark:text-white">{{ profileData.focusTitle }}</h2>
              <p class="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{{ profileData.focusDesc }}</p>

              <h3 class="mt-4 mb-2 text-[13px] font-extrabold text-[#1F6B4A] dark:text-emerald-300">Look for</h3>
              <ul class="flex flex-wrap gap-1.5" data-testid="look-for">
                <li v-for="item in profileData.dos" :key="item" class="px-2.5 py-1.5 rounded-[10px] bg-[#E3F3EC] dark:bg-emerald-900/30 text-[13px] font-bold text-[#1F6B4A] dark:text-emerald-300">{{ item }}</li>
              </ul>

              <h3 class="mt-3.5 mb-2 text-[13px] font-extrabold text-[#9B2C2C] dark:text-rose-300">Best avoided</h3>
              <ul class="flex flex-wrap gap-1.5" data-testid="best-avoided">
                <li v-for="item in profileData.donts" :key="item" class="px-2.5 py-1.5 rounded-[10px] bg-[#FBE9E9] dark:bg-rose-900/30 text-[13px] font-bold text-[#9B2C2C] dark:text-rose-300">{{ item }}</li>
              </ul>

              <!-- From lg the common concerns sit in this card; on a phone they
                   have their own card further down. -->
              <div class="hidden lg:block">
                <h3 class="mt-[18px] mb-2 text-[13px] font-extrabold text-brand-text dark:text-stone-100">Common for your type</h3>
                <ul class="flex flex-wrap gap-1.5" data-testid="concerns-desktop">
                  <li v-for="concern in profileData.commonConcerns" :key="concern" class="px-2.5 py-1.5 rounded-[10px] bg-brand-bg-light dark:bg-brand-bg-dark border border-brand-surface-border dark:border-stone-600 text-[13px] font-bold">{{ concern }}</li>
                </ul>
              </div>
            </section>

            <section
              aria-labelledby="profile-routine-heading"
              class="quiz-rise rounded-[22px] bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 p-5 lg:p-6"
              :style="rise(3)"
            >
              <h2 id="profile-routine-heading" class="font-serif text-xl lg:text-[22px] font-bold text-stone-800 dark:text-white">A routine to start from</h2>

              <!-- Phone: one list at a time behind Morning / Evening tabs -->
              <div class="lg:hidden">
                <div role="tablist" aria-label="Time of day" class="grid grid-cols-2 gap-1 mt-3.5 p-1 rounded-[14px] bg-brand-bg-light dark:bg-brand-bg-dark">
                  <button
                    v-for="(tab, i) in ROUTINE_TABS"
                    :id="`routine-tab-${tab.key}`"
                    :key="tab.key"
                    :ref="(el) => { if (el) routineTabEls[i] = el as HTMLElement }"
                    type="button"
                    role="tab"
                    :aria-selected="routineTab === tab.key"
                    aria-controls="routine-panel"
                    :tabindex="routineTab === tab.key ? 0 : -1"
                    class="min-h-11 rounded-[10px] text-sm transition-colors"
                    :class="routineTab === tab.key
                      ? 'bg-brand-surface-light dark:bg-brand-surface-dark font-extrabold text-brand-primary-strong-hover dark:text-brand-primary shadow-sm'
                      : 'font-bold text-stone-600 dark:text-stone-400'"
                    @click="routineTab = tab.key"
                    @keydown="onRoutineTabKeydown($event, i)"
                  >
                    {{ tab.label }}
                  </button>
                </div>
                <div id="routine-panel" role="tabpanel" :aria-labelledby="`routine-tab-${routineTab}`">
                  <Transition name="routine-fade" mode="out-in">
                    <ol :key="routineTab" class="mt-4 flex flex-col gap-2.5" data-testid="routine-steps">
                      <li v-for="(routineStep, i) in routineSteps" :key="i" class="flex items-center gap-3">
                        <span class="w-7 h-7 shrink-0 rounded-full bg-brand-primary-light dark:bg-brand-primary/15 text-brand-primary-strong-hover dark:text-brand-primary text-[13px] font-extrabold flex items-center justify-center">{{ i + 1 }}</span>
                        <span class="text-[15px] font-semibold">{{ routineStep }}</span>
                      </li>
                    </ol>
                  </Transition>
                </div>
              </div>

              <!-- From lg: both lists side by side -->
              <div class="hidden lg:grid grid-cols-2 gap-4 mt-4">
                <div v-for="tab in ROUTINE_TABS" :key="tab.key" :data-testid="`routine-column-${tab.key}`">
                  <h3 class="mb-2.5 text-[13px] font-extrabold" :class="tab.key === 'am' ? 'text-brand-primary-strong-hover dark:text-brand-primary' : 'text-brand-text dark:text-stone-100'">{{ tab.label }}</h3>
                  <ol class="flex flex-col gap-2.5">
                    <li v-for="(routineStep, i) in profileData.routineBlueprint[tab.key]" :key="i" class="flex items-center gap-2.5">
                      <span
                        class="w-[26px] h-[26px] shrink-0 rounded-full text-xs font-extrabold flex items-center justify-center"
                        :class="tab.key === 'am' ? 'bg-brand-primary-light dark:bg-brand-primary/15 text-brand-primary-strong-hover dark:text-brand-primary' : 'bg-[#EEF2F3] dark:bg-stone-700 text-brand-text dark:text-stone-200'"
                      >{{ i + 1 }}</span>
                      <span class="text-sm font-semibold">{{ routineStep }}</span>
                    </li>
                  </ol>
                </div>
              </div>

              <dl class="grid grid-cols-3 gap-2 mt-4 lg:mt-[18px]" data-testid="textures">
                <div class="p-2.5 rounded-xl bg-brand-bg-light dark:bg-brand-bg-dark">
                  <dt class="text-[11px] font-extrabold uppercase tracking-[0.06em] text-stone-600 dark:text-stone-400">Cleanser</dt>
                  <dd class="mt-1 text-[13px] font-bold text-brand-primary-strong-hover dark:text-brand-primary">{{ profileData.idealTextures.cleanser }}</dd>
                </div>
                <div class="p-2.5 rounded-xl bg-brand-bg-light dark:bg-brand-bg-dark">
                  <dt class="text-[11px] font-extrabold uppercase tracking-[0.06em] text-stone-600 dark:text-stone-400">Moisturiser</dt>
                  <dd class="mt-1 text-[13px] font-bold text-brand-primary-strong-hover dark:text-brand-primary">{{ profileData.idealTextures.moisturizer }}</dd>
                </div>
                <div class="p-2.5 rounded-xl bg-brand-bg-light dark:bg-brand-bg-dark">
                  <dt class="text-[11px] font-extrabold uppercase tracking-[0.06em] text-stone-600 dark:text-stone-400">Sunscreen</dt>
                  <dd class="mt-1 text-[13px] font-bold text-brand-primary-strong-hover dark:text-brand-primary">{{ profileData.idealTextures.sunscreen }}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section
            aria-labelledby="profile-concerns-heading"
            class="quiz-rise lg:hidden rounded-[22px] bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-700 p-5"
            :style="rise(4)"
          >
            <h2 id="profile-concerns-heading" class="font-serif text-xl font-bold text-stone-800 dark:text-white">Common for your type</h2>
            <ul class="flex flex-wrap gap-1.5 mt-3" data-testid="concerns">
              <li v-for="concern in profileData.commonConcerns" :key="concern" class="px-[11px] py-[7px] rounded-[10px] bg-brand-bg-light dark:bg-brand-bg-dark border border-brand-surface-border dark:border-stone-600 text-[13px] font-bold">{{ concern }}</li>
            </ul>
          </section>

          <div class="quiz-rise" :style="rise(5)" data-testid="profile-recommendations">
            <SkinTypeRecommendationsWidget
              :user-skin-type="userSkinType"
              :products="recommendedProducts"
              :loading="recommendationsLoading"
              :failed="recommendationsFailed"
              @retry="loadRecommendations"
            />
          </div>

          <!-- The actions on a phone: the very end of the page, after the
               recommendations. From lg they sit under the type instead. -->
          <div class="lg:hidden flex flex-col gap-2.5" data-testid="profile-actions-phone">
            <RouterLink
              to="/quiz"
              class="h-[50px] rounded-2xl border-[1.5px] border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark text-[15px] font-bold text-brand-primary-strong dark:text-brand-primary hover:border-brand-primary-strong dark:hover:border-brand-primary flex items-center justify-center text-center px-3 transition-colors"
            >
              Doesn't sound like you? Retake the quiz
            </RouterLink>
            <button
              type="button"
              class="h-12 rounded-2xl bg-brand-primary-light dark:bg-brand-primary/15 text-[15px] font-bold text-brand-primary-strong-hover dark:text-brand-primary hover:bg-brand-primary-accent/60 dark:hover:bg-brand-primary/25 transition-colors"
              @click="router.push('/chat')"
            >
              Ask SkinBuddy AI about it
            </button>
            <p class="mt-1 text-center text-xs leading-relaxed text-stone-600 dark:text-stone-400">
              A starting point for your routine, not a diagnosis. For a skin condition, see a dermatologist.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <Teleport to="body">
      <TypologyComparisonModal
        :is-open="isModalOpen"
        :active-trait="selectedActiveTrait"
        :opposite-trait="selectedOppositeTrait"
        :position="selectedIndex"
        :steps="sheetSteps"
        @close="closeTypologyModal"
        @step="stepTrait"
      />
    </Teleport>

    <ExpressSkinSelectorModal
      :is-open="showSelector"
      :is-saving="isSaving"
      @close="showSelector = false"
      @confirm="handleExpressConfirm"
    />
  </div>
</template>

<style scoped>
/* Morning and Evening cross-fade as the tab changes. */
.routine-fade-enter-active,
.routine-fade-leave-active {
  transition: opacity 180ms ease;
}
.routine-fade-enter-from,
.routine-fade-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .routine-fade-enter-active,
  .routine-fade-leave-active {
    transition: none;
  }
}
</style>
