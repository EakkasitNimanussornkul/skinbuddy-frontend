import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { resolveNavigation } from './guard'
import AuthCallbackView from '../views/AuthCallbackView.vue'
import ChatbotView from '../views/ChatbotView.vue'
import CompareView from '../views/CompareView.vue'
import ErrorView from '../views/ErrorView.vue'
import ExploreView from '../views/ExploreView.vue'
import HomeView from '../views/HomeView.vue'
import ProductDetailView from '../views/ProductDetailView.vue'
import RoutineView from '../views/RoutineView.vue'
import SettingsView from '../views/SettingsView.vue'
import ShelfView from '../views/ShelfView.vue'
import SkinAnalysisView from '../views/SkinAnalysisView.vue'
import SkinProfileView from '../views/SkinProfileView.vue'
import SkinQuizView from '../views/SkinQuizView.vue'
import SkinTypeLanding from '../views/SkinTypeLanding.vue'
import WeeklyCheckInView from '../views/WeeklyCheckInView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  },
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
      meta: { requiresAuth: true, requiresSkinType: true }
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
    {
      path: '/product/:slug',
      name: 'ProductDetail',
      component: ProductDetailView,
    },
    {
      path: '/compare',
      name: 'Compare',
      component: CompareView,
      meta: { requiresAuth: true },
    },
    {
      path: '/checkin',
      name: 'weekly-checkin',
      component: WeeklyCheckInView,
      meta: { requiresAuth: true },
    },
    {
      path: '/analysis',
      name: 'skin-analysis',
      component: SkinAnalysisView,
      meta: { requiresAuth: true },
    },

    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: ErrorView,
      beforeEnter: (to) => {
        to.query = {
          ...to.query,
          title: '404 - Page Not Found',
          message: `The path "${to.path}" is not found. Please check the URL or return to the home page.`,
        }
      }
    }
  ],
})

// Route Guard: Check if the user is allowed to view the page.
// The decision itself lives in ./guard so it can be unit tested without
// pulling every view into the test's tsconfig project.
router.beforeEach((to) => resolveNavigation(to, useAuthStore()))

export default router
