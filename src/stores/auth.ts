// src/stores/auth.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('access_token'))
  const user = ref<any>(JSON.parse(localStorage.getItem('user_info') || 'null'))
  const router = useRouter()

  // NEW: State for the global popup
  const showLoginPopup = ref(false)

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

  const updateSkinType = (newSkinType: string) => {
    if (user.value) {
      user.value = { ...user.value, skin_type: newSkinType }
      localStorage.setItem('user_info', JSON.stringify(user.value))
    }
  }

  // NEW: Silently wipe auth data without changing the page
  const clearSession = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_info')
  }

  const logout = () => {
    clearSession() // Use the new function to avoid repeating code
    router.push('/')
  }

  const isAuthenticated = () => !!token.value

  // Export the new variables and functions
  return {
    token,
    user,
    showLoginPopup, // Added
    loginWithLine,
    setAuth,
    updateSkinType,
    clearSession, // Added
    logout,
    isAuthenticated,
  }
})
