<template>
  <div class="flex flex-col p-6 max-w-md mx-auto font-sans text-gray-800">

    <!-- Progress Header -->
    <div class="flex justify-between text-xs font-bold text-blue-700 mb-2 tracking-wide">
      <span>STEP {{ currentStep }} OF {{ totalSteps }}</span>
      <span>{{ progressPercentage }}% COMPLETE</span>
    </div>

    <!-- Progress Bar -->
    <div class="h-1.5 bg-gray-200 rounded mb-8 overflow-hidden">
      <div
        class="h-full bg-blue-600 transition-all duration-300 ease-out"
        :style="{ width: progressPercentage + '%' }"
      ></div>
    </div>

    <!-- Question Content -->
    <h2 class="text-2xl font-medium leading-snug mb-3 font-serif text-slate-900">{{ question.text }}</h2>
    <p v-if="question.subtext" class="text-sm text-gray-500 mb-6 leading-relaxed">
      {{ question.subtext }}
    </p>

    <!-- Options List -->
    <div class="flex flex-col gap-3 mb-8">
      <div
        v-for="(option, index) in question.options"
        :key="index"
        @click="selectOption(index)"
        class="flex items-center p-4 border-2 rounded-xl shadow-sm cursor-pointer transition-all duration-200"
        :class="selectedIndex === index ? 'border-blue-600 bg-blue-50/50' : 'border-transparent bg-white hover:border-blue-100'"
      >
        <!-- Placeholder for icon (You can swap this for SVGs later) -->
        <div class="w-8 h-8 bg-slate-100 rounded-lg flex-shrink-0 mr-4 flex items-center justify-center text-slate-400">
          <!-- Add SVG here later -->
        </div>

        <div class="flex flex-col flex-grow">
          <span class="font-semibold text-sm mb-1 text-slate-800">{{ option.text }}</span>
          <span v-if="option.subtitle" class="text-xs text-slate-500">{{ option.subtitle }}</span>
        </div>

        <!-- Radio Indicator -->
        <div
          class="w-5 h-5 rounded-full border-2 ml-4 flex items-center justify-center transition-colors flex-shrink-0"
          :class="selectedIndex === index ? 'bg-blue-600 border-blue-600' : 'border-slate-300'"
        >
          <span v-if="selectedIndex === index" class="text-white text-[10px] font-bold">✓</span>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
<button
      @click="submitAnswer"
      :disabled="selectedIndex === null"
      class="w-full bg-blue-700 text-white font-semibold p-4 rounded-xl mb-2 transition-colors hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed shadow-sm"
    >
      Continue
    </button>

    <button
      v-if="question.options.length < 5"
      @click="submitUnsure"
      class="text-slate-500 font-semibold text-sm p-3 mb-8 hover:text-slate-800 transition-colors"
    >
      I'm not sure
    </button>

    <!-- Expert Insight Box -->
    <div v-if="question.insight" class="flex bg-slate-100/80 p-4 rounded-xl items-start border border-slate-200">
      <span class="mr-3 text-lg opacity-80">💡</span>
      <div>
        <span class="block font-semibold text-slate-700 text-sm mb-1">Expert Insight</span>
        <p class="text-xs text-slate-500 leading-relaxed m-0">{{ question.insight }}</p>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { QuizQuestion } from '../data/baumannQuiz'

const props = defineProps<{
  question: QuizQuestion;
  currentStep: number;
  totalSteps: number;
}>()

const emit = defineEmits<{
  (e: 'answer', points: number): void
}>()

// Local state to track what the user clicks before submitting
const selectedIndex = ref<number | null>(null)

// Calculate how full the progress bar should be
const progressPercentage = computed(() => {
  return Math.round((props.currentStep / props.totalSteps) * 100)
})

const selectOption = (index: number) => {
  selectedIndex.value = index
}

// Send the points to the parent view and reset the selection
const submitAnswer = () => {
  if (selectedIndex.value !== null) {
    // Safely grab the option using the index
    const selectedOption = props.question.options[selectedIndex.value]

    // Check if the option actually exists before asking for its points
    if (selectedOption) {
      emit('answer', selectedOption.points)
      selectedIndex.value = null
    }
  }
}

// Standard 2.5 points for unsure answers
const submitUnsure = () => {
  emit('answer', 2.5)
  selectedIndex.value = null
}
</script>
