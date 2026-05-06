import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useQuizStore = defineStore('quiz', () => {
  // --- STATE ---
  // Tracks which question the user is currently looking at
  const currentQuestionIndex = ref(0)

  // Tracks the user's score for the 4 Baumann categories
  const scores = ref({
    hydration: 0,    // High = Oily (O), Low = Dry (D)
    sensitivity: 0,  // High = Sensitive (S), Low = Resistant (R)
    pigmentation: 0, // High = Pigmented (P), Low = Non-pigmented (N)
    aging: 0         // High = Wrinkle-prone (W), Low = Tight (T)
  })

  // --- ACTIONS ---
  // Call this when a user clicks an answer
  const answerQuestion = (category: keyof typeof scores.value, points: number) => {
    scores.value[category] += points
    currentQuestionIndex.value++
  }

  // Resets the quiz if they want to take it again
  const resetQuiz = () => {
    currentQuestionIndex.value = 0
    scores.value = { hydration: 0, sensitivity: 0, pigmentation: 0, aging: 0 }
  }

  // --- GETTERS ---
  // We will build a getter later to calculate the final 4-letter acronym (e.g., "OSNT") based on the final scores!

  return {
    currentQuestionIndex,
    scores,
    answerQuestion,
    resetQuiz
  }
})
