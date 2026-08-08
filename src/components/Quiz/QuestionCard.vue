<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  question: {
    id: number
    text: string
    subtext?: string
    insight?: string
    category: 'hydration' | 'sensitivity' | 'pigmentation' | 'aging'
    options: Array<{ text: string; points: number }>
    showNotSure?: boolean
  }
  currentStep: number
  totalSteps: number
  showCancel: boolean
  savedOptionIndex: number | 'not_sure' | null
}>()

const emit = defineEmits(['answer', 'back', 'cancel'])

const selectedOptionIndex = ref<number | 'not_sure' | null>(null)

watch(() => props.question.id, () => {
  selectedOptionIndex.value = props.savedOptionIndex !== undefined ? props.savedOptionIndex : null
}, { immediate: true })

const handleContinue = () => {
  if (selectedOptionIndex.value === 'not_sure') {
    emit('answer', { points: 2.5, optionIndex: 'not_sure' })
  } else if (selectedOptionIndex.value !== null) {
    emit('answer', {
      points: props.question.options[selectedOptionIndex.value]!.points,
      optionIndex: selectedOptionIndex.value
    })
  }
}

const categoryDetails = computed(() => {
  const details = {
    hydration: {
      title: 'Moisture & Sebum',
      desc: 'This helps us understand your skin barrier, natural oil production, and hydration retention levels.'
    },
    sensitivity: {
      title: 'Barrier Reactivity',
      desc: 'This evaluates how likely your skin is to experience redness, stinging, or allergic reactions.'
    },
    pigmentation: {
      title: 'Melanin Production',
      desc: 'This assesses your skin\'s tendency to develop dark spots, freckles, or post-acne marks.'
    },
    aging: {
      title: 'Elasticity & Aging',
      desc: 'This looks at your skin\'s natural collagen support, firmness, and tendency to form fine lines.'
    }
  }
  return details[props.question.category]
})

// The quiz is 4 fixed categories of 4 questions each, in this order.
const CATEGORY_ORDER = ['hydration', 'sensitivity', 'pigmentation', 'aging'] as const
const CATEGORY_SHORT_LABEL: Record<(typeof CATEGORY_ORDER)[number], string> = {
  hydration: 'Hydration',
  sensitivity: 'Sensitivity',
  pigmentation: 'Pigment',
  aging: 'Aging'
}

const segmentFill = computed(() => {
  const perCategory = props.totalSteps / CATEGORY_ORDER.length
  const activeIndex = CATEGORY_ORDER.indexOf(props.question.category)
  return CATEGORY_ORDER.map((_, i) => {
    if (i < activeIndex) return 100
    if (i > activeIndex) return 0
    const positionInCategory = props.currentStep - i * perCategory
    return Math.min(100, Math.max(0, (positionInCategory / perCategory) * 100))
  })
})

const showNotSure = computed(() => props.question.showNotSure !== false)
</script>

