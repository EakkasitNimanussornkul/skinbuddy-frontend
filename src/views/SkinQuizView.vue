<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuizStore } from '../stores/quizStore'
import { saveSkinType } from '../api/quizapi'
import { baumannQuiz } from '../data/baumannQuiz'
import QuestionCard from '../components/QuestionCard.vue'
import { useAuthStore } from '../stores/auth'
// Initialize Stores and Router
const quizStore = useQuizStore()
const router = useRouter()
const authStore = useAuthStore()
const totalQuestions = baumannQuiz.length

// Grab the specific question object based on the user's current index
const currentQuestionData = computed(() => {
  return baumannQuiz[quizStore.currentQuestionIndex]
})

// Check if they have answered all questions in the array
const isQuizFinished = computed(() => {
  return quizStore.currentQuestionIndex >= totalQuestions
})

// Receives points emitted from your QuestionCard component
const handleAnswer = (points: number) => {
  if (currentQuestionData.value) {
    quizStore.answerQuestion(currentQuestionData.value.category, points)
  }
}

// Create a TypeScript interface so the linter knows what 'liff' is
interface LiffWindow extends Window {
  liff?: { closeWindow: () => void }
}
// PHASE 1: Saves the flag and closes the app to return to LINE Chat
// PHASE 1: Saves the flag, updates local memory, and returns to Home/LINE
const saveAndContinue = async () => {
  try {
    // 1. Send data to your FastAPI backend
    await saveSkinType(quizStore.finalSkinType, quizStore.scores)

    // 2. NEW: Tell the Auth Store to update the user's profile card instantly!
    authStore.updateSkinType(quizStore.finalSkinType)

    // 3. Save the local flag
    localStorage.setItem('hasCompletedQuiz', 'true')

    const win = window as LiffWindow
    if (typeof window !== 'undefined' && win.liff) {
      win.liff.closeWindow()
    } else {
      // Pushes the user back to the HomeView!
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

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">

        <div class="flex flex-col gap-6">
          <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h2 class="text-4xl font-serif text-center mb-6 text-slate-800">{{ quizStore.finalSkinType }}</h2>

            <div class="space-y-5">
              <div class="flex items-center">
                <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3 text-blue-600">💧</div>
                <div class="flex-grow">
                  <div class="flex justify-between text-sm font-semibold mb-1">
                    <span>{{ quizStore.scores.hydration >= 10 ? 'Oily' : 'Dry' }}</span>
                    <span class="text-slate-500">{{ quizStore.scores.hydration }}/16</span>
                  </div>
                  <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-blue-400" :style="{ width: (quizStore.scores.hydration / 16) * 100 + '%' }"></div>
                  </div>
                </div>
              </div>

              <div class="flex items-center">
                <div class="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center mr-3 text-teal-600">🌿</div>
                <div class="flex-grow">
                  <div class="flex justify-between text-sm font-semibold mb-1">
                    <span>{{ quizStore.scores.sensitivity >= 10 ? 'Sensitive' : 'Resistant' }}</span>
                    <span class="text-slate-500">{{ quizStore.scores.sensitivity }}/16</span>
                  </div>
                  <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-teal-400" :style="{ width: (quizStore.scores.sensitivity / 16) * 100 + '%' }"></div>
                  </div>
                </div>
              </div>

              <div class="flex items-center">
                <div class="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center mr-3 text-orange-600">☀️</div>
                <div class="flex-grow">
                  <div class="flex justify-between text-sm font-semibold mb-1">
                    <span>{{ quizStore.scores.pigmentation >= 10 ? 'Pigmented' : 'Non-Pigmented' }}</span>
                    <span class="text-slate-500">{{ quizStore.scores.pigmentation }}/16</span>
                  </div>
                  <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-orange-400" :style="{ width: (quizStore.scores.pigmentation / 16) * 100 + '%' }"></div>
                  </div>
                </div>
              </div>

              <div class="flex items-center">
                <div class="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center mr-3 text-purple-600">⏳</div>
                <div class="flex-grow">
                  <div class="flex justify-between text-sm font-semibold mb-1">
                    <span>{{ quizStore.scores.aging >= 10 ? 'Wrinkle-Prone' : 'Tight' }}</span>
                    <span class="text-slate-500">{{ quizStore.scores.aging }}/16</span>
                  </div>
                  <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-purple-400" :style="{ width: (quizStore.scores.aging / 16) * 100 + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-grow">
            <h3 class="text-xl font-serif mb-4 text-center">Skin Profile Details</h3>
            <p class="text-sm text-slate-600 leading-relaxed mb-3">
              <strong class="text-slate-900">Hydration:</strong> Your skin barrier indicates a tendency toward {{ quizStore.scores.hydration >= 10 ? 'excess sebum production' : 'moisture loss and flakiness' }}.
            </p>
            <p class="text-sm text-slate-600 leading-relaxed mb-3">
              <strong class="text-slate-900">Sensitivity:</strong> You have a {{ quizStore.scores.sensitivity >= 10 ? 'highly reactive' : 'robust' }} baseline, meaning active ingredients should be {{ quizStore.scores.sensitivity >= 10 ? 'introduced slowly' : 'tolerated well' }}.
            </p>
          </div>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <h3 class="text-xl font-serif mb-6 text-center border-b border-slate-100 pb-4">Key Characteristics</h3>

          <div class="flex-grow space-y-6">
            <div class="flex items-start">
              <div class="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-xl flex-shrink-0 mr-4">🛡️</div>
              <div>
                <h4 class="font-semibold text-sm mb-1">Barrier Integrity</h4>
                <p class="text-xs text-slate-500">Focus on strengthening the stratum corneum before introducing strong exfoliants.</p>
              </div>
            </div>
            <div class="flex items-start">
              <div class="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-xl flex-shrink-0 mr-4">✨</div>
              <div>
                <h4 class="font-semibold text-sm mb-1">Melanin Reactivity</h4>
                <p class="text-xs text-slate-500">Prone to post-inflammatory hyperpigmentation after breakouts or sun exposure.</p>
              </div>
            </div>
            <div class="flex items-start">
              <div class="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-xl flex-shrink-0 mr-4">💧</div>
              <div>
                <h4 class="font-semibold text-sm mb-1">Moisture Retention</h4>
                <p class="text-xs text-slate-500">Requires humectants that bind water to the skin without clogging pores.</p>
              </div>
            </div>
            <div class="flex items-start">
              <div class="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl flex-shrink-0 mr-4">🧬</div>
              <div>
                <h4 class="font-semibold text-sm mb-1">Collagen Support</h4>
                <p class="text-xs text-slate-500">Needs proactive collagen synthesis support to maintain long-term elasticity.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-6">
          <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <h3 class="font-serif text-center border-b border-slate-100 pb-2 mb-4">Morning ☀️</h3>
                <ul class="space-y-3 text-xs text-slate-600">
                  <li class="flex items-center"><span class="w-4 h-4 bg-slate-100 rounded-full mr-2"></span> Gentle Cleanser</li>
                  <li class="flex items-center"><span class="w-4 h-4 bg-slate-100 rounded-full mr-2"></span> Antioxidant Serum</li>
                  <li class="flex items-center"><span class="w-4 h-4 bg-slate-100 rounded-full mr-2"></span> Light Moisturizer</li>
                  <li class="flex items-center"><span class="w-4 h-4 bg-slate-100 rounded-full mr-2"></span> SPF 50+</li>
                </ul>
              </div>
              <div>
                <h3 class="font-serif text-center border-b border-slate-100 pb-2 mb-4">Evening 🌙</h3>
                <ul class="space-y-3 text-xs text-slate-600">
                  <li class="flex items-center"><span class="w-4 h-4 bg-slate-100 rounded-full mr-2"></span> Double Cleanse</li>
                  <li class="flex items-center"><span class="w-4 h-4 bg-slate-100 rounded-full mr-2"></span> Treatment Serum</li>
                  <li class="flex items-center"><span class="w-4 h-4 bg-slate-100 rounded-full mr-2"></span> Barrier Cream</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-grow">
            <h3 class="text-lg font-serif mb-4 text-center border-b border-slate-100 pb-2">Top Ingredients</h3>
            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="flex flex-col items-center">
                <div class="text-3xl mb-2">🌿</div>
                <span class="text-xs font-semibold">Centella</span>
              </div>
              <div class="flex flex-col items-center">
                <div class="text-3xl mb-2">💎</div>
                <span class="text-xs font-semibold">Niacinamide</span>
              </div>
              <div class="flex flex-col items-center">
                <div class="text-3xl mb-2">🧪</div>
                <span class="text-xs font-semibold">Ceramides</span>
              </div>
            </div>
          </div>
        </div>

      </div>

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
