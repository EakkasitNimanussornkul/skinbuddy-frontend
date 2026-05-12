import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AuthCallbackView from '../views/AuthCallbackView.vue'
import ErrorView from '../views/ErrorView.vue'
import HomeView from '../views/HomeView.vue'
import SkinQuizView from '../views/SkinQuizView.vue'
import ShelfView from '../views/ShelfView.vue'
import SettingsView from '../views/SettingsView.vue'
import ExploreView from '../views/ExploreView.vue'
import RoutineView from '../views/RoutineView.vue'
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
    {
      path: '/error',
      name: 'error',
      component: ErrorView,
    },
    {
      path: '/shelf',
      name: 'shelf',
      component: ShelfView,
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/explore',
      name: 'explore',
      component: ExploreView
    },
    {
      path: '/routine',
      name: 'routine',
      component: RoutineView,
      meta: { requiresAuth: true }
    }
  ],
})
// If you want the any link to be protected, write the line below:
// meta: { requiresAuth: true }

// Route Guard: Check if the user is allowed to view the page
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  if (to.name === 'authCallback' || to.name === 'error') {
    next()
    return
  }

  if (!authStore.isAuthenticated()) {
    authStore.loginWithLine()
    return
  }

  next()
})

export default router
