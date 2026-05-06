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

  // --- ACTIONS ---
  const answerQuestion = (category: keyof typeof scores.value, points: number) => {
    scores.value[category] += points
    currentQuestionIndex.value++
  }

  const resetQuiz = () => {
    currentQuestionIndex.value = 0
    scores.value = { hydration: 0, sensitivity: 0, pigmentation: 0, aging: 0 }
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
    answerQuestion,
    resetQuiz,
    finalSkinType
  }
})
