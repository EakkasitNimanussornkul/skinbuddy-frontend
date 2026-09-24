<script setup lang="ts">
import { ref, computed, useId } from 'vue'
import { useStepList } from '../../composables/useStepList'
import ShowMoreControl from '../Shared/ShowMoreControl.vue'
import CollapseTransition from '../Shared/CollapseTransition.vue'

const props = defineProps<{
  ingredients?: Array<{
    ingredients: {
      id: string
      name: string
      benefits: string | null
      functional_group: string | null
    }
  }>
  // Lets the user fold the whole grid away. Opt-in: the shelf item details
  // pass it, because the actives sit among several other sections there; the
  // compare matrix does not, because the actives are that panel's subject.
  // Starts open - folding is the user's choice.
  collapsible?: boolean
}>()

const isCollapsed = ref(false)
const regionId = useId()
const listId = useId()

const keyActives = computed(() => {
  if (!props.ingredients) return []
  return props.ingredients.filter(item => {
    const group = item.ingredients?.functional_group
    if (!group) return false
    const normalized = group.toLowerCase().trim()
    return normalized !== 'formulation stabilizer' && normalized !== 'solvent' && normalized !== 'vehicle'
  })
})

// Four, then four more at a time. Was four then every active at once.
const activeSteps = useStepList(keyActives, { initial: 4, step: 4 })

const isContentVisible = computed(() => !props.collapsible || !isCollapsed.value)
</script>

<template>
  <div class="space-y-4 w-full">
    <!-- Component Section Label Header. When collapsible, the button sits
         inside the h3 rather than around it - a heading is not valid content
         for a button - and spans the whole row, so the target is the full
         header and the count stays visible while folded. -->
    <h3 class="text-[11px] font-bold text-brand-text dark:text-stone-300 uppercase tracking-widest">
      <component
        :is="collapsible ? 'button' : 'div'"
        :type="collapsible ? 'button' : undefined"
        :aria-expanded="collapsible ? !isCollapsed : undefined"
        :aria-controls="collapsible ? regionId : undefined"
        class="flex items-center justify-between gap-3 w-full text-left uppercase tracking-widest"
        :class="collapsible ? 'cursor-pointer group' : ''"
        @click="collapsible && (isCollapsed = !isCollapsed)"
      >
        <span class="flex items-center gap-2">
          <svg class="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
          </svg>
          <span>Key Active Formulas</span>
        </span>
        <span class="flex items-center gap-2 normal-case tracking-normal">
          <span class="text-[10px] font-mono font-bold text-brand-primary dark:text-brand-primary-accent bg-brand-primary/10 px-2 py-0.5 rounded-md border border-brand-primary/20">
            {{ keyActives.length }} Actives
          </span>
          <span v-if="collapsible" class="flex items-center gap-1 text-[11px] font-bold text-brand-primary group-hover:underline">
            {{ isCollapsed ? 'Show' : 'Hide' }}
            <svg
              :class="['w-3.5 h-3.5 stroke-[2.5] transition-transform duration-200', isCollapsed ? '' : 'rotate-180']"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </span>
      </component>
    </h3>

    <CollapseTransition>
      <div v-show="isContentVisible" :id="regionId" class="space-y-4">
        <div v-if="activeSteps.visible.value.length > 0" :id="listId" class="grid grid-cols-1 gap-3 w-full">
          <div
            v-for="pi in activeSteps.visible.value"
            :key="pi.ingredients?.id"
            class="animate-reveal group bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800 rounded-2xl p-4 transition-all hover:border-brand-primary/40 dark:hover:border-brand-primary/40 hover:shadow-md"
          >
            <div class="flex items-start justify-between gap-4 mb-2">
              <span class="block text-sm font-bold text-brand-text dark:text-stone-100 group-hover:text-brand-primary dark:group-hover:text-brand-primary-accent transition-colors leading-tight truncate">
                {{ pi.ingredients?.name }}
              </span>
              <span class="text-[9px] font-black bg-brand-primary-light text-brand-primary dark:bg-brand-primary/10 dark:text-brand-primary-accent px-2 py-0.5 rounded-lg uppercase tracking-wider shrink-0 border border-brand-primary/10 max-w-[150px] truncate">
                {{ pi.ingredients?.functional_group || 'Active' }}
              </span>
            </div>
            <p class="text-xs text-brand-text-muted dark:text-stone-400 leading-relaxed font-medium">
              {{ pi.ingredients?.benefits || 'No target physiological benefit descriptions logged for this active component compound.' }}
            </p>
          </div>
        </div>

        <!-- Fallback Empty State Indicator -->
        <div v-else class="text-center py-6 border border-dashed border-brand-surface-border dark:border-stone-800 rounded-2xl text-xs font-semibold text-brand-text-muted">
          No therapeutic chemical groups found inside this product classification layer.
        </div>

        <ShowMoreControl
          :next-count="activeSteps.nextCount.value"
          :remaining="activeSteps.remaining.value"
          :can-show-more="activeSteps.canShowMore.value"
          :can-show-less="activeSteps.canShowLess.value"
          noun="actives"
          :controls="listId"
          @more="activeSteps.showMore"
          @less="activeSteps.showLess"
        />
      </div>
    </CollapseTransition>
  </div>
</template>
