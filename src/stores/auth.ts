import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('access_token'))
  const user = ref<any>(JSON.parse(localStorage.getItem('user_info') || 'null'))

  const showLoginPopup = ref(false)
  const popupReason = ref('Sign in to access your personalized skin routine.')
  const showLogoutPopup = ref(false)
  const isAuthenticated = computed(() => !!token.value)

  const triggerLoginPopup = (reason?: string) => {
    popupReason.value = reason || 'Sign in to access your personalized skin routine.'
    showLoginPopup.value = true
  }

  const loginWithLine = () => {
    const clientId = import.meta.env.VITE_LINE_CLIENT_ID
    const redirectUri = encodeURIComponent(import.meta.env.VITE_LINE_REDIRECT_URI)
    const state = crypto.randomUUID()
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=profile%20openid`
  }

  const setAuth = (newToken: string, userData: any) => {
    token.value = newToken
    const normalizedUser = {
      ...userData,
      name: userData.display_name || userData.name || 'Guest User',
      picture: userData.avatar || userData.picture_url || userData.picture || null
    }
    user.value = normalizedUser
    localStorage.setItem('access_token', newToken)
    localStorage.setItem('user_info', JSON.stringify(normalizedUser))
    showLoginPopup.value = false
  }

  const updateSkinType = (newSkinType: string) => {
    if (user.value) {
      user.value = { ...user.value, skin_type: newSkinType }
      localStorage.setItem('user_info', JSON.stringify(user.value))
    }
  }

  const clearSession = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_info')
  }

  const logout = () => {
    clearSession()
    showLogoutPopup.value = true
  }

  return {
    token,
    user,
    showLoginPopup,
    popupReason,
    showLogoutPopup,
    isAuthenticated,
    triggerLoginPopup,
    loginWithLine,
    setAuth,
    updateSkinType,
    clearSession,
    logout,
  }
})
