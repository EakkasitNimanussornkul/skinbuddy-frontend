<template>
  <div class="min-h-screen bg-slate-50 pt-10 pb-20 font-sans">

    <div v-if="!isQuizFinished">
      <QuestionCard
        v-if="currentQuestionData"
        :question="currentQuestionData"
        :current-step="quizStore.currentQuestionIndex + 1"
        :total-steps="totalQuestions"
        @answer="handleAnswer"
      />
    </div>

    <div v-else class="flex flex-col items-center px-6 max-w-md mx-auto text-center">

      <span class="bg-indigo-100 text-indigo-800 text-xs font-bold px-4 py-1.5 rounded-full tracking-wider mb-6">
        YOUR ANALYSIS IS COMPLETE
      </span>

      <h1 class="text-4xl text-slate-900 mb-8 font-serif">Your Skin Type</h1>

      <div class="bg-white w-full py-12 px-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
        <h2 class="text-6xl text-blue-700 font-serif mb-2 tracking-wide">
          {{ quizStore.finalSkinType }}
        </h2>
        <p class="text-slate-500 italic text-sm">
          Based on your dermatological markers
        </p>
      </div>

      <button
        @click="saveAndContinue"
        class="w-full bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl mb-4 transition-colors hover:bg-blue-800 shadow-sm"
      >
        Save to Profile & Continue
      </button>

      <button
        @click="quizStore.resetQuiz"
        class="text-slate-500 font-semibold text-sm py-2 hover:text-slate-800 transition-colors"
      >
        Retake Quiz
      </button>

    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuizStore } from '../stores/quizStore'
import { baumannQuiz } from '../data/baumannQuiz'
import QuestionCard from '../components/QuestionCard.vue'

const quizStore = useQuizStore()
const totalQuestions = baumannQuiz.length

// Grab the specific question object based on the user's current index
const currentQuestionData = computed(() => {
  return baumannQuiz[quizStore.currentQuestionIndex]
})

// Check if they have answered all questions in the array
const isQuizFinished = computed(() => {
  return quizStore.currentQuestionIndex >= totalQuestions
})

// This receives the points emitted from your QuestionCard component
const handleAnswer = (points: number) => {
  if (currentQuestionData.value) {
    quizStore.answerQuestion(currentQuestionData.value.category, points)
  }
}

// Placeholder for when we connect Supabase later!
const saveAndContinue = () => {
  console.log("Saving Skin Type:", quizStore.finalSkinType)
  alert(`Successfully saved ${quizStore.finalSkinType} to your profile!`)
}
</script>
