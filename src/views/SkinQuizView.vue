<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuizStore } from '../stores/quizStore'
import { saveSkinType } from '../api/quizapi'
import { baumannQuiz } from '../data/baumannQuiz'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'

import QuestionCard from '../components/Quiz/QuestionCard.vue'
import QuizResultDashboard from '../components/Quiz/QuizResultDashboard.vue'
import ConfirmCancelModal from '../components/Shared/ConfirmCancelModal.vue'
import LoadingScreen from '../components/Shared/LoadingScreen.vue'

const quizStore = useQuizStore()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { addToast } = useToast()
const totalQuestions = baumannQuiz.length

const showCancelModal = ref(false)
const isCalculating = ref(false)
const showResults = ref(false)

onMounted(() => {
  if (quizStore.currentQuestionIndex >= totalQuestions) {
    quizStore.resetQuiz()
  }
})

const isFirstTimeUser = computed(() => !authStore.user?.skin_type)

const currentQuestionData = computed(() => {
  return baumannQuiz[quizStore.currentQuestionIndex]
})

const isQuizFinished = computed(() => {
  return quizStore.currentQuestionIndex >= totalQuestions
})

// A purposeful "calculating" beat between the last question and the results
// reveal, instead of an instant page-swap.
watch(isQuizFinished, (finished) => {
  if (!finished) {
    showResults.value = false
    return
  }
  isCalculating.value = true
  setTimeout(() => {
    isCalculating.value = false
    showResults.value = true
  }, 1400)
})

const handleAnswer = (payload: { points: number, optionIndex: number | 'not_sure' }) => {
  if (currentQuestionData.value) {
    quizStore.answerQuestion(
      quizStore.currentQuestionIndex,
      currentQuestionData.value.category,
      payload.points,
      payload.optionIndex
    )
  }
}

const requestCancel = () => {
  showCancelModal.value = true
}

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
      // Honour the guard's redirect now that a skin type exists. Defaults to
      // home, which is where the quiz has always sent people.
      router.push((route.query.redirect as string) || '/')
    }
  } catch (error) {
    console.error(error)
    addToast("Failed to save to database. Please try again.", "error")
  }
}
</script>

<template>
  <!-- Updated background to semantic tokens -->
  <div class="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark font-sans text-brand-text dark:text-stone-100 relative flex flex-col">

    <Transition name="fade">
      <LoadingScreen v-if="isCalculating" message="Calculating your profile..." />
    </Transition>

    <div class="flex-grow flex flex-col">

      <div v-if="!isQuizFinished">
        <QuestionCard
          v-if="currentQuestionData"
          :question="currentQuestionData"
          :current-step="quizStore.currentQuestionIndex + 1"
          :total-steps="totalQuestions"
          :show-cancel="!isFirstTimeUser"
          :saved-option-index="quizStore.answersHistory[quizStore.currentQuestionIndex]?.optionIndex ?? null"
          @answer="handleAnswer"
          @back="quizStore.currentQuestionIndex > 0 ? quizStore.currentQuestionIndex-- : requestCancel()"
          @cancel="requestCancel"
        />
      </div>

      <Transition name="reveal">
        <div v-if="isQuizFinished && showResults" class="pb-32">
          <QuizResultDashboard
            :skin-type="quizStore.finalSkinType"
            :scores="quizStore.scores"
          />

          <!-- Sticky Footer for saving -->
          <div class="fixed bottom-0 left-0 w-full bg-brand-surface-light dark:bg-brand-surface-dark border-t border-brand-surface-border dark:border-stone-800 p-4 sm:p-6 z-20">
            <div class="max-w-md mx-auto">
              <button
                @click="saveAndContinue"
                class="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md flex justify-center items-center gap-2 active:scale-[0.98]"
              >
                Save Skin Profile
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </Transition>

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

.reveal-enter-active {
  transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
</style>
