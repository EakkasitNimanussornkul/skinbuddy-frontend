import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AuthCallbackView from '../views/AuthCallbackView.vue'
import ChatbotView from '../views/ChatbotView.vue'
import ErrorView from '../views/ErrorView.vue'
import ExploreView from '../views/ExploreView.vue'
import HomeView from '../views/HomeView.vue'
import RoutineView from '../views/RoutineView.vue'
import SettingsView from '../views/SettingsView.vue'
import ShelfView from '../views/ShelfView.vue'
import SkinQuizView from '../views/SkinQuizView.vue'
import SkinTypeLanding from '../views/SkinTypeLanding.vue'
import SkinProfileView from '../views/SkinProfileView.vue'
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
      meta: { requiresAuth: true }
    },
    {
      path: '/setup-profile',
      name: 'SkinTypeLanding',
      component: SkinTypeLanding,
      meta: { requiresAuth: true }
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
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'skin-profile',
      component: SkinProfileView,
      meta: { requiresAuth: true }
    },
    {
      path: '/explore',
      name: 'explore',
      component: ExploreView,
    },
    {
      path: '/routine',
      name: 'routine',
      component: RoutineView,
      meta: { requiresAuth: true },
    },
    {
      path: '/chat',
      name: 'chat',
      component: ChatbotView,
      meta: { requiresAuth: true },
    },

  ],
})
// If you want the any link to be protected, write the line below:
// meta: { requiresAuth: true }
// Route Guard: Check if the user is allowed to view the page
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  // Always allow callback and error pages to load
  if (to.name === 'authCallback' || to.name === 'error') {
    next()
    return
  }

  // If the page needs auth AND they are not logged in
  if (to.meta.requiresAuth && !authStore.isAuthenticated()) {
    authStore.showLoginPopup = true // Triggers the global popup
    next(false) // Stops them from entering the protected page
    return
  }

  // Otherwise, let them proceed normally
  next()
})

export default router
