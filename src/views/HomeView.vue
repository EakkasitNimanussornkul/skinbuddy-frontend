<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans">
    <h1 class="text-4xl font-serif text-slate-900 mb-4">Welcome to SkinBuddy</h1>
    <p class="text-slate-500 mb-8">Your personalized skincare companion.</p>

    <div class="flex gap-4">
      <RouterLink to="/quiz"
        class="bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors shadow-sm">
        Take the Skin Quiz
      </RouterLink>

      <RouterLink to="/shelf"
        class="bg-white text-slate-700 border border-slate-300 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors shadow-sm">
        View My Shelf
      </RouterLink>
    </div>

    <button @click="authStore.loginWithLine"
      style="background-color: #06C755; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-top: 20px;">
      Log in with LINE
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore()

onMounted(() => {
  console.log('Access token:', authStore.token)
})
</script>
