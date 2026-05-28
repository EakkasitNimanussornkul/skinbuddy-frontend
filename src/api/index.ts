// src/api/index.ts
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Your FastAPI URL
})

// Automatically attach the token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    return response // If successful, just return the data normally
  },
  (error) => {
    // If FastAPI throws a 401 Unauthorized
    if (error.response && error.response.status === 401) {
      const authStore = useAuthStore()

      console.warn('Token expired. Wiping session and prompting login.')

      // 1. Delete the bad token from memory and localStorage
      authStore.clearSession()

      // 2. Trigger your global popup
      authStore.showLoginPopup = true
    }

    // Still reject the promise so your individual components know it failed
    return Promise.reject(error)
  },
)
