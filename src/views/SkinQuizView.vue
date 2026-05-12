<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuizStore } from '../stores/quizStore'
import { saveSkinType } from '../api/quizapi'
import { baumannQuiz } from '../data/baumannQuiz'
import { useAuthStore } from '../stores/auth'
import QuestionCard from '../components/QuestionCard.vue'
import QuizResultDashboard from '../components/QuizResultDashboard.vue'

const quizStore = useQuizStore()
const router = useRouter()
const authStore = useAuthStore()
const totalQuestions = baumannQuiz.length

const currentQuestionData = computed(() => {
  return baumannQuiz[quizStore.currentQuestionIndex]
})

const isQuizFinished = computed(() => {
  return quizStore.currentQuestionIndex >= totalQuestions
})

const handleAnswer = (points: number) => {
  if (currentQuestionData.value) {
    quizStore.answerQuestion(currentQuestionData.value.category, points)
  }
}

interface LiffWindow extends Window {
  liff?: { closeWindow: () => void }
}

const saveAndContinue = async () => {
  try {
    await saveSkinType(quizStore.finalSkinType, quizStore.scores)
    authStore.updateSkinType(quizStore.finalSkinType)
    localStorage.setItem('hasCompletedQuiz', 'true')

    const win = window as LiffWindow
    if (typeof window !== 'undefined' && win.liff) {
      win.liff.closeWindow()
    } else {
      router.push('/')
    }
  } catch (error) {
    console.error(error)
    alert("Failed to save to database. Please try again.")
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 pt-8 pb-20 font-sans text-slate-800">

    <div v-if="!isQuizFinished" class="pt-10">
      <QuestionCard
        v-if="currentQuestionData"
        :question="currentQuestionData"
        :current-step="quizStore.currentQuestionIndex + 1"
        :total-steps="totalQuestions"
        @answer="handleAnswer"
      />
    </div>

    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      <div class="text-center mb-10">
        <span class="bg-indigo-100 text-indigo-800 text-xs font-bold px-4 py-1.5 rounded-full tracking-wider mb-4 inline-block">
          ANALYSIS COMPLETE
        </span>
        <h1 class="text-3xl md:text-4xl text-slate-900 font-serif mb-2">
          Your Comprehensive Result: <span class="text-[#2E5BFF] font-bold">{{ quizStore.finalSkinType }}</span>
        </h1>
        <p class="text-slate-500">Based on your dermatological markers and quiz responses.</p>
      </div>

      <QuizResultDashboard
        :skin-type="quizStore.finalSkinType"
        :scores="quizStore.scores"
      />

      <div class="flex flex-col gap-3 max-w-lg mx-auto mt-8">
        <button
          @click="saveAndContinue"
          class="w-full bg-[#2E5BFF] text-white font-semibold py-4 px-6 rounded-xl transition-colors hover:bg-blue-700 shadow-sm flex justify-center items-center"
        >
          <span class="mr-2">💾</span> Save analysis and continue
        </button>

        <button
          @click="quizStore.resetQuiz"
          class="w-full bg-white text-slate-700 border border-slate-300 font-semibold py-4 px-6 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
        >
          Retake Quiz
        </button>
      </div>

    </div>
  </div>
</template>
