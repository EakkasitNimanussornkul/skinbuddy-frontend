<script setup lang="ts">
import { computed, ref } from 'vue'
import { groupSteps, scheduleLabel } from '../../utils/routineSchedule'
import type { ProposedStep } from '../../api/routineApi'

const props = defineProps<{
  steps: ProposedStep[]
  applied?: boolean
}>()

const emit = defineEmits(['use', 'adjust', 'view'])

const grouped = computed(() => groupSteps(props.steps || []))

// One session is shown at a time, so the card stays short. A 'both' step is
// listed under each session, as it is on the Routine page.
const sessions = computed(() =>
  [
    { key: 'morning', title: 'Morning', items: grouped.value.morning },
    { key: 'evening', title: 'Evening', items: grouped.value.evening },
  ].filter((s) => s.items.length),
)
const activeKey = ref('morning')
const active = computed(
  () => sessions.value.find((s) => s.key === activeKey.value) ?? sessions.value[0],
)

// Each product once, for the photo stack and the summary line.
const products = computed(() => {
  const byId = new Map<string, ProposedStep>()
  for (const s of props.steps || []) if (!byId.has(s.product_id)) byId.set(s.product_id, s)
  return [...byId.values()]
})
const STACK_MAX = 4
const newCount = computed(() => products.value.filter((p) => !p.owned).length)

// Reason and caution stay folded until a step is tapped; one open at a time.
const openKey = ref<string | null>(null)
const stepKey = (s: ProposedStep) => `${active.value?.key}-${s.product_id}`
const toggle = (s: ProposedStep) => {
  if (!s.reason && !s.caution) return
  openKey.value = openKey.value === stepKey(s) ? null : stepKey(s)
}

// A photo that fails to load falls back to the placeholder, like a missing one.
const brokenImages = ref(new Set<string>())
const hasImage = (s: ProposedStep) => !!s.image_url && !brokenImages.value.has(s.product_id)
const markBroken = (productId: string) => {
  brokenImages.value = new Set(brokenImages.value).add(productId)
}
</script>

