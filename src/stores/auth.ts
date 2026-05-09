// src/stores/auth.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {

  const token = ref<string | null>(localStorage.getItem('access_token'))
  const user = ref<any>(JSON.parse(localStorage.getItem('user_info') || 'null'))
  const router = useRouter()

  const loginWithLine = () => {
    const clientId = import.meta.env.VITE_LINE_CLIENT_ID
    console.log('My Client ID is:', clientId)
    const redirectUri = encodeURIComponent(import.meta.env.VITE_LINE_REDIRECT_URI)
    const state = crypto.randomUUID()

    const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=profile%20openid`

    window.location.href = lineAuthUrl
  }

  const setAuth = (newToken: string, userData: any) => {
    token.value = newToken
    user.value = userData
    localStorage.setItem('access_token', newToken)
    localStorage.setItem('user_info', JSON.stringify(userData))
  }

  // --- NEW: Safely update the skin type in local memory ---
  const updateSkinType = (newSkinType: string) => {
    if (user.value) {
      // Update the reactive user object
      user.value = { ...user.value, skin_type: newSkinType }
      // Save it back to LocalStorage so it survives a page refresh
      localStorage.setItem('user_info', JSON.stringify(user.value))
    }
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_info')
    router.push('/')
  }

  // A simple boolean check for the router to use
  const isAuthenticated = () => !!token.value

  // Added updateSkinType to the return block!
  return { token, user, loginWithLine, setAuth, updateSkinType, logout, isAuthenticated }
})
