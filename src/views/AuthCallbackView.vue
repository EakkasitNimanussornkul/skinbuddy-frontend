<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '../api'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const errorMessage = ref('')

onMounted(async () => {
  const code = route.query.code as string

  if (code) {
    try {
      // Send the LINE code to your FastAPI backend
      const response = await apiClient.post('/auth/line', { code })
      const data = response.data

      // FastAPI should return something like: 
      // { "access_token": "ey...", "user": { "name": "...", "avatar": "..." } }
      if (data.access_token) {
        // Save token and user info to Pinia/LocalStorage
        authStore.setAuth(data.access_token, data.user)

        // Redirect to the SkinBuddies chat interface
        router.push('/chat')
      }
    } catch (error) {
      console.error('Authentication failed:', error)
      errorMessage.value = 'Failed to log in. Please try again.'
      setTimeout(() => router.push('/'), 3000)
    }
  } else {
    router.push('/')
  }
})
</script>

<template>
  <div style="text-align: center; margin-top: 20vh;">
    <h2 v-if="!errorMessage">Authenticating...</h2>
    <h2 v-else style="color: red;">{{ errorMessage }}</h2>
  </div>
</template>