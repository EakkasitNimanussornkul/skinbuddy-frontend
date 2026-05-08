import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AuthCallbackView from '../views/AuthCallbackView.vue'
import HomeView from '../views/HomeView.vue'
import SkinQuizView from '../views/SkinQuizView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/quiz',
      name: 'quiz',
      component: SkinQuizView,
    },
    {
      path: '/auth/callback',
      name: 'authCallback',
      component: AuthCallbackView,
    },
  ],
})
// If you want the any link to be protected, write the line below:
// meta: { requiresAuth: true }

// Route Guard: Check if the user is allowed to view the page
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  // Use the isAuthenticated() function we defined in Pinia instead of .session
  if (to.meta.requiresAuth && !authStore.isAuthenticated()) {
    // If they need to be logged in but aren't, send to Home
    next({ name: 'home' })
  } else if (to.name === 'home' && authStore.isAuthenticated()) {
    // If they are already logged in and try to hit the login page, send to Chat
    next({ name: 'chat' })
  } else {
    // Otherwise, let them go to the page they requested
    next()
  }
})

export default router