<template>
  <div class="flex flex-col min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-brand-text dark:text-stone-100 font-sans relative">

    <div class="max-w-xl mx-auto w-full px-4 sm:px-6 pt-6 pb-32 flex-grow flex flex-col overflow-y-auto overflow-x-hidden hide-scrollbar">

      <!-- Top Navigation Bar -->
      <div class="flex items-center justify-between mb-8">
        <button @click="emit('back')" class="w-8 h-8 flex items-center justify-start text-stone-800 dark:text-stone-200 hover:text-brand-primary transition-colors">
          <svg class="w-6 h-6 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>

        <div class="flex-grow mx-6 relative">
          <!-- Segmented Progress Bar: one chunk per quiz category -->
          <div class="flex gap-1.5">
            <div
              v-for="cat in CATEGORY_ORDER"
              :key="cat"
              class="flex-1 h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden"
            >
              <div
                class="h-full bg-brand-primary transition-all duration-500 ease-out"
                :style="{ width: `${segmentFill[CATEGORY_ORDER.indexOf(cat)]}%` }"
              ></div>
            </div>
          </div>
          <div class="flex justify-between mt-2">
            <span
              v-for="cat in CATEGORY_ORDER"
              :key="cat"
              class="text-[8px] sm:text-[9px] font-bold uppercase tracking-wide"
              :class="cat === question.category ? 'text-brand-primary' : 'text-brand-text-muted dark:text-stone-600'"
            >
              {{ CATEGORY_SHORT_LABEL[cat] }}
            </span>
          </div>
          <div class="text-center text-[10px] font-bold text-brand-text-muted mt-1 tracking-widest uppercase">
            Step {{ currentStep }} of {{ totalSteps }}
          </div>
        </div>

        <button
          v-if="showCancel"
          @click="emit('cancel')"
          class="text-sm font-bold text-stone-400 hover:text-rose-500 transition-colors w-8 text-right"
        >
          Cancel
        </button>
        <div v-else class="w-8"></div>
      </div>

      <Transition appear name="slide-fade" mode="out-in">
        <div :key="question.id" class="flex flex-col flex-grow w-full">

          <!-- Category Badge -->
          <div class="mb-6">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary rounded-lg mb-3 border border-brand-primary/20">
              <span class="text-[10px] font-bold uppercase tracking-widest">{{ categoryDetails.title }}</span>
            </div>
            <p class="text-sm font-medium text-stone-500 dark:text-stone-400 leading-relaxed">
              {{ categoryDetails.desc }}
            </p>
          </div>

          <h1 class="text-2xl sm:text-3xl font-bold mb-3 text-brand-text dark:text-white leading-tight font-serif">
            {{ question.text }}
          </h1>
          <p v-if="question.subtext" class="text-xs text-brand-text-muted dark:text-stone-500 font-medium mb-5 leading-relaxed">
            {{ question.subtext }}
          </p>

          <div v-if="question.insight" class="flex gap-3 items-start bg-brand-primary-light/60 dark:bg-brand-primary/10 border border-brand-primary/20 rounded-2xl px-4 py-3 mb-5">
            <svg class="w-4 h-4 text-brand-primary flex-shrink-0 mt-0.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z" /></svg>
            <p class="text-xs text-brand-text dark:text-stone-300 leading-relaxed"><span class="font-bold text-brand-primary">Why we ask &mdash; </span>{{ question.insight }}</p>
          </div>

          <div v-if="!question.subtext && !question.insight" class="mb-5"></div>

          <!-- Options Container -->
          <div class="flex flex-col mb-auto">
            <div class="grid grid-cols-2 gap-3 sm:gap-4 w-full">
              <button
                v-for="(option, index) in question.options"
                :key="index"
                @click="selectedOptionIndex = index"
                class="relative px-3 py-4 sm:p-6 rounded-2xl border-2 text-center transition-all duration-200 flex flex-col items-center justify-center min-h-[100px] sm:min-h-[120px] h-full active:scale-[0.97]"
                :class="[
                  selectedOptionIndex === index
                    ? 'bg-brand-primary-light border-brand-primary text-brand-primary dark:bg-brand-primary/20 dark:border-brand-primary dark:text-brand-primary shadow-sm scale-[0.98]'
                    : 'bg-white border-stone-200 text-stone-700 hover:border-brand-primary/40 dark:bg-brand-surface-dark dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-500',
                  index === 4 ? 'col-span-2' : ''
                ]"
              >
                <span
                  v-if="selectedOptionIndex === index"
                  class="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-sm"
                >
                  <svg class="w-3 h-3 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                </span>
                <span class="text-sm sm:text-base font-bold leading-snug break-words w-full">{{ option.text }}</span>
              </button>
            </div>

            <div v-if="showNotSure" class="mt-4 w-full">
              <button
                @click="selectedOptionIndex = 'not_sure'"
                class="w-full py-4 rounded-2xl border-2 border-dashed transition-all duration-200 text-sm font-bold active:scale-[0.98]"
                :class="
                  selectedOptionIndex === 'not_sure'
                    ? 'bg-brand-primary-light border-brand-primary text-brand-primary dark:bg-brand-primary/20 dark:border-brand-primary dark:text-brand-primary'
                    : 'bg-transparent border-stone-300 text-stone-500 hover:border-stone-400 dark:border-stone-700 dark:text-stone-400'
                "
              >
                I'm not sure
              </button>
            </div>
          </div>

        </div>
      </Transition>
    </div>

    <!-- Fixed Bottom Action Bar -->
    <div class="fixed bottom-0 left-0 w-full bg-brand-bg-light/90 dark:bg-brand-bg-dark/90 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 p-4 sm:p-6 flex justify-center z-10">
      <div class="max-w-xl w-full flex gap-4">
        <button
          @click="emit('back')"
          class="flex-1 py-4 px-6 rounded-2xl font-bold text-brand-primary border-2 border-brand-primary hover:bg-brand-primary-light dark:hover:bg-brand-primary/10 transition-colors active:scale-[0.98]"
        >
          Back
        </button>
        <button
          @click="handleContinue"
          :disabled="selectedOptionIndex === null"
          class="flex-1 py-4 px-6 rounded-2xl font-bold transition-all duration-200 shadow-sm active:scale-[0.98]"
          :class="
            selectedOptionIndex !== null
              ? 'bg-brand-primary text-white hover:bg-brand-primary-hover shadow-md shadow-brand-primary/20'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed dark:bg-stone-800 dark:text-stone-600 border border-transparent'
          "
        >
          Continue
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
