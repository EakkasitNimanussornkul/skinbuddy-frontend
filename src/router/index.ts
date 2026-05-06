import { createRouter, createWebHistory } from 'vue-router'
import SkinQuizView from '../views/SkinQuizView.vue'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/quiz',
      name: 'quiz',
      component: SkinQuizView
    },
    {
      path: '/shelf',
      name: 'shelf',
      component: () => import('../views/ShelfView.vue')
    }
  ]
})

export default router
