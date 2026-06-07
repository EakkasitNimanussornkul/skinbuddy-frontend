import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useQuizStore = defineStore('quiz', () => {
  // --- STATE ---
  const currentQuestionIndex = ref(0)
  const scores = ref({
    hydration: 0,
    sensitivity: 0,
    pigmentation: 0,
    aging: 0
  })

  // NEW: Track the history of answers so we can go back and change them safely
  const answersHistory = ref<Record<number, { points: number, optionIndex: number | 'not_sure' }>>({})

  // --- ACTIONS ---
  // Updated to require the questionIndex and the specific option they chose
  const answerQuestion = (questionIndex: number, category: keyof typeof scores.value, points: number, optionIndex: number | 'not_sure') => {

    // If they already answered this question before, subtract the old points first so we don't double-count!
    if (answersHistory.value[questionIndex]) {
      scores.value[category] -= answersHistory.value[questionIndex].points
    }

    // Add the new points
    scores.value[category] += points

    // Save to history
    answersHistory.value[questionIndex] = { points, optionIndex }

    // Move to next question
    currentQuestionIndex.value++
  }

  const resetQuiz = () => {
    currentQuestionIndex.value = 0
    scores.value = { hydration: 0, sensitivity: 0, pigmentation: 0, aging: 0 }
    answersHistory.value = {} // Reset history too
  }

  const finalSkinType = computed(() => {
    const hydrationLetter = scores.value.hydration >= 10 ? 'O' : 'D'
    const sensitivityLetter = scores.value.sensitivity >= 10 ? 'S' : 'R'
    const pigmentationLetter = scores.value.pigmentation >= 10 ? 'P' : 'N'
    const agingLetter = scores.value.aging >= 10 ? 'W' : 'T'

    return `${hydrationLetter}${sensitivityLetter}${pigmentationLetter}${agingLetter}`
  })

  return {
    currentQuestionIndex,
    scores,
    answersHistory,
    answerQuestion,
    resetQuiz,
    finalSkinType
  }
})
