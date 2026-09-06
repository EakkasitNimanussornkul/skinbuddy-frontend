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
    const state = crypto.randomUUID()
    // bot_prompt=aggressive shows the "add friend" screen during login so the user
    // befriends our LINE Official Account. This is REQUIRED for push reminders
    // (UC-21 / UC-26) to be deliverable — LINE only pushes to friended users.
    // Requires the Login channel to be linked to a Messaging API channel (OA).
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: import.meta.env.VITE_LINE_REDIRECT_URI,
      state,
      scope: 'profile openid',
      bot_prompt: 'aggressive',
    })
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
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
