<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuizStore } from '../stores/quizStore'
import { saveSkinType } from '../api/quizapi'
import { baumannQuiz } from '../data/baumannQuiz'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'

import QuestionCard from '../components/QuestionCard.vue'
import QuizResultDashboard from '../components/QuizResultDashboard.vue'
import ConfirmCancelModal from '../components/ConfirmCancelModal.vue'
import LoadingScreen from '../components/LoadingScreen.vue' // NEW IMPORT

const quizStore = useQuizStore()
const router = useRouter()
const authStore = useAuthStore()
const { addToast } = useToast()
const totalQuestions = baumannQuiz.length

// Loading and Modal State
const showCancelModal = ref(false)
const isLoading = ref(true) // Start the page in a loading state

onMounted(() => {
  // Reset if they are coming back for a retake
  if (quizStore.currentQuestionIndex >= totalQuestions) {
    quizStore.resetQuiz()
  }

  // Create the artificial "App Loading" delay (1.8 seconds)
  setTimeout(() => {
    isLoading.value = false
  }, 1800)
})

const isFirstTimeUser = computed(() => !authStore.user?.skin_type)

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

// 1. Opens the warning modal
const requestCancel = () => {
  showCancelModal.value = true
}

// 2. Executes the actual cancel if they click "Yes, Exit"
const executeCancel = () => {
  showCancelModal.value = false
  quizStore.resetQuiz()
  router.push('/')
}

interface LiffWindow extends Window {
  liff?: { closeWindow: () => void }
}

const saveAndContinue = async () => {
  try {
    await saveSkinType(quizStore.finalSkinType, quizStore.scores)
    authStore.updateSkinType(quizStore.finalSkinType)
    localStorage.setItem('hasCompletedQuiz', 'true')

    addToast('Skin profile successfully saved!', 'success')

    const win = window as LiffWindow
    if (typeof window !== 'undefined' && win.liff) {
      win.liff.closeWindow()
    } else {
      router.push('/')
    }
  } catch (error) {
    console.error(error)
    addToast("Failed to save to database. Please try again.", "error")
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#F7F9F8] dark:bg-[#111412] font-sans text-slate-800 relative flex flex-col">

    <!-- THE FULL-SCREEN LOADER -->
    <Transition name="fade">
      <LoadingScreen v-if="isLoading" message="Preparing Quiz..." />
    </Transition>

    <!-- WRAPPER: Only renders AFTER loading is totally finished -->
    <div v-if="!isLoading" class="flex-grow flex flex-col">

      <!-- Active Quiz Phase -->
      <div v-if="!isQuizFinished">
        <QuestionCard
          v-if="currentQuestionData"
          :question="currentQuestionData"
          :current-step="quizStore.currentQuestionIndex + 1"
          :total-steps="totalQuestions"
          :show-cancel="!isFirstTimeUser"
          @answer="handleAnswer"
          @back="quizStore.currentQuestionIndex > 0 ? quizStore.currentQuestionIndex-- : requestCancel()"
          @cancel="requestCancel"
        />
      </div>

      <!-- Completed Analysis Phase -->
<div v-else class="pb-32">
        <QuizResultDashboard
          :skin-type="quizStore.finalSkinType"
          :scores="quizStore.scores"
        />

        <div class="fixed bottom-0 left-0 w-full bg-brand-surface-light dark:bg-brand-surface-dark border-t border-stone-200 dark:border-stone-800 p-4 sm:p-6 z-20">
          <div class="max-w-md mx-auto">
            <button
              @click="saveAndContinue"
              class="w-full bg-brand-primary text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md flex justify-center items-center gap-2 hover:bg-orange-800 active:scale-[0.98]"
            >
              Save Skin Profile
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            </button>
          </div>
        </div>
      </div>

    </div>

    <ConfirmCancelModal
      v-if="showCancelModal"
      @cancel="showCancelModal = false"
      @confirm="executeCancel"
    />

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.6s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
