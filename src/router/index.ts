import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SkinQuizView from '../views/SkinQuizView.vue'
import ShelfView from '../views/ShelfView.vue'
import SettingsView from '../views/SettingsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/quiz', name: 'quiz', component: SkinQuizView },
    { path: '/shelf', name: 'shelf', component: ShelfView },
    { path: '/settings', name: 'settings', component: SettingsView }
  ]
})
// THE ROUTER GUARD
router.beforeEach((to, from, next) => {
  // Check if our "quiz finished" flag exists in the browser's permanent local storage
  const hasCompletedQuiz = localStorage.getItem('hasCompletedQuiz')

  if (!hasCompletedQuiz && to.name !== 'quiz') {
    next({ name: 'quiz' }) // Force redirect them to the quiz
  } else {
    next() // Otherwise, let them proceed normally
  }
})
export default router