<template>
  <div class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl border border-brand-surface-border dark:border-stone-700 shadow-sm p-4 w-full">
    <!-- Header: product photos + one-line summary -->
    <div class="flex items-center gap-3">
      <div class="flex -space-x-2.5 shrink-0" aria-hidden="true">
        <div
          v-for="p in products.slice(0, STACK_MAX)"
          :key="p.product_id"
          class="stack-photo w-9 h-9 rounded-full overflow-hidden bg-brand-bg-light dark:bg-stone-800 ring-2 ring-brand-surface-light dark:ring-brand-surface-dark flex items-center justify-center"
        >
          <img v-if="hasImage(p)" :src="p.image_url ?? undefined" alt="" loading="lazy" @error="markBroken(p.product_id)" class="w-full h-full object-contain p-0.5 mix-blend-multiply dark:mix-blend-normal" />
          <svg v-else class="w-4 h-4 text-brand-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 3h6v3H9zM8 6h8l1 3v10a2 2 0 01-2 2H9a2 2 0 01-2-2V9l1-3z" /></svg>
        </div>
        <div
          v-if="products.length > STACK_MAX"
          class="w-9 h-9 rounded-full bg-brand-primary-light dark:bg-brand-primary/20 ring-2 ring-brand-surface-light dark:ring-brand-surface-dark flex items-center justify-center text-[10px] font-bold text-brand-text dark:text-brand-primary-accent"
        >
          +{{ products.length - STACK_MAX }}
        </div>
      </div>
      <div class="min-w-0">
        <p class="text-sm font-bold text-brand-text dark:text-stone-100 leading-tight">Your new routine</p>
        <p class="summary text-[11px] text-brand-text-muted dark:text-stone-400 mt-0.5">
          {{ products.length }} {{ products.length === 1 ? 'product' : 'products' }}<template v-if="newCount"> · {{ newCount }} new</template>
        </p>
      </div>
    </div>

    <!-- Session switcher -->
    <div v-if="sessions.length > 1" role="tablist" class="mt-3 grid grid-cols-2 gap-1 p-1 rounded-xl bg-brand-bg-light dark:bg-stone-800">
      <button
        v-for="s in sessions"
        :key="s.key"
        type="button"
        role="tab"
        :aria-selected="s.key === active?.key"
        @click="activeKey = s.key; openKey = null"
        class="session-tab py-1.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        :class="s.key === active?.key
          ? 'bg-brand-surface-light dark:bg-brand-surface-dark text-brand-text dark:text-stone-100 shadow-sm'
          : 'text-brand-text-muted dark:text-stone-400 hover:text-brand-text dark:hover:text-stone-200'"
      >
        <svg v-if="s.key === 'morning'" class="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        <svg v-else class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        {{ s.title }}
        <span class="text-[10px] font-semibold opacity-60 tabular-nums">{{ s.items.length }}</span>
      </button>
    </div>
    <p v-else-if="active" class="mt-3 text-[10px] font-bold uppercase tracking-widest text-brand-text-muted">{{ active.title }}</p>

    <!-- Steps for the selected session -->
    <ol v-if="active" role="tabpanel" class="mt-3 space-y-2">
      <li v-for="(s, i) in active.items" :key="stepKey(s)" class="proposal-step">
        <button
          type="button"
          @click="toggle(s)"
          :aria-expanded="s.reason || s.caution ? openKey === stepKey(s) : undefined"
          class="w-full flex items-center gap-3 p-2 rounded-xl text-left bg-brand-bg-light/60 dark:bg-stone-800/60 border border-brand-surface-border dark:border-stone-700 transition-colors"
          :class="s.reason || s.caution ? 'cursor-pointer hover:border-brand-primary/50' : 'cursor-default'"
        >
          <!-- Photo, numbered by application order -->
          <div class="relative w-14 h-14 shrink-0">
            <div class="w-full h-full rounded-lg bg-brand-surface-light dark:bg-stone-900 border border-brand-surface-border dark:border-stone-700 p-1 flex items-center justify-center overflow-hidden">
              <img
                v-if="hasImage(s)"
                :src="s.image_url ?? undefined"
                :alt="s.product_name"
                loading="lazy"
                @error="markBroken(s.product_id)"
                class="step-photo w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
              />
              <svg v-else class="step-placeholder w-6 h-6 text-brand-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" :aria-label="s.product_name" role="img"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 3h6v3H9zM8 6h8l1 3v10a2 2 0 01-2 2H9a2 2 0 01-2-2V9l1-3z" /></svg>
            </div>
            <span class="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-brand-primary text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-brand-surface-light dark:ring-brand-surface-dark tabular-nums">{{ i + 1 }}</span>
          </div>

          <div class="flex-1 min-w-0">
            <p v-if="s.brand" class="text-[10px] font-bold text-brand-primary uppercase tracking-wider line-clamp-1">{{ s.brand }}</p>
            <p class="step-name text-sm font-bold text-brand-text dark:text-stone-100 leading-tight line-clamp-2">{{ s.product_name }}</p>
            <div class="flex flex-wrap items-center gap-1.5 mt-1">
              <span class="whitespace-nowrap text-[9px] font-bold px-2 py-0.5 rounded-md uppercase bg-brand-surface-light dark:bg-stone-900 text-brand-text-muted border border-brand-surface-border dark:border-stone-700">{{ scheduleLabel(s.frequency) }}</span>
              <span v-if="!s.owned" class="new-chip text-[9px] font-bold px-2 py-0.5 rounded-md uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">New</span>
              <svg v-if="s.caution" class="caution-icon w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="Has a caution"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
          </div>

          <svg
            v-if="s.reason || s.caution"
            class="w-4 h-4 shrink-0 text-brand-text-muted transition-transform"
            :class="openKey === stepKey(s) ? 'rotate-180' : ''"
            fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
          ><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>

        <!-- Why + what to watch for, on demand -->
        <div v-if="openKey === stepKey(s)" class="step-details mt-1.5 mx-2 px-3 py-2 rounded-lg bg-brand-bg-light dark:bg-stone-800/60 space-y-1">
          <p v-if="s.reason" class="text-[11px] text-brand-text dark:text-stone-300 leading-snug">{{ s.reason }}</p>
          <p v-if="s.caution" class="text-[11px] text-amber-700 dark:text-amber-400 leading-snug flex items-start gap-1">
            <svg class="w-3 h-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {{ s.caution }}
          </p>
        </div>
      </li>
    </ol>

    <p v-if="newCount && !applied" class="mt-3 text-[11px] text-brand-text-muted dark:text-stone-400 leading-snug">
      <span class="font-bold text-amber-700 dark:text-amber-400">New</span> products are added to your shelf when you use this routine.
    </p>

    <!-- Applied state -->
    <div v-if="applied" class="mt-3 flex items-center justify-between gap-3">
      <span class="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
        Applied as your routine
      </span>
      <button @click="emit('view')" class="text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover px-3.5 py-2 rounded-lg transition-colors cursor-pointer active:scale-95">View routine</button>
    </div>

    <!-- Action state (UC-15 step 6/7) -->
    <div v-else class="mt-3 grid grid-cols-2 gap-2">
      <button @click="emit('adjust')" class="py-2.5 rounded-lg font-bold text-xs text-brand-text dark:text-stone-300 bg-brand-bg-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700 hover:bg-brand-surface-border/40 dark:hover:bg-stone-700 transition-colors cursor-pointer">Adjust</button>
      <button @click="emit('use')" class="py-2.5 rounded-lg font-bold text-xs text-white bg-brand-primary hover:bg-brand-primary-hover transition-all shadow-sm active:scale-[0.98] cursor-pointer">Use this routine</button>
    </div>
  </div>
</template>
